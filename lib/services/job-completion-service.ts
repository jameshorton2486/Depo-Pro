// =============================================================================
// JOB COMPLETION SERVICE
// =============================================================================
// Location: lib/services/job-completion-service.ts
// Phase: 2 - Pipeline Orchestration
// Fixes: B1 (job completion orchestration)
//
// CRITICAL PRINCIPLE:
// Job completion is a SINGLE AUTHORITATIVE function that:
// 1. Validates all prerequisites
// 2. Generates final invoice
// 3. Locks the job
// 4. Creates audit trail
// =============================================================================

import { db } from '@/lib/db';
import { transitionJobStatus } from './job-field-lock-service';
import { isPipelineComplete } from './audio-processing-orchestrator';
import { getConfidenceStatsForJob } from './confidence-analysis-service';
import { calculateJobBilling } from '@/lib/billing/pricing-snapshot';
import { generateInvoiceForJob } from '@/lib/billing/invoice-generator';
import type { JobStatus } from '@prisma/client';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CompletionValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CompletionResult {
  success: boolean;
  error?: string;
  invoiceId?: string;
  jobId: string;
}

// -----------------------------------------------------------------------------
// Validate Job Can Be Completed
// -----------------------------------------------------------------------------

export async function validateJobCompletion(jobId: string): Promise<CompletionValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch job with relations
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      transcription: true,
      pricingSnapshot: true,
      files: true,
    },
  });

  if (!job) {
    return { valid: false, errors: ['Job not found'], warnings: [] };
  }

  // Check status
  const completableStatuses: JobStatus[] = [
    'TRANSCRIBING',
    'IN_REVIEW',
    'REVIEW_COMPLETE',
  ];
  
  if (!completableStatuses.includes(job.status)) {
    errors.push(`Job status must be one of: ${completableStatuses.join(', ')}`);
  }

  // Check pipeline completion
  const pipelineStatus = await isPipelineComplete(jobId);
  if (!pipelineStatus.complete) {
    errors.push(`Pipeline incomplete. Missing steps: ${pipelineStatus.missingSteps.join(', ')}`);
  }

  // Check transcription exists
  if (!job.transcription) {
    errors.push('Transcription not found');
  }

  // Check pricing snapshot exists
  if (!job.pricingSnapshot) {
    warnings.push('No pricing snapshot found - using default rates');
  }

  // Check audio duration
  if (!job.audioDurationMinutes || job.audioDurationMinutes <= 0) {
    warnings.push('Audio duration not recorded - billing may be inaccurate');
  }

  // Check if already completed
  if (job.status === 'COMPLETED') {
    errors.push('Job is already completed');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// Complete Job
// -----------------------------------------------------------------------------

export async function completeJob(
  jobId: string,
  actorUserId: string,
  options: {
    skipInvoice?: boolean;
    forceComplete?: boolean;
  } = {}
): Promise<CompletionResult> {
  // Validate
  if (!options.forceComplete) {
    const validation = await validateJobCompletion(jobId);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join('; ')}`,
        jobId,
      };
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn(`⚠️ Job completion warnings for ${jobId}:`, validation.warnings);
    }
  }

  // Fetch job
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      transcription: true,
      pricingSnapshot: true,
      firm: true,
    },
  });

  if (!job) {
    return { success: false, error: 'Job not found', jobId };
  }

  // Generate invoice (unless skipped)
  let invoiceId: string | undefined;
  if (!options.skipInvoice) {
    try {
      const invoiceResult = await generateInvoiceForJob(jobId, {
        periodStart: new Date(),
        periodEnd: new Date(),
        sendToStripe: false,
      });
      if (invoiceResult.success && invoiceResult.invoiceId) {
        invoiceId = invoiceResult.invoiceId;
        console.log(`💰 Invoice created: ${invoiceId} for job ${jobId}`);
      } else {
        console.error(`❌ Failed to create invoice: ${invoiceResult.error}`);
        // Don't fail completion if invoice fails - log it
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      // Continue with completion even if invoice fails
    }
  }

  // Transition status to COMPLETED
  const statusResult = await transitionJobStatus(jobId, 'COMPLETED', actorUserId);
  if (!statusResult.success) {
    return {
      success: false,
      error: `Failed to update status: ${statusResult.error}`,
      jobId,
    };
  }

  // Lock the job
  await db.job.update({
    where: { id: jobId },
    data: {
      lockedAt: new Date(),
      lockedBy: actorUserId,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      action: 'job.completed',
      targetType: 'job',
      targetId: jobId,
      actorUserId,
      firmId: job.firmId || undefined,
      metadata: {
        invoiceId,
        completedAt: new Date().toISOString(),
        audioDurationMinutes: job.audioDurationMinutes,
        transcriptionWordCount: job.transcription?.wordCount || 0,
      },
    },
  });

  console.log(`✅ Job completed: ${jobId} by user ${actorUserId}`);

  return {
    success: true,
    jobId,
    invoiceId,
  };
}

// -----------------------------------------------------------------------------
// Get Completion Status
// -----------------------------------------------------------------------------

export async function getCompletionStatus(jobId: string): Promise<{
  canComplete: boolean;
  validation: CompletionValidation;
  invoiceId?: string;
}> {
  const validation = await validateJobCompletion(jobId);
  
  // Check if invoice already exists (via line items)
  const invoice = await db.invoice.findFirst({
    where: {
      lineItems: {
        some: {
          jobId: jobId,
        },
      },
    },
    select: { id: true },
  });

  return {
    canComplete: validation.valid,
    validation,
    invoiceId: invoice?.id,
  };
}

// -----------------------------------------------------------------------------
// Reopen Job (Admin Only)
// -----------------------------------------------------------------------------

export async function reopenJob(
  jobId: string,
  actorUserId: string,
  reason: string
): Promise<CompletionResult> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { status: true, lockedAt: true },
  });

  if (!job) {
    return { success: false, error: 'Job not found', jobId };
  }

  if (job.status !== 'COMPLETED') {
    return { success: false, error: 'Job is not completed', jobId };
  }

  // Transition back to IN_REVIEW
  const statusResult = await transitionJobStatus(jobId, 'IN_REVIEW', actorUserId);
  if (!statusResult.success) {
    return {
      success: false,
      error: `Failed to update status: ${statusResult.error}`,
      jobId,
    };
  }

  // Unlock the job
  await db.job.update({
    where: { id: jobId },
    data: {
      lockedAt: null,
      lockedBy: null,
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      action: 'job.reopened',
      targetType: 'job',
      targetId: jobId,
      actorUserId,
      metadata: {
        reason,
        reopenedAt: new Date().toISOString(),
      },
    },
  });

  console.log(`🔄 Job reopened: ${jobId} by user ${actorUserId} - Reason: ${reason}`);

  return {
    success: true,
    jobId,
  };
}

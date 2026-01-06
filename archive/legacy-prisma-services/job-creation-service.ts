// =============================================================================
// JOB CREATION SERVICE
// =============================================================================
// Location: lib/services/job-creation-service.ts
// Phase: 1 - Domain Enforcement
// Fixes: A1 (business rules in backend), B2 (pricing snapshot at job start)
//
// CRITICAL PRINCIPLE:
// This service is the ONLY way to create jobs.
// It guarantees:
// 1. Pricing snapshot is captured
// 2. Initial fields are validated
// 3. Audit trail is created
// =============================================================================

import { createPricingSnapshot } from '@/lib/billing/pricing-snapshot';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface JobCreationInput {
  title: string;
  caseName: string;
  caseNumber?: string;
  depositionDate: Date | string;
  location?: string;
  zoomLink?: string;
  firmId: string;
  createdById: string;
  transcriptionModelType?: 'STANDARD' | 'MEDICAL' | 'BILINGUAL';
  audioProcessingMode?: 'AUTOMATED' | 'MANUAL_RX';
  notes?: string;
  caseId?: string;
  agencyId?: string;
}

export interface JobCreationResult {
  success: boolean;
  jobId?: string;
  pricingSnapshotId?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function validateJobInput(input: JobCreationInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }

  if (!input.caseName || input.caseName.trim().length < 2) {
    errors.push('Case name is required');
  }

  if (!input.depositionDate) {
    errors.push('Deposition date is required');
  }

  if (!input.firmId) {
    errors.push('Firm ID is required');
  }

  if (!input.createdById) {
    errors.push('Creator ID is required');
  }

  // RX forensic requires explicit request
  if (input.audioProcessingMode === 'MANUAL_RX') {
    // Will be validated further by RX eligibility service
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------------------------
// Create Job (Single Entry Point)
// -----------------------------------------------------------------------------

export async function createJob(input: JobCreationInput): Promise<JobCreationResult> {
  // Step 1: Validate input
  const validation = validateJobInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join(', ')}`,
    };
  }

  try {
    // Step 2: Create pricing snapshot FIRST
    // This captures current rates and links them to this job forever
    const pricingSnapshotId = await createPricingSnapshot(input.firmId);

    // Step 3: Determine ASR tier from model type
    const asrModelTier = input.transcriptionModelType === 'MEDICAL' ||
                         input.transcriptionModelType === 'BILINGUAL'
      ? 'ENHANCED'
      : 'STANDARD';

    // Step 4: Parse deposition date
    const depositionDate = typeof input.depositionDate === 'string'
      ? new Date(input.depositionDate)
      : input.depositionDate;

    // Step 5: Create job with all required fields
    const job = await db.job.create({
      data: {
        title: input.title.trim(),
        caseName: input.caseName.trim(),
        caseNumber: input.caseNumber?.trim(),
        depositionDate,
        location: input.location?.trim(),
        zoomLink: input.zoomLink?.trim(),
        firmId: input.firmId,
        createdById: input.createdById,
        transcriptionModelType: input.transcriptionModelType || 'STANDARD',
        audioProcessingMode: input.audioProcessingMode || 'AUTOMATED',
        asrModelTier,
        pricingSnapshotId,
        notes: input.notes,
        caseId: input.caseId,
        agencyId: input.agencyId,
        status: 'CREATED',
      },
    });

    // Step 6: Create audit log
    await db.auditLog.create({
      data: {
        action: 'job.created',
        targetType: 'job',
        targetId: job.id,
        actorUserId: input.createdById,
        firmId: input.firmId,
        metadata: {
          title: job.title,
          caseName: job.caseName,
          pricingSnapshotId,
          audioProcessingMode: input.audioProcessingMode || 'AUTOMATED',
          asrModelTier,
          createdAt: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Job created: ${job.id} with pricing snapshot: ${pricingSnapshotId}`);

    return {
      success: true,
      jobId: job.id,
      pricingSnapshotId,
    };
  } catch (error) {
    console.error('❌ Job creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Get Job with Pricing (For Cost Preview)
// -----------------------------------------------------------------------------

export async function getJobWithPricing(jobId: string) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      firm: true,
      pricingSnapshot: true,
    },
  });

  return job;
}

// -----------------------------------------------------------------------------
// Validate Job Can Be Modified
// -----------------------------------------------------------------------------

export async function canModifyJob(jobId: string): Promise<{ allowed: boolean; reason?: string }> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      lockedAt: true,
    },
  });

  if (!job) {
    return { allowed: false, reason: 'Job not found' };
  }

  // Jobs cannot be modified after these statuses
  const lockedStatuses = [
    'REVIEW_COMPLETE',
    'COMPLETED',
  ];

  if (lockedStatuses.includes(job.status)) {
    return { 
      allowed: false, 
      reason: `Job is locked at status: ${job.status}` 
    };
  }

  if (job.lockedAt) {
    return {
      allowed: false,
      reason: 'Job is explicitly locked',
    };
  }

  return { allowed: true };
}

// =============================================================================
// JOB FIELD LOCK SERVICE
// =============================================================================
// Location: lib/services/job-field-lock-service.ts
// Phase: 1 - Domain Enforcement
// Fixes: A1 (business rules in backend)
//
// CRITICAL PRINCIPLE:
// Once a job enters certain states, specific fields become IMMUTABLE.
// This prevents:
// - Pricing changes after quote
// - Processing mode changes after processing starts
// - Model changes after transcription starts
// =============================================================================

import type { JobStatus } from '@/types/database';

// -----------------------------------------------------------------------------
// Field Lock Configuration
// -----------------------------------------------------------------------------

// Define which fields lock at which status
const FIELD_LOCK_RULES: Record<string, JobStatus[]> = {
  // Pricing-related fields lock when audio is uploaded
  pricingSnapshotId: ['FILES_UPLOADED', 'ENHANCING_AUDIO', 'TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'REVIEW_COMPLETE', 'COMPLETED'],
  
  // Processing mode locks when processing starts
  audioProcessingMode: ['ENHANCING_AUDIO', 'TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'REVIEW_COMPLETE', 'COMPLETED'],
  
  // Model type locks when transcription starts
  transcriptionModelType: ['TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'REVIEW_COMPLETE', 'COMPLETED'],
  asrModelTier: ['TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'REVIEW_COMPLETE', 'COMPLETED'],
  
  // Case info locks after transcription complete
  caseName: ['REVIEW_COMPLETE', 'COMPLETED'],
  caseNumber: ['REVIEW_COMPLETE', 'COMPLETED'],
  depositionDate: ['REVIEW_COMPLETE', 'COMPLETED'],
};

// Fields that can NEVER be changed
const IMMUTABLE_FIELDS = [
  'id',
  'createdById',
  'createdAt',
  'firmId',
];

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FieldLockResult {
  canUpdate: boolean;
  lockedFields: string[];
  reason?: string;
}

export interface UpdateValidation {
  valid: boolean;
  blockedFields: string[];
  allowedFields: string[];
  errors: string[];
}

// -----------------------------------------------------------------------------
// Check if Field is Locked
// -----------------------------------------------------------------------------

export function isFieldLocked(fieldName: string, currentStatus: JobStatus): boolean {
  // Immutable fields are always locked
  if (IMMUTABLE_FIELDS.includes(fieldName)) {
    return true;
  }

  // Check lock rules
  const lockingStatuses = FIELD_LOCK_RULES[fieldName];
  if (!lockingStatuses) {
    return false; // No rule = not locked
  }

  return lockingStatuses.includes(currentStatus);
}

// -----------------------------------------------------------------------------
// Get All Locked Fields for Status
// -----------------------------------------------------------------------------

export function getLockedFields(currentStatus: JobStatus): string[] {
  const locked: string[] = [...IMMUTABLE_FIELDS];

  for (const [field, lockingStatuses] of Object.entries(FIELD_LOCK_RULES)) {
    if (lockingStatuses.includes(currentStatus)) {
      locked.push(field);
    }
  }

  return locked;
}

// -----------------------------------------------------------------------------
// Validate Update Request
// -----------------------------------------------------------------------------

export async function validateJobUpdate(
  jobId: string,
  proposedChanges: Record<string, unknown>
): Promise<UpdateValidation> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { status: true },
  });

  if (!job) {
    return {
      valid: false,
      blockedFields: [],
      allowedFields: [],
      errors: ['Job not found'],
    };
  }

  const lockedFields = getLockedFields(job.status);
  const proposedFields = Object.keys(proposedChanges);

  const blockedFields: string[] = [];
  const allowedFields: string[] = [];
  const errors: string[] = [];

  for (const field of proposedFields) {
    if (lockedFields.includes(field)) {
      blockedFields.push(field);
      errors.push(`Field '${field}' is locked at status '${job.status}'`);
    } else {
      allowedFields.push(field);
    }
  }

  return {
    valid: blockedFields.length === 0,
    blockedFields,
    allowedFields,
    errors,
  };
}

// -----------------------------------------------------------------------------
// Safe Job Update (Enforces Locks)
// -----------------------------------------------------------------------------

export async function safeUpdateJob(
  jobId: string,
  updates: Record<string, unknown>,
  actorUserId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate the update
  const validation = await validateJobUpdate(jobId, updates);

  if (!validation.valid) {
    console.warn(`❌ Job update blocked: ${validation.errors.join(', ')}`);
    return {
      success: false,
      error: `Cannot update locked fields: ${validation.blockedFields.join(', ')}`,
    };
  }

  try {
    // Get current values for audit
    const currentJob = await db.job.findUnique({
      where: { id: jobId },
    });

    if (!currentJob) {
      return { success: false, error: 'Job not found' };
    }

    // Perform update (only allowed fields)
    const allowedUpdates: Record<string, unknown> = {};
    for (const field of validation.allowedFields) {
      allowedUpdates[field] = updates[field];
    }

    await db.job.update({
      where: { id: jobId },
      data: allowedUpdates,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'job.updated',
        targetType: 'job',
        targetId: jobId,
        actorUserId,
        firmId: currentJob.firmId || undefined,
        metadata: {
          fieldsChanged: validation.allowedFields,
          previousValues: Object.fromEntries(
            validation.allowedFields.map(f => [f, (currentJob as any)?.[f]])
          ),
          newValues: Object.fromEntries(
            validation.allowedFields.map(f => [f, updates[f]])
          ),
          updatedAt: new Date().toISOString(),
        } as any,
      },
    });

    console.log(`✅ Job ${jobId} updated: ${validation.allowedFields.join(', ')}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Job update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Lock Job Explicitly (For Manual Locking)
// -----------------------------------------------------------------------------

export async function lockJob(
  jobId: string,
  reason: string,
  lockedByUserId: string
): Promise<{ success: boolean }> {
  try {
    await db.job.update({
      where: { id: jobId },
      data: {
        lockedBy: lockedByUserId,
        lockedAt: new Date(),
        // Store lock reason in notes or metadata
        internalNotes: `[LOCKED] ${reason}`,
      },
    });

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { firmId: true },
    });

    await db.auditLog.create({
      data: {
        action: 'job.locked',
        targetType: 'job',
        targetId: jobId,
        actorUserId: lockedByUserId,
        firmId: job?.firmId || undefined,
        metadata: { reason, lockedAt: new Date().toISOString() },
      },
    });

    console.log(`🔒 Job ${jobId} locked: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to lock job:', error);
    return { success: false };
  }
}

// -----------------------------------------------------------------------------
// Check if Status Transition is Valid
// -----------------------------------------------------------------------------

const VALID_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  CREATED: ['FILES_UPLOADED', 'CANCELLED'],
  FILES_UPLOADED: ['ENHANCING_AUDIO', 'TRANSCRIBING', 'CANCELLED'],
  ENHANCING_AUDIO: ['TRANSCRIBING', 'CANCELLED'],
  TRANSCRIBING: ['AI_REVIEWING', 'CANCELLED'],
  AI_REVIEWING: ['READY_FOR_EDIT', 'CANCELLED'],
  READY_FOR_EDIT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_EDIT', 'CANCELLED'],
  IN_EDIT: ['SUBMITTED_FOR_REVIEW', 'CANCELLED'],
  SUBMITTED_FOR_REVIEW: ['IN_REVIEW', 'CANCELLED'],
  IN_REVIEW: ['SCOPIST_COMPLETE', 'CANCELLED'],
  SCOPIST_COMPLETE: ['REVIEW_COMPLETE', 'CANCELLED'],
  REVIEW_COMPLETE: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
  const validNextStatuses = VALID_STATUS_TRANSITIONS[from] || [];
  return validNextStatuses.includes(to);
}

export async function transitionJobStatus(
  jobId: string,
  newStatus: JobStatus,
  actorUserId: string
): Promise<{ success: boolean; error?: string }> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { status: true, firmId: true },
  });

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (!isValidStatusTransition(job.status, newStatus)) {
    return {
      success: false,
      error: `Invalid status transition: ${job.status} → ${newStatus}`,
    };
  }

  try {
    await db.job.update({
      where: { id: jobId },
      data: { status: newStatus },
    });

    await db.auditLog.create({
      data: {
        action: 'job.status_changed',
        targetType: 'job',
        targetId: jobId,
        actorUserId,
        firmId: job.firmId || undefined,
        metadata: {
          from: job.status,
          to: newStatus,
          changedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`📋 Job ${jobId}: ${job.status} → ${newStatus}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Status transition failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

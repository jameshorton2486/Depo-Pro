// =============================================================================
// RX ELIGIBILITY SERVICE
// =============================================================================
// Location: lib/services/rx-eligibility-service.ts
// Phase: 3 - RX Governance
// Fixes: B2 (RX escalation rules)
//
// CRITICAL PRINCIPLE:
// This service wraps the RX escalation logic and provides a clean interface
// for evaluating RX eligibility and handling admin approvals.
// =============================================================================

import {
  evaluateRXEligibility,
  checkRXEligibilityForJob,
  requestRXAdminApproval,
  processRXAdminApproval,
  type RXEligibilityInput,
  type RXEligibilityResult,
  type RXEscalationStatus,
} from '@/lib/rx/escalation';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type { RXEscalationStatus, RXEligibilityInput, RXEligibilityResult };

// -----------------------------------------------------------------------------
// Evaluate RX Eligibility
// -----------------------------------------------------------------------------

export async function evaluateRXEligibilityForJob(
  jobId: string,
  requestedByUserId: string,
  userRequested: boolean,
  adminOverride = false
): Promise<RXEligibilityResult> {
  return checkRXEligibilityForJob(jobId, requestedByUserId, userRequested, adminOverride);
}

// -----------------------------------------------------------------------------
// Check RX Eligibility for Job (Full Flow)
// -----------------------------------------------------------------------------

export async function checkRXEligibility(
  input: RXEligibilityInput
): Promise<RXEligibilityResult> {
  return evaluateRXEligibility(input);
}

// -----------------------------------------------------------------------------
// Log RX Eligibility Decision
// -----------------------------------------------------------------------------

export async function logRXEligibilityDecision(
  jobId: string,
  result: RXEligibilityResult,
  actorUserId: string
): Promise<void> {
  await db.auditLog.create({
    data: {
      action: 'rx_eligibility_evaluated',
      targetType: 'job',
      targetId: jobId,
      actorUserId,
      metadata: {
        allowed: result.allowed,
        decision: result.decision,
        reason: result.reason,
        requiresApproval: result.requiresApproval,
        evaluatedAt: new Date().toISOString(),
      },
    },
  });
}

// -----------------------------------------------------------------------------
// Request Admin Approval
// -----------------------------------------------------------------------------

export async function requestRXAdminApprovalForJob(
  jobId: string,
  requestedByUserId: string,
  justification: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const result = await requestRXAdminApproval(jobId, requestedByUserId, justification);
    return {
      success: result.success,
      requestId: result.requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// -----------------------------------------------------------------------------
// Process Admin Approval
// -----------------------------------------------------------------------------

export async function processRXAdminApprovalForJob(
  jobId: string,
  approvedByUserId: string,
  approved: boolean,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await processRXAdminApproval(jobId, approvedByUserId, approved, notes);
    return {
      success: result.success,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// -----------------------------------------------------------------------------
// Validate Processing Mode Change
// -----------------------------------------------------------------------------

export async function validateProcessingModeChange(
  jobId: string,
  newMode: 'AUTOMATED' | 'MANUAL_RX',
  actorUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      audioProcessingMode: true,
      lockedAt: true,
    },
  });

  if (!job) {
    return { allowed: false, reason: 'Job not found' };
  }

  // Can't change if job is locked
  if (job.lockedAt) {
    return { allowed: false, reason: 'Job is locked' };
  }

  // Can't change if already processing
  if (['ENHANCING_AUDIO', 'TRANSCRIBING', 'REVIEWING'].includes(job.status)) {
    return { allowed: false, reason: 'Job is already processing' };
  }

  // Can't change if already in the requested mode
  if (job.audioProcessingMode === newMode) {
    return { allowed: false, reason: `Job is already set to ${newMode}` };
  }

  // If switching to MANUAL_RX, check eligibility
  if (newMode === 'MANUAL_RX') {
    const eligibility = await checkRXEligibilityForJob(
      jobId,
      actorUserId,
      true, // userRequested
      false // adminOverride
    );

    if (!eligibility.allowed && !eligibility.requiresApproval) {
      return {
        allowed: false,
        reason: eligibility.reason,
      };
    }

    if (eligibility.requiresApproval) {
      return {
        allowed: false,
        reason: 'Admin approval required for RX processing',
      };
    }
  }

  return { allowed: true };
}

// =============================================================================
// RX ESCALATION SERVICE
// =============================================================================
// Location: lib/rx/escalation.ts
// Purpose: Policy enforcement for premium RX forensic audio cleanup
//
// RX is:
// ❌ Not default
// ❌ Not automatic
// ✅ Explicit
// ✅ Logged
// ✅ Gated
// =============================================================================


// -----------------------------------------------------------------------------
// Types (match Prisma enums after migration)
// -----------------------------------------------------------------------------

export type RXEscalationStatus = 
  | 'ALLOWED'
  | 'BLOCKED'
  | 'ADMIN_APPROVAL_REQUIRED'
  | 'NOT_RECOMMENDED';

export interface RXEligibilityInput {
  jobId: string;
  requestedByUserId?: string;
  userRequested: boolean;
  adminOverride?: boolean;
  audioQualityScore?: number;      // 0-100
  confidencePercent?: number;       // % of words below confidence threshold
  durationMinutes: number;
  isAgencyAccount: boolean;
}

export interface RXEligibilityResult {
  allowed: boolean;
  decision: RXEscalationStatus;
  reason: string;
  requiresApproval: boolean;
}

// -----------------------------------------------------------------------------
// RX Eligibility Thresholds
// -----------------------------------------------------------------------------

const RX_THRESHOLDS = {
  // Confidence percentage thresholds
  LOW_CONFIDENCE_THRESHOLD: 25,     // >25% below threshold = recommended
  SUFFICIENT_QUALITY_THRESHOLD: 10, // <10% below threshold = not needed
  
  // Audio quality thresholds
  POOR_AUDIO_SCORE: 40,             // Quality score below this = RX recommended
  GOOD_AUDIO_SCORE: 70,             // Quality score above this = RX not needed
  
  // Duration thresholds for admin approval
  LONG_DURATION_THRESHOLD: 180,     // >3 hours requires admin approval for agencies
};

// -----------------------------------------------------------------------------
// Evaluate RX Eligibility
// -----------------------------------------------------------------------------

export function evaluateRXEligibility(input: RXEligibilityInput): RXEligibilityResult {
  const {
    userRequested,
    adminOverride,
    audioQualityScore,
    confidencePercent,
    durationMinutes,
    isAgencyAccount,
  } = input;

  // Priority 1: Admin override always wins
  if (adminOverride) {
    return {
      allowed: true,
      decision: 'ALLOWED',
      reason: 'Admin override granted',
      requiresApproval: false,
    };
  }

  // Priority 2: If not requested, block immediately
  if (!userRequested) {
    return {
      allowed: false,
      decision: 'BLOCKED',
      reason: 'RX not requested by user',
      requiresApproval: false,
    };
  }

  // Priority 3: Long duration agency jobs require admin approval
  if (durationMinutes > RX_THRESHOLDS.LONG_DURATION_THRESHOLD && isAgencyAccount) {
    return {
      allowed: false,
      decision: 'ADMIN_APPROVAL_REQUIRED',
      reason: `Jobs over ${RX_THRESHOLDS.LONG_DURATION_THRESHOLD} minutes from agency accounts require admin approval`,
      requiresApproval: true,
    };
  }

  // Priority 4: Check audio quality score (if available)
  if (audioQualityScore !== undefined) {
    if (audioQualityScore < RX_THRESHOLDS.POOR_AUDIO_SCORE) {
      return {
        allowed: true,
        decision: 'ALLOWED',
        reason: `Poor audio quality (${audioQualityScore}%) - RX recommended`,
        requiresApproval: false,
      };
    }
    
    if (audioQualityScore > RX_THRESHOLDS.GOOD_AUDIO_SCORE) {
      return {
        allowed: false,
        decision: 'NOT_RECOMMENDED',
        reason: `Audio quality is good (${audioQualityScore}%) - RX not recommended`,
        requiresApproval: false,
      };
    }
  }

  // Priority 5: Check confidence percentage
  if (confidencePercent !== undefined) {
    if (confidencePercent > RX_THRESHOLDS.LOW_CONFIDENCE_THRESHOLD) {
      return {
        allowed: true,
        decision: 'ALLOWED',
        reason: `High percentage of low-confidence words (${confidencePercent.toFixed(1)}%)`,
        requiresApproval: false,
      };
    }

    if (confidencePercent < RX_THRESHOLDS.SUFFICIENT_QUALITY_THRESHOLD) {
      return {
        allowed: false,
        decision: 'NOT_RECOMMENDED',
        reason: `Audio quality is sufficient (${confidencePercent.toFixed(1)}% low-confidence)`,
        requiresApproval: false,
      };
    }
  }

  // Default: User requested, no blocking conditions met
  return {
    allowed: true,
    decision: 'ALLOWED',
    reason: 'User requested RX enhancement',
    requiresApproval: false,
  };
}

// -----------------------------------------------------------------------------
// Log RX Escalation Decision
// -----------------------------------------------------------------------------

export async function logRXEscalationDecision(
  input: RXEligibilityInput,
  result: RXEligibilityResult
): Promise<string> {
  const log = await db.auditLog.create({
    data: {
      action: 'rx_escalation_decision',
      targetType: 'job',
      targetId: input.jobId,
      actorUserId: input.requestedByUserId || undefined,
      metadata: {
        input: {
          userRequested: input.userRequested,
          adminOverride: input.adminOverride,
          audioQualityScore: input.audioQualityScore,
          confidencePercent: input.confidencePercent,
          durationMinutes: input.durationMinutes,
          isAgencyAccount: input.isAgencyAccount,
        },
        result: {
          allowed: result.allowed,
          decision: result.decision,
          reason: result.reason,
          requiresApproval: result.requiresApproval,
        },
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log(`📋 RX Escalation logged: ${result.decision} - ${result.reason}`);
  return log.id;
}

// -----------------------------------------------------------------------------
// Check RX Eligibility for Job (Full Flow)
// -----------------------------------------------------------------------------

export async function checkRXEligibilityForJob(
  jobId: string,
  requestedByUserId: string,
  userRequested: boolean,
  adminOverride = false
): Promise<RXEligibilityResult> {
  // Fetch job data
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      firm: true,
      transcription: {
        select: {
          averageConfidence: true,
          flaggedWordCount: true,
          wordCount: true,
        },
      },
      files: {
        where: { type: 'AUDIO' },
        select: { extractedData: true },
      },
    },
  });

  if (!job) {
    return {
      allowed: false,
      decision: 'BLOCKED',
      reason: 'Job not found',
      requiresApproval: false,
    };
  }

  // Calculate confidence percentage
  let confidencePercent: number | undefined;
  if (job.transcription?.wordCount && job.transcription?.flaggedWordCount) {
    confidencePercent = (job.transcription.flaggedWordCount / job.transcription.wordCount) * 100;
  }

  // Get audio quality score from file metadata (if available)
  let audioQualityScore: number | undefined;
  const audioFile = job.files[0];
  if (audioFile?.extractedData) {
    const metadata = audioFile.extractedData as Record<string, unknown>;
    audioQualityScore = metadata.qualityScore as number | undefined;
  }

  // Get duration from job
  const durationMinutes = job.audioDurationMinutes || 60; // Default to 60 minutes

  // Check if this is an agency account (has agencyId)
  const isAgencyAccount = !!job.agencyId;

  // Build input
  const input: RXEligibilityInput = {
    jobId,
    requestedByUserId,
    userRequested,
    adminOverride,
    audioQualityScore,
    confidencePercent,
    durationMinutes,
    isAgencyAccount,
  };

  // Evaluate eligibility
  const result = evaluateRXEligibility(input);

  // Log the decision
  await logRXEscalationDecision(input, result);

  return result;
}

// -----------------------------------------------------------------------------
// Request Admin Approval for RX
// -----------------------------------------------------------------------------

export async function requestRXAdminApproval(
  jobId: string,
  requestedByUserId: string,
  justification: string
): Promise<{ success: boolean; requestId: string }> {
  // Create an audit log entry for the approval request
  const log = await db.auditLog.create({
    data: {
      action: 'rx_admin_approval_requested',
      targetType: 'job',
      targetId: jobId,
      actorUserId: requestedByUserId,
      metadata: {
        justification,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      },
    },
  });

  // TODO: Send notification to admin
  // await sendAdminApprovalNotification(jobId, requestedByUserId, justification);

  console.log(`📨 RX Admin approval requested for job ${jobId}`);

  return {
    success: true,
    requestId: log.id,
  };
}

// -----------------------------------------------------------------------------
// Process Admin Approval Decision
// -----------------------------------------------------------------------------

export async function processRXAdminApproval(
  jobId: string,
  approvedByUserId: string,
  approved: boolean,
  notes?: string
): Promise<{ success: boolean }> {
  // Log the admin decision
  await db.auditLog.create({
    data: {
      action: approved ? 'rx_admin_approved' : 'rx_admin_denied',
      targetType: 'job',
      targetId: jobId,
      actorUserId: approvedByUserId,
      metadata: {
        approved,
        notes,
        decidedAt: new Date().toISOString(),
      },
    },
  });

  // If approved, update job to use RX
  if (approved) {
    await db.job.update({
      where: { id: jobId },
      data: {
        audioProcessingMode: 'MANUAL_RX',
        notes: `[RX Approved by Admin] ${notes || ''}`,
      },
    });
  }

  console.log(`✅ RX Admin decision: ${approved ? 'APPROVED' : 'DENIED'} for job ${jobId}`);

  return { success: true };
}

// =============================================================================
// RX ESCALATION RULES SERVICE
// Phase 6B: Audio Processing Governance
// =============================================================================
//
// Implements the RX escalation rules from the Authoritative Build Specification:
//
// RX MAY BE OFFERED WHEN (ANY true):
// - Reporter explicitly selects RX
// - Admin flags job
// - >25% of words <90% confidence
// - Audio flagged as: heavy reverb, cross-talk, whispering, severe background noise
//
// RX REQUIRES ADMIN APPROVAL WHEN:
// - Audio >180 minutes
// - Agency account
// - Multiple RX jobs requested same day
//
// RX MUST NOT BE OFFERED WHEN:
// - Automated confidence <10% flagged
// - Clean audio indicators present
// - Cost exceeds transcript value
// - Client has opted out
// =============================================================================

import { db } from '@/lib/db';

// Thresholds (configurable)
export const RX_THRESHOLDS = {
  // Confidence threshold for flagging (90%)
  CONFIDENCE_THRESHOLD: 0.90,
  // Percentage of words below threshold to trigger RX suggestion (25%)
  LOW_CONFIDENCE_PERCENTAGE: 0.25,
  // Percentage below which RX is NOT offered (10%)
  MIN_FLAGGED_PERCENTAGE: 0.10,
  // Duration requiring admin approval (180 minutes)
  ADMIN_APPROVAL_DURATION_MINUTES: 180,
  // Maximum RX jobs per day per user before approval required
  MAX_RX_JOBS_PER_DAY: 1,
  // RX flat fee in cents ($150)
  RX_FLAT_FEE_CENTS: 15000,
};

export interface RXEligibilityResult {
  isEligible: boolean;
  requiresApproval: boolean;
  reasons: string[];
  suggestions: string[];
  blockedReasons: string[];
}

export interface AudioQualityIndicators {
  averageConfidence: number;
  lowConfidencePercentage: number;
  hasHeavyReverb?: boolean;
  hasCrossTalk?: boolean;
  hasWhispering?: boolean;
  hasSevereBackgroundNoise?: boolean;
}

/**
 * Check if a job is eligible for RX forensic enhancement
 */
export async function checkRXEligibility(
  jobId: string,
  userId: string,
  audioQuality?: AudioQualityIndicators,
): Promise<RXEligibilityResult> {
  const result: RXEligibilityResult = {
    isEligible: false,
    requiresApproval: false,
    reasons: [],
    suggestions: [],
    blockedReasons: [],
  };

  // Fetch job details
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      firm: {
        include: {
          agency: true,
        },
      },
      transcription: true,
    },
  });

  if (!job) {
    result.blockedReasons.push('Job not found');
    return result;
  }

  // Check if job already has RX processing mode set
  if (job.audioProcessingMode === 'MANUAL_RX') {
    result.isEligible = true;
    result.reasons.push('Reporter explicitly selected RX');
    // Still need to check approval requirements
  }

  // Check audio quality indicators
  if (audioQuality) {
    // Block if confidence is very high (clean audio)
    if (audioQuality.lowConfidencePercentage < RX_THRESHOLDS.MIN_FLAGGED_PERCENTAGE) {
      result.blockedReasons.push('Audio quality is good - RX not recommended');
    }

    // Suggest RX if >25% low confidence
    if (audioQuality.lowConfidencePercentage > RX_THRESHOLDS.LOW_CONFIDENCE_PERCENTAGE) {
      result.isEligible = true;
      result.reasons.push(`${(audioQuality.lowConfidencePercentage * 100).toFixed(1)}% of words have low confidence`);
    }

    // Check for specific audio issues
    if (audioQuality.hasHeavyReverb) {
      result.isEligible = true;
      result.suggestions.push('Heavy reverb detected');
    }
    if (audioQuality.hasCrossTalk) {
      result.isEligible = true;
      result.suggestions.push('Cross-talk detected');
    }
    if (audioQuality.hasWhispering) {
      result.isEligible = true;
      result.suggestions.push('Whispered speech detected');
    }
    if (audioQuality.hasSevereBackgroundNoise) {
      result.isEligible = true;
      result.suggestions.push('Severe background noise detected');
    }
  }

  // If blocked, return early
  if (result.blockedReasons.length > 0 && !result.isEligible) {
    return result;
  }

  // =========================================================================
  // Check if admin approval is required
  // =========================================================================

  // Check duration
  if (job.audioDurationMinutes && job.audioDurationMinutes > RX_THRESHOLDS.ADMIN_APPROVAL_DURATION_MINUTES) {
    result.requiresApproval = true;
    result.reasons.push(`Audio exceeds ${RX_THRESHOLDS.ADMIN_APPROVAL_DURATION_MINUTES} minutes - admin approval required`);
  }

  // Check if agency account (firm has agencyId)
  if (job.firm?.agencyId) {
    result.requiresApproval = true;
    result.reasons.push('Agency account - admin approval required');
  }

  // Check for multiple RX jobs today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const rxJobsToday = await db.job.count({
    where: {
      createdById: userId,
      audioProcessingMode: 'MANUAL_RX',
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
      id: { not: jobId }, // Exclude current job
    },
  });

  if (rxJobsToday >= RX_THRESHOLDS.MAX_RX_JOBS_PER_DAY) {
    result.requiresApproval = true;
    result.reasons.push(`${rxJobsToday + 1} RX jobs requested today - admin approval required`);
  }

  // Set final eligibility
  if (result.reasons.length > 0 || result.suggestions.length > 0) {
    result.isEligible = true;
  }

  return result;
}

/**
 * Analyze transcription for audio quality indicators
 */
export function analyzeAudioQuality(transcription: {
  words?: { confidence: number }[];
  averageConfidence?: number;
  flaggedWordCount?: number;
  wordCount?: number;
}): AudioQualityIndicators {
  const words = transcription.words || [];
  const totalWords = words.length || transcription.wordCount || 0;
  
  let lowConfidenceCount = 0;
  let totalConfidence = 0;

  for (const word of words) {
    totalConfidence += word.confidence;
    if (word.confidence < RX_THRESHOLDS.CONFIDENCE_THRESHOLD) {
      lowConfidenceCount++;
    }
  }

  const averageConfidence = totalWords > 0 
    ? totalConfidence / totalWords 
    : transcription.averageConfidence || 0;

  const lowConfidencePercentage = totalWords > 0 
    ? lowConfidenceCount / totalWords 
    : (transcription.flaggedWordCount || 0) / (transcription.wordCount || 1);

  return {
    averageConfidence,
    lowConfidencePercentage,
    // Audio issue detection would require additional analysis
    // These are placeholders for future implementation
    hasHeavyReverb: false,
    hasCrossTalk: false,
    hasWhispering: false,
    hasSevereBackgroundNoise: false,
  };
}

/**
 * Calculate estimated RX cost
 */
export function calculateRXCost(fileCount: number = 1): {
  totalCents: number;
  formatted: string;
  breakdown: { description: string; amountCents: number }[];
} {
  const totalCents = fileCount * RX_THRESHOLDS.RX_FLAT_FEE_CENTS;
  
  return {
    totalCents,
    formatted: `$${(totalCents / 100).toFixed(2)}`,
    breakdown: [
      {
        description: `Manual Forensic Enhancement (${fileCount} file${fileCount > 1 ? 's' : ''})`,
        amountCents: totalCents,
      },
    ],
  };
}

/**
 * Internal RX Checklist (for operators)
 */
export const RX_OPERATOR_CHECKLIST = [
  { step: 1, task: 'Voice De-noise', description: 'Apply noise reduction to isolate voices' },
  { step: 2, task: 'Dialogue Isolate', description: 'Separate overlapping speakers' },
  { step: 3, task: 'De-reverb', description: 'Remove room echo and reverb' },
  { step: 4, task: 'Spectral Repair', description: 'Fix specific frequency issues (as needed)' },
  { step: 5, task: 'Level Normalization', description: 'Balance audio levels across speakers' },
  { step: 6, task: 'Quality Check', description: 'Verify improvement, log results' },
];

/**
 * Log RX decision for audit trail
 */
export async function logRXDecision(
  jobId: string,
  decision: 'offered' | 'accepted' | 'declined' | 'blocked' | 'approved' | 'denied',
  reason: string,
  userId: string,
): Promise<void> {
  // Log to audit system
  await db.auditLog.create({
    data: {
      action: `RX_${decision.toUpperCase()}`,
      targetType: 'JOB',
      targetId: jobId,
      actorUserId: userId,
      metadata: {
        decision,
        reason,
        timestamp: new Date().toISOString(),
      },
    },
  });
}

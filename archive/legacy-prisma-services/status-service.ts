// =============================================================================
// TRANSCRIPT STATUS SERVICE
// lib/transcripts/status-service.ts
//
// Phase 3B-1: State machine for transcript lifecycle
// =============================================================================

import type { UserRole } from '@/types/database';
import { createVersion } from '@/lib/_future/transcripts/version-service';

export type TranscriptStatus = 'DRAFT' | 'IN_REVIEW' | 'FINALIZED' | 'DELIVERED';

/**
 * Valid state transitions
 * Maps current status to allowed next statuses
 */
export const VALID_TRANSITIONS: Record<TranscriptStatus, TranscriptStatus[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['DRAFT', 'FINALIZED'],
  FINALIZED: ['IN_REVIEW', 'DELIVERED'], // IN_REVIEW requires ADMIN
  DELIVERED: [], // Terminal state
};

export interface TransitionResult {
  success: boolean;
  error?: string;
}

/**
 * Transition transcript to a new status
 * Enforces state machine rules and role permissions
 */
export async function transitionStatus(
  transcriptId: string,
  newStatus: TranscriptStatus,
  userId: string,
  userRole: UserRole,
  reason?: string
): Promise<TransitionResult> {
  // Get current transcript
  const transcript = await db.transcription.findUnique({
    where: { id: transcriptId },
    select: { status: true, jobId: true },
  });

  if (!transcript) {
    return { success: false, error: 'Transcript not found' };
  }

  // Map TranscriptionStatus to our TranscriptStatus
  const currentStatus = mapToTranscriptStatus(transcript.status);

  // Check if transition is valid
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  // Role-based permission checks
  if (newStatus === 'FINALIZED' && currentStatus === 'IN_REVIEW') {
    // Only SCOPIST or ADMIN can finalize from IN_REVIEW
    if (userRole !== 'SCOPIST' && userRole !== 'ADMIN') {
      return {
        success: false,
        error: 'Only scopists and admins can finalize transcripts',
      };
    }
  }

  if (newStatus === 'IN_REVIEW' && currentStatus === 'FINALIZED') {
    // Only ADMIN can unlock finalized transcripts
    if (userRole !== 'ADMIN') {
      return {
        success: false,
        error: 'Only admins can unlock finalized transcripts',
      };
    }
    if (!reason) {
      return {
        success: false,
        error: 'Reason required when unlocking finalized transcript',
      };
    }
  }

  // Perform transition in transaction with audit log
  try {
    await db.$transaction(async (tx) => {
      // Update transcript status
      // Note: Using COMPLETED as a proxy for FINALIZED until schema is updated
      await tx.transcription.update({
        where: { id: transcriptId },
        data: {
          status: mapToTranscriptionStatus(newStatus) as any, // Type assertion needed until schema updated
          updatedAt: new Date(),
        },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          action: 'TRANSCRIPT_STATUS_CHANGED',
          targetType: 'Transcription',
          targetId: transcriptId,
          actorUserId: userId,
          metadata: {
            previousStatus: currentStatus,
            newStatus,
            reason: reason || undefined,
          },
        },
      });

      // Phase 4B-1: Create version snapshot at key lifecycle points
      if (newStatus === 'FINALIZED') {
        try {
          await createVersion(transcriptId, 'final', userId, {
            reason: reason || 'Finalized',
          });
        } catch (error) {
          // Log but don't fail the transaction
          console.error('Failed to create version snapshot:', error);
        }
      } else if (newStatus === 'IN_REVIEW' && currentStatus === 'DRAFT') {
        try {
          await createVersion(transcriptId, 'post_ai', userId, {
            reason: 'Moved to review',
          });
        } catch (error) {
          console.error('Failed to create version snapshot:', error);
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error transitioning transcript status:', error);
    return {
      success: false,
      error: 'Failed to update transcript status',
    };
  }
}

/**
 * Map Prisma TranscriptionStatus to our TranscriptStatus
 * Note: This is a temporary mapping until schema is updated
 */
function mapToTranscriptStatus(status: string): TranscriptStatus {
  // Map existing statuses to our new status model
  if (status === 'PENDING' || status === 'PROCESSING') {
    return 'DRAFT';
  }
  if (status === 'COMPLETED') {
    // For now, assume COMPLETED means ready for review
    // In the future, we'll have explicit status fields
    return 'IN_REVIEW';
  }
  // Default to DRAFT if unknown
  return 'DRAFT';
}

/**
 * Map our TranscriptStatus to Prisma TranscriptionStatus
 * Note: This is a temporary mapping until schema is updated with new status enum
 */
function mapToTranscriptionStatus(status: TranscriptStatus): string {
  // Temporary mapping - in future, TranscriptionStatus enum should include:
  // DRAFT, IN_REVIEW, FINALIZED, DELIVERED
  if (status === 'FINALIZED' || status === 'DELIVERED') {
    return 'COMPLETED';
  }
  if (status === 'IN_REVIEW') {
    return 'COMPLETED'; // Use COMPLETED to indicate ready for review
  }
  return 'PENDING';
}

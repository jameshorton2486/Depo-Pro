// =============================================================================
// TRANSCRIPT LOCK SERVICE
// lib/transcripts/lock-service.ts
//
// Phase 3B-5: Locking enforcement for finalized transcripts
// =============================================================================

import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { mapToTranscriptStatus } from './status-service';

export interface LockCheckResult {
  allowed: boolean;
  reason?: string;
  isLocked: boolean;
  currentStatus?: string;
}

/**
 * Check if a user can edit a transcript
 * Phase 3B-5: Hard lock on FINALIZED status
 */
export async function canEditTranscript(
  transcriptId: string,
  userId: string,
  userRole: UserRole
): Promise<LockCheckResult> {
  const transcript = await db.transcription.findUnique({
    where: { id: transcriptId },
    select: {
      status: true,
      lockedAt: true,
      lockedBy: true,
      lockReason: true,
    },
  });

  if (!transcript) {
    return {
      allowed: false,
      reason: 'Transcript not found',
      isLocked: false,
    };
  }

  const currentStatus = mapToTranscriptStatus(transcript.status);

  // FINALIZED = hard lock for all except ADMIN
  if (currentStatus === 'FINALIZED' || currentStatus === 'DELIVERED') {
    if (userRole === 'ADMIN') {
      return {
        allowed: true, // Admin can always edit, will be logged
        isLocked: true,
        currentStatus,
      };
    }
    return {
      allowed: false,
      reason: 'Transcript is finalized and locked',
      isLocked: true,
      currentStatus,
    };
  }

  // Check explicit lock fields
  if (transcript.lockedAt && transcript.lockedBy) {
    if (userRole === 'ADMIN' || transcript.lockedBy === userId) {
      return {
        allowed: true,
        isLocked: true,
        currentStatus,
      };
    }
    return {
      allowed: false,
      reason: transcript.lockReason || 'Transcript is locked',
      isLocked: true,
      currentStatus,
    };
  }

  return {
    allowed: true,
    isLocked: false,
    currentStatus,
  };
}

/**
 * Unlock a finalized transcript (Admin only)
 * Phase 3B-5: Creates audit trail
 */
export async function unlockTranscript(
  transcriptId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      // Update transcript status to IN_REVIEW
      await tx.transcription.update({
        where: { id: transcriptId },
        data: {
          status: 'COMPLETED' as any, // Maps to IN_REVIEW
          lockedAt: null,
          lockedBy: null,
          lockReason: null,
          updatedAt: new Date(),
        },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          action: 'TRANSCRIPT_UNLOCKED',
          targetType: 'Transcription',
          targetId: transcriptId,
          actorUserId: adminId,
          metadata: {
            reason,
            previousStatus: 'FINALIZED',
            newStatus: 'IN_REVIEW',
          },
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error unlocking transcript:', error);
    return {
      success: false,
      error: 'Failed to unlock transcript',
    };
  }
}

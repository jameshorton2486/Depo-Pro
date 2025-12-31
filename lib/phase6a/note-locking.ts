// =============================================================================
// DEPOSITION NOTE LOCKING SERVICE - Phase 6A
// Auto-locks notes when transcript is finalized
// =============================================================================

import { db } from '@/lib/db';
import { JobStatus } from '@prisma/client';

/**
 * Lock all notes for a job when transcript is finalized
 * Called automatically when Job.status changes to COMPLETED or REVIEW_COMPLETE
 */
export async function lockNotesForJob(
  jobId: string,
  lockedBy: string
): Promise<{ lockedCount: number }> {
  // Check if job is in a finalized state
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const isFinalized = job.status === JobStatus.COMPLETED || job.status === JobStatus.REVIEW_COMPLETE;

  if (!isFinalized) {
    // Job is not finalized, no need to lock
    return { lockedCount: 0 };
  }

  // Lock all unlocked notes for this job
  const result = await db.depositionNote.updateMany({
    where: {
      jobId,
      isLocked: false,
    },
    data: {
      isLocked: true,
      lockedAt: new Date(),
      lockedBy,
    },
  });

  return { lockedCount: result.count };
}

/**
 * Unlock notes for a job (admin only - for corrections)
 * This should be used rarely, only when transcript needs to be reopened
 */
export async function unlockNotesForJob(
  jobId: string,
  _unlockedBy: string
): Promise<{ unlockedCount: number }> {
  const result = await db.depositionNote.updateMany({
    where: {
      jobId,
      isLocked: true,
    },
    data: {
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
    },
  });

  return { unlockedCount: result.count };
}
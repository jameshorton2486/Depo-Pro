/**
 * Transcript Immutability Enforcement
 * 
 * This module provides utilities to enforce transcript locking at the API level.
 * 
 * NOTE: Current implementation uses API-level enforcement. Future enhancements
 * may include DB-level constraints or Prisma middleware, but the current
 * approach is correct for this phase.
 * 
 * Usage:
 *   import { requireUnlocked, lockJob } from '@/lib/transcript-lock';
 *   await requireUnlocked(jobId); // Throws if locked
 *   await lockJob(jobId, userId);
 */


export interface LockInfo {
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
}

/**
 * Check if a job/transcript is locked
 */
export async function checkJobLock(jobId: string): Promise<LockInfo> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { lockedBy: true, lockedAt: true },
  });
  
  if (!job) {
    throw new Error('Job not found');
  }
  
  return {
    isLocked: !!job.lockedBy,
    lockedBy: job.lockedBy,
    lockedAt: job.lockedAt,
  };
}

/**
 * Enforce that a job is not locked before allowing modifications
 * Throws error if locked
 */
export async function requireUnlocked(jobId: string): Promise<void> {
  const lock = await checkJobLock(jobId);
  
  if (lock.isLocked) {
    throw new Error(
      `This job is locked and cannot be modified. ` +
      `Locked by: ${lock.lockedBy} at ${lock.lockedAt?.toISOString()}`
    );
  }
}

/**
 * Lock a job to prevent further modifications
 */
export async function lockJob(jobId: string, userId: string): Promise<void> {
  await db.job.update({
    where: { id: jobId },
    data: {
      lockedBy: userId,
      lockedAt: new Date(),
    },
  });
}

/**
 * Unlock a job (admin only typically)
 */
export async function unlockJob(jobId: string): Promise<void> {
  await db.job.update({
    where: { id: jobId },
    data: {
      lockedBy: null,
      lockedAt: null,
    },
  });
}

/**
 * Wrapper for operations that should check lock first
 */
export async function withLockCheck<T>(
  jobId: string,
  operation: () => Promise<T>
): Promise<T> {
  await requireUnlocked(jobId);
  return operation();
}


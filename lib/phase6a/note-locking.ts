/**
 * Note Locking Service
 * Locks deposition notes when jobs are completed
 */

export interface NoteLockResult {
  success: boolean;
  lockedCount: number;
  error?: string;
}

/**
 * Lock all notes for a job
 */
export async function lockNotesForJob(jobId: string, _userId?: string): Promise<NoteLockResult> {
  console.log('[NoteLocking] lockNotesForJob called - stub', { jobId });
  return {
    success: true,
    lockedCount: 0,
  };
}

/**
 * Unlock notes for a job (admin only)
 */
export async function unlockNotesForJob(jobId: string, adminUserId: string): Promise<NoteLockResult> {
  console.log('[NoteLocking] unlockNotesForJob called - stub', { jobId, adminUserId });
  return {
    success: true,
    lockedCount: 0,
  };
}

/**
 * Check if notes are locked for a job
 */
export async function areNotesLocked(jobId: string): Promise<boolean> {
  console.log('[NoteLocking] areNotesLocked called - stub', { jobId });
  return false;
}

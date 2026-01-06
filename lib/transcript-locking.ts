/**
 * Transcript Locking Service
 */

export interface LockStatus {
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  reason?: string;
}

export interface EditPermission {
  canEdit: boolean;
  allowed: boolean;
  reason?: string;
}

const LOCKED_STATUSES = ['FINALIZED', 'ARCHIVED', 'COMPLETED'];

/**
 * Get lock status for a transcript
 */
export function getLockStatus(status: string): LockStatus {
  return {
    isLocked: LOCKED_STATUSES.includes(status),
    reason: LOCKED_STATUSES.includes(status) ? `Transcript is ${status.toLowerCase()}` : undefined,
  };
}

/**
 * Check if transcript is locked
 */
export function isTranscriptLocked(status: string): boolean {
  return LOCKED_STATUSES.includes(status);
}

/**
 * Check edit permission for a transcript
 */
export function checkEditPermission(status: string, userRole: string): EditPermission {
  const isLocked = LOCKED_STATUSES.includes(status);
  
  // Admins can edit locked transcripts
  if (userRole === 'ADMIN') {
    return { canEdit: true, allowed: true };
  }
  
  if (isLocked) {
    return {
      canEdit: false,
      allowed: false,
      reason: `Transcript is ${status.toLowerCase()} and cannot be edited`,
    };
  }
  
  return { canEdit: true, allowed: true };
}

/**
 * Transition transcript status
 */
export async function transitionTranscriptStatus(
  transcriptId: string,
  newStatus: string,
  userRole: string,
  _reason?: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[TranscriptLocking] transitionTranscriptStatus', {
    transcriptId,
    newStatus,
    userRole,
  });
  
  return { success: true };
}

/**
 * Transcript Locking Service
 * Manages immutability enforcement for legal transcripts
 *
 * Once a transcript is locked:
 * - Base text cannot be modified
 * - All changes stored in TranscriptionEdit table
 * - Original preserved for legal compliance
 *
 * @module lib/transcript-locking
 */


// ============================================
// TYPES
// ============================================

export type LockReason =
  | 'ai_complete'
  | 'manual'
  | 'export'
  | 'scopist_complete'
  | 'final_review';

export interface LockResult {
  success: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  lockReason: string | null;
  error?: string;
}

export interface LockStatus {
  isLocked: boolean;
  reason: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  canUnlock: boolean;
  unlockRequiresAdmin: boolean;
}

export interface TranscriptionLockInfo {
  id?: string;
  lockedAt?: Date | null;
  lockedBy?: string | null;
  lockReason?: string | null;
  status?: string;
}

// ============================================
// LOCK STATUS FUNCTIONS
// ============================================

/**
 * Check if a transcription is locked for editing
 * A transcript is locked if:
 * 1. It has an explicit lockedAt timestamp
 * 2. Its status indicates completion (COMPLETED, ERROR, CANCELLED)
 *
 * @param transcription - Transcription object with lock fields
 * @returns true if transcript is locked
 */
export function isTranscriptLocked(transcription: TranscriptionLockInfo): boolean {
  // Explicitly locked
  if (transcription.lockedAt) {
    return true;
  }

  // Implicitly locked by terminal status
  const terminalStatuses = ['COMPLETED', 'ERROR', 'CANCELLED'];
  if (transcription.status && terminalStatuses.includes(transcription.status)) {
    return true;
  }

  return false;
}

/**
 * Check if transcript is editable (inverse of locked)
 * @param transcription - Transcription object with lock fields
 * @returns true if transcript can be edited
 */
export function isTranscriptEditable(transcription: TranscriptionLockInfo): boolean {
  return !isTranscriptLocked(transcription);
}

/**
 * Get detailed lock status for UI display and decision making
 * @param transcription - Transcription object with lock fields
 * @returns Detailed lock status object
 */
export function getLockStatus(transcription: TranscriptionLockInfo): LockStatus {
  const isLocked = isTranscriptLocked(transcription);

  // Determine the reason for the lock
  let reason: string | null = null;
  if (transcription.lockedAt) {
    reason = transcription.lockReason || 'Manually locked';
  } else if (isLocked && transcription.status) {
    reason = `Status: ${transcription.status}`;
  }

  // Determine if this lock can be removed
  // Only manual locks can be removed by the user who set them
  // System locks (ai_complete, export) require admin
  const canUnlock = transcription.lockReason === 'manual';
  const unlockRequiresAdmin = isLocked && !canUnlock;

  return {
    isLocked,
    reason,
    lockedAt: transcription.lockedAt || null,
    lockedBy: transcription.lockedBy || null,
    canUnlock,
    unlockRequiresAdmin,
  };
}

/**
 * Get human-readable lock status message
 * @param transcription - Transcription object with lock fields
 * @returns Human-readable status string
 */
export function getLockStatusMessage(transcription: TranscriptionLockInfo): string {
  const status = getLockStatus(transcription);

  if (!status.isLocked) {
    return 'Transcript is editable';
  }

  if (status.reason === 'ai_complete') {
    return 'Transcript locked after AI processing. Edits are tracked separately.';
  }

  if (status.reason === 'export') {
    return 'Transcript locked for export. Contact admin to unlock.';
  }

  if (status.reason === 'scopist_complete') {
    return 'Transcript locked after scopist review completion.';
  }

  if (status.reason === 'manual') {
    return `Transcript manually locked${status.lockedBy ? ` by ${status.lockedBy}` : ''}.`;
  }

  if (status.reason?.startsWith('Status:')) {
    return `Transcript is in ${transcription.status} status and cannot be edited.`;
  }

  return 'Transcript is locked and cannot be edited.';
}

// ============================================
// LOCK OPERATIONS
// ============================================

/**
 * Lock a transcription (idempotent - safe to call multiple times)
 * @param transcriptionId - ID of the transcription to lock
 * @param lockedBy - User ID or "system"
 * @param reason - Reason for locking
 * @returns Lock result object
 */
export async function lockTranscript(
  transcriptionId: string,
  lockedBy: string,
  reason: LockReason
): Promise<LockResult> {
  try {
    // Check if transcription exists and get current lock status
    const existing = await prisma.transcription.findUnique({
      where: { id: transcriptionId },
      select: {
        id: true,
        lockedAt: true,
        lockedBy: true,
        lockReason: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        lockedAt: null,
        lockedBy: null,
        lockReason: null,
        error: 'Transcription not found',
      };
    }

    // Already locked - idempotent success
    if (existing.lockedAt) {
      console.log(
        `Transcript ${transcriptionId} already locked at ${existing.lockedAt}`
      );
      return {
        success: true,
        lockedAt: existing.lockedAt,
        lockedBy: existing.lockedBy,
        lockReason: existing.lockReason,
      };
    }

    // Apply the lock
    const updated = await prisma.transcription.update({
      where: { id: transcriptionId },
      data: {
        lockedAt: new Date(),
        lockedBy,
        lockReason: reason,
      },
      select: {
        lockedAt: true,
        lockedBy: true,
        lockReason: true,
      },
    });

    console.log(
      `Transcript ${transcriptionId} locked by ${lockedBy} (reason: ${reason})`
    );

    return {
      success: true,
      lockedAt: updated.lockedAt,
      lockedBy: updated.lockedBy,
      lockReason: updated.lockReason,
    };
  } catch (error) {
    console.error('Failed to lock transcript:', error);
    return {
      success: false,
      lockedAt: null,
      lockedBy: null,
      lockReason: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unlock a transcription (restricted - only manual locks by authorized users)
 * @param transcriptionId - ID of the transcription to unlock
 * @param unlockedBy - User ID requesting unlock
 * @param isAdmin - Whether the user has admin privileges
 * @returns Lock result object
 */
export async function unlockTranscript(
  transcriptionId: string,
  unlockedBy: string,
  isAdmin: boolean = false
): Promise<LockResult> {
  try {
    const existing = await prisma.transcription.findUnique({
      where: { id: transcriptionId },
      select: {
        id: true,
        lockedAt: true,
        lockedBy: true,
        lockReason: true,
        status: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        lockedAt: null,
        lockedBy: null,
        lockReason: null,
        error: 'Transcription not found',
      };
    }

    // Not locked - already successful
    if (!existing.lockedAt) {
      return {
        success: true,
        lockedAt: null,
        lockedBy: null,
        lockReason: null,
      };
    }

    // Check if unlock is allowed
    const canUnlock =
      isAdmin || // Admins can always unlock
      (existing.lockReason === 'manual' && existing.lockedBy === unlockedBy); // Users can unlock their own manual locks

    if (!canUnlock) {
      const reason =
        existing.lockReason === 'manual'
          ? 'Only the user who locked this transcript can unlock it'
          : 'System locks can only be removed by an administrator';

      return {
        success: false,
        lockedAt: existing.lockedAt,
        lockedBy: existing.lockedBy,
        lockReason: existing.lockReason,
        error: reason,
      };
    }

    // Terminal status cannot be unlocked even by admin
    const terminalStatuses = ['COMPLETED', 'ERROR', 'CANCELLED'];
    if (terminalStatuses.includes(existing.status || '')) {
      return {
        success: false,
        lockedAt: existing.lockedAt,
        lockedBy: existing.lockedBy,
        lockReason: existing.lockReason,
        error: `Cannot unlock transcript in ${existing.status} status`,
      };
    }

    // Apply the unlock
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: {
        lockedAt: null,
        lockedBy: null,
        lockReason: null,
      },
    });

    console.log(`Transcript ${transcriptionId} unlocked by ${unlockedBy}`);

    return {
      success: true,
      lockedAt: null,
      lockedBy: null,
      lockReason: null,
    };
  } catch (error) {
    console.error('Failed to unlock transcript:', error);
    return {
      success: false,
      lockedAt: null,
      lockedBy: null,
      lockReason: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// GUARD FUNCTIONS (for API routes)
// ============================================

/**
 * API guard that returns an error response if transcript is locked
 * Use in API route handlers before allowing modifications
 *
 * @param transcription - Transcription object with lock fields
 * @returns null if editable, error response object if locked
 */
export function guardTranscriptEdit(
  transcription: TranscriptionLockInfo
): { error: string; code: string; details: LockStatus } | null {
  if (isTranscriptEditable(transcription)) {
    return null;
  }

  const status = getLockStatus(transcription);

  return {
    error: 'Transcript is locked',
    code: 'TRANSCRIPT_LOCKED',
    details: status,
  };
}

/**
 * Throw an error if transcript is locked (for use in services)
 * @param transcription - Transcription object with lock fields
 * @throws Error if transcript is locked
 */
export function assertTranscriptEditable(
  transcription: TranscriptionLockInfo
): void {
  if (!isTranscriptEditable(transcription)) {
    const message = getLockStatusMessage(transcription);
    throw new Error(message);
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Lock multiple transcripts at once (for bulk operations)
 * @param transcriptionIds - Array of transcription IDs
 * @param lockedBy - User ID or "system"
 * @param reason - Reason for locking
 * @returns Object with results for each ID
 */
export async function lockTranscriptsBatch(
  transcriptionIds: string[],
  lockedBy: string,
  reason: LockReason
): Promise<Record<string, LockResult>> {
  const results: Record<string, LockResult> = {};

  // Use Promise.allSettled to handle partial failures
  const operations = transcriptionIds.map(async (id) => {
    const result = await lockTranscript(id, lockedBy, reason);
    results[id] = result;
    return result;
  });

  await Promise.allSettled(operations);

  return results;
}

/**
 * Get lock status for multiple transcripts
 * @param transcriptions - Array of transcription objects
 * @returns Array of lock status objects with IDs
 */
export function getLockStatusBatch(
  transcriptions: Array<TranscriptionLockInfo & { id: string }>
): Array<LockStatus & { id: string }> {
  return transcriptions.map((t) => ({
    id: t.id,
    ...getLockStatus(t),
  }));
}

// ============================================
// PRISMA SCHEMA ADDITIONS (for reference)
// ============================================

/**
 * Add these fields to your Transcription model in prisma/schema.prisma:
 *
 * model Transcription {
 *   // ... existing fields ...
 *
 *   // Locking fields
 *   lockedAt    DateTime?  // When transcript was locked
 *   lockedBy    String?    // User ID or "system"
 *   lockReason  String?    // "ai_complete", "manual", "export", etc.
 *
 *   // Add index for querying locked transcripts
 *   @@index([lockedAt])
 * }
 *
 * Then run:
 * npx prisma migrate dev --name add_transcript_locking
 */

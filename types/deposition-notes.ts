// =============================================================================
// types/deposition-notes.ts
// Type definitions for Live Deposition Notes
// =============================================================================

/**
 * DepositionNote as returned from API
 */
export interface DepositionNote {
  id: string;
  jobId: string;
  reporterId: string;
  content: string;
  audioTimestamp: number | null;
  noteCategory: string | null;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Request body for creating a note
 */
export interface CreateNoteRequest {
  content: string;
  audioTimestamp?: number | null;
  noteCategory?: string | null;
}

/**
 * Request body for updating a note
 */
export interface UpdateNoteRequest {
  content?: string;
  audioTimestamp?: number | null;
  noteCategory?: string | null;
}

/**
 * Response from GET /api/jobs/[id]/notes
 */
export interface NotesListResponse {
  notes: DepositionNote[];
  meta: {
    total: number;
    jobStatus: string;
    isJobFinalized: boolean;
  };
}

/**
 * Response from GET /api/jobs/[id]/notes/[noteId]
 */
export interface NoteResponse {
  note: DepositionNote;
}

/**
 * Response from POST /api/jobs/[id]/notes
 */
export interface CreateNoteResponse {
  note: DepositionNote;
  message: string;
}

/**
 * Response from PATCH /api/jobs/[id]/notes/[noteId]
 */
export interface UpdateNoteResponse {
  note: DepositionNote;
  message: string;
}

/**
 * Response from DELETE /api/jobs/[id]/notes/[noteId]
 */
export interface DeleteNoteResponse {
  message: string;
}

/**
 * Response from GET /api/jobs/[id]/notes/lock
 */
export interface LockStatusResponse {
  jobId: string;
  jobStatus: string;
  isJobFinalized: boolean;
  totalNotes: number;
  lockedNotes: number;
  unlockedNotes: number;
  effectivelyLocked: boolean;
}

/**
 * Response from POST /api/jobs/[id]/notes/lock
 */
export interface LockNotesResponse {
  message: string;
  lockedCount: number;
}

/**
 * Common note categories (not enforced, just suggestions)
 */
export const NOTE_CATEGORIES = [
  'spelling',
  'exhibit',
  'off-record',
  'on-record',
  'speaker',
  'clarification',
  'technical',
  'break',
  'recess',
  'stipulation',
  'objection',
  'other',
] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

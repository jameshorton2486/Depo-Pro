// lib/permissions/transcript-permissions.ts

export type TranscriptRole =
  | 'ADMIN'
  | 'COURT_REPORTER'
  | 'SCOPIST'
  | 'ATTORNEY';

export interface TranscriptAccessContext {
  role: TranscriptRole;
  isOwner: boolean;
  isAssignedScopist: boolean;
  isReadOnly: boolean;
}

/**
 * Determines whether a user may edit a transcript.
 * This function must be used server-side only.
 */
export function canEditTranscript(ctx: TranscriptAccessContext): boolean {
  if (ctx.isReadOnly) return false;

  if (ctx.role === 'ADMIN') return true;

  if (ctx.role === 'COURT_REPORTER' && ctx.isOwner) {
    return true;
  }

  if (ctx.role === 'SCOPIST' && ctx.isAssignedScopist) {
    return true;
  }

  return false;
}

/**
 * Determines whether a user may view a transcript.
 */
export function canViewTranscript(ctx: TranscriptAccessContext): boolean {
  if (ctx.role === 'ADMIN') return true;
  if (ctx.isOwner) return true;
  if (ctx.isAssignedScopist) return true;
  return false;
}

// =============================================================================
// CENTRAL PERMISSION HELPERS
// Authoritative server-side permission checks
// =============================================================================

import { UserRole } from '@prisma/client';

/**
 * Require user to have one of the allowed roles
 * Throws error if user doesn't have required role
 */
export function requireRole(userRole: UserRole, allowed: UserRole[]): void {
  if (!allowed.includes(userRole)) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Check if user has any of the allowed roles
 * Returns boolean instead of throwing
 */
export function requireAnyRole(userRole: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(userRole);
}

/**
 * Assert that transcript is editable (not finalized)
 * Checks Job status since Transcript doesn't have status field yet
 * TODO: Update to check Transcript.status when field is added
 */
export function assertEditableBeforeFinal(jobStatus?: string): void {
  if (jobStatus === 'COMPLETED' || jobStatus === 'REVIEW_COMPLETE') {
    throw new Error('TRANSCRIPT_FINALIZED');
  }
}

/**
 * Check if transcript is finalized
 * Returns boolean indicating if transcript is locked
 */
export function isTranscriptFinalized(jobStatus?: string): boolean {
  return jobStatus === 'COMPLETED' || jobStatus === 'REVIEW_COMPLETE';
}
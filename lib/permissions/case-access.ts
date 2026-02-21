/**
 * Case Access Permission Service
 *
 * Uses the same enforcement as api-guards (jobs-as-cases compatibility layer).
 * Throws typed permission errors for server-side callers.
 */

import {
  canAccessCase as canAccessCaseGuard,
  canEditCase as canEditCaseGuard,
  getCasePermissions as getCasePermissionsGuard,
  assertCaseAccess as assertCaseAccessGuard,
  requireAttorneyCaseAccess,
  requireExhibitUpload,
  requireReporterDepositionAccess,
} from '@/lib/permissions/api-guards';
import { logger } from '@/lib/logger';

export interface CasePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAnnotate: boolean;
  canUploadExhibit: boolean;
}

export interface PermissionError extends Error {
  code: string;
  statusCode: number;
}

export function createPermissionError(code: string, message: string): PermissionError {
  const error = new Error(message) as PermissionError;
  error.code = code;
  error.statusCode = 403;
  return error;
}

/**
 * Check if user can access a case.
 */
export async function canAccessCase(userId: string, caseId: string): Promise<boolean> {
  return canAccessCaseGuard(userId, caseId);
}

/**
 * Check if user can edit a case.
 */
export async function canEditCase(userId: string, caseId: string): Promise<boolean> {
  return canEditCaseGuard(userId, caseId);
}

/**
 * Get all permissions for a user on a case.
 */
export async function getCasePermissions(userId: string, caseId: string): Promise<CasePermissions> {
  return getCasePermissionsGuard(userId, caseId);
}

/**
 * Assert user has case access (throws on failure).
 */
export async function assertCaseAccess(
  userId: string,
  caseId: string,
  action?: keyof CasePermissions
): Promise<void> {
  if (!action) {
    await assertCaseAccessGuard(userId, caseId);
    return;
  }

  const permissions = await getCasePermissions(userId, caseId);
  const isAllowed = permissions[action];
  if (!isAllowed) {
    throw createPermissionError('ACCESS_DENIED', `Missing "${action}" permission for case`);
  }
}

/**
 * Assert attorney has case access.
 */
export async function assertAttorneyCaseAccess(userId: string, caseId: string): Promise<void> {
  const result = await requireAttorneyCaseAccess(userId, caseId);
  if (result !== true) {
    throw createPermissionError('ACCESS_DENIED', 'Attorney does not have access to this case');
  }
}

/**
 * Assert reporter has deposition access.
 * Uses jobs table — real implementation.
 */
export async function assertReporterDepositionAccess(userId: string, jobId: string): Promise<void> {
  const result = await requireReporterDepositionAccess(userId, jobId);
  if (result !== true) {
    throw createPermissionError('ACCESS_DENIED', 'Reporter does not have access to this deposition');
  }
}

/**
 * Assert user can upload exhibit.
 */
export async function assertCanUploadExhibit(userId: string, caseId: string): Promise<void> {
  const result = await requireExhibitUpload(userId, caseId);
  if (result !== true) {
    throw createPermissionError('ACCESS_DENIED', 'User cannot upload exhibits for this case');
  }
}

/**
 * Assert user can annotate transcript.
 * Stub — transcript_access table does not exist yet.
 */
export async function assertCanAnnotateTranscript(userId: string, transcriptId: string): Promise<void> {
  logger.warn('[case-access] assertCanAnnotateTranscript is a stub — implement in Phase 1', { userId, transcriptId });
}

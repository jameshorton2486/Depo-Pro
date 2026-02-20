/**
 * Case Access Permission Service
 *
 * PHASE 0 NOTE: Queries for case_memberships, case_attorneys, and
 * transcript_access tables are stubbed — these tables do not exist yet.
 * They will be implemented in Phase 1 (multi-tenant schema migration).
 *
 * All stubs log warnings so they are visible in server logs.
 */

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
 * Stub — implement real check in Phase 1 against case_memberships table.
 */
export async function canAccessCase(userId: string, caseId: string): Promise<boolean> {
  logger.warn('[case-access] canAccessCase is a stub — implement in Phase 1', { userId, caseId });
  return true;
}

/**
 * Check if user can edit a case.
 * Stub — implement real check in Phase 1.
 */
export async function canEditCase(userId: string, caseId: string): Promise<boolean> {
  logger.warn('[case-access] canEditCase is a stub — implement in Phase 1', { userId, caseId });
  return true;
}

/**
 * Get all permissions for a user on a case.
 * Stub — case_memberships table does not exist yet.
 */
export async function getCasePermissions(userId: string, caseId: string): Promise<CasePermissions> {
  logger.warn('[case-access] getCasePermissions is a stub — implement in Phase 1', { userId, caseId });
  return {
    canView: true,
    canEdit: true,
    canDelete: false,
    canAnnotate: true,
    canUploadExhibit: true,
  };
}

/**
 * Assert user has case access (throws on failure).
 * Stub — implement in Phase 1.
 */
export async function assertCaseAccess(
  userId: string,
  caseId: string,
  action?: keyof CasePermissions
): Promise<void> {
  logger.warn('[case-access] assertCaseAccess is a stub', { userId, caseId, action });
}

/**
 * Assert attorney has case access.
 * Stub — case_attorneys table does not exist yet.
 */
export async function assertAttorneyCaseAccess(userId: string, caseId: string): Promise<void> {
  logger.warn('[case-access] assertAttorneyCaseAccess is a stub — implement in Phase 1', { userId, caseId });
}

/**
 * Assert reporter has deposition access.
 * Uses jobs table — real implementation.
 */
export async function assertReporterDepositionAccess(userId: string, jobId: string): Promise<void> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();

  const { data: job } = await supabase
    .from('jobs')
    .select('id, created_by_id, assigned_to_id')
    .eq('id', jobId)
    .single();

  if (!job) {
    throw createPermissionError('NOT_FOUND', 'Job not found');
  }

  if (job.created_by_id !== userId && job.assigned_to_id !== userId) {
    throw createPermissionError('ACCESS_DENIED', 'Reporter does not have access to this job');
  }
}

/**
 * Assert user can upload exhibit.
 * Stub — implement in Phase 1.
 */
export async function assertCanUploadExhibit(userId: string, caseId: string): Promise<void> {
  logger.warn('[case-access] assertCanUploadExhibit is a stub', { userId, caseId });
}

/**
 * Assert user can annotate transcript.
 * Stub — transcript_access table does not exist yet.
 */
export async function assertCanAnnotateTranscript(userId: string, transcriptId: string): Promise<void> {
  logger.warn('[case-access] assertCanAnnotateTranscript is a stub — implement in Phase 1', { userId, transcriptId });
}

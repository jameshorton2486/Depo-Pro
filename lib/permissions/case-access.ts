/**
 * Case Access Permission Service
 * Handles all permission checks for case-related operations
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

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

/**
 * Create a permission error
 */
export function createPermissionError(code: string, message: string): PermissionError {
  const error = new Error(message) as PermissionError;
  error.code = code;
  error.statusCode = 403;
  return error;
}

/**
 * Check if user can access a case
 */
export async function canAccessCase(userId: string, caseId: string): Promise<boolean> {
  const permissions = await getCasePermissions(userId, caseId);
  return permissions.canView;
}

/**
 * Check if user can edit a case
 */
export async function canEditCase(userId: string, caseId: string): Promise<boolean> {
  const permissions = await getCasePermissions(userId, caseId);
  return permissions.canEdit;
}

/**
 * Get all permissions for a user on a case
 */
export async function getCasePermissions(userId: string, caseId: string): Promise<CasePermissions> {
  const supabase = await createSupabaseServerClient();
  
  // Check case membership
  const { data: membership } = await supabase
    .from('case_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('case_id', caseId)
    .single();
  
  if (!membership) {
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canAnnotate: false,
      canUploadExhibit: false,
    };
  }
  
  const role = membership.role;
  
  return {
    canView: true,
    canEdit: ['OWNER', 'ADMIN', 'EDITOR'].includes(role),
    canDelete: ['OWNER', 'ADMIN'].includes(role),
    canAnnotate: ['OWNER', 'ADMIN', 'EDITOR', 'ANNOTATOR'].includes(role),
    canUploadExhibit: ['OWNER', 'ADMIN', 'EDITOR'].includes(role),
  };
}

/**
 * Assert user has case access (throws on failure)
 */
export async function assertCaseAccess(
  userId: string,
  caseId: string,
  action?: keyof CasePermissions
): Promise<void> {
  const permissions = await getCasePermissions(userId, caseId);
  
  if (action && !permissions[action]) {
    throw createPermissionError('ACCESS_DENIED', `No ${action} permission for this case`);
  }
  
  if (!action && !permissions.canView) {
    throw createPermissionError('ACCESS_DENIED', 'No access to this case');
  }
}

/**
 * Assert attorney has case access
 */
export async function assertAttorneyCaseAccess(userId: string, caseId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  
  const { data: attorney } = await supabase
    .from('case_attorneys')
    .select('id')
    .eq('user_id', userId)
    .eq('case_id', caseId)
    .single();
  
  if (!attorney) {
    throw createPermissionError('ACCESS_DENIED', 'Attorney does not have access to this case');
  }
}

/**
 * Assert reporter has deposition access
 */
export async function assertReporterDepositionAccess(userId: string, jobId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  
  const { data: job } = await supabase
    .from('jobs')
    .select('id, created_by_id, assigned_reporter_id')
    .eq('id', jobId)
    .single();
  
  if (!job) {
    throw createPermissionError('NOT_FOUND', 'Job not found');
  }
  
  if (job.created_by_id !== userId && job.assigned_reporter_id !== userId) {
    throw createPermissionError('ACCESS_DENIED', 'Reporter does not have access to this job');
  }
}

/**
 * Assert user can upload exhibit
 */
export async function assertCanUploadExhibit(userId: string, caseId: string): Promise<void> {
  const permissions = await getCasePermissions(userId, caseId);
  
  if (!permissions.canUploadExhibit) {
    throw createPermissionError('ACCESS_DENIED', 'Cannot upload exhibits to this case');
  }
}

/**
 * Assert user can annotate transcript
 */
export async function assertCanAnnotateTranscript(userId: string, transcriptId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  
  const { data: access } = await supabase
    .from('transcript_access')
    .select('can_annotate')
    .eq('user_id', userId)
    .eq('transcript_id', transcriptId)
    .single();
  
  if (!access || !access.can_annotate) {
    throw createPermissionError('ACCESS_DENIED', 'Cannot annotate this transcript');
  }
}

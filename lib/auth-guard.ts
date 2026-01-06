// =============================================================================
// AUTHENTICATION & AUTHORIZATION GUARDS
// Server-side only - never trust client for auth decisions
// =============================================================================

import { auth } from '@/lib/auth';
import type { UserRole } from '@/types/database';
import { unauthorized, forbidden } from './api-response';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  firmId: string | null;
}

export interface AuthResult {
  success: true;
  user: AuthenticatedUser;
}

export interface AuthError {
  success: false;
  response: Response;
}

export type AuthCheck = AuthResult | AuthError;

// =============================================================================
// CORE AUTH FUNCTIONS
// =============================================================================

export async function requireAuth(): Promise<AuthCheck> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      response: unauthorized(),
    };
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name ?? null,
      role: session.user.role as UserRole,
      firmId: session.user.firmId ?? null,
    },
  };
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthCheck> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      success: false,
      response: forbidden(`This action requires one of these roles: ${allowedRoles.join(', ')}`),
    };
  }

  return authResult;
}

export async function requireAdmin(): Promise<AuthCheck> {
  return requireRole(['ADMIN']);
}

export async function requireSameFirm(firmId: string): Promise<AuthCheck> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user.role === 'ADMIN') {
    return authResult;
  }

  if (authResult.user.firmId !== firmId) {
    return {
      success: false,
      response: forbidden('You do not have access to this firm'),
    };
  }

  return authResult;
}

// =============================================================================
// RESOURCE-SPECIFIC GUARDS
// =============================================================================

export async function canAccessJob(
  user: AuthenticatedUser,
  jobId: string
): Promise<{ allowed: boolean; job?: any }> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();

  const { data: job, error } = await supabase
    .from('Job')
    .select(`
      id,
      firm_id,
      case_name,
      status,
      created_by_id,
      assignments:JobAssignment(scopist_id)
    `)
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return { allowed: false };
  }

  if (user.role === 'ADMIN') {
    return { allowed: true, job };
  }

  if (job.firm_id && user.firmId !== job.firm_id) {
    return { allowed: false };
  }

  const isCreator = job.created_by_id === user.id;
  const isAssignedScopist = job.assignments?.some((a: any) => a.scopist_id === user.id);
  const isAgencyOrReporter = (['REPORTER', 'AGENCY'] as UserRole[]).includes(user.role);

  const canAccess = isCreator || isAssignedScopist || isAgencyOrReporter;

  return { allowed: canAccess, job };
}

export async function canAccessTranscript(
  user: AuthenticatedUser,
  transcriptId: string
): Promise<{ allowed: boolean; accessLevel?: string; transcript?: any }> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();

  const { data: transcript, error } = await supabase
    .from('Transcript')
    .select(`
      id,
      job:Job(
        id,
        firm_id,
        created_by_id,
        assignments:JobAssignment(scopist_id)
      )
    `)
    .eq('id', transcriptId)
    .single();

  if (error || !transcript) {
    return { allowed: false };
  }

  if (user.role === 'ADMIN') {
    return { allowed: true, accessLevel: 'EDIT', transcript };
  }

  const job = transcript.job as any;
  if (job) {
    const isCreator = job.created_by_id === user.id;
    const isAssignedScopist = job.assignments?.some((a: any) => a.scopist_id === user.id);
    const isSameFirm = job.firm_id && user.firmId === job.firm_id;

    if (isSameFirm && (isCreator || isAssignedScopist)) {
      return { allowed: true, accessLevel: 'EDIT', transcript };
    }
  }

  // Check direct access grants
  const { data: access } = await supabase
    .from('TranscriptAccess')
    .select('access_level')
    .eq('transcript_id', transcriptId)
    .eq('user_id', user.id)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .single();

  if (access) {
    return { allowed: true, accessLevel: access.access_level, transcript };
  }

  // Check external shares
  const { data: share } = await supabase
    .from('TranscriptShare')
    .select('access_level')
    .eq('transcript_id', transcriptId)
    .eq('recipient_email', user.email)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .single();

  if (share) {
    return { allowed: true, accessLevel: share.access_level, transcript };
  }

  return { allowed: false };
}

export async function canModifyTranscript(
  user: AuthenticatedUser,
  transcriptId: string
): Promise<boolean> {
  const access = await canAccessTranscript(user, transcriptId);
  return access.allowed && access.accessLevel === 'EDIT';
}

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

export function withAuth<T>(
  handler: (user: AuthenticatedUser) => Promise<T>
): () => Promise<T | Response> {
  return async () => {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }
    return handler(authResult.user);
  };
}

export function withRole<T>(
  roles: UserRole[],
  handler: (user: AuthenticatedUser) => Promise<T>
): () => Promise<T | Response> {
  return async () => {
    const authResult = await requireRole(roles);
    if (!authResult.success) {
      return authResult.response;
    }
    return handler(authResult.user);
  };
}

// ═══════════════════════════════════════════════════════════════
// API GUARDS v2 — Auth + Role + Org enforcement for API routes
// Depo-Pro Architecture Blueprint v2.2
//
// Replaces: stub version (silent true returns)
// Preserves: Existing AuthUser interface + requireAuth signature
//
// Auth pattern: createSupabaseServerClient() → .from('users')
// Role source: profiles.role (user_role enum)
// Org source: organization_memberships.org_id (after migration)
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { UserRole, LEGACY_ROLE_MAP } from '@/lib/enums/roles';
import {
  isAgencyAdmin,
  isFirmAdmin,
  canManageOrg,
} from '@/lib/permissions/role-groups';

export { UserRole, LEGACY_ROLE_MAP };
export { isAgencyAdmin, isFirmAdmin, canManageOrg };

export const ROLE_GROUPS = {
  AGENCY_ADMIN: [UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER, UserRole.ADMIN],
  AGENCY_STAFF: [UserRole.REPORTER, UserRole.SCOPIST, UserRole.COURT_REPORTER, UserRole.VIDEOGRAPHER, UserRole.INTERPRETER],
  FIRM_ADMIN: [UserRole.FIRM_OWNER, UserRole.FIRM_MANAGER],
  FIRM_STAFF: [UserRole.ATTORNEY, UserRole.PARALEGAL],
} as const;

// ── Types ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  role: string;
  firmId?: string | null;
  orgId?: string | null;
  orgType?: 'AGENCY' | 'FIRM' | null;
  email?: string;
}

// Discriminated union: success or failure
type AuthSuccess = { authorized: true; user: AuthUser };
type AuthFailure = { authorized: false; response: NextResponse };
export type AuthResult = AuthSuccess | AuthFailure;

// Legacy exports (backward compatibility)
export type PermissionAction = 'view' | 'edit' | 'upload' | 'annotate' | 'delete' | 'link';
export interface CasePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAnnotate: boolean;
  canUploadExhibit: boolean;
}

export interface PermissionError {
  code: string;
  message: string;
  statusCode: number;
}

export function createPermissionError(code: string, message: string): PermissionError {
  return { code, message, statusCode: 403 };
}

// ── Core Guards ────────────────────────────────────────────────

/**
 * Require authentication. Returns enriched AuthUser or 401 response.
 * Queries 'users' table (matches existing pattern in lib/auth.ts).
 * After Phase 1 migration, also enriches with org context.
 */
export async function requireAuth(_request?: Request): Promise<AuthUser | NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile (existing pattern — queries 'users' view/table)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, firm_id, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.warn('[api-guards] User profile not found', { userId: user.id });
      return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
    }

    if (!profile.role) {
      logger.warn('[api-guards] User has no role assigned', { userId: user.id });
      return NextResponse.json({ error: 'User profile incomplete: no role assigned' }, { status: 401 });
    }

    // Try to enrich with org context (graceful — org tables may not exist yet)
    let orgId: string | null = null;
    let orgType: 'AGENCY' | 'FIRM' | null = null;
    try {
      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('org_id, organizations!inner(type)')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .eq('status', 'ACTIVE')
        .single();

      if (membership) {
        orgId = membership.org_id;
        orgType = (membership as any).organizations?.type || null;
      }
    } catch {
      // organization_memberships may not exist yet — fall back to firm_id
    }

    return {
      id: profile.id,
      role: profile.role,
      firmId: profile.firm_id || null,
      orgId: orgId || profile.firm_id || null,
      orgType,
      email: profile.email,
    };
  } catch (error) {
    logger.error('[api-guards] Auth error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Internal auth error' }, { status: 500 });
  }
}

/**
 * Require authentication with discriminated union return.
 * Preferred pattern for new code.
 *
 * Usage:
 *   const auth = await requireAuthV2();
 *   if (!auth.authorized) return auth.response;
 *   const { user } = auth;
 */
export async function requireAuthV2(): Promise<AuthResult> {
  const result = await requireAuth();
  if (result instanceof NextResponse) {
    return { authorized: false, response: result };
  }
  return { authorized: true, user: result };
}

/**
 * Require specific roles. Accepts both legacy and v2.2 roles.
 */
export async function requireRole(allowedRoles: (UserRole | string)[]): Promise<AuthResult> {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth;

  const userRole = auth.user.role;
  if (!allowedRoles.includes(userRole)) {
    // Check legacy mapping
    const mappedRole = LEGACY_ROLE_MAP[userRole];
    if (!mappedRole || !allowedRoles.includes(mappedRole)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden', requiredRoles: allowedRoles, userRole },
          { status: 403 }
        ),
      };
    }
  }

  return auth;
}

/**
 * Require a role group check.
 *
 * Usage:
 *   const auth = await requireRoleGroup(canManageOrg);
 *   if (!auth.authorized) return auth.response;
 */
export async function requireRoleGroup(
  checker: (role: string) => boolean
): Promise<AuthResult> {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth;

  if (!checker(auth.user.role)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return auth;
}

/**
 * Require org membership. User must belong to the specified org.
 * Cross-tenant access returns 403.
 */
export async function requireOrgMembership(orgId: string): Promise<AuthResult> {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth;

  if (auth.user.orgId !== orgId && auth.user.firmId !== orgId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      ),
    };
  }

  return auth;
}

// ── Legacy Stubs (backward compatibility) ──────────────────────
// Stubs now log warnings instead of silently returning true.
// Phase 2 will implement real checks against case/transcript tables.

export async function requireTranscriptAnnotation(
  userId: string, transcriptId: string
): Promise<true | NextResponse> {
  logger.warn('[Guards] requireTranscriptAnnotation is a stub — implement in Phase 2', { userId, transcriptId });
  return true;
}

export async function requireAttorneyCaseAccess(
  userId: string, caseId: string
): Promise<true | NextResponse> {
  logger.warn('[Guards] requireAttorneyCaseAccess is a stub — implement in Phase 2', { userId, caseId });
  return true;
}

export async function requireExhibitUpload(
  userId: string, caseId: string
): Promise<true | NextResponse> {
  logger.warn('[Guards] requireExhibitUpload is a stub — implement in Phase 2', { userId, caseId });
  return true;
}

export async function requireReporterDepositionAccess(
  userId: string, jobId: string
): Promise<true | NextResponse> {
  logger.warn('[Guards] requireReporterDepositionAccess is a stub — implement in Phase 2', { userId, jobId });
  return true;
}

// Legacy aliases
export const assertAttorneyCaseAccess = requireAttorneyCaseAccess;
export const assertReporterDepositionAccess = requireReporterDepositionAccess;
export const assertCanUploadExhibit = requireExhibitUpload;

export async function assertCanAnnotateTranscript(userId: string, transcriptId: string): Promise<void> {
  logger.warn('[Guards] assertCanAnnotateTranscript is a stub', { userId, transcriptId });
}

export async function canAccessCase(userId: string, caseId: string): Promise<boolean> {
  logger.warn('[Guards] canAccessCase is a stub', { userId, caseId });
  return true;
}

export async function canEditCase(userId: string, caseId: string): Promise<boolean> {
  logger.warn('[Guards] canEditCase is a stub', { userId, caseId });
  return true;
}

export async function getCasePermissions(userId: string, caseId: string): Promise<CasePermissions> {
  logger.warn('[Guards] getCasePermissions is a stub', { userId, caseId });
  return { canView: true, canEdit: true, canDelete: false, canAnnotate: true, canUploadExhibit: true };
}

export async function assertCaseAccess(userId: string, caseId: string): Promise<void> {
  logger.warn('[Guards] assertCaseAccess is a stub', { userId, caseId });
}

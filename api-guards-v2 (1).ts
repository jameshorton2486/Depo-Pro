// ═══════════════════════════════════════════════════════════════
// API GUARDS v2 — Auth + Role + Org enforcement for API routes
// Depo-Pro Architecture Blueprint v2.2
//
// Replaces: lib/permissions/api-guards.ts (stub version)
// Preserves: Existing AuthUser interface + requireAuth signature
//
// Auth pattern: createSupabaseServerClient() → .from('users')
// Role source: profiles.role (user_role enum)
// Org source: organization_memberships.org_id (after migration)
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ── Role Enum (canonical source: lib/enums/roles.ts) ──────────

export enum UserRole {
  // Legacy v1.3 roles (existing in DB)
  ADMIN = 'ADMIN',
  COURT_REPORTER = 'COURT_REPORTER',
  SCOPIST = 'SCOPIST',
  ATTORNEY = 'ATTORNEY',
  // v2.2 multi-tenant roles (added by migration)
  AGENCY_OWNER = 'AGENCY_OWNER',
  AGENCY_MANAGER = 'AGENCY_MANAGER',
  REPORTER = 'REPORTER',
  VIDEOGRAPHER = 'VIDEOGRAPHER',
  INTERPRETER = 'INTERPRETER',
  FIRM_OWNER = 'FIRM_OWNER',
  FIRM_MANAGER = 'FIRM_MANAGER',
  PARALEGAL = 'PARALEGAL',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// Legacy → new role mapping for transition period
export const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  'ADMIN': UserRole.AGENCY_OWNER,
  'COURT_REPORTER': UserRole.REPORTER,
};

// ── Role Groups ────────────────────────────────────────────────

export const ROLE_GROUPS = {
  AGENCY_ADMIN: [UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER, UserRole.ADMIN],
  AGENCY_STAFF: [UserRole.REPORTER, UserRole.SCOPIST, UserRole.COURT_REPORTER,
                 UserRole.VIDEOGRAPHER, UserRole.INTERPRETER],
  FIRM_ADMIN: [UserRole.FIRM_OWNER, UserRole.FIRM_MANAGER],
  FIRM_STAFF: [UserRole.ATTORNEY, UserRole.PARALEGAL],
} as const;

export function isAgencyAdmin(role: string): boolean {
  return (ROLE_GROUPS.AGENCY_ADMIN as readonly string[]).includes(role);
}
export function isAgencyStaff(role: string): boolean {
  return (ROLE_GROUPS.AGENCY_STAFF as readonly string[]).includes(role);
}
export function isFirmAdmin(role: string): boolean {
  return (ROLE_GROUPS.FIRM_ADMIN as readonly string[]).includes(role);
}
export function isFirmStaff(role: string): boolean {
  return (ROLE_GROUPS.FIRM_STAFF as readonly string[]).includes(role);
}
export function canManageOrg(role: string): boolean {
  return isAgencyAdmin(role) || isFirmAdmin(role);
}

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

// ── Core Guards ────────────────────────────────────────────────

/**
 * Require authentication. Returns enriched user or 401.
 * Queries 'users' table (matches existing pattern in lib/auth.ts).
 * After migration, also queries organization_memberships for org context.
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
    logger.error('[api-guards] Auth error', { error });
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
 * Require specific roles.
 * Accepts both legacy roles (ADMIN, COURT_REPORTER) and new roles.
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
 */
export async function requireOrgMembership(orgId: string): Promise<AuthResult> {
  const auth = await requireAuthV2();
  if (!auth.authorized) return auth;

  if (auth.user.orgId !== orgId && auth.user.firmId !== orgId) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 }),
    };
  }

  return auth;
}

// ── Legacy Stubs (backward compatibility) ──────────────────────
// These were returning true in the old version. Now they log warnings.
// Phase 1+ will implement real checks.

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

export function createPermissionError(code: string, message: string) {
  return { code, message, statusCode: 403 };
}

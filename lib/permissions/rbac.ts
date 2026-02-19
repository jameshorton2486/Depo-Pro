// ============================================================
// RBAC UTILITIES — Migrated from lib/rbac.ts
// lib/permissions/rbac.ts
//
// Provides action-level permission checks used by API routes.
// Role source: canonical lib/enums/roles.ts
// ============================================================

import { UserRole } from '@/lib/enums/roles';

export type PermissionKey =
  | 'CONVERT_CALENDAR_TO_JOB'
  | 'ASSIGN_REPORTER'
  | 'VIEW_CALENDAR'
  | 'VIEW_JOBS'
  | 'MANAGE_CALENDAR_EVENTS'
  | 'VIEW_ALL_REPORTERS';

/**
 * Action permission matrix.
 * Uses v2.2 roles + legacy aliases for backward compatibility.
 */
export const PERMISSIONS: Record<PermissionKey, UserRole[]> = {
  CONVERT_CALENDAR_TO_JOB: [
    UserRole.ADMIN, UserRole.AGENCY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER,
  ],
  ASSIGN_REPORTER: [
    UserRole.ADMIN, UserRole.AGENCY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER,
    UserRole.REPORTER,
  ],
  VIEW_CALENDAR: [
    UserRole.ADMIN, UserRole.AGENCY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER,
    UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.ATTORNEY,
    UserRole.VIDEOGRAPHER, UserRole.INTERPRETER,
  ],
  VIEW_JOBS: [
    UserRole.ADMIN, UserRole.AGENCY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER,
    UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY,
    UserRole.FIRM_OWNER, UserRole.FIRM_MANAGER,
  ],
  MANAGE_CALENDAR_EVENTS: [
    UserRole.ADMIN, UserRole.AGENCY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER,
  ],
  VIEW_ALL_REPORTERS: [
    UserRole.ADMIN, UserRole.AGENCY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER,
  ],
};

export function canPerformAction(
  userRole: string | undefined | null,
  action: PermissionKey
): boolean {
  if (!userRole) return false;
  return (PERMISSIONS[action] as readonly string[]).includes(userRole);
}

export function assertPermission(
  userRole: string | undefined | null,
  action: PermissionKey
): void {
  if (!canPerformAction(userRole, action)) {
    throw new Error(`Unauthorized: Role ${userRole ?? 'unknown'} cannot perform ${action}`);
  }
}

export function getPermissionsForRole(role: UserRole): PermissionKey[] {
  return (Object.keys(PERMISSIONS) as PermissionKey[]).filter((action) =>
    (PERMISSIONS[action] as readonly string[]).includes(role)
  );
}

export function canConvertEventToJob(
  userRole: string | undefined,
  userFirmId: string | undefined,
  eventFirmId: string
): boolean {
  if (!canPerformAction(userRole, 'CONVERT_CALENDAR_TO_JOB')) return false;
  if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) return true;
  // Agency roles: must match firm
  return userFirmId === eventFirmId;
}

export function canAssignReporter(
  userRole: string | undefined,
  userFirmId: string | undefined,
  jobFirmId: string,
  userId?: string,
  reporterId?: string
): boolean {
  if (!canPerformAction(userRole, 'ASSIGN_REPORTER')) return false;
  if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) return true;
  if (userRole === UserRole.REPORTER || userRole === UserRole.COURT_REPORTER) {
    return userId === reporterId;
  }
  // Agency roles: must match firm
  return userFirmId === jobFirmId;
}

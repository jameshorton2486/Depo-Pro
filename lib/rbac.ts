// ============================================================
// ROLE-BASED ACCESS CONTROL (RBAC) UTILITIES
// Path: lib/rbac.ts
// ============================================================

import { Role } from '@/lib/constants';

/**
 * Phase 3 Permission Matrix
 */
export const PERMISSIONS = {
  CONVERT_CALENDAR_TO_JOB: ['ADMIN', 'AGENCY'] as Role[],
  ASSIGN_REPORTER: ['ADMIN', 'AGENCY', 'REPORTER'] as Role[],
  VIEW_CALENDAR: ['ADMIN', 'AGENCY', 'REPORTER', 'ATTORNEY'] as Role[],
  VIEW_JOBS: ['ADMIN', 'AGENCY', 'REPORTER', 'SCOPIST', 'ATTORNEY'] as Role[],
  MANAGE_CALENDAR_EVENTS: ['ADMIN', 'AGENCY'] as Role[],
  VIEW_ALL_REPORTERS: ['ADMIN', 'AGENCY'] as Role[],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function canPerformAction(
  userRole: Role | string | undefined | null,
  action: PermissionKey
): boolean {
  if (!userRole) return false;
  return (PERMISSIONS[action] as readonly string[]).includes(userRole);
}

export function assertPermission(
  userRole: Role | string | undefined | null,
  action: PermissionKey
): asserts userRole is Role {
  if (!canPerformAction(userRole, action)) {
    throw new Error(`Unauthorized: Role ${userRole ?? 'unknown'} cannot perform ${action}`);
  }
}

export function getPermissionsForRole(role: Role): PermissionKey[] {
  return (Object.keys(PERMISSIONS) as PermissionKey[]).filter((action) =>
    (PERMISSIONS[action] as readonly string[]).includes(role)
  );
}

export function canConvertEventToJob(
  userRole: Role | string | undefined,
  userFirmId: string | undefined,
  eventFirmId: string
): boolean {
  if (!canPerformAction(userRole, 'CONVERT_CALENDAR_TO_JOB')) {
    return false;
  }
  if (userRole === 'ADMIN') return true;
  if (userRole === 'AGENCY') return userFirmId === eventFirmId;
  return false;
}

export function canAssignReporter(
  userRole: Role | string | undefined,
  userFirmId: string | undefined,
  jobFirmId: string,
  userId?: string,
  reporterId?: string
): boolean {
  if (!canPerformAction(userRole, 'ASSIGN_REPORTER')) {
    return false;
  }
  if (userRole === 'ADMIN') return true;
  if (userRole === 'AGENCY') return userFirmId === jobFirmId;
  if (userRole === 'REPORTER') return userId === reporterId;
  return false;
}


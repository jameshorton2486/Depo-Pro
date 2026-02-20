// ============================================================
// CLIENT-SIDE RBAC UTILITIES
// Path: lib/rbac-client.ts
// ============================================================
// Safe to use in 'use client' components

import { UserRole } from '@/lib/enums/roles'; void UserRole; // available for consumers

export const PERMISSIONS = {
  CONVERT_CALENDAR_TO_JOB: [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  ASSIGN_REPORTER: [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER, UserRole.REPORTER],
  VIEW_CALENDAR: [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER, UserRole.REPORTER, UserRole.ATTORNEY],
  VIEW_JOBS: [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY],
  MANAGE_CALENDAR_EVENTS: [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  VIEW_ALL_REPORTERS: [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function canPerformAction(
  userRole: string | undefined | null,
  action: PermissionKey
): boolean {
  if (!userRole) return false;
  return (PERMISSIONS[action] as readonly string[]).includes(userRole);
}

export function canConvertEventToJob(userRole: string | undefined): boolean {
  return canPerformAction(userRole, 'CONVERT_CALENDAR_TO_JOB');
}

export function canAssignReporterClient(userRole: string | undefined): boolean {
  return canPerformAction(userRole, 'ASSIGN_REPORTER');
}

export function canManageCalendar(userRole: string | undefined): boolean {
  return canPerformAction(userRole, 'MANAGE_CALENDAR_EVENTS');
}


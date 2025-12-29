// ============================================================
// CLIENT-SIDE RBAC UTILITIES
// Path: lib/rbac-client.ts
// ============================================================
// Safe to use in 'use client' components

export const PERMISSIONS = {
  CONVERT_CALENDAR_TO_JOB: ['ADMIN', 'AGENCY'],
  ASSIGN_REPORTER: ['ADMIN', 'AGENCY', 'REPORTER'],
  VIEW_CALENDAR: ['ADMIN', 'AGENCY', 'REPORTER', 'ATTORNEY'],
  VIEW_JOBS: ['ADMIN', 'AGENCY', 'REPORTER', 'SCOPIST', 'ATTORNEY'],
  MANAGE_CALENDAR_EVENTS: ['ADMIN', 'AGENCY'],
  VIEW_ALL_REPORTERS: ['ADMIN', 'AGENCY'],
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


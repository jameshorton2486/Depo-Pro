// ============================================
// Calendar Permissions - Phase 2
// ============================================

import type { UserRole, RolePermissions, CalendarAction, ActionAvailability, CalendarEventUI } from './types';

// ============================================
// ROLE PERMISSION DEFINITIONS
// ============================================

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canViewAllEvents: true,
    canViewFirmEvents: true,
    canViewAssignedOnly: false,
    canAssignReporter: true,
    canAssignScopist: true,
    canAssignVideographer: true,
    canAssignInterpreter: true,
    canRequestChanges: true,
    canConvertToJob: true,
    canCancelEvent: true,
    canReschedule: true,
    canAddNotes: true,
    canMarkComplete: true,
    preferredView: 'grid',
    canToggleView: true,
  },
  
  REPORTER: {
    canViewAllEvents: false,
    canViewFirmEvents: false,
    canViewAssignedOnly: true,
    canAssignReporter: false,
    canAssignScopist: false,
    canAssignVideographer: false,
    canAssignInterpreter: false,
    canRequestChanges: true,
    canConvertToJob: false,
    canCancelEvent: false,
    canReschedule: false,
    canAddNotes: true,
    canMarkComplete: true,
    preferredView: 'timeline',
    canToggleView: true,
  },
  
  SCOPIST: {
    canViewAllEvents: false,
    canViewFirmEvents: false,
    canViewAssignedOnly: true,
    canAssignReporter: false,
    canAssignScopist: false,
    canAssignVideographer: false,
    canAssignInterpreter: false,
    canRequestChanges: false,
    canConvertToJob: false,
    canCancelEvent: false,
    canReschedule: false,
    canAddNotes: false,
    canMarkComplete: false,
    preferredView: 'timeline',
    canToggleView: false,  // Timeline only
  },
  
  ATTORNEY: {
    canViewAllEvents: false,
    canViewFirmEvents: true,
    canViewAssignedOnly: false,
    canAssignReporter: false,
    canAssignScopist: false,
    canAssignVideographer: false,
    canAssignInterpreter: false,
    canRequestChanges: true,
    canConvertToJob: false,
    canCancelEvent: true,
    canReschedule: true,
    canAddNotes: true,
    canMarkComplete: false,
    preferredView: 'grid',
    canToggleView: true,
  },
  
  PARALEGAL: {
    canViewAllEvents: false,
    canViewFirmEvents: true,
    canViewAssignedOnly: false,
    canAssignReporter: false,
    canAssignScopist: false,
    canAssignVideographer: false,
    canAssignInterpreter: false,
    canRequestChanges: true,
    canConvertToJob: false,
    canCancelEvent: false,
    canReschedule: false,
    canAddNotes: true,
    canMarkComplete: false,
    preferredView: 'grid',
    canToggleView: true,
  },
  
  AGENCY: {
    canViewAllEvents: false,
    canViewFirmEvents: false,
    canViewAssignedOnly: true,
    canAssignReporter: false,
    canAssignScopist: false,
    canAssignVideographer: false,
    canAssignInterpreter: false,
    canRequestChanges: false,
    canConvertToJob: false,
    canCancelEvent: false,
    canReschedule: false,
    canAddNotes: true,
    canMarkComplete: false,
    preferredView: 'timeline',
    canToggleView: false,
  },
  
  AGENCY_ADMIN: {
    canViewAllEvents: true,
    canViewFirmEvents: true,
    canViewAssignedOnly: false,
    canAssignReporter: true,
    canAssignScopist: true,
    canAssignVideographer: true,
    canAssignInterpreter: true,
    canRequestChanges: true,
    canConvertToJob: true,
    canCancelEvent: true,
    canReschedule: true,
    canAddNotes: true,
    canMarkComplete: true,
    preferredView: 'grid',
    canToggleView: true,
  },
  
  FIRM_ADMIN: {
    canViewAllEvents: false,
    canViewFirmEvents: true,
    canViewAssignedOnly: false,
    canAssignReporter: false,
    canAssignScopist: false,
    canAssignVideographer: false,
    canAssignInterpreter: false,
    canRequestChanges: true,
    canConvertToJob: false,
    canCancelEvent: true,
    canReschedule: true,
    canAddNotes: true,
    canMarkComplete: false,
    preferredView: 'grid',
    canToggleView: true,
  },
};

// ============================================
// ACTION AVAILABILITY BY ROLE
// ============================================

export function getActionAvailability(
  action: CalendarAction,
  role: UserRole,
  _event?: CalendarEventUI
): ActionAvailability {
  const permissions = ROLE_PERMISSIONS[role];
  
  // Map actions to permission checks
  const permissionMap: Record<CalendarAction, keyof RolePermissions | null> = {
    VIEW_DETAILS: null,  // Always available
    REQUEST_CHANGE: 'canRequestChanges',
    ASSIGN_REPORTER: 'canAssignReporter',
    ASSIGN_SCOPIST: 'canAssignScopist',
    ASSIGN_VIDEOGRAPHER: 'canAssignVideographer',
    ASSIGN_INTERPRETER: 'canAssignInterpreter',
    CONVERT_TO_JOB: 'canConvertToJob',
    CANCEL_EVENT: 'canCancelEvent',
    RESCHEDULE: 'canReschedule',
    ADD_NOTES: 'canAddNotes',
    MARK_COMPLETE: 'canMarkComplete',
  };
  
  const permissionKey = permissionMap[action];
  
  // VIEW_DETAILS is always available
  if (permissionKey === null) {
    return 'AVAILABLE'; // Phase 3: Now available
  }
  
  // Check if role has permission
  if (!permissions[permissionKey]) {
    return 'NO_PERMISSION';
  }
  
  // Phase 3: Actions are now AVAILABLE (not disabled)
  return 'AVAILABLE';
}

// ============================================
// DISABLED REASON MESSAGES
// ============================================

export const ACTION_DISABLED_REASONS: Record<CalendarAction, string> = {
  VIEW_DETAILS: 'Event details will be available in the next update.',
  REQUEST_CHANGE: 'Change requests coming in Phase 3.',
  ASSIGN_REPORTER: 'Reporter assignment coming in Phase 3.',
  ASSIGN_SCOPIST: 'Scopist assignment coming in Phase 3.',
  ASSIGN_VIDEOGRAPHER: 'Videographer assignment coming in Phase 3.',
  ASSIGN_INTERPRETER: 'Interpreter assignment coming in Phase 3.',
  CONVERT_TO_JOB: 'Job conversion coming in Phase 3.',
  CANCEL_EVENT: 'Event cancellation coming in Phase 3.',
  RESCHEDULE: 'Rescheduling coming in Phase 3.',
  ADD_NOTES: 'Notes feature coming in Phase 3.',
  MARK_COMPLETE: 'Status updates coming in Phase 3.',
};

export const ACTION_PERMISSION_REASONS: Record<CalendarAction, string> = {
  VIEW_DETAILS: '',
  REQUEST_CHANGE: 'Your role does not have permission to request changes.',
  ASSIGN_REPORTER: 'Only agency administrators can assign reporters.',
  ASSIGN_SCOPIST: 'Only agency administrators can assign scopists.',
  ASSIGN_VIDEOGRAPHER: 'Only agency administrators can assign videographers.',
  ASSIGN_INTERPRETER: 'Only agency administrators can assign interpreters.',
  CONVERT_TO_JOB: 'Only CSRs can convert events to transcription jobs.',
  CANCEL_EVENT: 'Only attorneys and administrators can cancel events.',
  RESCHEDULE: 'Only attorneys and administrators can reschedule events.',
  ADD_NOTES: 'Your role does not have permission to add notes.',
  MARK_COMPLETE: 'Only reporters and administrators can mark events complete.',
};

// ============================================
// HELPER FUNCTIONS FOR API ROUTES
// ============================================

export function canConvertToJob(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].canConvertToJob;
}

export function canAssignPersonnel(
  role: UserRole,
  personnelType: 'REPORTER' | 'SCOPIST' | 'VIDEOGRAPHER' | 'INTERPRETER'
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  switch (personnelType) {
    case 'REPORTER':
      return permissions.canAssignReporter;
    case 'SCOPIST':
      return permissions.canAssignScopist;
    case 'VIDEOGRAPHER':
      return permissions.canAssignVideographer;
    case 'INTERPRETER':
      return permissions.canAssignInterpreter;
    default:
      return false;
  }
}

export function canCancelEvent(
  role: UserRole,
  _userId: string,
  _event: { createdById?: string; firmId?: string }
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (permissions.canCancelEvent) {
    // Attorneys can only cancel their own firm's events
    if (role === 'ATTORNEY' || role === 'FIRM_ADMIN') {
      // This check should be done at the API level with actual firm data
      return true; // API route will verify firmId match
    }
    return true;
  }
  return false;
}

export function canReschedule(
  role: UserRole,
  _userId: string,
  _event: { createdById?: string; firmId?: string }
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (permissions.canReschedule) {
    // Similar to cancel, attorneys can only reschedule their firm's events
    return true; // API route will verify firmId match
  }
  return false;
}

export function canAddNotes(role: UserRole): boolean {
  return ROLE_PERMISSIONS[role].canAddNotes;
}


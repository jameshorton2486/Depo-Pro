// ============================================
// useCalendarPermissions Hook
// ============================================

import { useMemo, useCallback } from 'react';
import { UserRole, CalendarAction, CalendarEventUI, RolePermissions, PermissionCheckResult } from '@/lib/calendar/types';
import { ROLE_PERMISSIONS, getActionAvailability } from '@/lib/calendar/permissions';

interface UseCalendarPermissionsReturn {
  permissions: RolePermissions;
  canPerformAction: (action: CalendarAction, event?: CalendarEventUI) => PermissionCheckResult;
  getAvailableActions: (event: CalendarEventUI) => CalendarAction[];
  preferredView: 'grid' | 'timeline';
  canToggleView: boolean;
}

export function useCalendarPermissions(
  userRole: UserRole,
  _userId: string
): UseCalendarPermissionsReturn {
  
  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[userRole];
  }, [userRole]);
  
  const canPerformAction = useCallback((
    action: CalendarAction,
    event?: CalendarEventUI
  ): PermissionCheckResult => {
    const availability = getActionAvailability(action, userRole, event);
    
    if (availability === 'AVAILABLE') {
      return { allowed: true };
    }
    
    if (availability === 'DISABLED') {
      return { 
        allowed: false, 
        reason: 'This feature is coming soon.' 
      };
    }
    
    if (availability === 'NO_PERMISSION') {
      return { 
        allowed: false, 
        reason: `Your role (${userRole}) does not have permission for this action.` 
      };
    }
    
    return { allowed: false, reason: 'Action not available.' };
  }, [userRole]);
  
  const getAvailableActions = useCallback((event: CalendarEventUI): CalendarAction[] => {
    const allActions: CalendarAction[] = [
      'VIEW_DETAILS',
      'REQUEST_CHANGE',
      'ASSIGN_REPORTER',
      'ASSIGN_SCOPIST',
      'ASSIGN_VIDEOGRAPHER', 
      'ASSIGN_INTERPRETER',
      'CONVERT_TO_JOB',
      'ADD_NOTES',
      'MARK_COMPLETE',
      'RESCHEDULE',
      'CANCEL_EVENT',
    ];
    
    return allActions.filter(action => {
      const availability = getActionAvailability(action, userRole, event);
      return availability !== 'HIDDEN';
    });
  }, [userRole]);
  
  return {
    permissions,
    canPerformAction,
    getAvailableActions,
    preferredView: permissions.preferredView,
    canToggleView: permissions.canToggleView,
  };
}


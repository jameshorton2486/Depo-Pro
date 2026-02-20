// =============================================================================
// CALENDAR VIEW PERMISSION HELPER
// lib/calendar/use-allowed-calendar-views.ts
//
// Permission-safe view resolver - uses route-access.ts as single source of truth
// Phase 3A-1: No role checks in UI
// =============================================================================

import { hasRouteAccess } from '@/lib/permissions/route-access';
import type { UserRole } from '@/lib/enums/roles';

export type CalendarView = 'jobs' | 'availability' | 'assignments';

/**
 * Get allowed calendar views based on route permissions
 * Uses route-access.ts as single source of truth
 * 
 * @param userRole - User's role from session
 * @returns Array of allowed calendar views
 */
export function getAllowedCalendarViews(userRole: UserRole): CalendarView[] {
  const views: CalendarView[] = [];

  // Assignments view: available to anyone with /calendar access
  if (hasRouteAccess('/calendar', userRole)) {
    views.push('assignments');
  }

  // Availability view: requires /calendar/availability access
  if (hasRouteAccess('/calendar/availability', userRole)) {
    views.push('availability');
  }

  // Jobs view: requires /jobs access
  if (hasRouteAccess('/jobs', userRole)) {
    views.push('jobs');
  }

  return views;
}

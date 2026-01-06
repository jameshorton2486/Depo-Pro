// =============================================================================
// CALENDAR EVENT FILTERS
// lib/calendar/event-filters.ts
//
// Role-aware event filtering for calendar view
// =============================================================================

import { CalendarEventUI } from '@/components/calendar/calendar.types';
import type { UserRole } from '@/types/database';
import { filterEventsByType, EventTypeFilter } from './event-types';

export interface EventFilterOptions {
  typeFilter: EventTypeFilter;
  userRole: UserRole;
  userId: string;
  firmId?: string;
  agencyId?: string;
}

/**
 * Filter events based on role and type
 */
export function filterEventsByRole(
  events: CalendarEventUI[],
  options: EventFilterOptions
): CalendarEventUI[] {
  const { typeFilter, userRole, userId, firmId, agencyId } = options;
  
  // First filter by type
  let filtered = filterEventsByType(events, typeFilter);
  
  // Then apply role-based filtering
  if (userRole === 'SCOPIST') {
    // Scopists see only their assignments and jobs assigned to them
    filtered = filtered.filter((event) => {
      // If it's an assignment, check if assigned to this scopist
      if (event.assignedReporter?.id === userId) {
        return true;
      }
      // If it's a job, check if there's a job assignment (would need jobId lookup)
      // For now, we'll show events where they're the assigned reporter
      return event.assignedReporter?.id === userId;
    });
  } else if (userRole === 'REPORTER') {
    // Reporters see their jobs, availability, and assignments
    filtered = filtered.filter((event) => {
      // Their own events
      if (event.createdById === userId) {
        return true;
      }
      // Events assigned to them
      if (event.assignedReporter?.id === userId) {
        return true;
      }
      // Availability events (typically don't have assigned reporter)
      if (!event.assignedReporter && !event.jobId) {
        return true;
      }
      return false;
    });
  } else if (userRole === 'ADMIN') {
    // Admin sees all events
    // Optionally filter by firm/agency if provided
    if (firmId) {
      filtered = filtered.filter((event) => event.firmId === firmId);
    }
    if (agencyId) {
      filtered = filtered.filter((event) => event.agencyId === agencyId);
    }
  } else if (userRole === 'ATTORNEY') {
    // Attorneys see events for their cases
    // This would need case relationship lookup
    // For now, show events in their firm
    if (firmId) {
      filtered = filtered.filter((event) => event.firmId === firmId);
    }
  } else if (userRole === 'AGENCY') {
    // Agency sees events for their agency
    if (agencyId) {
      filtered = filtered.filter((event) => event.agencyId === agencyId);
    }
  }
  
  return filtered;
}

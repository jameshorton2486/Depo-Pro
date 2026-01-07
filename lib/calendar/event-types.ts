// =============================================================================
// CALENDAR EVENT TYPES
// lib/calendar/event-types.ts
//
// Defines event type categories for unified calendar view
// =============================================================================

import type { CalendarEventUI } from '@/components/calendar/calendar.types';

export type EventTypeFilter = 'all' | 'jobs' | 'availability' | 'assignments';

export interface EventTypeMetadata {
  type: EventTypeFilter;
  label: string;
  color: string;
  icon?: string;
}

export const EVENT_TYPE_CONFIG: Record<EventTypeFilter, EventTypeMetadata> = {
  all: {
    type: 'all',
    label: 'All Events',
    color: '#6B7280', // gray-500
  },
  jobs: {
    type: 'jobs',
    label: 'Jobs Only',
    color: '#3B82F6', // blue-500
  },
  availability: {
    type: 'availability',
    label: 'Availability Only',
    color: '#22C55E', // green-500
  },
  assignments: {
    type: 'assignments',
    label: 'Assignments Only',
    color: '#8B5CF6', // purple-500
  },
};

/**
 * Determine event type from event data
 */
export function getEventType(event: CalendarEventUI | any): EventTypeFilter {
  // Check if event has jobId (from API response)
  if (event.jobId) {
    return 'jobs';
  }
  
  // If event is assigned to a reporter, it's an assignment
  if (event.assignedReporter || event.assignedReporterId) {
    return 'assignments';
  }
  
  // Availability events typically don't have case info or jobId
  // Check for eventType field from API (if it's an availability event)
  if (event.eventType === 'AVAILABILITY' || (!event.caseStyle && !event.deponentName && !event.jobId)) {
    return 'availability';
  }
  
  // Default to jobs for deposition events
  return 'jobs';
}

/**
 * Filter events by type
 */
export function filterEventsByType(
  events: CalendarEventUI[],
  filterType: EventTypeFilter
): CalendarEventUI[] {
  if (filterType === 'all') {
    return events;
  }
  
  return events.filter((event) => getEventType(event) === filterType);
}

/**
 * Get color for event based on type
 */
export function getEventTypeColor(event: CalendarEventUI): string {
  const eventType = getEventType(event);
  return EVENT_TYPE_CONFIG[eventType].color;
}

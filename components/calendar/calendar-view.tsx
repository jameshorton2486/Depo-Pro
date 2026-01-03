'use client';

// =============================================================================
// CALENDAR VIEW SWITCHER
// components/calendar/calendar-view.tsx
//
// Phase 3A-1: Actual view implementations
// =============================================================================

import { CalendarView as ViewType } from '@/lib/calendar/use-allowed-calendar-views';
import { JobsCalendarView } from './views/jobs-calendar-view';
import { AvailabilityEditor } from './availability-editor';
import { AssignmentCalendar } from './assignment-calendar';

export interface CalendarViewProps {
  view: ViewType;
}

export function CalendarView({ view }: CalendarViewProps) {
  switch (view) {
    case 'jobs':
      return <JobsCalendarView />;
    case 'availability':
      return <AvailabilityEditor />;
    case 'assignments':
      return <AssignmentCalendar />;
    default:
      return null;
  }
}

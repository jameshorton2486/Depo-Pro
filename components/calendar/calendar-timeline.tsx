'use client';

import type { CalendarEventUI, UserRole } from '@/lib/calendar/types';
import { formatDateHeading, sortEventsByTime, groupEventsByDate } from '@/lib/calendar/utils';
import { CalendarEventCard } from './calendar-event-card';

interface CalendarTimelineProps {
  events: CalendarEventUI[];
  dateRange: { start: Date; end: Date };
  onEventClick: (event: CalendarEventUI) => void;
  isLoading?: boolean;
  userRole: UserRole;
  groupBy?: 'day' | 'week'; // default: 'day'
}

export function CalendarTimeline({
  events,
  dateRange: _dateRange,
  onEventClick,
  isLoading = false,
  userRole: _userRole,
  groupBy: _groupBy = 'day',
}: CalendarTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading timeline...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No events scheduled
      </div>
    );
  }

  // Sort events by time
  const sortedEvents = sortEventsByTime(events);

  // Group by date
  const grouped = groupEventsByDate(sortedEvents);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateKey, dayEvents]) => {
        const date = new Date(dateKey);
        return (
          <div key={dateKey}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 sticky top-0 bg-gray-50 py-1">
              {formatDateHeading(date)}
            </h3>
            <div className="space-y-2 pl-4 border-l-2 border-gray-200">
              {dayEvents.map((event) => (
                <CalendarEventCard
                  key={event.id}
                  event={event}
                  variant="full"
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

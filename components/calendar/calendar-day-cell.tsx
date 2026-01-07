'use client';

import { format } from 'date-fns';
import type { CalendarEventUI } from '@/lib/calendar/types';
import { CalendarEventCard } from './calendar-event-card';
import { MAX_VISIBLE_EVENTS_PER_DAY } from '@/lib/calendar/constants';

interface CalendarDayCellProps {
  date: Date;
  events: CalendarEventUI[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onEventClick: (event: CalendarEventUI) => void;
  maxVisibleEvents?: number;
}

export function CalendarDayCell({
  date,
  events,
  isToday,
  isCurrentMonth,
  onEventClick,
  maxVisibleEvents = MAX_VISIBLE_EVENTS_PER_DAY,
}: CalendarDayCellProps) {
  const visibleEvents = events.slice(0, maxVisibleEvents);
  const overflowCount = events.length - maxVisibleEvents;

  return (
    <div
      className={`min-h-[120px] border-b border-r p-1 ${
        !isCurrentMonth ? 'bg-gray-50' : ''
      }`}
    >
      {/* Date number */}
      <div
        className={`text-sm font-medium mb-1 ${
          isToday
            ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
            : isCurrentMonth
            ? 'text-gray-900'
            : 'text-gray-400'
        }`}
      >
        {format(date, 'd')}
      </div>

      {/* Events */}
      <div className="space-y-1">
        {visibleEvents.map((event) => (
          <CalendarEventCard
            key={event.id}
            event={event}
            variant="compact"
            onClick={() => onEventClick(event)}
          />
        ))}
        {overflowCount > 0 && (
          <div className="text-xs text-gray-500 pl-1">
            +{overflowCount} more
          </div>
        )}
      </div>
    </div>
  );
}


'use client';

import { useMemo } from 'react';
import { CalendarEventUI, UserRole } from '@/lib/calendar/types';
import { getCalendarDays } from '@/lib/calendar/utils';
import { CalendarDayCell } from './calendar-day-cell';

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEventUI[];
  onEventClick: (event: CalendarEventUI) => void;
  isLoading?: boolean;
  userRole: UserRole;
}

export function CalendarGrid({
  currentDate,
  events,
  onEventClick,
  isLoading = false,
  userRole: _userRole,
}: CalendarGridProps) {
  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return getCalendarDays(year, month, events);
  }, [currentDate, events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <CalendarDayCell
            key={day.date.toISOString()}
            date={day.date}
            events={day.events}
            isToday={day.isToday}
            isCurrentMonth={day.isCurrentMonth}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

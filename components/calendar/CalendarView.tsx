'use client';

import { useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

import {
  CalendarEventUI,
  CalendarViewType,
  CalendarViewProps,
  STATUS_COLORS,
} from './calendar.types';
import { CalendarEventCard } from './CalendarEventCard';

// ============================================
// DATE-FNS LOCALIZER SETUP
// ============================================

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// ============================================
// VIEW MAPPING
// ============================================

const VIEW_MAP: Record<Exclude<CalendarViewType, 'timeline'>, (typeof Views)[keyof typeof Views]> = {
  month: Views.MONTH,
  week: Views.WEEK,
  day: Views.DAY,
  agenda: Views.AGENDA,
};

// ============================================
// CALENDAR VIEW COMPONENT
// ============================================

export function CalendarView({
  events,
  view,
  date,
  onViewChange,
  onDateChange,
  onEventClick,
  onSlotClick,
  isLoading = false,
}: CalendarViewProps) {
  // Timeline view is handled separately in CalendarShell
  if (view === 'timeline') {
    return null;
  }

  // Convert our events to react-big-calendar format
  const calendarEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      title: `${event.deponentName} - ${event.caseStyle}`,
      start: new Date(event.start),
      end: event.end ? new Date(event.end) : new Date(new Date(event.start).getTime() + 2 * 60 * 60 * 1000), // Default 2 hours
    }));
  }, [events]);

  // Handle event click
  const handleSelectEvent = useCallback(
    (event: CalendarEventUI) => {
      onEventClick(event);
    },
    [onEventClick]
  );

  // Handle slot click (for creating new events)
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (onSlotClick) {
        onSlotClick({ start: slotInfo.start, end: slotInfo.end });
      }
    },
    [onSlotClick]
  );

  // Handle view change
  const handleViewChange = useCallback(
    (newView: (typeof Views)[keyof typeof Views]) => {
      const viewKey = Object.entries(VIEW_MAP).find(([, v]) => v === newView)?.[0] as CalendarViewType;
      if (viewKey) {
        onViewChange(viewKey);
      }
    },
    [onViewChange]
  );

  // Handle navigation
  const handleNavigate = useCallback(
    (newDate: Date) => {
      onDateChange(newDate);
    },
    [onDateChange]
  );

  // Custom event styling
  const eventStyleGetter = useCallback((event: CalendarEventUI) => {
    const _colors = STATUS_COLORS[event.status] || STATUS_COLORS.SCHEDULED;
    
    return {
      style: {
        backgroundColor: event.status === 'CANCELLED' ? '#fee2e2' : 
                        event.status === 'CONFIRMED' ? '#dcfce7' :
                        event.status === 'IN_PROGRESS' ? '#fef3c7' :
                        event.status === 'COMPLETED' ? '#f3f4f6' :
                        '#dbeafe',
        borderLeft: `4px solid ${
          event.status === 'CANCELLED' ? '#ef4444' :
          event.status === 'CONFIRMED' ? '#22c55e' :
          event.status === 'IN_PROGRESS' ? '#f59e0b' :
          event.status === 'COMPLETED' ? '#6b7280' :
          '#3b82f6'
        }`,
        color: '#1f2937',
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '0.75rem',
        cursor: 'pointer',
      },
    };
  }, []);

  // Custom event component
  const components = useMemo(
    () => ({
      event: ({ event }: { event: CalendarEventUI }) => (
        <CalendarEventCard 
          event={event} 
          compact={view === 'month'} 
          hasConflict={(event as any).hasConflict}
        />
      ),
    }),
    [view]
  );

  // Loading overlay
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-white rounded-lg border">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-gray-500">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 700 }}
        view={VIEW_MAP[view as Exclude<CalendarViewType, 'timeline'>]}
        date={date}
        onView={handleViewChange}
        onNavigate={handleNavigate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        components={components}
        popup
        showMultiDayTimes
        step={30}
        timeslots={2}
        min={new Date(2024, 0, 1, 7, 0, 0)} // 7 AM start
        max={new Date(2024, 0, 1, 20, 0, 0)} // 8 PM end
        formats={{
          timeGutterFormat: 'h:mm a',
          eventTimeRangeFormat: ({ start, end }) =>
            `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
          dayHeaderFormat: 'EEEE, MMMM d',
          dayRangeHeaderFormat: ({ start, end }) =>
            `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
        }}
        messages={{
          today: 'Today',
          previous: 'Back',
          next: 'Next',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          agenda: 'Agenda',
          noEventsInRange: 'No depositions scheduled in this range.',
        }}
      />
    </div>
  );
}

export default CalendarView;

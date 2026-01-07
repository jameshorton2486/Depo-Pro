'use client';

import { useMemo, useCallback } from 'react';
import type { SlotInfo } from 'react-big-calendar';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

import type {
  CalendarEventUI,
  CalendarViewType,
  CalendarViewProps,
} from './calendar.types';
import { CalendarEventCard } from './CalendarEventCard';
import { CalendarEventTooltip } from './calendar-event-tooltip';

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

  // Custom event styling - using HSL colors from status-colors utility
  const eventStyleGetter = useCallback((event: CalendarEventUI) => {
    // Map CalendarEventStatus to HSL colors (for react-big-calendar which needs inline styles)
    const statusColorMap: Record<string, { bg: string; border: string; text: string }> = {
      CANCELLED: { bg: 'hsl(0, 84%, 95%)', border: 'hsl(0, 84%, 60%)', text: 'hsl(0, 84%, 30%)' },
      CONFIRMED: { bg: 'hsl(142, 76%, 95%)', border: 'hsl(142, 76%, 36%)', text: 'hsl(142, 76%, 20%)' },
      IN_PROGRESS: { bg: 'hsl(199, 89%, 95%)', border: 'hsl(199, 89%, 48%)', text: 'hsl(199, 89%, 25%)' },
      COMPLETED: { bg: 'hsl(220, 9%, 95%)', border: 'hsl(220, 9%, 46%)', text: 'hsl(220, 9%, 25%)' },
      SCHEDULED: { bg: 'hsl(217, 91%, 95%)', border: 'hsl(217, 91%, 60%)', text: 'hsl(217, 91%, 30%)' },
    };
    
    const colors = statusColorMap[event.status] || statusColorMap.SCHEDULED;
    
    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        color: colors.text,
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '0.75rem',
        cursor: 'pointer',
      },
    };
  }, []);

  // Custom event component with tooltip
  const components = useMemo(
    () => ({
      event: ({ event }: { event: CalendarEventUI }) => (
        <CalendarEventTooltip event={event}>
          <CalendarEventCard 
            event={event} 
            compact={view === 'month'} 
            hasConflict={(event as any).hasConflict}
          />
        </CalendarEventTooltip>
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
        style={{ height: '700px' }}
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

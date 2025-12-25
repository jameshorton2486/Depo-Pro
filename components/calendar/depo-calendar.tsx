// ============================================================
// DEPO-PRO CALENDAR COMPONENT
// Path: components/calendar/depo-calendar.tsx
// ============================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { useSession } from 'next-auth/react';
import { CalendarEventModal } from './calendar-event-modal';
import { CalendarEventDetail } from './calendar-event-detail';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, RefreshCw, Filter } from 'lucide-react';
import { toast } from 'sonner';

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    eventType: string;
    status: string;
    location?: string;
    isRemote: boolean;
    meetingLink?: string;
    assignedReporter?: {
      id: string;
      name: string;
      email: string;
    };
    requestedBy?: {
      id: string;
      name: string;
      email: string;
    };
    job?: {
      id: string;
      caseName: string;
      status: string;
    };
    participants?: any[];
    notes?: string;
    timezone: string;
  };
}

interface DepoCalendarProps {
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  reporters?: Array<{ id: string; name: string }>;
}

// ------------------------------------------------------------
// STATUS COLORS (matching API)
// ------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  REQUESTED: { bg: '#FFA500', text: '#fff', label: 'Requested' },
  SCHEDULED: { bg: '#3788D8', text: '#fff', label: 'Scheduled' },
  CONFIRMED: { bg: '#28A745', text: '#fff', label: 'Confirmed' },
  IN_PROGRESS: { bg: '#17A2B8', text: '#fff', label: 'In Progress' },
  COMPLETED: { bg: '#6C757D', text: '#fff', label: 'Completed' },
  CANCELLED: { bg: '#DC3545', text: '#fff', label: 'Cancelled' },
  RESCHEDULED: { bg: '#9B59B6', text: '#fff', label: 'Rescheduled' },
};

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

export function DepoCalendar({ 
  initialView = 'dayGridMonth',
  reporters = [],
}: DepoCalendarProps) {
  const { data: session } = useSession();
  const calendarRef = useRef<FullCalendar>(null);
  
  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentView, setCurrentView] = useState(initialView);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reporterFilter, setReporterFilter] = useState<string>('all');

  // User role checks
  const userRole = session?.user?.role || 'ATTORNEY';
  const canCreateEvents = ['AGENCY', 'ADMIN'].includes(userRole);
  const canDragDrop = ['AGENCY', 'ADMIN'].includes(userRole);

  // ------------------------------------------------------------
  // DATA FETCHING
  // ------------------------------------------------------------

  const fetchEvents = useCallback(async (start?: Date, end?: Date) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (start && end) {
        params.set('start', start.toISOString());
        params.set('end', end.toISOString());
      }
      
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      
      if (reporterFilter !== 'all') {
        params.set('reporterId', reporterFilter);
      }

      const response = await fetch(`/api/calendar/events?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, reporterFilter]);

  // Initial fetch and refetch on filter change
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      const start = calendarApi.view.activeStart;
      const end = calendarApi.view.activeEnd;
      fetchEvents(start, end);
    } else {
      fetchEvents();
    }
  }, [fetchEvents]);

  // ------------------------------------------------------------
  // EVENT HANDLERS
  // ------------------------------------------------------------

  // Date range change (when navigating months/weeks)
  const handleDatesSet = useCallback((arg: { start: Date; end: Date }) => {
    fetchEvents(arg.start, arg.end);
  }, [fetchEvents]);

  // Click on event
  const handleEventClick = useCallback((arg: EventClickArg) => {
    const event = events.find(e => e.id === arg.event.id);
    if (event) {
      setSelectedEvent(event);
      setIsDetailOpen(true);
    }
  }, [events]);

  // Select date range (for creating new event)
  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    if (!canCreateEvents) {
      toast.info('Contact your agency to schedule depositions');
      return;
    }
    
    setSelectedDateRange({
      start: arg.start,
      end: arg.end,
    });
    setIsCreateModalOpen(true);
  }, [canCreateEvents]);

  // Drag and drop to reschedule
  const handleEventDrop = useCallback(async (arg: EventDropArg) => {
    if (!canDragDrop) {
      arg.revert();
      return;
    }

    const { event } = arg;
    
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: event.start?.toISOString(),
          endTime: event.end?.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Handle conflict
        if (response.status === 409) {
          toast.error('Conflict detected', {
            description: 'Reporter already has an event at this time',
          });
          arg.revert();
          return;
        }
        
        throw new Error(data.error || 'Failed to update');
      }

      toast.success('Event rescheduled');
      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to reschedule event');
      arg.revert();
    }
  }, [canDragDrop, fetchEvents]);

  // Event resize
  const handleEventResize = useCallback(async (arg: any) => {
    if (!canDragDrop) {
      arg.revert();
      return;
    }

    const { event } = arg;

    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: event.start?.toISOString(),
          endTime: event.end?.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      toast.success('Event duration updated');
    } catch (error) {
      console.error('Error resizing event:', error);
      toast.error('Failed to update event');
      arg.revert();
    }
  }, [canDragDrop]);

  // Create event callback
  const handleEventCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    setSelectedDateRange(null);
    fetchEvents();
    toast.success('Event created successfully');
  }, [fetchEvents]);

  // Update event callback  
  const handleEventUpdated = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedEvent(null);
    fetchEvents();
    toast.success('Event updated successfully');
  }, [fetchEvents]);

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* View Selector */}
          <Select value={currentView} onValueChange={(v: any) => setCurrentView(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dayGridMonth">Month</SelectItem>
              <SelectItem value="timeGridWeek">Week</SelectItem>
              <SelectItem value="timeGridDay">Day</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_COLORS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reporter Filter (Agency/Admin only) */}
          {canCreateEvents && reporters.length > 0 && (
            <Select value={reporterFilter} onValueChange={setReporterFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Reporter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reporters</SelectItem>
                {reporters.map(reporter => (
                  <SelectItem key={reporter.id} value={reporter.id}>
                    {reporter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => fetchEvents()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Legend */}
          <div className="hidden md:flex items-center gap-2">
            {Object.entries(STATUS_COLORS).slice(0, 4).map(([key, { bg, label }]) => (
              <Badge 
                key={key} 
                style={{ backgroundColor: bg }}
                className="text-white text-xs"
              >
                {label}
              </Badge>
            ))}
          </div>

          {/* Create Button (Agency/Admin only) */}
          {canCreateEvents && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white rounded-lg border shadow-sm p-4">
        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '', // We handle view switching in our toolbar
            }}
            events={events}
            editable={canDragDrop}
            selectable={canCreateEvents}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            nowIndicator={true}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short',
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={true}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            select={handleDateSelect}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventContent={(arg) => (
              <div className="p-1 overflow-hidden">
                <div className="font-medium text-xs truncate">{arg.event.title}</div>
                {arg.event.extendedProps.assignedReporter && (
                  <div className="text-xs opacity-80 truncate">
                    {arg.event.extendedProps.assignedReporter.name}
                  </div>
                )}
              </div>
            )}
            height="auto"
            aspectRatio={1.8}
          />
        )}
      </div>

      {/* Create Event Modal */}
      <CalendarEventModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedDateRange(null);
        }}
        onSuccess={handleEventCreated}
        initialDateRange={selectedDateRange}
        reporters={reporters}
      />

      {/* Event Detail Sidebar/Modal */}
      <CalendarEventDetail
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onUpdate={handleEventUpdated}
        canEdit={canCreateEvents}
      />
    </div>
  );
}

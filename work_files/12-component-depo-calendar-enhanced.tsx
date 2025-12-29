// ============================================================
// PHASE 4: ENHANCED DEPO-CALENDAR COMPONENT
// Path: components/calendar/depo-calendar.tsx (REPLACEMENT)
// ============================================================
// Full drag-and-drop with conflict detection, undo, and previews
// ============================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  EventClickArg, 
  DateSelectArg, 
  EventDropArg,
  EventResizeDoneArg,
} from '@fullcalendar/core';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CalendarEventModal } from './calendar-event-modal';
import { CalendarEventDetail } from './calendar-event-detail';
import { ConflictDialog } from './conflict-dialog';
import { DragPreview } from './drag-preview';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, RefreshCw, Filter, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useRescheduleUndo } from '@/hooks/use-undo-toast';

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
  editable?: boolean;
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

interface Conflict {
  type: string;
  conflictingEventId: string;
  conflictingEventTitle: string;
  conflictingStart: string;
  conflictingEnd: string;
  overlapMinutes: number;
  reporterName?: string;
  location?: string;
  severity: 'WARNING' | 'ERROR';
  message: string;
}

interface AlternativeTimeSlot {
  start: string;
  end: string;
}

interface DepoCalendarProps {
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  reporters?: Array<{ id: string; name: string }>;
}

// ------------------------------------------------------------
// STATUS COLORS
// ------------------------------------------------------------

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  REQUESTED: { bg: '#FFA500', text: '#fff', label: 'Requested' },
  SCHEDULED: { bg: '#3788D8', text: '#fff', label: 'Scheduled' },
  CONFIRMED: { bg: '#28A745', text: '#fff', label: 'Confirmed' },
  IN_PROGRESS: { bg: '#17A2B8', text: '#fff', label: 'In Progress' },
  COMPLETED: { bg: '#6C757D', text: '#fff', label: 'Completed' },
  CANCELLED: { bg: '#DC3545', text: '#fff', label: 'Cancelled' },
  RESCHEDULED: { bg: '#9B59B6', text: '#fff', label: 'Rescheduled' },
  CONVERTED: { bg: '#4F46E5', text: '#fff', label: 'Converted' },
};

// Locked statuses - cannot be dragged
const LOCKED_STATUSES = ['CONVERTED', 'CANCELLED', 'COMPLETED'];

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

export function DepoCalendar({ 
  initialView = 'dayGridMonth',
  reporters = [],
}: DepoCalendarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const { showRescheduleUndo } = useRescheduleUndo();
  
  // Core state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentView, setCurrentView] = useState(initialView);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reporterFilter, setReporterFilter] = useState<string>('all');

  // Phase 4: Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewData, setDragPreviewData] = useState<{
    eventTitle: string;
    proposedStart: Date | null;
    proposedEnd: Date | null;
    isChecking: boolean;
    hasConflicts: boolean;
    conflictCount: number;
    canDrop: boolean;
    position: { x: number; y: number };
  }>({
    eventTitle: '',
    proposedStart: null,
    proposedEnd: null,
    isChecking: false,
    hasConflicts: false,
    conflictCount: 0,
    canDrop: true,
    position: { x: 0, y: 0 },
  });

  // Phase 4: Conflict dialog state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [pendingReschedule, setPendingReschedule] = useState<{
    eventId: string;
    eventTitle: string;
    newStart: Date;
    newEnd: Date;
    revertFn: () => void;
  } | null>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<Conflict[]>([]);
  const [canOverrideConflicts, setCanOverrideConflicts] = useState(false);
  const [suggestedAlternatives, setSuggestedAlternatives] = useState<AlternativeTimeSlot[]>([]);

  // User role checks
  const userRole = session?.user?.role || 'ATTORNEY';
  const canCreateEvents = ['AGENCY', 'ADMIN'].includes(userRole);
  const canDragDrop = ['AGENCY', 'ADMIN'].includes(userRole);

  // ------------------------------------------------------------
  // REFRESH EVENT LISTENER
  // ------------------------------------------------------------

  useEffect(() => {
    const handleRefresh = () => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        fetchEvents(calendarApi.view.activeStart, calendarApi.view.activeEnd);
      }
    };

    window.addEventListener('calendar-refresh', handleRefresh);
    return () => window.removeEventListener('calendar-refresh', handleRefresh);
  }, []);

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
      
      // Process events to set editability based on status
      const processedEvents = data.events.map((event: CalendarEvent) => ({
        ...event,
        editable: canDragDrop && !LOCKED_STATUSES.includes(event.extendedProps.status),
      }));
      
      setEvents(processedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, reporterFilter, canDragDrop]);

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

  const handleDatesSet = useCallback((arg: { start: Date; end: Date }) => {
    fetchEvents(arg.start, arg.end);
  }, [fetchEvents]);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const event = events.find(e => e.id === arg.event.id);
    if (event) {
      setSelectedEvent(event);
      setIsDetailOpen(true);
    }
  }, [events]);

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

  // ------------------------------------------------------------
  // PHASE 4: DRAG AND DROP WITH CONFLICT DETECTION
  // ------------------------------------------------------------

  const handleEventDragStart = useCallback((info: any) => {
    if (!canDragDrop) return;
    
    const status = info.event.extendedProps?.status;
    if (LOCKED_STATUSES.includes(status)) {
      toast.error(`Cannot move ${status.toLowerCase()} events`);
      return;
    }
    
    setIsDragging(true);
    setDragPreviewData(prev => ({
      ...prev,
      eventTitle: info.event.title,
      isChecking: false,
      hasConflicts: false,
      canDrop: true,
    }));
  }, [canDragDrop]);

  const handleEventDragStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleEventDrop = useCallback(async (arg: EventDropArg) => {
    if (!canDragDrop) {
      arg.revert();
      return;
    }

    const { event } = arg;
    const status = event.extendedProps?.status;
    
    // Check if locked
    if (LOCKED_STATUSES.includes(status)) {
      toast.error(`Cannot reschedule ${status.toLowerCase()} events`);
      arg.revert();
      return;
    }

    const newStart = event.start!;
    const newEnd = event.end!;
    
    try {
      // First, check for conflicts via preview
      const previewResponse = await fetch(`/api/calendar/events/${event.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        }),
      });

      const previewData = await previewResponse.json();

      if (previewData.isLocked) {
        toast.error('This event is locked and cannot be rescheduled');
        arg.revert();
        return;
      }

      // If there are conflicts, show dialog
      if (previewData.hasConflicts) {
        setDetectedConflicts(previewData.conflicts);
        setCanOverrideConflicts(previewData.canOverride);
        setSuggestedAlternatives(previewData.suggestedAlternatives || []);
        setPendingReschedule({
          eventId: event.id,
          eventTitle: event.title,
          newStart,
          newEnd,
          revertFn: arg.revert,
        });
        setConflictDialogOpen(true);
        return;
      }

      // No conflicts - proceed with reschedule
      await performReschedule(event.id, event.title, newStart, newEnd);
      
    } catch (error) {
      console.error('Error checking conflicts:', error);
      toast.error('Failed to reschedule event');
      arg.revert();
    }
  }, [canDragDrop]);

  // Perform the actual reschedule
  const performReschedule = async (
    eventId: string,
    eventTitle: string,
    newStart: Date,
    newEnd: Date,
    forceOverride: boolean = false,
    overrideReason?: string
  ) => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          forceOverride,
          overrideReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule');
      }

      // Show undo toast
      if (data.undoToken && data.event) {
        showRescheduleUndo({
          eventId,
          eventTitle,
          undoToken: data.undoToken,
          previousStart: new Date(data.event.previousStart),
          previousEnd: new Date(data.event.previousEnd),
          newStart: new Date(data.event.startTime),
          newEnd: new Date(data.event.endTime),
        });
      } else {
        toast.success('Event rescheduled');
      }

      // Refresh calendar
      fetchEvents();
      
      return true;
    } catch (error) {
      console.error('Reschedule failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reschedule');
      return false;
    }
  };

  // Handle conflict override
  const handleConflictOverride = async (reason: string) => {
    if (!pendingReschedule) return;

    const success = await performReschedule(
      pendingReschedule.eventId,
      pendingReschedule.eventTitle,
      pendingReschedule.newStart,
      pendingReschedule.newEnd,
      true,
      reason
    );

    if (!success) {
      pendingReschedule.revertFn();
    }

    setConflictDialogOpen(false);
    setPendingReschedule(null);
  };

  // Handle selecting alternative time
  const handleSelectAlternative = async (start: Date, end: Date) => {
    if (!pendingReschedule) return;

    // Revert the original drag
    pendingReschedule.revertFn();

    // Schedule at the alternative time
    const success = await performReschedule(
      pendingReschedule.eventId,
      pendingReschedule.eventTitle,
      start,
      end
    );

    if (!success) {
      toast.error('Failed to reschedule to alternative time');
    }

    setConflictDialogOpen(false);
    setPendingReschedule(null);
  };

  // Handle conflict dialog cancel
  const handleConflictCancel = () => {
    if (pendingReschedule) {
      pendingReschedule.revertFn();
    }
    setConflictDialogOpen(false);
    setPendingReschedule(null);
  };

  // Handle resize
  const handleEventResize = useCallback(async (arg: EventResizeDoneArg) => {
    if (!canDragDrop) {
      arg.revert();
      return;
    }

    const { event } = arg;
    const status = event.extendedProps?.status;

    if (LOCKED_STATUSES.includes(status)) {
      toast.error(`Cannot resize ${status.toLowerCase()} events`);
      arg.revert();
      return;
    }

    try {
      const response = await fetch(`/api/calendar/events/${event.id}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: event.end?.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        if (response.status === 409) {
          toast.error('Conflict detected', {
            description: 'Extending this event would create scheduling conflicts',
          });
          arg.revert();
          return;
        }
        
        throw new Error(data.error || 'Failed to resize');
      }

      toast.success('Event duration updated');
      fetchEvents();
    } catch (error) {
      console.error('Error resizing event:', error);
      toast.error('Failed to resize event');
      arg.revert();
    }
  }, [canDragDrop, fetchEvents]);

  // Callbacks for modals
  const handleEventCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    setSelectedDateRange(null);
    fetchEvents();
    toast.success('Event created successfully');
  }, [fetchEvents]);

  const handleEventUpdated = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedEvent(null);
    fetchEvents();
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

          {/* Reporter Filter */}
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

          {/* Create Button */}
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
              right: '',
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
            snapDuration="00:15:00"
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            select={handleDateSelect}
            eventDragStart={handleEventDragStart}
            eventDragStop={handleEventDragStop}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventContent={(arg) => (
              <div className="p-1 overflow-hidden relative">
                <div className="font-medium text-xs truncate flex items-center gap-1">
                  {LOCKED_STATUSES.includes(arg.event.extendedProps.status) && (
                    <Lock className="h-3 w-3 opacity-70" />
                  )}
                  {arg.event.title}
                </div>
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

      {/* Drag Preview */}
      <DragPreview
        isVisible={isDragging}
        eventTitle={dragPreviewData.eventTitle}
        proposedStart={dragPreviewData.proposedStart}
        proposedEnd={dragPreviewData.proposedEnd}
        isChecking={dragPreviewData.isChecking}
        hasConflicts={dragPreviewData.hasConflicts}
        conflictCount={dragPreviewData.conflictCount}
        canDrop={dragPreviewData.canDrop}
        position={dragPreviewData.position}
      />

      {/* Conflict Dialog */}
      <ConflictDialog
        isOpen={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
        conflicts={detectedConflicts}
        canOverride={canOverrideConflicts}
        suggestedAlternatives={suggestedAlternatives}
        eventTitle={pendingReschedule?.eventTitle || ''}
        onOverride={handleConflictOverride}
        onSelectAlternative={handleSelectAlternative}
        onCancel={handleConflictCancel}
      />

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

      {/* Event Detail Sidebar */}
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

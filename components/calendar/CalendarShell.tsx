'use client';

import { useState, useCallback, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  format,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  Filter,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

import { CalendarView } from './CalendarView';
import { CalendarTimeline } from './CalendarTimeline';
import { EventDetailsDrawer } from './EventDetailsDrawer';
import { CreateEventModal } from './CreateEventModal';
import {
  CalendarEventUI,
  CalendarViewType,
  CalendarShellProps,
  CalendarEventStatus,
} from './calendar.types';
import { detectConflicts } from '@/lib/calendar/calendar-utils';

// ============================================
// CALENDAR SHELL COMPONENT
// ============================================

export function CalendarShell({
  userRole,
  userId,
  firmId,
  agencyId,
  initialEvents = [],
}: CalendarShellProps) {
  const router = useRouter();
  const [_isPending, startTransition] = useTransition();

  // State - use initialEvents if provided, otherwise empty array
  const [events, setEvents] = useState<CalendarEventUI[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(initialEvents.length === 0);
  const hasInitialDataRef = useRef(initialEvents.length > 0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>('week');
  
  // Modals/Drawers
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventUI | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | undefined>();
  
  // Filters
  const [statusFilters, setStatusFilters] = useState<CalendarEventStatus[]>([
    'SCHEDULED',
    'CONFIRMED',
    'IN_PROGRESS',
  ]);
  const [showCancelled, setShowCancelled] = useState(false);

  // Reporters list (for assignment dropdown)
  const [reporters, setReporters] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

  // ============================================
  // PERMISSIONS
  // ============================================

  const canCreateEvents = ['ADMIN', 'AGENCY_ADMIN', 'REPORTER'].includes(userRole);
  const canAssignReporters = ['ADMIN', 'AGENCY_ADMIN'].includes(userRole);
  const canEditEvents = ['ADMIN', 'AGENCY_ADMIN', 'REPORTER'].includes(userRole);
  const canCancelEvents = ['ADMIN', 'AGENCY_ADMIN'].includes(userRole);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on view
      let start: Date;
      let end: Date;
      
      if (view === 'month') {
        start = startOfWeek(startOfMonth(currentDate));
        end = endOfWeek(endOfMonth(currentDate));
      } else if (view === 'week') {
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
      } else {
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
      }

      // Build query params
      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      if (statusFilters.length > 0) {
        params.set('status', statusFilters.join(','));
      }
      if (showCancelled) {
        params.set('showCancelled', 'true');
      }
      if (firmId) {
        params.set('firmId', firmId);
      }
      if (agencyId) {
        params.set('agencyId', agencyId);
      }
      // For reporters, only show their assigned events
      if (userRole === 'REPORTER') {
        params.set('assignedReporterId', userId);
      }

      const response = await fetch(`/api/calendar?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      
          // Transform dates - API returns start/end (already Date objects or ISO strings)
      const transformedEvents: CalendarEventUI[] = data.events.map((event: any) => ({
        ...event,
        start: event.start ? new Date(event.start) : (event.startTime ? new Date(event.startTime) : new Date()),
        end: event.end ? new Date(event.end) : (event.endTime ? new Date(event.endTime) : new Date(event.start).getTime() + 2 * 60 * 60 * 1000), // Default 2 hours if no end
      }));

      // Detect conflicts
      const conflictIds = detectConflicts(transformedEvents);
      
      // Add conflict flag to events
      const eventsWithConflicts = transformedEvents.map(event => ({
        ...event,
        hasConflict: conflictIds.has(event.id),
      }));

      setEvents(eventsWithConflicts);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, view, statusFilters, showCancelled, firmId, agencyId, userRole, userId]);

  // Fetch reporters for assignment dropdown
  const fetchReporters = useCallback(async () => {
    if (!canAssignReporters) return;
    
    try {
      const params = new URLSearchParams();
      if (firmId) params.set('firmId', firmId);
      if (agencyId) params.set('agencyId', agencyId);
      
      const response = await fetch(`/api/users/reporters?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch reporters');
      
      const data = await response.json();
      setReporters(data.reporters || []);
    } catch (error) {
      console.error('Error fetching reporters:', error);
    }
  }, [canAssignReporters, firmId, agencyId]);

  // Fetch reporters on mount
  useEffect(() => {
    fetchReporters();
  }, [fetchReporters]);
  
  // Refetch events when filters, view, or date change
  // Skip initial fetch if we have server-provided initialEvents
  useEffect(() => {
    if (hasInitialDataRef.current) {
      // We have initial data from server, skip the initial fetch
      // but allow subsequent refetches when filters/view change
      hasInitialDataRef.current = false;
      return;
    }
    // User changed filters/view/date, refetch
    fetchEvents();
  }, [fetchEvents, currentDate, view, statusFilters, showCancelled]);

  // ============================================
  // NAVIGATION HANDLERS
  // ============================================

  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
    }
  };
  
  const goToNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
    }
  };

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleEventClick = (event: CalendarEventUI) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const handleSlotClick = (slotInfo: { start: Date; end: Date }) => {
    if (!canCreateEvents) {
      toast.error('You do not have permission to create events');
      return;
    }
    setCreateDefaultDate(slotInfo.start);
    setIsCreateOpen(true);
  };

  const handleCreateEvent = async (data: any) => {
    // Combine date and time
    const scheduledDate = data.scheduledDate;
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const scheduledStart = new Date(scheduledDate);
    scheduledStart.setHours(startHours, startMinutes, 0, 0);

    let scheduledEnd: Date | undefined;
    if (data.endTime) {
      const [endHours, endMinutes] = data.endTime.split(':').map(Number);
      scheduledEnd = new Date(scheduledDate);
      scheduledEnd.setHours(endHours, endMinutes, 0, 0);
    }

    const eventData = {
      ...data,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd?.toISOString(),
      firmId,
      agencyId,
    };

    const response = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create event');
    }

    // Refresh events
    await fetchEvents();
  };

  const handleConvertToJob = async (eventId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/calendar/${eventId}/convert-to-job`, {
          method: 'POST',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to convert to job');
        }

        const data = await response.json();
        toast.success('Event converted to job successfully');
        
        // Close drawer and refresh
        setIsDetailsOpen(false);
        setSelectedEvent(null);
        await fetchEvents();

        // Navigate to job page
        router.push(`/jobs/${data.jobId}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to convert to job');
      }
    });
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to cancel this deposition?')) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/calendar/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to cancel event');
        }

        toast.success('Deposition cancelled');
        setIsDetailsOpen(false);
        setSelectedEvent(null);
        await fetchEvents();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to cancel event');
      }
    });
  };

  // ============================================
  // FILTER HANDLERS
  // ============================================

  const toggleStatusFilter = (status: CalendarEventStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
            {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            {view === 'agenda' && format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchEvents()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={statusFilters.includes('SCHEDULED')}
                onCheckedChange={() => toggleStatusFilter('SCHEDULED')}
              >
                Scheduled
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilters.includes('CONFIRMED')}
                onCheckedChange={() => toggleStatusFilter('CONFIRMED')}
              >
                Confirmed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilters.includes('IN_PROGRESS')}
                onCheckedChange={() => toggleStatusFilter('IN_PROGRESS')}
              >
                In Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilters.includes('COMPLETED')}
                onCheckedChange={() => toggleStatusFilter('COMPLETED')}
              >
                Completed
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={showCancelled}
                onCheckedChange={setShowCancelled}
              >
                Show Cancelled
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {view === 'month' && <LayoutGrid className="h-4 w-4 mr-2" />}
                {view === 'week' && <CalendarIcon className="h-4 w-4 mr-2" />}
                {view === 'day' && <CalendarIcon className="h-4 w-4 mr-2" />}
                {view === 'agenda' && <List className="h-4 w-4 mr-2" />}
                {view === 'timeline' && <CalendarIcon className="h-4 w-4 mr-2" />}
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setView('month')}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('week')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('day')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Day
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('agenda')}>
                <List className="h-4 w-4 mr-2" />
                Agenda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Button */}
          {canCreateEvents && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Deposition
            </Button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4 bg-gray-50">
        {view === 'timeline' ? (
          <CalendarTimeline
            events={events}
            role={userRole}
            onEventClick={handleEventClick}
          />
        ) : (
          <CalendarView
            events={events}
            view={view}
            date={currentDate}
            onViewChange={setView}
            onDateChange={setCurrentDate}
            onEventClick={handleEventClick}
            onSlotClick={canCreateEvents ? handleSlotClick : undefined}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Event Details Drawer */}
      <EventDetailsDrawer
        event={selectedEvent}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedEvent(null);
        }}
        onEdit={canEditEvents ? () => {
          // TODO: Open edit modal
          toast.info('Edit functionality coming soon');
        } : undefined}
        onConvertToJob={handleConvertToJob}
        onCancel={canCancelEvents ? handleCancelEvent : undefined}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateDefaultDate(undefined);
        }}
        onSubmit={handleCreateEvent}
        defaultDate={createDefaultDate}
        reporters={canAssignReporters ? reporters : []}
      />
    </div>
  );
}

export default CalendarShell;

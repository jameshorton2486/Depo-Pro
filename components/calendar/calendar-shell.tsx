'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  status: string;
  location: string | null;
  isRemote: boolean;
  assignedReporter: { firstName: string | null; lastName: string | null } | null;
  caseName: string | null;
}

interface CalendarShellProps {
  userRole: string;
  userId: string;
  firmId?: string;
  agencyId?: string;
}

export function CalendarShell({ userRole, userId, firmId, agencyId }: CalendarShellProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      if (firmId) params.set('firmId', firmId);
      if (agencyId) params.set('agencyId', agencyId);
      if (userRole === 'COURT_REPORTER') {
        params.set('assignedReporterId', userId);
      }

      const response = await fetch(`/api/calendar?${params.toString()}`);
      
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      
      const transformed = (data.events || []).map((e: Record<string, unknown>) => ({
        ...e,
        start: new Date(e.start as string),
        end: e.end ? new Date(e.end as string) : null,
      }));

      setEvents(transformed);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, firmId, agencyId, userRole, userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const eventsByDate = events.reduce((acc, event) => {
    const key = format(event.start, 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => subMonths(prev, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addMonths(prev, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchEvents} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 bg-gray-50 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="text-lg">No events scheduled</p>
            <p className="text-sm mt-1">Events will appear here once created</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(eventsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, dayEvents]) => (
                <div key={dateKey} className="bg-white rounded-lg border p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{event.title}</h4>
                            {event.caseName && <p className="text-sm text-gray-600">{event.caseName}</p>}
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            {event.status}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 flex gap-4">
                          <span>{format(event.start, 'h:mm a')}</span>
                          {event.location && <span>{event.isRemote ? '📹 Remote' : `📍 ${event.location}`}</span>}
                          {event.assignedReporter && (
                            <span>👤 {event.assignedReporter.firstName} {event.assignedReporter.lastName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarShell;

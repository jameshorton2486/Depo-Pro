// ============================================
// useCalendarEvents Hook
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { CalendarEventUI, CalendarFilters } from '@/lib/calendar/types';

interface UseCalendarEventsOptions {
  startDate: Date;
  endDate: Date;
  filters?: CalendarFilters;
  firmId?: string;
  agencyId?: string;
  userId?: string;
  userRole?: string;
}

interface UseCalendarEventsReturn {
  events: CalendarEventUI[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCalendarEvents(
  options: UseCalendarEventsOptions
): UseCalendarEventsReturn {
  const { startDate, endDate, filters, firmId, agencyId, userId, userRole } = options;
  
  const [events, setEvents] = useState<CalendarEventUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (firmId) params.set('firmId', firmId);
      if (agencyId) params.set('agencyId', agencyId);
      
      // Reporters only see their own events
      if (userRole === 'REPORTER' && userId) {
        params.set('assignedReporterId', userId);
      }

      if (filters?.status && filters.status.length > 0) {
        params.set('status', filters.status.join(','));
      }

      if (filters?.assignedToMe && userId) {
        params.set('assignedReporterId', userId);
      }

      const response = await fetch(`/api/calendar?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API events to UI events (parse dates)
      // API returns start/end as ISO strings (serialized from Date objects)
      const transformedEvents = (data.events || []).map((event: any) => {
        return {
          ...event,
          start: new Date(event.start),
          end: event.end ? new Date(event.end) : null,
        } as CalendarEventUI;
      });

      setEvents(transformedEvents);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Calendar events fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, firmId, agencyId, userId, userRole, filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
  };
}


// ============================================
// useCalendarFilters Hook
// ============================================

import { useState, useMemo } from 'react';
import type { CalendarFilters } from '@/lib/calendar/types';

interface UseCalendarFiltersReturn {
  filters: CalendarFilters;
  setFilter: <K extends keyof CalendarFilters>(
    key: K,
    value: CalendarFilters[K]
  ) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useCalendarFilters(
  initialStartDate: Date,
  initialEndDate: Date
): UseCalendarFiltersReturn {
  const [filters, setFilters] = useState<CalendarFilters>({
    startDate: initialStartDate,
    endDate: initialEndDate,
    eventTypes: undefined,
    status: undefined,
    assignedToMe: false,
  } as CalendarFilters);

  const setFilter = <K extends keyof CalendarFilters>(
    key: K,
    value: CalendarFilters[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: initialStartDate,
      endDate: initialEndDate,
      eventTypes: undefined,
      status: undefined,
      assignedToMe: false,
    } as CalendarFilters);
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.eventTypes?.length ||
      filters.status?.length ||
      filters.assignedToMe
    );
  }, [filters]);

  return {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
  };
}


// ============================================
// useCalendarNavigation Hook
// ============================================

import { useState, useMemo } from 'react';
import { getMonthDateRange } from '@/lib/calendar/utils';

interface UseCalendarNavigationReturn {
  currentDate: Date;
  dateRange: { start: Date; end: Date };
  goToNext: () => void;
  goToPrevious: () => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;
}

export function useCalendarNavigation(
  initialDate?: Date,
  view: 'grid' | 'timeline' = 'grid'
): UseCalendarNavigationReturn {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());

  const dateRange = useMemo(() => {
    if (view === 'grid') {
      return getMonthDateRange(currentDate);
    } else {
      // For timeline, use month range for now (can be adjusted to week)
      return getMonthDateRange(currentDate);
    }
  }, [currentDate, view]);

  const goToNext = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToDate = (date: Date) => {
    setCurrentDate(date);
  };

  return {
    currentDate,
    dateRange,
    goToNext,
    goToPrevious,
    goToToday,
    goToDate,
  };
}


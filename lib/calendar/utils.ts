// ============================================
// Calendar Utility Functions
// ============================================

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday as dateFnsIsToday,
  format,
  differenceInDays,
} from 'date-fns';
import type { CalendarEventUI, DayEvents } from './types';

/**
 * Get date range for a month (start of first week to end of last week)
 */
export function getMonthDateRange(date: Date): { start: Date; end: Date } {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday = 0
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  return { start: calendarStart, end: calendarEnd };
}

/**
 * Get date range for a week
 */
export function getWeekDateRange(date: Date): { start: Date; end: Date } {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
  
  return { start: weekStart, end: weekEnd };
}

// Note: Using date-fns isSameDay directly, no wrapper needed

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return dateFnsIsToday(date);
}

/**
 * Format event time range
 */
export function formatEventTime(startTime: Date, endTime: Date | null): string {
  const start = format(startTime, 'h:mm a');
  if (!endTime) return start;
  
  const end = format(endTime, 'h:mm a');
  return `${start} - ${end}`;
}

/**
 * Format date heading (Today, Tomorrow, or formatted date)
 */
export function formatDateHeading(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (isSameDay(date, today)) {
    return 'Today';
  }
  
  if (isSameDay(date, tomorrow)) {
    return 'Tomorrow';
  }
  
  const diffDays = differenceInDays(date, today);
  if (diffDays === -1) {
    return 'Yesterday';
  }
  
  if (Math.abs(diffDays) <= 7) {
    return format(date, 'EEEE, MMMM d');
  }
  
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Group events by date
 */
export function groupEventsByDate(events: CalendarEventUI[]): Map<string, CalendarEventUI[]> {
  const grouped = new Map<string, CalendarEventUI[]>();
  
  events.forEach((event) => {
    const key = format(event.start, 'yyyy-MM-dd');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(event);
  });
  
  return grouped;
}

/**
 * Sort events by start time
 */
export function sortEventsByTime(events: CalendarEventUI[]): CalendarEventUI[] {
  return [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Get calendar days for a month (including adjacent month days)
 */
export function getCalendarDays(year: number, month: number, events: CalendarEventUI[]): DayEvents[] {
  const date = new Date(year, month, 1);
  const { start, end } = getMonthDateRange(date);
  const days = eachDayOfInterval({ start, end });
  const eventsByDate = groupEventsByDate(events);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const today = new Date();
  
  return days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const dayEvents = sortEventsByTime(eventsByDate.get(key) || []);
    const isCurrentMonth = day >= monthStart && day <= monthEnd;
    const isTodayDate = isSameDay(day, today);
    
    return {
      date: day,
      events: dayEvents,
      isToday: isTodayDate,
      isCurrentMonth,
    };
  });
}

/**
 * Parse ISO date string to Date object
 */
export function parseEventDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Transform API event to UI event (parse dates)
 */
export function transformEventToUI(event: any): CalendarEventUI {
  return {
    ...event,
    start: event.start instanceof Date ? event.start : parseEventDate(event.startTime || event.start),
    end: event.end instanceof Date ? event.end : (event.endTime ? parseEventDate(event.endTime) : new Date(event.start.getTime() + 4 * 60 * 60 * 1000)),
  };
}


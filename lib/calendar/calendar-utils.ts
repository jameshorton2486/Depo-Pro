// ============================================
// CALENDAR UTILITIES
// Date formatting, status colors, and helpers
// ============================================

import { format, parseISO } from 'date-fns';
import type { CalendarEventStatus, CalendarEventUI } from '@/components/calendar/calendar.types';

/**
 * Format event time for display
 * Safely handles invalid dates
 */
export function formatEventTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (isNaN(date.getTime())) {
      return 'TBD';
    }
    return format(date, 'h:mm a');
  } catch {
    return 'TBD';
  }
}

/**
 * Format event date for display
 */
export function formatEventDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (isNaN(date.getTime())) {
      return 'TBD';
    }
    return format(date, 'MMM d, yyyy');
  } catch {
    return 'TBD';
  }
}

/**
 * Format full date and time
 */
export function formatEventDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (isNaN(date.getTime())) {
      return 'TBD';
    }
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return 'TBD';
  }
}

/**
 * Get status color classes for badges
 */
export function getStatusColor(status: CalendarEventStatus): string {
  const themes: Record<CalendarEventStatus, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
    CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    COMPLETED: 'bg-gray-100 text-gray-700 border-gray-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    POSTPONED: 'bg-orange-100 text-orange-700 border-orange-200',
    NO_SHOW: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return themes[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Check if event is in the past
 */
export function isPastEvent(endTime: string | Date): boolean {
  try {
    const date = typeof endTime === 'string' ? parseISO(endTime) : endTime;
    return date < new Date();
  } catch {
    return false;
  }
}

/**
 * Check if event is today
 */
export function isToday(date: string | Date): boolean {
  try {
    const eventDate = typeof date === 'string' ? parseISO(date) : date;
    const today = new Date();
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Get duration in hours between two dates
 */
export function getDurationHours(start: string | Date, end: string | Date): number {
  try {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal
  } catch {
    return 0;
  }
}

/**
 * Detect scheduling conflicts between events
 * Returns a Set of event IDs that have conflicts
 * 
 * Conflicts occur when:
 * - Two events overlap in time
 * - AND they share the same assigned reporter
 * 
 * This is display-only logic - conflicts are calculated client-side
 */
export function detectConflicts(events: CalendarEventUI[]): Set<string> {
  const conflictIds = new Set<string>();
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i];
      const e2 = events[j];
      
      // Skip if either event doesn't have an assigned reporter
      if (!e1.assignedReporter || !e2.assignedReporter) {
        continue;
      }
      
      // Check if same reporter
      const sameReporter = e1.assignedReporter.id === e2.assignedReporter.id;
      if (!sameReporter) {
        continue;
      }
      
      // Check for time overlap
      const start1 = e1.start.getTime();
      const end1 = e1.end.getTime();
      const start2 = e2.start.getTime();
      const end2 = e2.end.getTime();
      
      const isOverlap = start1 < end2 && start2 < end1;
      
      if (isOverlap) {
        conflictIds.add(e1.id);
        conflictIds.add(e2.id);
      }
    }
  }
  
  return conflictIds;
}


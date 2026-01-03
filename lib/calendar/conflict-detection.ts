// =============================================================================
// CONFLICT DETECTION SERVICE
// lib/calendar/conflict-detection.ts
//
// Phase 3A-4: Soft conflict detection for calendar events
// =============================================================================

import { db } from '@/lib/db';

export interface ConflictWarning {
  eventId: string;
  eventTitle: string;
  startTime: Date;
  endTime: Date;
  severity: 'warning' | 'error';
  message: string;
}

/**
 * Check for scheduling conflicts
 * Returns warnings but doesn't block saves (soft detection)
 */
export async function checkConflicts(
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeEventId?: string
): Promise<ConflictWarning[]> {
  const where: any = {
    assignedReporterId: userId,
    id: excludeEventId ? { not: excludeEventId } : undefined,
    status: {
      not: 'CANCELLED',
    },
    OR: [
      // Overlapping: new start is within existing event
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gt: startTime } },
        ],
      },
      // Overlapping: new end is within existing event
      {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gte: endTime } },
        ],
      },
      // Overlapping: new event completely contains existing event
      {
        AND: [
          { startTime: { gte: startTime } },
          { endTime: { lte: endTime } },
        ],
      },
      // Overlapping: existing event completely contains new event
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gte: endTime } },
        ],
      },
    ],
  };

  // Remove undefined fields
  if (!where.id) {
    delete where.id;
  }

  const overlapping = await db.calendarEvent.findMany({
    where,
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
    },
  });

  return overlapping.map((event) => ({
    eventId: event.id,
    eventTitle: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    severity: 'warning' as const,
    message: `Overlaps with "${event.title}"`,
  }));
}

// ============================================================
// PHASE 4: CONFLICT DETECTION SERVICE
// Path: lib/scheduling/conflict-detection.ts
// ============================================================
// Core service for detecting scheduling conflicts
// ============================================================


// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface TimeRange {
  start: Date;
  end: Date;
}

// Export Conflict type for compatibility with components
export interface Conflict {
  id: string;
  type: ConflictType | string;
  severity: 'WARNING' | 'ERROR' | 'low' | 'medium' | 'high';
  conflictEventId: string;
  conflictEventTitle: string;
  eventId?: string;
  eventTitle?: string;
  start: Date;
  end: Date;
  overlapMinutes: number;
  message: string;
}

// Export TimeSlot type for compatibility
export interface TimeSlot {
  start: Date;
  end: Date;
  duration?: number;
  available?: boolean;
}

export interface ConflictCheckParams {
  eventId?: string;           // Exclude this event from conflict check (for updates)
  reporterId?: string;        // Reporter to check
  location?: string;          // Physical location to check
  proposedStart: Date;
  proposedEnd: Date;
  firmId: string;
}

export interface DetectedConflict {
  type: ConflictType;
  conflictingEventId: string;
  conflictingEventTitle: string;
  conflictingStart: Date;
  conflictingEnd: Date;
  overlapMinutes: number;
  reporterName?: string;
  location?: string;
  severity: 'WARNING' | 'ERROR';
  message: string;
}

export type ConflictType = 
  | 'REPORTER_DOUBLE_BOOKED'
  | 'LOCATION_CONFLICT'
  | 'TRAVEL_TIME_INSUFFICIENT'
  | 'RESOURCE_UNAVAILABLE';

// Enum versions for compatibility
export enum ConflictTypeEnum {
  TIME_OVERLAP = "TIME_OVERLAP",
  DOUBLE_BOOKING = "DOUBLE_BOOKING",
  TRAVEL_TIME = "TRAVEL_TIME",
  BREAK_VIOLATION = "BREAK_VIOLATION",
}

export enum ConflictSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: DetectedConflict[];
  canOverride: boolean;
  suggestedAlternatives?: TimeRange[];
  alternativeSlots?: TimeRange[]; // Alias for API compatibility
}

// ------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------

const CONFIG = {
  // Minimum travel time between events (in minutes)
  MIN_TRAVEL_TIME_MINUTES: 30,
  
  // Buffer time before/after events (in minutes)
  BUFFER_TIME_MINUTES: 15,
  
  // Maximum number of alternative times to suggest
  MAX_ALTERNATIVES: 5,
  
  // How far ahead to look for alternatives (in days)
  ALTERNATIVE_SEARCH_DAYS: 7,
};

// ------------------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------------------

/**
 * Check if two time ranges overlap
 */
export function doTimesOverlap(range1: TimeRange, range2: TimeRange): boolean {
  return range1.start < range2.end && range1.end > range2.start;
}

/**
 * Calculate overlap duration in minutes
 */
export function calculateOverlapMinutes(range1: TimeRange, range2: TimeRange): number {
  if (!doTimesOverlap(range1, range2)) return 0;
  
  const overlapStart = new Date(Math.max(range1.start.getTime(), range2.start.getTime()));
  const overlapEnd = new Date(Math.min(range1.end.getTime(), range2.end.getTime()));
  
  return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
}

/**
 * Check if there's sufficient travel time between events
 */
export function hasSufficientTravelTime(
  event1End: Date,
  event2Start: Date,
  requiredMinutes: number = CONFIG.MIN_TRAVEL_TIME_MINUTES
): boolean {
  const gapMinutes = (event2Start.getTime() - event1End.getTime()) / (1000 * 60);
  return gapMinutes >= requiredMinutes;
}

/**
 * Generate a human-readable conflict message
 */
function generateConflictMessage(conflict: Omit<DetectedConflict, 'message'>): string {
  const startTime = conflict.conflictingStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  
  switch (conflict.type) {
    case 'REPORTER_DOUBLE_BOOKED':
      return `${conflict.reporterName} is already scheduled for "${conflict.conflictingEventTitle}" at ${startTime} (${conflict.overlapMinutes} min overlap)`;
    
    case 'LOCATION_CONFLICT':
      return `Location "${conflict.location}" is already booked for "${conflict.conflictingEventTitle}" at ${startTime}`;
    
    case 'TRAVEL_TIME_INSUFFICIENT':
      return `Insufficient travel time to reach "${conflict.conflictingEventTitle}" starting at ${startTime}`;
    
    case 'RESOURCE_UNAVAILABLE':
      return `Required resource is unavailable during this time`;
    
    default:
      return `Scheduling conflict detected with "${conflict.conflictingEventTitle}"`;
  }
}

// ------------------------------------------------------------
// MAIN CONFLICT DETECTION FUNCTION
// ------------------------------------------------------------

/**
 * Check for scheduling conflicts
 */
export async function checkForConflicts(
  params: ConflictCheckParams
): Promise<ConflictCheckResult> {
  const { eventId, reporterId, location, proposedStart, proposedEnd, firmId } = params;
  const conflicts: DetectedConflict[] = [];
  
  // Build the base where clause
  const baseWhere: any = {
    firmId,
    status: {
      notIn: ['CANCELLED', 'COMPLETED'],
    },
    // Exclude the current event if updating
    ...(eventId && { id: { not: eventId } }),
    // Time range overlap check
    OR: [
      {
        // Event starts during proposed time
        startTime: {
          gte: proposedStart,
          lt: proposedEnd,
        },
      },
      {
        // Event ends during proposed time
        endTime: {
          gt: proposedStart,
          lte: proposedEnd,
        },
      },
      {
        // Event spans the entire proposed time
        AND: [
          { startTime: { lte: proposedStart } },
          { endTime: { gte: proposedEnd } },
        ],
      },
    ],
  };

  // 1. Check for reporter double-booking
  if (reporterId) {
    const reporterConflicts = await db.calendarEvent.findMany({
      where: {
        ...baseWhere,
        assignedReporterId: reporterId,
      },
      include: {
        assignedReporter: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    for (const event of reporterConflicts) {
      const overlapMinutes = calculateOverlapMinutes(
        { start: proposedStart, end: proposedEnd },
        { start: event.startTime, end: event.endTime }
      );

      const conflict: Omit<DetectedConflict, 'message'> = {
        type: 'REPORTER_DOUBLE_BOOKED',
        conflictingEventId: event.id,
        conflictingEventTitle: event.title,
        conflictingStart: event.startTime,
        conflictingEnd: event.endTime,
        overlapMinutes,
        reporterName: event.assignedReporter
          ? `${event.assignedReporter.firstName} ${event.assignedReporter.lastName}`
          : 'Unknown Reporter',
        severity: 'ERROR',
      };

      conflicts.push({
        ...conflict,
        message: generateConflictMessage(conflict),
      });
    }
  }

  // 2. Check for location conflicts (physical locations only)
  if (location && !location.toLowerCase().includes('remote') && !location.toLowerCase().includes('zoom')) {
    const locationConflicts = await db.calendarEvent.findMany({
      where: {
        ...baseWhere,
        location: {
          equals: location,
          mode: 'insensitive',
        },
        isRemote: false,
      },
    });

    for (const event of locationConflicts) {
      // Skip if already detected as reporter conflict
      if (conflicts.some(c => c.conflictingEventId === event.id)) continue;

      const overlapMinutes = calculateOverlapMinutes(
        { start: proposedStart, end: proposedEnd },
        { start: event.startTime, end: event.endTime }
      );

      const conflict: Omit<DetectedConflict, 'message'> = {
        type: 'LOCATION_CONFLICT',
        conflictingEventId: event.id,
        conflictingEventTitle: event.title,
        conflictingStart: event.startTime,
        conflictingEnd: event.endTime,
        overlapMinutes,
        location,
        severity: 'WARNING',
      };

      conflicts.push({
        ...conflict,
        message: generateConflictMessage(conflict),
      });
    }
  }

  // 3. Check for travel time conflicts (if reporter has events the same day)
  if (reporterId) {
    const sameDayStart = new Date(proposedStart);
    sameDayStart.setHours(0, 0, 0, 0);
    
    const sameDayEnd = new Date(proposedStart);
    sameDayEnd.setHours(23, 59, 59, 999);

    const sameDayEvents = await db.calendarEvent.findMany({
      where: {
        firmId,
        assignedReporterId: reporterId,
        status: { notIn: ['CANCELLED'] },
        ...(eventId && { id: { not: eventId } }),
        startTime: {
          gte: sameDayStart,
          lte: sameDayEnd,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    for (const event of sameDayEvents) {
      // Skip events that directly overlap (already caught above)
      if (doTimesOverlap(
        { start: proposedStart, end: proposedEnd },
        { start: event.startTime, end: event.endTime }
      )) continue;

      // Check if proposed event is right before this event
      if (proposedEnd <= event.startTime) {
        if (!hasSufficientTravelTime(proposedEnd, event.startTime)) {
          const conflict: Omit<DetectedConflict, 'message'> = {
            type: 'TRAVEL_TIME_INSUFFICIENT',
            conflictingEventId: event.id,
            conflictingEventTitle: event.title,
            conflictingStart: event.startTime,
            conflictingEnd: event.endTime,
            overlapMinutes: 0,
            severity: 'WARNING',
          };

          conflicts.push({
            ...conflict,
            message: generateConflictMessage(conflict),
          });
        }
      }

      // Check if proposed event is right after this event
      if (proposedStart >= event.endTime) {
        if (!hasSufficientTravelTime(event.endTime, proposedStart)) {
          const conflict: Omit<DetectedConflict, 'message'> = {
            type: 'TRAVEL_TIME_INSUFFICIENT',
            conflictingEventId: event.id,
            conflictingEventTitle: event.title,
            conflictingStart: event.startTime,
            conflictingEnd: event.endTime,
            overlapMinutes: 0,
            severity: 'WARNING',
          };

          conflicts.push({
            ...conflict,
            message: generateConflictMessage(conflict),
          });
        }
      }
    }
  }

  // Determine if conflicts can be overridden
  const hasBlockingConflicts = conflicts.some(c => c.severity === 'ERROR');
  const canOverride = !hasBlockingConflicts || conflicts.every(c => c.type !== 'REPORTER_DOUBLE_BOOKED');

  // Generate alternative time suggestions if there are conflicts
  let suggestedAlternatives: TimeRange[] | undefined;
  if (conflicts.length > 0 && reporterId) {
    suggestedAlternatives = await findAlternativeTimeSlots({
      reporterId,
      firmId,
      duration: proposedEnd.getTime() - proposedStart.getTime(),
      preferredDate: proposedStart,
      excludeEventId: eventId,
    });
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    canOverride,
    suggestedAlternatives,
    alternativeSlots: suggestedAlternatives, // API compatibility alias
  };
}

// ------------------------------------------------------------
// ALTERNATIVE TIME SLOT FINDER
// ------------------------------------------------------------

interface AlternativeSearchParams {
  reporterId: string;
  firmId: string;
  duration: number; // in milliseconds
  preferredDate: Date;
  excludeEventId?: string;
}

/**
 * Find available time slots for a reporter
 */
export async function findAlternativeTimeSlots(
  params: AlternativeSearchParams
): Promise<TimeRange[]> {
  const { reporterId, firmId, duration, preferredDate, excludeEventId } = params;
  const alternatives: TimeRange[] = [];
  
  const searchStart = new Date(preferredDate);
  searchStart.setHours(0, 0, 0, 0);
  
  const searchEnd = new Date(searchStart);
  searchEnd.setDate(searchEnd.getDate() + CONFIG.ALTERNATIVE_SEARCH_DAYS);

  // Get all events for the reporter in the search range
  const events = await db.calendarEvent.findMany({
    where: {
      firmId,
      assignedReporterId: reporterId,
      status: { notIn: ['CANCELLED'] },
      ...(excludeEventId && { id: { not: excludeEventId } }),
      startTime: {
        gte: searchStart,
        lte: searchEnd,
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // Business hours: 8 AM to 6 PM
  const BUSINESS_START_HOUR = 8;
  const BUSINESS_END_HOUR = 18;
  const durationMs = duration;
  const _durationMinutes = Math.ceil(durationMs / (1000 * 60));

  // Check each day in the search range
  for (let dayOffset = 0; dayOffset < CONFIG.ALTERNATIVE_SEARCH_DAYS && alternatives.length < CONFIG.MAX_ALTERNATIVES; dayOffset++) {
    const currentDay = new Date(searchStart);
    currentDay.setDate(currentDay.getDate() + dayOffset);
    
    // Skip weekends
    if (currentDay.getDay() === 0 || currentDay.getDay() === 6) continue;

    const dayStart = new Date(currentDay);
    dayStart.setHours(BUSINESS_START_HOUR, 0, 0, 0);
    
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0);

    // Get events for this specific day
    const dayEvents = events.filter(e => {
      const eventDate = new Date(e.startTime);
      return eventDate.toDateString() === currentDay.toDateString();
    });

    // Find gaps between events
    let currentTime = dayStart;

    for (const event of dayEvents) {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      // Check if there's a gap before this event
      const gapStart = new Date(currentTime.getTime() + CONFIG.BUFFER_TIME_MINUTES * 60 * 1000);
      const gapEnd = new Date(eventStart.getTime() - CONFIG.BUFFER_TIME_MINUTES * 60 * 1000);

      if (gapEnd.getTime() - gapStart.getTime() >= durationMs) {
        alternatives.push({
          start: gapStart,
          end: new Date(gapStart.getTime() + durationMs),
        });

        if (alternatives.length >= CONFIG.MAX_ALTERNATIVES) break;
      }

      currentTime = eventEnd;
    }

    // Check for time after the last event
    if (alternatives.length < CONFIG.MAX_ALTERNATIVES) {
      const afterLastEvent = new Date(currentTime.getTime() + CONFIG.BUFFER_TIME_MINUTES * 60 * 1000);
      if (dayEnd.getTime() - afterLastEvent.getTime() >= durationMs) {
        alternatives.push({
          start: afterLastEvent,
          end: new Date(afterLastEvent.getTime() + durationMs),
        });
      }
    }
  }

  return alternatives;
}

// ------------------------------------------------------------
// QUICK AVAILABILITY CHECK
// ------------------------------------------------------------

/**
 * Quick check if a reporter is available at a specific time
 */
export async function isReporterAvailable(
  reporterId: string,
  start: Date,
  end: Date,
  excludeEventId?: string
): Promise<boolean> {
  const conflictCount = await db.calendarEvent.count({
    where: {
      assignedReporterId: reporterId,
      status: { notIn: ['CANCELLED', 'COMPLETED'] },
      ...(excludeEventId && { id: { not: excludeEventId } }),
      OR: [
        {
          startTime: { gte: start, lt: end },
        },
        {
          endTime: { gt: start, lte: end },
        },
        {
          AND: [
            { startTime: { lte: start } },
            { endTime: { gte: end } },
          ],
        },
      ],
    },
  });

  return conflictCount === 0;
}

// ------------------------------------------------------------
// BATCH AVAILABILITY CHECK
// ------------------------------------------------------------

/**
 * Check availability for multiple reporters
 */
export async function getReportersAvailability(
  reporterIds: string[],
  start: Date,
  end: Date
): Promise<Map<string, boolean>> {
  const availability = new Map<string, boolean>();

  // Get all conflicting events for these reporters
  const conflicts = await db.calendarEvent.findMany({
    where: {
      assignedReporterId: { in: reporterIds },
      status: { notIn: ['CANCELLED', 'COMPLETED'] },
      OR: [
        { startTime: { gte: start, lt: end } },
        { endTime: { gt: start, lte: end } },
        { AND: [{ startTime: { lte: start } }, { endTime: { gte: end } }] },
      ],
    },
    select: { assignedReporterId: true },
  });

  const busyReporterIds = new Set(conflicts.map(c => c.assignedReporterId).filter(Boolean));

  for (const reporterId of reporterIds) {
    availability.set(reporterId, !busyReporterIds.has(reporterId));
  }

  return availability;
}

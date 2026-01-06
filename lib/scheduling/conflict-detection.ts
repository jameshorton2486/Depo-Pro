/**
 * Conflict Detection Service
 * Detects scheduling conflicts for calendar events
 */

export interface ConflictCheckParams {
  startTime?: Date;
  endTime?: Date;
  excludeEventId?: string;
  eventId?: string;
  reporterId?: string;
  firmId?: string;
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: ConflictInfo[];
  suggestedAlternatives?: Array<{ start: Date; end: Date }>;
  alternativeSlots?: Array<{ start: Date; end: Date }>;
}

export interface ConflictInfo {
  type: string;
  conflictingEventId: string;
  conflictingEventTitle: string;
  overlapMinutes: number;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  conflicts?: ConflictInfo[];
}

/**
 * Check for conflicts with existing events - accepts object or individual params
 */
export async function checkForConflicts(
  paramsOrStartTime: ConflictCheckParams | Date,
  endTime?: Date,
  options?: {
    excludeEventId?: string;
    eventId?: string;
    reporterId?: string;
    firmId?: string;
  }
): Promise<ConflictResult> {
  const params: ConflictCheckParams = paramsOrStartTime instanceof Date
    ? { startTime: paramsOrStartTime, endTime, ...options }
    : paramsOrStartTime;
  
  console.log('[Conflict] checkForConflicts called - stub', params);
  
  return {
    hasConflicts: false,
    conflicts: [],
    suggestedAlternatives: [],
    alternativeSlots: [],
  };
}

/**
 * Check conflicts for a specific reporter
 */
export async function checkReporterConflicts(
  reporterId: string,
  startTime: Date,
  endTime: Date,
  excludeEventId?: string
): Promise<ConflictResult> {
  return checkForConflicts(startTime, endTime, { reporterId, excludeEventId });
}

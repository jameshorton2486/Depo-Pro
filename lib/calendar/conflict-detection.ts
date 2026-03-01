import { logger } from '@/lib/logger';
// lib/calendar/conflict-detection.ts
// STUB: Calendar conflict detection

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: Array<{
    eventId: string;
    title: string;
    _startTime: string;
    _endTime: string;
    type: string;
  }>;
}

export async function checkConflicts(
  _startTime: Date,
  _endTime: Date,
  _reporterId?: string,
  _excludeEventId?: string
): Promise<ConflictResult> {
  logger.debug('[STUB] checkConflicts called');
  return { hasConflicts: false, conflicts: [] };
}


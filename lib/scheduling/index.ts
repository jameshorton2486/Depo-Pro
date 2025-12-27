// =============================================================================
// SCHEDULING LIBRARY INDEX
// Path: lib/scheduling/index.ts
// =============================================================================

export {
  checkForConflicts,
  findAlternativeTimeSlots,
  isReporterAvailable,
  getReportersAvailability,
  type Conflict,
  type ConflictCheckResult,
  type TimeSlot,
} from './conflict-detection';

export {
  rescheduleEvent,
  undoReschedule,
  resizeEvent,
  previewReschedule,
  canRescheduleEvent,
  canResizeEvent,
  type RescheduleParams,
  type RescheduleResult,
} from './scheduling-service';


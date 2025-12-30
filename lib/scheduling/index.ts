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
  type TimeRange,
  type DetectedConflict,
  type ConflictType,
  ConflictTypeEnum,
  ConflictSeverity,
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

export {
  type SchedulingSuggestion,
  type SuggestionContext,
} from './suggestion-engine';


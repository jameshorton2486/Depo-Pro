// =============================================================================
// CANONICAL CALENDAR ENUMS
// =============================================================================
// Single source of truth for calendar-related enums
// These MUST match the Supabase migration enum definitions exactly
// =============================================================================

export enum CalendarEventStatus {
  REQUESTED = "REQUESTED",
  SCHEDULED = "SCHEDULED",
  CONFIRMED = "CONFIRMED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  RESCHEDULED = "RESCHEDULED",
  CONVERTED = "CONVERTED",
  EXTERNAL_BLOCK = "EXTERNAL_BLOCK",
}

export enum EventType {
  DEPOSITION = "DEPOSITION",
  HEARING = "HEARING",
  TRIAL = "TRIAL",
  MEETING = "MEETING",
  DEADLINE = "DEADLINE",
  ARBITRATION = "ARBITRATION",
  MEDIATION = "MEDIATION",
  EUO = "EUO",
  STATEMENT = "STATEMENT",
  OTHER = "OTHER",
}

export enum ConflictType {
  REPORTER_DOUBLE_BOOKED = "REPORTER_DOUBLE_BOOKED",
  LOCATION_CONFLICT = "LOCATION_CONFLICT",
  TRAVEL_TIME_INSUFFICIENT = "TRAVEL_TIME_INSUFFICIENT",
  RESOURCE_UNAVAILABLE = "RESOURCE_UNAVAILABLE",
}

export enum ConflictStatus {
  PENDING = "PENDING",
  OVERRIDDEN = "OVERRIDDEN",
  RESOLVED = "RESOLVED",
  AUTO_FIXED = "AUTO_FIXED",
}

export enum ConflictResolution {
  KEPT_ORIGINAL = "KEPT_ORIGINAL",
  MOVED_ORIGINAL = "MOVED_ORIGINAL",
  REASSIGNED_REPORTER = "REASSIGNED_REPORTER",
  OVERRIDE_ACCEPTED = "OVERRIDE_ACCEPTED",
  TIME_ADJUSTED = "TIME_ADJUSTED",
}

// =============================================================================
// PHASE 5: EXTERNAL CALENDAR ENUMS
// =============================================================================

export enum ExternalCalendarSyncMode {
  READ_ONLY = "READ_ONLY",
  PUSH_INTERNAL = "PUSH_INTERNAL",
  BIDIRECTIONAL = "BIDIRECTIONAL",
}

export enum ExternalCalendarProvider {
  GOOGLE = "GOOGLE",
  OUTLOOK = "OUTLOOK",
  APPLE = "APPLE",
}

export enum ExternalEventSyncStatus {
  SYNCED = "SYNCED",
  PENDING = "PENDING",
  CONFLICT = "CONFLICT",
  FAILED = "FAILED",
  DELETED = "DELETED",
}

// =============================================================================
// PHASE 5: SCHEDULING VALIDATION ENUMS
// =============================================================================

export enum SchedulingValidationType {
  OVERLAP = "OVERLAP",
  DOUBLE_BOOKING = "DOUBLE_BOOKING",
  PAST_TIME = "PAST_TIME",
  TOO_SHORT_NOTICE = "TOO_SHORT_NOTICE",
  OUTSIDE_HOURS = "OUTSIDE_HOURS",
  EXTERNAL_CONFLICT = "EXTERNAL_CONFLICT",
  DURATION_MISMATCH = "DURATION_MISMATCH",
}

export enum ValidationSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
}

// =============================================================================
// PHASE 5: SCHEDULING SUGGESTION ENUMS
// =============================================================================

export enum SchedulingSuggestionType {
  AVAILABLE_SLOT = "AVAILABLE_SLOT",
  REPORTER_AVAILABLE = "REPORTER_AVAILABLE",
  HISTORICAL_PATTERN = "HISTORICAL_PATTERN",
  OPTIMAL_TIME = "OPTIMAL_TIME",
  DURATION_ESTIMATE = "DURATION_ESTIMATE",
  CONFLICT_FREE = "CONFLICT_FREE",
  // Legacy values for backward compatibility
  AVAILABILITY_BASED = "AVAILABILITY_BASED",
  TIME_PATTERN_BASED = "TIME_PATTERN_BASED",
  HISTORICAL_DURATION_BASED = "HISTORICAL_DURATION_BASED",
  WORKLOAD_BALANCED = "WORKLOAD_BALANCED",
}

export enum SuggestionConfidence {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

// Re-export UserRole for convenience
export { UserRole } from './roles';

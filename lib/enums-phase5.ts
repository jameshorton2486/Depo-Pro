// =============================================================================
// PHASE 5: ENUM ADDITIONS
// =============================================================================
// Merge these into lib/enums.ts
// =============================================================================

// =============================================================================
// STEP 4: EXTERNAL CALENDAR SYNC ENUMS
// =============================================================================

/**
 * Sync modes for external calendar integration
 * Default: READ_ONLY (safest option)
 */
export enum ExternalCalendarSyncMode {
  READ_ONLY = "READ_ONLY",           // Only read external events, no push
  PUSH_INTERNAL = "PUSH_INTERNAL",   // Push Depo-Pro events to external calendar
  BIDIRECTIONAL = "BIDIRECTIONAL",   // Full two-way sync (use with caution)
}

/**
 * Supported external calendar providers
 */
export enum ExternalCalendarProvider {
  GOOGLE = "GOOGLE",     // Google Calendar
  OUTLOOK = "OUTLOOK",   // Microsoft Outlook/Office 365
  APPLE = "APPLE",       // Apple Calendar (future)
}

/**
 * Sync status for external events
 */
export enum ExternalEventSyncStatus {
  SYNCED = "SYNCED",       // Successfully synced
  PENDING = "PENDING",     // Waiting to sync
  CONFLICT = "CONFLICT",   // Has scheduling conflict
  FAILED = "FAILED",       // Sync failed
  DELETED = "DELETED",     // Deleted from external source
}

// =============================================================================
// UPDATED CalendarEventStatus (Add EXTERNAL_BLOCK)
// =============================================================================

/**
 * Calendar event status values
 * NOTE: Add EXTERNAL_BLOCK to existing enum
 */
export enum CalendarEventStatus {
  REQUESTED = "REQUESTED",         // Attorney submitted request
  SCHEDULED = "SCHEDULED",         // Agency created/confirmed
  CONFIRMED = "CONFIRMED",         // Reporter accepted
  IN_PROGRESS = "IN_PROGRESS",     // Deposition happening
  COMPLETED = "COMPLETED",         // Finished
  CANCELLED = "CANCELLED",         // Cancelled
  RESCHEDULED = "RESCHEDULED",     // Moved to new time
  CONVERTED = "CONVERTED",         // Converted to Job (Phase 3/4)
  EXTERNAL_BLOCK = "EXTERNAL_BLOCK", // NEW: External calendar block
}

// =============================================================================
// STEP 5: SUGGESTION ENGINE ENUMS
// =============================================================================

/**
 * Types of scheduling suggestions
 */
export enum SchedulingSuggestionType {
  OPTIMAL_TIME = "OPTIMAL_TIME",           // Best time based on all factors
  REPORTER_AVAILABLE = "REPORTER_AVAILABLE", // Based on reporter availability
  AVOID_CONFLICT = "AVOID_CONFLICT",       // Moves away from conflicts
  HISTORICAL_PATTERN = "HISTORICAL_PATTERN", // Based on past successful times
  DURATION_ESTIMATE = "DURATION_ESTIMATE", // Suggested duration
}

/**
 * Confidence levels for suggestions
 */
export enum SuggestionConfidence {
  HIGH = "HIGH",       // 80%+ confidence
  MEDIUM = "MEDIUM",   // 50-79% confidence
  LOW = "LOW",         // <50% confidence
}

// =============================================================================
// STEP 6: UX VALIDATION ENUMS
// =============================================================================

/**
 * Types of scheduling validations
 */
export enum SchedulingValidationType {
  OVERLAP = "OVERLAP",                     // Events overlap
  DOUBLE_BOOKING = "DOUBLE_BOOKING",       // Reporter double-booked
  PAST_TIME = "PAST_TIME",                 // Scheduling in the past
  TOO_SHORT_NOTICE = "TOO_SHORT_NOTICE",   // Less than 24 hours notice
  OUTSIDE_HOURS = "OUTSIDE_HOURS",         // Outside business hours
  EXTERNAL_CONFLICT = "EXTERNAL_CONFLICT", // Conflicts with external event
  DURATION_MISMATCH = "DURATION_MISMATCH", // Duration doesn't match type
}

/**
 * Severity of validation issues
 */
export enum ValidationSeverity {
  ERROR = "ERROR",     // Blocks the action
  WARNING = "WARNING", // Allows with confirmation
  INFO = "INFO",       // Informational only
}

// =============================================================================
// AUDIT ACTION ADDITIONS
// =============================================================================

/**
 * Additional audit actions for Phase 5
 * Merge with existing AuditAction enum
 */
export const PHASE5_AUDIT_ACTIONS = {
  // External Calendar
  EXTERNAL_CALENDAR_CONNECTED: "EXTERNAL_CALENDAR_CONNECTED",
  EXTERNAL_CALENDAR_DISCONNECTED: "EXTERNAL_CALENDAR_DISCONNECTED",
  EXTERNAL_CALENDAR_SYNCED: "EXTERNAL_CALENDAR_SYNCED",
  EXTERNAL_CALENDAR_SYNC_FAILED: "EXTERNAL_CALENDAR_SYNC_FAILED",
  
  // Suggestions
  SUGGESTION_GENERATED: "SUGGESTION_GENERATED",
  SUGGESTION_APPLIED: "SUGGESTION_APPLIED",
  SUGGESTION_DISMISSED: "SUGGESTION_DISMISSED",
  
  // Validation
  SCHEDULING_VALIDATION_FAILED: "SCHEDULING_VALIDATION_FAILED",
  SCHEDULING_OVERRIDE_CONFIRMED: "SCHEDULING_OVERRIDE_CONFIRMED",
} as const;

// =============================================================================
// TYPE HELPERS
// =============================================================================

export const EXTERNAL_SYNC_MODE_LABELS: Record<ExternalCalendarSyncMode, string> = {
  [ExternalCalendarSyncMode.READ_ONLY]: "Read Only",
  [ExternalCalendarSyncMode.PUSH_INTERNAL]: "Push to External",
  [ExternalCalendarSyncMode.BIDIRECTIONAL]: "Two-Way Sync",
};

export const EXTERNAL_PROVIDER_LABELS: Record<ExternalCalendarProvider, string> = {
  [ExternalCalendarProvider.GOOGLE]: "Google Calendar",
  [ExternalCalendarProvider.OUTLOOK]: "Microsoft Outlook",
  [ExternalCalendarProvider.APPLE]: "Apple Calendar",
};

export const SYNC_STATUS_LABELS: Record<ExternalEventSyncStatus, string> = {
  [ExternalEventSyncStatus.SYNCED]: "Synced",
  [ExternalEventSyncStatus.PENDING]: "Pending",
  [ExternalEventSyncStatus.CONFLICT]: "Has Conflict",
  [ExternalEventSyncStatus.FAILED]: "Failed",
  [ExternalEventSyncStatus.DELETED]: "Deleted",
};

export const SUGGESTION_TYPE_LABELS: Record<SchedulingSuggestionType, string> = {
  [SchedulingSuggestionType.OPTIMAL_TIME]: "Optimal Time",
  [SchedulingSuggestionType.REPORTER_AVAILABLE]: "Reporter Available",
  [SchedulingSuggestionType.AVOID_CONFLICT]: "Avoids Conflict",
  [SchedulingSuggestionType.HISTORICAL_PATTERN]: "Based on History",
  [SchedulingSuggestionType.DURATION_ESTIMATE]: "Duration Estimate",
};

export const VALIDATION_SEVERITY_CONFIG: Record<ValidationSeverity, {
  color: string;
  icon: string;
  allowOverride: boolean;
}> = {
  [ValidationSeverity.ERROR]: {
    color: "red",
    icon: "XCircle",
    allowOverride: false,
  },
  [ValidationSeverity.WARNING]: {
    color: "yellow",
    icon: "AlertTriangle",
    allowOverride: true,
  },
  [ValidationSeverity.INFO]: {
    color: "blue",
    icon: "Info",
    allowOverride: true,
  },
};

// =============================================================================
// EXTERNAL EVENT STATUS CHECK
// =============================================================================

/**
 * Check if an event status is for external calendar blocks
 */
export function isExternalEvent(status: CalendarEventStatus): boolean {
  return status === CalendarEventStatus.EXTERNAL_BLOCK;
}

/**
 * Check if event status allows mutations
 */
export function canMutateEvent(status: CalendarEventStatus): boolean {
  const immutableStatuses = [
    CalendarEventStatus.COMPLETED,
    CalendarEventStatus.CANCELLED,
    CalendarEventStatus.CONVERTED,
    CalendarEventStatus.EXTERNAL_BLOCK,
  ];
  return !immutableStatuses.includes(status);
}

// =============================================================================
// CANONICAL CONFLICT INTERFACES
// =============================================================================
// Single source of truth for conflict detection types
// =============================================================================

/**
 * Alternative time slot suggestion
 */
export interface AlternativeTimeSlot {
  start: Date;
  end: Date;
  confidence: number;
  metadata?: {
    reporterId?: string;
    reporterName?: string;
    reason?: string;
  };
}

/**
 * Detected scheduling conflict
 */
export interface Conflict {
  conflictEventId: string;
  conflictEventTitle: string;
  start: Date;
  end: Date;
  conflictType: string;
  overlapMinutes: number;
  metadata?: {
    reporterId?: string;
    reporterName?: string;
    location?: string;
  };
}

/**
 * Result of conflict check operation
 */
export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: Conflict[];
  alternativeSlots?: AlternativeTimeSlot[]; // Optional to support backward compatibility
}


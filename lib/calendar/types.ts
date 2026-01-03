// =============================================================================
// CALENDAR TYPES
// lib/calendar/types.ts
//
// Shared types for calendar functionality
// =============================================================================

/**
 * Availability block data contract
 * Phase 3A-2: ISO strings in UI, Date objects server-side
 */
export interface AvailabilityBlock {
  id: string;
  userId: string;
  start: string; // ISO string
  end: string;   // ISO string
  recurring?: {
    pattern: 'daily' | 'weekly';
    until?: string; // ISO string
  };
}

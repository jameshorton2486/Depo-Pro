// =============================================================================
// AVAILABILITY UTILITIES
// lib/calendar/availability-utils.ts
//
// Phase 3A-2: Helper functions for availability management
// =============================================================================

import type { AvailabilityBlock } from './types';

/**
 * Check if two availability blocks overlap
 * Returns true if there's any overlap (warning only, doesn't block)
 */
export function checkOverlap(
  block1: AvailabilityBlock,
  block2: AvailabilityBlock
): boolean {
  const start1 = new Date(block1.start).getTime();
  const end1 = new Date(block1.end).getTime();
  const start2 = new Date(block2.start).getTime();
  const end2 = new Date(block2.end).getTime();

  // Check for overlap: block1 starts before block2 ends AND block1 ends after block2 starts
  return start1 < end2 && end1 > start2;
}

/**
 * Find all overlapping blocks for a given block
 */
export function findOverlaps(
  block: AvailabilityBlock,
  allBlocks: AvailabilityBlock[]
): AvailabilityBlock[] {
  return allBlocks.filter(
    (b) => b.id !== block.id && checkOverlap(block, b)
  );
}

/**
 * Format time range for display
 */
export function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  return `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

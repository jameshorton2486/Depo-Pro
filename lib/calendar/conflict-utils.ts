// =============================================================================
// CONFLICT UTILITIES
// lib/calendar/conflict-utils.ts
//
// Phase 3A-4: Simple conflict detection for availability blocks
// =============================================================================

import { AvailabilityBlock } from './types';

/**
 * Check if a time range conflicts with any availability blocks
 * Returns true if there's any overlap (warning only, doesn't block)
 */
export function hasConflict(
  start: Date,
  end: Date,
  blocks: AvailabilityBlock[],
  excludeBlockId?: string
): boolean {
  return blocks.some((block) => {
    // Skip the block we're checking against
    if (excludeBlockId && block.id === excludeBlockId) {
      return false;
    }

    const bStart = new Date(block.start);
    const bEnd = new Date(block.end);

    // Check for overlap: start < bEnd && end > bStart
    return start < bEnd && end > bStart;
  });
}

/**
 * Find all blocks that conflict with a given time range
 */
export function findConflictingBlocks(
  start: Date,
  end: Date,
  blocks: AvailabilityBlock[],
  excludeBlockId?: string
): AvailabilityBlock[] {
  return blocks.filter((block) => {
    if (excludeBlockId && block.id === excludeBlockId) {
      return false;
    }

    const bStart = new Date(block.start);
    const bEnd = new Date(block.end);

    return start < bEnd && end > bStart;
  });
}

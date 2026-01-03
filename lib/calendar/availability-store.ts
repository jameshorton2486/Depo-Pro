// =============================================================================
// AVAILABILITY STORE
// lib/calendar/availability-store.ts
//
// Phase 3A-2: Client-safe availability state management
// =============================================================================

import { useEffect, useState } from 'react';
import { AvailabilityBlock } from './types';

export function useAvailability(userId: string) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, [userId]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/calendar/availability?reporterId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      
      // Transform API response to AvailabilityBlock format
      const availabilityBlocks: AvailabilityBlock[] = (data.availability || []).map((slot: any) => ({
        id: slot.id,
        userId: slot.extendedProps?.reporterId || userId,
        start: slot.start,
        end: slot.end,
        recurring: slot.extendedProps?.isRecurring
          ? {
              pattern: slot.extendedProps.recurrenceRule?.includes('WEEKLY') ? 'weekly' : 'daily',
              until: slot.extendedProps.recurrenceEnd,
            }
          : undefined,
      }));

      setBlocks(availabilityBlocks);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  function addBlock(block: AvailabilityBlock) {
    setBlocks((prev) => [...prev, block]);
  }

  function updateBlock(updated: AvailabilityBlock) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b))
    );
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  return {
    blocks,
    loading,
    error,
    addBlock,
    updateBlock,
    removeBlock,
    refresh: fetchAvailability,
  };
}

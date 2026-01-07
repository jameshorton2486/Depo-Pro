'use client';

// =============================================================================
// AVAILABILITY GRID
// components/calendar/availability-grid.tsx
//
// Phase 3A-2: Grid component for creating availability blocks
// Phase 3A-2.1: Enhanced with drag & resize support
// =============================================================================

import { useState } from 'react';
import type { DragEndEvent} from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import type { AvailabilityBlock } from '@/lib/calendar/types';
import { findOverlaps } from '@/lib/calendar/availability-utils';
import { hasConflict } from '@/lib/calendar/conflict-utils';
import { AvailabilityBlockComponent } from './availability-block';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
// Note: Using client-side ID generation for temporary blocks

interface AvailabilityGridProps {
  blocks: AvailabilityBlock[];
  onCreate: (block: AvailabilityBlock) => void;
  onUpdate: (block: AvailabilityBlock) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function AvailabilityGrid({
  blocks,
  onCreate,
  onUpdate: _onUpdate,
  onDelete,
  onRefresh,
}: AvailabilityGridProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  async function handleCreate(start: Date, end: Date) {
    const newBlock: AvailabilityBlock = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: 'self', // Will be replaced by API
      start: start.toISOString(),
      end: end.toISOString(),
    };

    // Check for overlaps (warning only)
    const overlaps = findOverlaps(newBlock, blocks);
    if (overlaps.length > 0) {
      toast.warning(
        `This time overlaps with ${overlaps.length} existing block(s)`,
        {
          description: 'You can still save, but this may cause scheduling conflicts.',
        }
      );
    }

    // Optimistically add to UI
    onCreate(newBlock);

    // Persist to server
    try {
      const response = await fetch('/api/calendar/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          type: 'AVAILABLE',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create availability');
      }

      // Refresh to get server-generated ID
      onRefresh();
      toast.success('Availability block created');
    } catch (error) {
      console.error('Error creating availability:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create availability');
      // Remove from UI on error
      onDelete(newBlock.id);
    }
  }

  async function handleDelete(id: string) {
    // Optimistically remove from UI
    onDelete(id);

    try {
      const response = await fetch(`/api/calendar/availability/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete availability');
      }

      toast.success('Availability block deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast.error('Failed to delete availability');
      // Refresh to restore on error
      onRefresh();
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event;
    const block = active.data.current?.block as AvailabilityBlock | undefined;

    if (!block || !delta) {
      return;
    }

    // Calculate new times based on drag delta
    // For now, we'll just show a toast - full drag implementation would update times
    // This is a placeholder for future drag-to-move functionality
    toast.info('Drag to move coming soon - use edit for now');
  }

  function handleQuickAdd(hours: number) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(now.getHours(), 0, 0, 0);

    const end = new Date(start);
    end.setHours(start.getHours() + hours);

    handleCreate(start, end);
  }

  // Filter blocks for selected date
  const dayBlocks = blocks.filter((block) => {
    const blockDate = new Date(block.start).toISOString().split('T')[0];
    return blockDate === selectedDate;
  });

  return (
    <div className="space-y-4">
      {/* Quick Add Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickAdd(4)}
        >
          + 4 hours
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickAdd(8)}
        >
          + 8 hours
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const start = new Date(`${selectedDate}T09:00:00`);
            const end = new Date(`${selectedDate}T17:00:00`);
            handleCreate(start, end);
          }}
        >
          + 9-5 Day
        </Button>
      </div>

      {/* Date Selector */}
      <div>
        <label htmlFor="availability-date" className="text-sm font-medium mb-2 block">Date</label>
        <input
          id="availability-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border rounded-md"
        />
      </div>

      {/* Availability Blocks List */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="border rounded-lg p-4 space-y-2">
          {dayBlocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No availability blocks for this date</p>
              <p className="text-sm">Click a quick add button or create a custom block</p>
            </div>
          ) : (
            dayBlocks.map((block) => {
              const overlaps = findOverlaps(block, blocks);

              // Check for conflicts using the conflict utility
              const blockStart = new Date(block.start);
              const blockEnd = new Date(block.end);
              const hasConflictWarning = hasConflict(blockStart, blockEnd, blocks, block.id);

              return (
                <AvailabilityBlockComponent
                  key={block.id}
                  block={block}
                  hasConflict={hasConflictWarning || overlaps.length > 0}
                  overlaps={overlaps}
                  onDelete={handleDelete}
                />
              );
            })
          )}
        </div>
      </DndContext>

      {/* Create Custom Block */}
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="text-sm font-medium mb-2">Create Custom Block</div>
        <div className="text-xs text-muted-foreground mb-3">
          Click to create a block for {new Date(selectedDate).toLocaleDateString()}
        </div>
        <div
          className="h-32 bg-background border-2 border-dashed rounded-md cursor-crosshair hover:border-primary transition-colors flex items-center justify-center"
          onClick={() => {
            const start = new Date(`${selectedDate}T09:00:00`);
            const end = new Date(`${selectedDate}T17:00:00`);
            handleCreate(start, end);
          }}
        >
          <span className="text-sm text-muted-foreground">
            Click to add availability (9 AM - 5 PM)
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

// =============================================================================
// AVAILABILITY BLOCK
// components/calendar/availability-block.tsx
//
// Phase 3A-2.1: Draggable/resizable availability block
// =============================================================================

import { useDraggable } from '@dnd-kit/core';
import { AvailabilityBlock } from '@/lib/calendar/types';
import { formatTimeRange } from '@/lib/calendar/availability-utils';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailabilityBlockProps {
  block: AvailabilityBlock;
  hasConflict: boolean;
  overlaps: AvailabilityBlock[];
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

export function AvailabilityBlockComponent({
  block,
  hasConflict,
  overlaps,
  onDelete,
  isDragging = false,
}: AvailabilityBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingState,
  } = useDraggable({
    id: block.id,
    data: {
      block,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const dragging = isDragging || isDraggingState;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between p-3 rounded-md border transition-all',
        hasConflict
          ? 'bg-amber-50 border-amber-200'
          : 'bg-green-50 border-green-200',
        dragging && 'opacity-50 shadow-lg z-50'
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label="Drag to move"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Status Indicator */}
        <div
          className={cn(
            'w-3 h-3 rounded-full',
            hasConflict ? 'bg-amber-500' : 'bg-green-500'
          )}
        />

        {/* Block Info */}
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">
            {formatTimeRange(block.start, block.end)}
            {hasConflict && (
              <span className="text-amber-600" title="Time conflict detected">
                ⚠️
              </span>
            )}
          </div>
          {hasConflict && overlaps.length > 0 && (
            <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              Overlaps with {overlaps.length} other block(s)
            </div>
          )}
          {block.recurring && (
            <div className="text-xs text-muted-foreground mt-1">
              Recurring: {block.recurring.pattern}
            </div>
          )}
        </div>
      </div>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(block.id)}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

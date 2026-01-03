'use client';

// =============================================================================
// CALENDAR FILTER BAR
// components/calendar/calendar-filter-bar.tsx
//
// Toggle bar for filtering calendar events by type
// =============================================================================

import { EventTypeFilter, EVENT_TYPE_CONFIG } from '@/lib/calendar/event-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CalendarFilterBarProps {
  selectedFilter: EventTypeFilter;
  onFilterChange: (filter: EventTypeFilter) => void;
  className?: string;
}

export function CalendarFilterBar({
  selectedFilter,
  onFilterChange,
  className,
}: CalendarFilterBarProps) {
  return (
    <div className={cn('flex items-center gap-2 p-2 bg-gray-50 rounded-lg border', className)}>
      <span className="text-sm font-medium text-gray-700 mr-2">Show:</span>
      {Object.values(EVENT_TYPE_CONFIG).map((config) => {
        const isSelected = selectedFilter === config.type;
        return (
          <Button
            key={config.type}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(config.type)}
            className={cn(
              'transition-colors',
              isSelected && 'bg-blue-600 hover:bg-blue-700 text-white',
              !isSelected && 'bg-white hover:bg-gray-100'
            )}
            style={
              isSelected
                ? {
                    backgroundColor: config.color,
                    borderColor: config.color,
                  }
                : undefined
            }
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}

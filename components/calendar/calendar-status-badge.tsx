'use client';

import { EventStatus } from '@/lib/calendar/types';
import { EVENT_STATUS_CONFIG } from '@/lib/calendar/constants';
import { cn } from '@/lib/utils';

interface CalendarStatusBadgeProps {
  status: EventStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  showLabel?: boolean;
}

export function CalendarStatusBadge({
  status,
  size = 'md',
  showDot = true,
  showLabel = true,
}: CalendarStatusBadgeProps) {
  const config = EVENT_STATUS_CONFIG[status];
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.color,
        sizeClasses[size]
      )}
      title={config.description}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full',
            dotSizeClasses[size],
            config.dotColor,
            status === 'IN_PROGRESS' && 'animate-pulse'
          )}
        />
      )}
      {showLabel && config.label}
    </span>
  );
}


'use client';

import { CalendarEventUI } from '@/lib/calendar/types';
import { REQUIREMENT_FLAGS } from '@/lib/calendar/constants';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface CalendarRequirementFlagsProps {
  event: CalendarEventUI;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'badge' | 'full';
}

export function CalendarRequirementFlags({
  event,
  size = 'md',
  variant = 'badge',
}: CalendarRequirementFlagsProps) {
  const flags: Array<{ key: string; config: typeof REQUIREMENT_FLAGS[keyof typeof REQUIREMENT_FLAGS] }> = [];
  
  // Check for remote/in-person
  if (event.isRemote) {
    flags.push({ key: 'remote', config: REQUIREMENT_FLAGS.remote });
  } else if (event.location) {
    flags.push({ key: 'inPerson', config: REQUIREMENT_FLAGS.inPerson });
  }
  
  // Note: These fields don't exist in CalendarEventUI yet, but we can prepare for them
  // if (event.interpreterRequired) {
  //   flags.push({ key: 'interpreter', config: REQUIREMENT_FLAGS.interpreter });
  // }
  // if (event.videographerRequired) {
  //   flags.push({ key: 'videographer', config: REQUIREMENT_FLAGS.videographer });
  // }
  
  // Check for unassigned
  if (!event.assignedReporter) {
    flags.push({ key: 'unassigned', config: REQUIREMENT_FLAGS.unassigned });
  }
  
  if (flags.length === 0) return null;
  
  if (variant === 'icon') {
    return (
      <div className="flex items-center gap-1">
        {flags.map(({ key, config }) => {
          const IconComponent = Icons[config.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
          return IconComponent ? (
            <span key={key} title={config.label}>
              <IconComponent
                className={cn(
                  'flex-shrink-0',
                  size === 'sm' && 'h-3 w-3',
                  size === 'md' && 'h-4 w-4',
                  size === 'lg' && 'h-5 w-5',
                  config.iconColor
                )}
              />
            </span>
          ) : null;
        })}
      </div>
    );
  }
  
  if (variant === 'badge') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {flags.map(({ key, config }) => {
          const IconComponent = Icons[config.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
          return (
            <span
              key={key}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                config.color,
                size === 'sm' && 'text-xs px-1.5 py-0.5',
                size === 'lg' && 'text-sm px-2.5 py-1'
              )}
            >
              {IconComponent && <IconComponent className="h-3 w-3" />}
              {config.shortLabel}
            </span>
          );
        })}
      </div>
    );
  }
  
  // Full variant
  return (
    <div className="space-y-1">
      {flags.map(({ key, config }) => {
        const IconComponent = Icons[config.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
        return (
          <div
            key={key}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2',
              config.color
            )}
          >
            {IconComponent && <IconComponent className="h-4 w-4" />}
            <span className="font-medium">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}


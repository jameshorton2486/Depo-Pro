'use client';

import type { CalendarEventUI, CalendarAction, UserRole } from '@/lib/calendar/types';
import { getActionAvailability } from '@/lib/calendar/permissions';
import { CALENDAR_ACTIONS } from '@/lib/calendar/constants';
import { Button } from '@/components/ui/button';
import { CalendarPermissionTooltip } from './calendar-permission-tooltip';
import { Lock } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEventActionsProps {
  event: CalendarEventUI;
  userRole: UserRole;
  userId: string;
  variant: 'drawer' | 'card' | 'inline';
  onActionClick?: (action: CalendarAction) => void;  // For analytics/logging only
}

export function CalendarEventActions({
  event,
  userRole,
  userId: _userId,
  variant,
  onActionClick,
}: CalendarEventActionsProps) {
  
  const getActionsForRole = (): CalendarAction[] => {
    // Return ordered list of actions to display for this role
    const allActions: CalendarAction[] = [
      'REQUEST_CHANGE',
      'ASSIGN_REPORTER',
      'ASSIGN_SCOPIST',
      'ASSIGN_VIDEOGRAPHER',
      'ASSIGN_INTERPRETER',
      'CONVERT_TO_JOB',
      'ADD_NOTES',
      'MARK_COMPLETE',
      'RESCHEDULE',
      'CANCEL_EVENT',
    ];
    
    return allActions.filter(action => {
      const availability = getActionAvailability(action, userRole, event);
      return availability !== 'HIDDEN';
    });
  };
  
  const handleClick = (action: CalendarAction) => {
    // NO MUTATION - just log for analytics if needed
    onActionClick?.(action);
  };
  
  const renderActionButton = (action: CalendarAction) => {
    const config = CALENDAR_ACTIONS[action];
    const availability = getActionAvailability(action, userRole, event);
    const IconComponent = Icons[config.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    
    const isDisabled = availability === 'DISABLED' || availability === 'NO_PERMISSION';
    // const _tooltipContent = availability === 'DISABLED'
    //   ? ACTION_DISABLED_REASONS[action]
    //   : ACTION_PERMISSION_REASONS[action]; // Unused - kept for future tooltip
    
    const button = (
      <Button
        variant={config.variant}
        size={variant === 'card' ? 'sm' : 'default'}
        disabled={isDisabled}
        onClick={() => handleClick(action)}
        className={cn(
          'relative',
          availability === 'NO_PERMISSION' && 'opacity-50'
        )}
      >
        {availability === 'NO_PERMISSION' ? (
          <Lock className="mr-2 h-4 w-4" />
        ) : (
          IconComponent && <IconComponent className="mr-2 h-4 w-4" />
        )}
        {config.label}
        {availability === 'DISABLED' && (
          <span className="ml-2 text-xs text-muted-foreground">
            Coming Soon
          </span>
        )}
      </Button>
    );
    
    return (
      <CalendarPermissionTooltip
        key={action}
        action={action}
        availability={availability}
        userRole={userRole}
      >
        {button}
      </CalendarPermissionTooltip>
    );
  };
  
  const actions = getActionsForRole();
  const showInContext = variant === 'drawer' ? 'showInDrawer' : 'showOnCard';
  const visibleActions = actions.filter(a => CALENDAR_ACTIONS[a][showInContext]);
  
  if (visibleActions.length === 0) return null;
  
  return (
    <div className={cn(
      'flex gap-2',
      variant === 'drawer' && 'flex-col',
      variant === 'card' && 'flex-row flex-wrap',
      variant === 'inline' && 'flex-row'
    )}>
      {visibleActions.map(renderActionButton)}
    </div>
  );
}

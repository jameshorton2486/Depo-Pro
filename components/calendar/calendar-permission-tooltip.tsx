'use client';

import type { ReactNode } from 'react';
import type { CalendarAction, ActionAvailability, UserRole } from '@/lib/calendar/types';
import { ACTION_DISABLED_REASONS, ACTION_PERMISSION_REASONS } from '@/lib/calendar/permissions';

interface CalendarPermissionTooltipProps {
  children: ReactNode;
  action: CalendarAction;
  availability: ActionAvailability;
  userRole: UserRole;
}

export function CalendarPermissionTooltip({
  children,
  action,
  availability,
  userRole: _userRole,
}: CalendarPermissionTooltipProps) {
  if (availability === 'AVAILABLE') {
    // No tooltip needed for available actions
    return <>{children}</>;
  }
  
  const tooltipContent = availability === 'DISABLED'
    ? ACTION_DISABLED_REASONS[action]
    : ACTION_PERMISSION_REASONS[action];
  
  // Simple tooltip implementation using native title attribute
  // For a more sophisticated tooltip, you could use a tooltip library
  return (
    <span title={tooltipContent} className="inline-block">
      {children}
    </span>
  );
}


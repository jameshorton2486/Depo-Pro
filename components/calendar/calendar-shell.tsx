'use client';

// =============================================================================
// CALENDAR SHELL
// components/calendar/calendar-shell.tsx
//
// Unified calendar container - permission-safe, no role checks in UI
// Phase 3A-1: Clean state model
// =============================================================================

import { useState } from 'react';
import { CalendarViewToggle } from './calendar-view-toggle';
import { CalendarView } from './calendar-view';
import { getAllowedCalendarViews, type CalendarView as ViewType } from '@/lib/calendar/use-allowed-calendar-views';
import type { UserRole } from '@/lib/enums/roles';

export interface CalendarShellProps {
  userRole: UserRole;
}

export function CalendarShell({ userRole }: CalendarShellProps) {
  const allowedViews = getAllowedCalendarViews(userRole);
  const [view, setView] = useState<ViewType>(allowedViews[0] || 'assignments');

  // If no views allowed, show message
  if (allowedViews.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have access to calendar views.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CalendarViewToggle
        allowedViews={allowedViews}
        activeView={view}
        onChange={setView}
      />

      <CalendarView view={view} />
    </div>
  );
}

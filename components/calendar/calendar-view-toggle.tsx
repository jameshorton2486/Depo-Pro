'use client';

// =============================================================================
// CALENDAR VIEW TOGGLE
// components/calendar/calendar-view-toggle.tsx
//
// Permission-safe view toggle - receives allowed views as props
// Phase 3A-1: No role checks in UI
// =============================================================================

import type { CalendarView } from '@/lib/calendar/use-allowed-calendar-views';

interface CalendarViewToggleProps {
  allowedViews: CalendarView[];
  activeView: CalendarView;
  onChange: (view: CalendarView) => void;
}

const LABELS: Record<CalendarView, string> = {
  jobs: 'Jobs',
  availability: 'Availability',
  assignments: 'Assignments',
};

export function CalendarViewToggle({
  allowedViews,
  activeView,
  onChange,
}: CalendarViewToggleProps) {
  // If only one view, don't show toggle
  if (allowedViews.length <= 1) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {allowedViews.map((view) => (
        <button
          key={view}
          onClick={() => onChange(view)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === view
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {LABELS[view]}
        </button>
      ))}
    </div>
  );
}

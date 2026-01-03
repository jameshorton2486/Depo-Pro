'use client';

// =============================================================================
// AVAILABILITY CALENDAR VIEW
// components/calendar/views/availability-calendar-view.tsx
//
// Phase 3A-2: Availability editor integrated into calendar view
// =============================================================================

import { AvailabilityManager } from '../availability-manager';

export function AvailabilityCalendarView() {
  return (
    <div className="h-full">
      <AvailabilityManager />
    </div>
  );
}

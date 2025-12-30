# 🎯 CURSOR: Complete Depo-Pro Calendar System

## CONTEXT

I've deployed lean Calendar API routes and baase types. The routes are now aligned with my **actual Prisma schema** (not expanded/future fields).

Your job is to:
1. Verify the API routes compile (fix any remaining type errors)
2. Build the Calendar UI components
3. Ensure everything integrates cleanly

---

## ⚠️ ABSOLUTE RULES

- ❌ NO schema changes
- ❌ NO new Prisma migrations
- ✅ Use `db` from `@/lib/db` (not `prisma`)
- ✅ Use `.issues` not `.errors` for Zod
- ✅ Read `prisma/schema.prisma` for actual field names
- ✅ Handle nullable fields safely

---

## STEP 1: Verify API Routes

Run `npm run typecheck` and fix any errors in:
- `app/api/calendar/route.ts`
- `app/api/calendar/[id]/route.ts`
- `app/api/calendar/[id]/convert-to-job/route.ts`
- `app/api/users/reporters/route.ts`

### Common Fixes Needed:

**If field doesn't exist:** Check `prisma/schema.prisma` for actual field name
- `startTime` vs `scheduledStart` vs `startDate`
- `endTime` vs `scheduledEnd` vs `endDate`
- `location` vs `locationAddress`
- `meetingLink` vs `zoomJoinUrl`
- `isRemote` vs `locationType`

**If enum value invalid:** Check the enum in schema
- `JobStatus` values: Check what exists (CREATED, PENDING, SCHEDULED, etc.)
- `CalendarEventStatus` values: Check what exists

**If relation doesn't exist:** Remove or adjust the include
- `assignedReporter` - might be `reporter` or different name
- `job` - verify the relation name

---

## STEP 2: Build Calendar UI Components

Create these files in `components/calendar/`:

### 2.1 calendar-shell.tsx

```tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { CalendarToolbar } from './calendar-toolbar';
import { CalendarGrid } from './calendar-grid';
import { CalendarTimeline } from './calendar-timeline';
import { CalendarEventCard } from './calendar-event-card';
import { CalendarEventUI, CalendarView, CalendarShellProps } from '@/lib/calendar/calendar-types';
import { seesOnlyOwnEvents } from './role-visibility';
import { toast } from 'sonner';

export function CalendarShell({ userRole, userId, firmId, agencyId }: CalendarShellProps) {
  const [events, setEvents] = useState<CalendarEventUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      if (firmId) params.set('firmId', firmId);
      if (agencyId) params.set('agencyId', agencyId);
      if (seesOnlyOwnEvents(userRole)) {
        params.set('assignedReporterId', userId);
      }

      const response = await fetch(`/api/calendar?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();

      const transformed = (data.events || []).map((e: any) => ({
        ...e,
        start: new Date(e.start),
        end: e.end ? new Date(e.end) : null,
      }));

      setEvents(transformed);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, firmId, agencyId, userRole, userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="flex flex-col h-full">
      <CalendarToolbar
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onToday={() => setCurrentDate(new Date())}
        onPrevious={() => setCurrentDate(prev => subMonths(prev, 1))}
        onNext={() => setCurrentDate(prev => addMonths(prev, 1))}
        onRefresh={fetchEvents}
        isLoading={isLoading}
      />

      <div className="flex-1 p-4 bg-gray-50 overflow-auto">
        {view === 'agenda' ? (
          <CalendarTimeline events={events} isLoading={isLoading} />
        ) : (
          <CalendarGrid
            events={events}
            view={view}
            currentDate={currentDate}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
```

### 2.2 calendar-toolbar.tsx

```tsx
'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw, LayoutGrid, List, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarToolbarProps, CalendarView } from '@/lib/calendar/calendar-types';

export function CalendarToolbar({
  view,
  onViewChange,
  currentDate,
  onToday,
  onPrevious,
  onNext,
  onRefresh,
  isLoading,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold ml-2">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        <div className="flex border rounded-md">
          <Button
            variant={view === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'agenda' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('agenda')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 2.3 calendar-grid.tsx

```tsx
'use client';

import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from 'date-fns';
import { CalendarEventUI, CalendarView } from '@/lib/calendar/calendar-types';
import { CalendarEventCard } from './calendar-event-card';

interface CalendarGridProps {
  events: CalendarEventUI[];
  view: CalendarView;
  currentDate: Date;
  isLoading: boolean;
}

export function CalendarGrid({ events, view, currentDate, isLoading }: CalendarGridProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventUI[]>();
    events.forEach((event) => {
      const key = format(event.start, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    });
    return map;
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={`min-h-[120px] border-b border-r p-1 ${
                !isCurrentMonth ? 'bg-gray-50' : ''
              }`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  isToday
                    ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                    : isCurrentMonth
                    ? 'text-gray-900'
                    : 'text-gray-400'
                }`}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <CalendarEventCard key={event.id} event={event} isCompact />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 2.4 calendar-timeline.tsx

```tsx
'use client';

import { format } from 'date-fns';
import { CalendarEventUI } from '@/lib/calendar/calendar-types';
import { CalendarEventCard } from './calendar-event-card';

interface CalendarTimelineProps {
  events: CalendarEventUI[];
  isLoading: boolean;
}

export function CalendarTimeline({ events, isLoading }: CalendarTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No events scheduled
      </div>
    );
  }

  // Sort by date
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Group by date
  const grouped = sorted.reduce((acc, event) => {
    const dateKey = format(event.start, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEventUI[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 sticky top-0 bg-gray-50 py-1">
            {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="space-y-2 pl-4 border-l-2 border-gray-200">
            {dayEvents.map((event) => (
              <CalendarEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 2.5 calendar-event-card.tsx

```tsx
'use client';

import { format } from 'date-fns';
import { MapPin, Video, Clock, User } from 'lucide-react';
import { CalendarEventCardProps, STATUS_COLORS } from '@/lib/calendar/calendar-types';

export function CalendarEventCard({ event, isCompact = false, onClick }: CalendarEventCardProps) {
  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.SCHEDULED;

  if (isCompact) {
    return (
      <div
        onClick={onClick}
        className={`px-1 py-0.5 text-xs rounded truncate cursor-pointer ${colors.bg} ${colors.border} border ${colors.text}`}
      >
        {format(event.start, 'h:mm a')} {event.title}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${colors.bg} ${colors.border}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
          {event.caseName && (
            <p className="text-sm text-gray-600 truncate">{event.caseName}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
          {event.status}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(event.start, 'h:mm a')}
          {event.end && ` - ${format(event.end, 'h:mm a')}`}
        </div>

        {event.location && (
          <div className="flex items-center gap-1">
            {event.isRemote ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {event.isRemote ? 'Remote' : event.location}
          </div>
        )}

        {event.assignedReporter && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {event.assignedReporter.firstName} {event.assignedReporter.lastName}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## STEP 3: Create Index Exports

Create `components/calendar/index.ts`:

```ts
export { CalendarShell } from './calendar-shell';
export { CalendarToolbar } from './calendar-toolbar';
export { CalendarGrid } from './calendar-grid';
export { CalendarTimeline } from './calendar-timeline';
export { CalendarEventCard } from './calendar-event-card';
export * from './role-visibility';
```

Create `lib/calendar/index.ts`:

```ts
export * from './calendar-types';
```

---

## STEP 4: Verify Everything

```bash
npm run typecheck  # Should be 0 errors
npm run lint       # Should be 0 warnings
npm run dev        # Start dev server
```

Then visit: `http://localhost:3000/calendar`

---

## STEP 5: Report Completion

When done, reply:

**"Calendar Phase 1 Complete - UI rendering with lean API routes."**

---

## 🔜 PHASE ROADMAP

### Phase 2A: Event Detail Drawer (Next)
- Click event → slide-out drawer
- Show full event details
- "Convert to Job" button
- "Edit" and "Cancel" buttons (role-gated)

### Phase 2B: Create Event Modal
- "New Deposition" button
- Form: title, date, time, location, remote toggle
- Assign reporter dropdown
- Save → POST /api/calendar

### Phase 3: Job Intake Integration
- After convert-to-job, redirect to `/jobs/[id]/intake`
- Pre-fill from calendar event
- Add case details, deponent, parties

### Phase 4: Conflict Detection
- Query overlapping events
- Visual indicator on conflicting times
- Admin-only view

### Phase 5: Reporter Availability
- Reporter sets available hours
- Calendar shows availability overlay
- Prevents double-booking

### Phase 6: Scopist Marketplace Calendar
- Scopists see available jobs
- "Claim" workflow
- Deadline-based sorting

### Phase 7: Google Calendar Sync
- OAuth integration
- Two-way sync toggle
- Conflict handling

### Phase 8: Notification System
- Event reminders (email/in-app)
- Assignment notifications
- Status change alerts

### Phase 9: Mobile Optimization
- Touch-friendly event cards
- Swipe navigation
- Responsive timeline view

### Phase 10: Analytics Dashboard
- Events per month chart
- Reporter utilization
- Cancellation rate tracking

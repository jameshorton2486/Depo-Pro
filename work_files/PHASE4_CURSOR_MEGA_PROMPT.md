# DEPO-PRO PHASE 4: COMPLETE IMPLEMENTATION
## Drag-and-Drop Scheduling with Conflict Detection

**Copy this entire file into Cursor as a single prompt to implement Phase 4**

---

## OBJECTIVE

Implement Phase 4 "Drag-and-Drop Scheduling" for Depo-Pro:
1. Drag-and-drop event rescheduling with conflict detection
2. Real-time conflict preview during drag operations
3. Override capability with audit trail
4. Undo functionality for recent reschedules
5. Alternative time slot suggestions
6. Event resize with conflict checking
7. Locked status enforcement (CONVERTED, CANCELLED, COMPLETED)

---

## PREREQUISITES

Phase 3 must be complete:
- ✅ CONVERTED status exists in CalendarEventStatus enum
- ✅ RBAC utilities exist in lib/rbac.ts
- ✅ Audit logging is functional
- ✅ Calendar events can be converted to jobs

---

## STEP 1: UPDATE PRISMA SCHEMA

**File: `prisma/schema.prisma`**

### 1.1 Add new enums:

```prisma
enum ConflictType {
  REPORTER_DOUBLE_BOOKED
  LOCATION_CONFLICT
  TRAVEL_TIME_INSUFFICIENT
  RESOURCE_UNAVAILABLE
}

enum ConflictStatus {
  PENDING
  OVERRIDDEN
  RESOLVED
  AUTO_FIXED
}

enum ConflictResolution {
  KEPT_ORIGINAL
  MOVED_ORIGINAL
  REASSIGNED_REPORTER
  OVERRIDE_ACCEPTED
  TIME_ADJUSTED
}
```

### 1.2 Add ScheduleConflict model:

```prisma
model ScheduleConflict {
  id                String   @id @default(cuid())
  sourceEventId     String
  sourceEvent       CalendarEvent @relation("SourceConflicts", fields: [sourceEventId], references: [id], onDelete: Cascade)
  conflictEventId   String
  conflictEvent     CalendarEvent @relation("ConflictsWith", fields: [conflictEventId], references: [id], onDelete: Cascade)
  conflictType      ConflictType
  proposedStart     DateTime
  proposedEnd       DateTime
  overlapMinutes    Int
  status            ConflictStatus @default(PENDING)
  resolvedAt        DateTime?
  resolvedById      String?
  resolvedBy        User?     @relation(fields: [resolvedById], references: [id])
  resolution        ConflictResolution?
  resolutionNotes   String?
  createdAt         DateTime  @default(now())
  firmId            String
  firm              Firm      @relation(fields: [firmId], references: [id])
  
  @@index([sourceEventId])
  @@index([conflictEventId])
  @@index([firmId])
  @@index([status])
}
```

### 1.3 Update CalendarEvent model - add these fields:

```prisma
// Add to CalendarEvent:
sourceConflicts    ScheduleConflict[] @relation("SourceConflicts")
conflictsWith      ScheduleConflict[] @relation("ConflictsWith")
lastRescheduledAt  DateTime?
lastRescheduledBy  String?
rescheduleCount    Int       @default(0)
originalStartTime  DateTime?
```

### 1.4 Update Firm model:

```prisma
// Add to Firm:
scheduleConflicts  ScheduleConflict[]
```

After updating, run:
```bash
npx prisma migrate dev --name add_phase4_scheduling
npx prisma generate
```

---

## STEP 2: UPDATE LIB/ENUMS.TS

Add these to your existing lib/enums.ts:

```typescript
// Add to AuditAction enum:
CALENDAR_RESCHEDULE = "CALENDAR_RESCHEDULE",
CALENDAR_DRAG_DROP = "CALENDAR_DRAG_DROP",
CALENDAR_RESIZE = "CALENDAR_RESIZE",
CALENDAR_CONFLICT_OVERRIDE = "CALENDAR_CONFLICT_OVERRIDE",
CALENDAR_CONFLICT_DETECTED = "CALENDAR_CONFLICT_DETECTED",
CALENDAR_UNDO_RESCHEDULE = "CALENDAR_UNDO_RESCHEDULE",

// Add new enums:
export enum ConflictType {
  REPORTER_DOUBLE_BOOKED = "REPORTER_DOUBLE_BOOKED",
  LOCATION_CONFLICT = "LOCATION_CONFLICT",
  TRAVEL_TIME_INSUFFICIENT = "TRAVEL_TIME_INSUFFICIENT",
  RESOURCE_UNAVAILABLE = "RESOURCE_UNAVAILABLE",
}

export enum ConflictStatus {
  PENDING = "PENDING",
  OVERRIDDEN = "OVERRIDDEN",
  RESOLVED = "RESOLVED",
  AUTO_FIXED = "AUTO_FIXED",
}

export enum ConflictResolution {
  KEPT_ORIGINAL = "KEPT_ORIGINAL",
  MOVED_ORIGINAL = "MOVED_ORIGINAL",
  REASSIGNED_REPORTER = "REASSIGNED_REPORTER",
  OVERRIDE_ACCEPTED = "OVERRIDE_ACCEPTED",
  TIME_ADJUSTED = "TIME_ADJUSTED",
}
```

---

## STEP 3: CREATE CONFLICT DETECTION SERVICE

**Create: `lib/scheduling/conflict-detection.ts`**

This service provides:
- `checkForConflicts()` - Check for scheduling conflicts
- `findAlternativeTimeSlots()` - Find available alternatives
- `isReporterAvailable()` - Quick availability check
- `getReportersAvailability()` - Batch availability check

Key conflict types detected:
1. **REPORTER_DOUBLE_BOOKED** - Same reporter has overlapping events
2. **LOCATION_CONFLICT** - Same physical location has overlapping events
3. **TRAVEL_TIME_INSUFFICIENT** - Not enough time between events (30 min default)

See implementation file: `03-lib-conflict-detection.ts`

---

## STEP 4: CREATE SCHEDULING SERVICE

**Create: `lib/scheduling/scheduling-service.ts`**

This service provides:
- `rescheduleEvent()` - Reschedule with conflict detection and audit
- `undoReschedule()` - Undo a recent reschedule (5-minute window)
- `resizeEvent()` - Change event duration
- `previewReschedule()` - Dry run to check conflicts

Key features:
- Undo tokens with expiration
- Full audit trail for all operations
- Permission checks (ADMIN, AGENCY only)
- Locked event protection

See implementation file: `04-lib-scheduling-service.ts`

---

## STEP 5: CREATE API ROUTES

### 5.1 Reschedule Route
**Create: `app/api/calendar/events/[id]/reschedule/route.ts`**

- POST: Perform reschedule (with optional force override)
- PUT: Preview reschedule (dry run)

### 5.2 Undo Reschedule Route
**Create: `app/api/calendar/events/[id]/undo-reschedule/route.ts`**

- POST: Undo a recent reschedule using undo token

### 5.3 Check Conflicts Route
**Create: `app/api/calendar/events/check-conflicts/route.ts`**

- POST: Check for conflicts without modifying anything

### 5.4 Resize Route
**Create: `app/api/calendar/events/[id]/resize/route.ts`**

- POST: Resize event duration

See implementation files: `05-api-reschedule-route.ts` through `08-api-resize-route.ts`

---

## STEP 6: CREATE UI COMPONENTS

### 6.1 Conflict Dialog
**Create: `components/calendar/conflict-dialog.tsx`**

Features:
- Lists all detected conflicts with severity badges
- Override mode with reason input
- Alternative time slot selection
- Clear visual hierarchy

### 6.2 Drag Preview
**Create: `components/calendar/drag-preview.tsx`**

Features:
- Real-time availability indicator during drag
- Conflict count display
- Position follows cursor

### 6.3 Undo Toast Hook
**Create: `hooks/use-undo-toast.ts`**

Features:
- `useUndoToast()` - Generic undo toast
- `useRescheduleUndo()` - Specialized for reschedule operations
- Auto-dismisses after 8 seconds

### 6.4 Enhanced DepoCalendar
**Replace: `components/calendar/depo-calendar.tsx`**

New features:
- Conflict detection on drop
- Locked event indicators
- Undo support
- Resize handling
- Alternative time suggestions

See implementation files: `09-component-conflict-dialog.tsx` through `12-component-depo-calendar-enhanced.tsx`

---

## STEP 7: UPDATE COMPONENT EXPORTS

**Update: `components/calendar/index.ts`**

```typescript
// Existing exports
export { CalendarEventDetail } from './calendar-event-detail';
export { CalendarEventModal } from './calendar-event-modal';
export { DepoCalendar } from './depo-calendar';
export { BookingRequestForm } from './booking-request-form';
export { BookingRequestQueue } from './booking-request-queue';
export { AvailabilityManager } from './availability-manager';

// Phase 3 exports
export { ConvertToJobButton } from './convert-to-job-button';
export { EventStatusBadge, isEventLocked, canConvertToJob } from './event-status-badge';

// Phase 4 exports
export { ConflictDialog } from './conflict-dialog';
export { DragPreview, AvailabilityIndicator, DropZoneHighlight } from './drag-preview';
```

---

## STEP 8: CREATE SCHEDULING LIBRARY INDEX

**Create: `lib/scheduling/index.ts`**

```typescript
export {
  checkForConflicts,
  findAlternativeTimeSlots,
  isReporterAvailable,
  getReportersAvailability,
} from './conflict-detection';

export {
  rescheduleEvent,
  undoReschedule,
  resizeEvent,
  previewReschedule,
  canRescheduleEvent,
  canResizeEvent,
} from './scheduling-service';
```

---

## LOCKED EVENT RULES

Events in these statuses CANNOT be dragged or resized:
- `CONVERTED` - Has been converted to a job
- `CANCELLED` - Event was cancelled
- `COMPLETED` - Event has finished

Visual indicator: Lock icon appears on locked events

---

## CONFLICT HANDLING FLOW

```
User drags event
       ↓
Preview API called (PUT /reschedule)
       ↓
   ┌───────────────┐
   │ Has conflicts? │
   └───────┬───────┘
           │
     ┌─────┴─────┐
     │           │
   No ↓         Yes ↓
     │           │
   POST         Show
 /reschedule   Dialog
     │           │
   Success    ┌──┴───────────────┐
     │        │                  │
     ↓      Override    Select Alternative
  Show      (with reason)   (new time)
 Undo Toast    │                │
               ↓                ↓
           POST with      POST with
         forceOverride   new times
               │                │
               └────────┬───────┘
                        ↓
                   Show Undo Toast
```

---

## UNDO FUNCTIONALITY

- Undo tokens expire after 5 minutes
- Only the user who made the change can undo (or ADMIN)
- Undo triggers `CALENDAR_UNDO_RESCHEDULE` audit action
- After undo, the undo option is no longer available

---

## AUDIT ACTIONS

All Phase 4 operations are logged:

| Action | Description |
|--------|-------------|
| `CALENDAR_DRAG_DROP` | Event was moved via drag-and-drop |
| `CALENDAR_RESIZE` | Event duration was changed |
| `CALENDAR_CONFLICT_OVERRIDE` | User overrode detected conflicts |
| `CALENDAR_UNDO_RESCHEDULE` | User undid a reschedule |

---

## VERIFICATION CHECKLIST

After implementing all steps, verify:

- [ ] `npx prisma migrate dev` runs without errors
- [ ] `npx prisma generate` succeeds
- [ ] `npm run build` compiles without TypeScript errors
- [ ] ADMIN can drag events and see conflicts
- [ ] AGENCY can drag events and see conflicts
- [ ] REPORTER cannot drag events (no edit permission)
- [ ] CONVERTED events show lock icon
- [ ] CONVERTED events cannot be dragged
- [ ] CANCELLED events cannot be dragged
- [ ] Conflict dialog shows when dropping on occupied time
- [ ] Override with reason works and is logged
- [ ] Alternative time selection works
- [ ] Undo toast appears after reschedule
- [ ] Undo reverts the event to original time
- [ ] Resize creates conflicts correctly
- [ ] All operations create AuditLog entries

---

## TESTING COMMANDS

```bash
# Test preview reschedule
curl -X PUT http://localhost:3000/api/calendar/events/EVENT_ID/reschedule \
  -H "Content-Type: application/json" \
  -d '{"startTime": "2025-01-15T10:00:00Z", "endTime": "2025-01-15T12:00:00Z"}' \
  -H "Cookie: your-session-cookie"

# Test actual reschedule
curl -X POST http://localhost:3000/api/calendar/events/EVENT_ID/reschedule \
  -H "Content-Type: application/json" \
  -d '{"startTime": "2025-01-15T10:00:00Z", "endTime": "2025-01-15T12:00:00Z"}' \
  -H "Cookie: your-session-cookie"

# Test reschedule with override
curl -X POST http://localhost:3000/api/calendar/events/EVENT_ID/reschedule \
  -H "Content-Type: application/json" \
  -d '{"startTime": "2025-01-15T10:00:00Z", "endTime": "2025-01-15T12:00:00Z", "forceOverride": true, "overrideReason": "Client requested this time"}' \
  -H "Cookie: your-session-cookie"

# Test undo
curl -X POST http://localhost:3000/api/calendar/events/EVENT_ID/undo-reschedule \
  -H "Content-Type: application/json" \
  -d '{"undoToken": "undo_EVENT_ID_123456789_abc123"}' \
  -H "Cookie: your-session-cookie"

# Test check conflicts
curl -X POST http://localhost:3000/api/calendar/events/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{"reporterId": "REPORTER_ID", "startTime": "2025-01-15T10:00:00Z", "endTime": "2025-01-15T12:00:00Z"}' \
  -H "Cookie: your-session-cookie"
```

---

## FILE SUMMARY

| # | File | Purpose |
|---|------|---------|
| 01 | schema-additions.prisma | Prisma schema updates |
| 02 | enums-additions.ts | New enum values |
| 03 | lib-conflict-detection.ts | Core conflict detection service |
| 04 | lib-scheduling-service.ts | Reschedule/undo/resize operations |
| 05 | api-reschedule-route.ts | POST/PUT reschedule API |
| 06 | api-undo-reschedule-route.ts | Undo API |
| 07 | api-check-conflicts-route.ts | Conflict check API |
| 08 | api-resize-route.ts | Resize API |
| 09 | component-conflict-dialog.tsx | Conflict resolution UI |
| 10 | hook-use-undo-toast.ts | Undo toast functionality |
| 11 | component-drag-preview.tsx | Drag feedback UI |
| 12 | component-depo-calendar-enhanced.tsx | Updated calendar |
| 13 | lib-scheduling-index.ts | Library exports |

---

## END OF PHASE 4 IMPLEMENTATION

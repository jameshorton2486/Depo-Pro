# DEPO-PRO PHASE 4 IMPLEMENTATION CHECKLIST
## Drag-and-Drop Scheduling - Progress Tracker

Use this checklist to track your implementation progress. Check items off as you complete them.

---

## 📋 PREREQUISITES (Phase 3 Complete)

- [ ] **0.1** CalendarEventStatus has CONVERTED status
- [ ] **0.2** lib/rbac.ts exists and is functional
- [ ] **0.3** Audit logging (lib/audit.ts) is working
- [ ] **0.4** Convert to Job functionality works
- [ ] **0.5** npm run build passes without errors

---

## 📋 SCHEMA & DATABASE

- [ ] **1.1** Add ConflictType enum to schema
- [ ] **1.2** Add ConflictStatus enum to schema
- [ ] **1.3** Add ConflictResolution enum to schema
- [ ] **1.4** Add ScheduleConflict model to schema
- [ ] **1.5** Add sourceConflicts relation to CalendarEvent
- [ ] **1.6** Add conflictsWith relation to CalendarEvent
- [ ] **1.7** Add lastRescheduledAt field to CalendarEvent
- [ ] **1.8** Add lastRescheduledBy field to CalendarEvent
- [ ] **1.9** Add rescheduleCount field to CalendarEvent
- [ ] **1.10** Add originalStartTime field to CalendarEvent
- [ ] **1.11** Add scheduleConflicts relation to Firm
- [ ] **1.12** Run `npx prisma migrate dev --name add_phase4_scheduling`
- [ ] **1.13** Run `npx prisma generate`
- [ ] **1.14** Verify migration applied in Supabase

---

## 📋 LIB UTILITIES

- [ ] **2.1** Update lib/enums.ts with new AuditAction values
- [ ] **2.2** Add ConflictType enum to lib/enums.ts
- [ ] **2.3** Add ConflictStatus enum to lib/enums.ts
- [ ] **2.4** Add ConflictResolution enum to lib/enums.ts
- [ ] **2.5** Create lib/scheduling/ directory
- [ ] **2.6** Create lib/scheduling/conflict-detection.ts
- [ ] **2.7** Create lib/scheduling/scheduling-service.ts
- [ ] **2.8** Create lib/scheduling/index.ts
- [ ] **2.9** Verify imports work: `npm run typecheck`

---

## 📋 API ROUTES

- [ ] **3.1** Create app/api/calendar/events/[id]/reschedule/route.ts
- [ ] **3.2** Create app/api/calendar/events/[id]/undo-reschedule/route.ts
- [ ] **3.3** Create app/api/calendar/events/check-conflicts/route.ts
- [ ] **3.4** Create app/api/calendar/events/[id]/resize/route.ts
- [ ] **3.5** Test all API routes compile: `npm run build`

---

## 📋 UI COMPONENTS & HOOKS

- [ ] **4.1** Create hooks/use-undo-toast.ts
- [ ] **4.2** Create components/calendar/conflict-dialog.tsx
- [ ] **4.3** Create components/calendar/drag-preview.tsx
- [ ] **4.4** Update components/calendar/depo-calendar.tsx with Phase 4 features
- [ ] **4.5** Update components/calendar/index.ts with new exports
- [ ] **4.6** Verify all components compile

---

## 📋 TESTING - CONFLICT DETECTION

### Reporter Double-Booking
- [ ] **5.1** Moving event to time when reporter is busy shows conflict
- [ ] **5.2** Conflict marked as severity ERROR
- [ ] **5.3** Override not available for double-booking (canOverride: false)
- [ ] **5.4** Alternative times are suggested

### Location Conflicts
- [ ] **5.5** Moving event to location with existing event shows conflict
- [ ] **5.6** Conflict marked as severity WARNING
- [ ] **5.7** Remote events don't trigger location conflicts
- [ ] **5.8** Override is available for location conflicts

### Travel Time Conflicts
- [ ] **5.9** Events scheduled <30 min apart show warning
- [ ] **5.10** Events scheduled >30 min apart have no warning
- [ ] **5.11** Travel time warning can be overridden

---

## 📋 TESTING - DRAG AND DROP

### Basic Operations
- [ ] **6.1** ADMIN can drag events
- [ ] **6.2** AGENCY can drag events
- [ ] **6.3** REPORTER cannot drag events
- [ ] **6.4** SCOPIST cannot drag events
- [ ] **6.5** ATTORNEY cannot drag events
- [ ] **6.6** Dragging to empty slot succeeds immediately
- [ ] **6.7** Event updates in database after drag

### Locked Events
- [ ] **6.8** CONVERTED events show lock icon
- [ ] **6.9** CONVERTED events cannot be dragged
- [ ] **6.10** CANCELLED events cannot be dragged
- [ ] **6.11** COMPLETED events cannot be dragged
- [ ] **6.12** Toast error appears when trying to drag locked event

### Conflict Handling
- [ ] **6.13** Conflict dialog opens when dropping on occupied time
- [ ] **6.14** All conflicts are listed in dialog
- [ ] **6.15** Severity badges (Blocking/Warning) display correctly
- [ ] **6.16** Cancel button reverts the drag
- [ ] **6.17** View Alternatives button shows alternative times
- [ ] **6.18** Selecting alternative time reschedules correctly
- [ ] **6.19** Override button (when available) opens reason input
- [ ] **6.20** Override with reason succeeds and logs
- [ ] **6.21** Override without reason is blocked

---

## 📋 TESTING - UNDO FUNCTIONALITY

- [ ] **7.1** Undo toast appears after successful reschedule
- [ ] **7.2** Toast shows previous and new time
- [ ] **7.3** Clicking Undo reverts the event
- [ ] **7.4** Calendar refreshes after undo
- [ ] **7.5** Undo creates CALENDAR_UNDO_RESCHEDULE audit entry
- [ ] **7.6** Undo toast disappears after 8 seconds
- [ ] **7.7** Expired undo token returns 410 Gone error
- [ ] **7.8** Only original user can undo (or ADMIN)

---

## 📋 TESTING - RESIZE

- [ ] **8.1** Resizing event updates end time
- [ ] **8.2** Resize that creates conflicts shows error
- [ ] **8.3** ADMIN can resize events
- [ ] **8.4** AGENCY can resize events
- [ ] **8.5** REPORTER cannot resize events
- [ ] **8.6** Locked events cannot be resized
- [ ] **8.7** Resize creates CALENDAR_RESIZE audit entry

---

## 📋 TESTING - AUDIT LOGGING

- [ ] **9.1** CALENDAR_DRAG_DROP logged on successful drag
- [ ] **9.2** Audit includes previousStart, previousEnd, newStart, newEnd
- [ ] **9.3** CALENDAR_CONFLICT_OVERRIDE logged when overriding
- [ ] **9.4** Override audit includes conflict details and reason
- [ ] **9.5** CALENDAR_UNDO_RESCHEDULE logged on undo
- [ ] **9.6** CALENDAR_RESIZE logged on resize
- [ ] **9.7** All audits have correct userId

---

## 📋 EXIT CRITERIA

- [ ] **10.1** `npm run typecheck` passes with ZERO errors
- [ ] **10.2** `npm run build` succeeds
- [ ] **10.3** All drag-drop operations respect RBAC
- [ ] **10.4** Locked events are protected from modification
- [ ] **10.5** All conflicts are detected correctly
- [ ] **10.6** Override flow works with audit trail
- [ ] **10.7** Undo functionality works within time window
- [ ] **10.8** Alternative time suggestions are valid
- [ ] **10.9** No console errors in browser during testing
- [ ] **10.10** Calendar updates in real-time after changes

---

## 🔍 QUICK TEST COMMANDS

```bash
# Check for TypeScript errors
npm run typecheck

# Build the application
npm run build

# Start development server
npm run dev

# Check database migration status
npx prisma migrate status

# Open Prisma Studio to inspect data
npx prisma studio

# Check audit logs in database
# In Prisma Studio, view AuditLog table filtered by action
```

---

## 📊 PROGRESS SUMMARY

| Section | Total | Completed | Progress |
|---------|-------|-----------|----------|
| Prerequisites | 5 | | |
| Schema & Database | 14 | | |
| Lib Utilities | 9 | | |
| API Routes | 5 | | |
| UI Components | 6 | | |
| Conflict Detection Tests | 11 | | |
| Drag-and-Drop Tests | 21 | | |
| Undo Tests | 8 | | |
| Resize Tests | 7 | | |
| Audit Logging Tests | 7 | | |
| Exit Criteria | 10 | | |
| **TOTAL** | **103** | | |

---

## 📝 NOTES

Add any notes, issues encountered, or modifications made during implementation:

```
Date: 
Note: 
```

```
Date: 
Note: 
```

```
Date: 
Note: 
```

---

## 🚀 PHASE 5 PREVIEW

After completing Phase 4, the next phase will focus on:
- Real-time collaboration (multiple users editing)
- WebSocket updates for live calendar sync
- Push notifications for schedule changes
- Mobile-responsive calendar enhancements

# 🎯 CURSOR AUTHORITATIVE TASK
## Depo-Pro Calendar UI Phase 1 (Read-Only, Role-Aware)

---

## ⚠️ ABSOLUTE RULES (DO NOT VIOLATE)

- ❌ NO Prisma calls in client components
- ❌ NO schema changes
- ❌ NO API mutations
- ❌ NO backend logic edits
- ✅ READ-ONLY UI ONLY
- ✅ Use existing `/api/calendar` endpoint
- ✅ Use server components for data fetching
- ✅ Role logic must be display-only

**If any rule conflicts, STOP and ASK.**

---

## 🧱 GOAL

Build a professional calendar UI for Depo-Pro that:
- Displays depositions and events
- Supports grid + timeline views
- Is role-aware (visibility & affordances)
- Is read-only in Phase 1
- Does not risk backend stability

This UI will be the foundation for:
- Scheduling
- Conflict detection
- Assignment workflows
- Scopist marketplace
- Google Calendar sync (later)

---

## 🗂️ FILES TO CREATE (ONLY THESE)

```
app/(dashboard)/calendar/page.tsx
components/calendar/
  ├─ calendar-shell.tsx
  ├─ calendar-toolbar.tsx
  ├─ calendar-grid.tsx
  ├─ calendar-timeline.tsx
  ├─ calendar-event-card.tsx
  └─ role-visibility.ts
lib/calendar/
  ├─ calendar-types.ts
  └─ calendar-utils.ts
```

- ❌ Do not edit existing calendar API routes
- ❌ Do not touch Prisma
- ❌ Do not touch auth logic

---

## 🧠 DATA CONTRACT (DO NOT CHANGE)

**IMPORTANT:** First read `prisma/schema.prisma` to see the actual `CalendarEvent` model fields.

Use the existing API endpoint:
```
GET /api/calendar?startDate=...&endDate=...
```

The API returns `{ events: CalendarEventDTO[] }`.

Map the response to your UI types. If the schema has different field names than expected, adapt the UI to use the actual fields:

| Expected Field | Check Schema For |
|----------------|------------------|
| `caseStyle` | might be `title` or `caseCaption` |
| `deponentName` | might be in related CSRRecord |
| `scheduledStartTime` | might be `startTime` or `scheduledStart` |
| `scheduledEndTime` | might be `endTime` or `scheduledEnd` |
| `locationType` | might be `location` or `isRemote` |

**If a field is missing → render safely with fallback.**

Example safe rendering:
```tsx
<span>{event.caseStyle || event.title || 'Untitled Event'}</span>
```

---

## 🎨 UI REQUIREMENTS

### Calendar Views

**Grid View**
- Month / Week toggle
- Cards per event

**Timeline View**
- Vertical time axis
- Overlapping event stacking
- Clear time boundaries

### Event Card Must Show
- Case Style / Title
- Deponent (if available)
- Start Time
- Location Icon (Zoom/In-Person)
- Priority Badge (Rush/Standard) - if available
- Status Badge

---

## 🧑‍⚖️ ROLE-AWARE DISPLAY LOGIC (CRITICAL)

Create `role-visibility.ts` that exports:

```typescript
export function canSeeEventDetails(role: UserRole): boolean
export function canSeeAssignments(role: UserRole): boolean
export function canSeeConflicts(role: UserRole): boolean
```

### Role Matrix (DISPLAY ONLY)

| Role | Can See Event | Can See Assigned CSR | Can See Conflicts |
|------|---------------|---------------------|-------------------|
| Attorney | ✅ | ❌ | ❌ |
| Law Firm Admin | ✅ | ❌ | ❌ |
| CSR | ✅ (own only) | ✅ (self) | ❌ |
| Agency Admin | ✅ | ✅ | ✅ |
| Scopist | ❌ (unless assigned) | ❌ | ❌ |
| Videographer | ✅ (assigned only) | ❌ | ❌ |
| Interpreter | ✅ (assigned only) | ❌ | ❌ |

⚠️ This is presentation logic only — NOT enforcement.

---

## 🧩 IMPLEMENTATION STEPS (FOLLOW EXACTLY)

### Step 1 — Calendar Page

Create: `app/(dashboard)/calendar/page.tsx`

- Server component
- Fetch events via `fetch("/api/calendar?startDate=...&endDate=...")`
- Pass data into `<CalendarShell />`

```tsx
// Example
const now = new Date();
const startDate = startOfMonth(now).toISOString();
const endDate = endOfMonth(now).toISOString();

const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calendar?startDate=${startDate}&endDate=${endDate}`, {
  headers: { cookie: cookies().toString() }
});
const { events } = await res.json();
```

### Step 2 — Calendar Shell

`calendar-shell.tsx`

Responsibilities:
- Holds current view state (grid vs timeline)
- Renders toolbar + selected view
- No data fetching

### Step 3 — Toolbar

`calendar-toolbar.tsx`

- View toggle (Grid / Timeline)
- Legend for status & priority
- No actions yet

### Step 4 — Grid View

`calendar-grid.tsx`

- Map events into day buckets
- Render `<CalendarEventCard />`
- Month/week toggle (state only)

### Step 5 — Timeline View

`calendar-timeline.tsx`

- Sort events by start time
- Stack overlaps
- Vertical hour markers

### Step 6 — Event Card

`calendar-event-card.tsx`

- Fully presentational
- Uses role-visibility helpers
- No links yet (Phase 2)

### Step 7 — Type Safety

Create `lib/calendar/calendar-types.ts`:

```typescript
// Adapt these types to match your actual schema
export type CalendarEventDTO = {
  id: string;
  title?: string;
  caseStyle?: string;
  deponentName?: string;
  startTime?: string;
  endTime?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  location?: string;
  locationType?: string;
  isRemote?: boolean;
  status: string;
  assignedReporter?: {
    id: string;
    firstName?: string;
    lastName?: string;
  } | null;
  firmId?: string;
  jobId?: string | null;
};

export type CalendarView = "grid" | "timeline";
export type UserRole = "ADMIN" | "COURT_REPORTER" | "SCOPIST" | "ATTORNEY" | "AGENCY_ADMIN";
```

---

## 🚫 WHAT YOU MUST NOT DO

- ❌ No drag-and-drop
- ❌ No create/edit/delete
- ❌ No conflict resolution logic
- ❌ No Google Calendar sync
- ❌ No Prisma imports

Those are Phase 2+.

---

## ✅ COMPLETION CHECKLIST

When done, verify:

- [ ] Calendar renders without errors
- [ ] Events load correctly (even if empty)
- [ ] Roles hide/show fields properly
- [ ] No backend files changed
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes

---

## 🟢 DELIVERABLE

When finished, reply:

**"Calendar UI Phase 1 complete — ready for Phase 2."**

---

## 🔜 NEXT PHASE OPTIONS (YOUR CHOICE)

- **Phase 2A** — Conflict visualization (Admin only)
- **Phase 2B** — Assignment workflows
- **Phase 3** — Scopist marketplace calendar
- **Phase 4** — Google Calendar sync (two-way)

---

You've built the foundation correctly.
This UI work is safe, clean, and extensible.

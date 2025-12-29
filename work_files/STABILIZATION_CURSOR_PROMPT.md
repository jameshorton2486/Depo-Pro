# DEPO-PRO STABILIZATION MEGA-PROMPT
## Items 1-3: TypeScript Fix, ESLint Enforcement, Phase 3 API Tightening

**Copy this entire file into Cursor as a single prompt**

---

## CONTEXT

You are implementing stabilization changes for Depo-Pro, a legal transcription SaaS platform.
- Stack: Next.js 15 (App Router), TypeScript, Prisma, Supabase, NextAuth v5
- Mode: Stabilization only — NO new features, NO broad rewrites

---

## OBJECTIVE 1: Fix CalendarToolbarProps TypeScript Error (PROACTIVE)

**Status**: The `CalendarToolbarProps` type doesn't currently exist. Create it proactively to prevent future errors.

### Action: Create `lib/calendar/calendar-types.ts`

```bash
mkdir -p lib/calendar
```

Then create the file with these types:

```typescript
// ============================================================
// CALENDAR TYPES
// Path: lib/calendar/calendar-types.ts
// ============================================================

// Calendar view types
export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

// Event status types
export type CalendarEventStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'CONVERTED';

// Calendar toolbar props interface
export interface CalendarToolbarProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  reporterFilter: string;
  onReporterFilterChange: (reporterId: string) => void;
  reporters: Array<{ id: string; name: string }>;
  isLoading: boolean;
  onRefresh: () => void;
  onCreateEvent?: () => void;
  canCreateEvents: boolean;
}

// Status colors for UI consistency
export const STATUS_COLORS: Record<CalendarEventStatus, { bg: string; text: string; label: string }> = {
  REQUESTED: { bg: '#FFA500', text: '#fff', label: 'Requested' },
  SCHEDULED: { bg: '#3788D8', text: '#fff', label: 'Scheduled' },
  CONFIRMED: { bg: '#28A745', text: '#fff', label: 'Confirmed' },
  IN_PROGRESS: { bg: '#17A2B8', text: '#fff', label: 'In Progress' },
  COMPLETED: { bg: '#6C757D', text: '#fff', label: 'Completed' },
  CANCELLED: { bg: '#DC3545', text: '#fff', label: 'Cancelled' },
  RESCHEDULED: { bg: '#9B59B6', text: '#fff', label: 'Rescheduled' },
  CONVERTED: { bg: '#4F46E5', text: '#fff', label: 'Converted' },
};

// Locked statuses
export const LOCKED_STATUSES: CalendarEventStatus[] = ['CONVERTED', 'CANCELLED', 'COMPLETED'];
```

---

## OBJECTIVE 2: ESLint Strict Unused Variables Enforcement

### Action: Update `eslint.config.mjs`

Change the `@typescript-eslint/no-unused-vars` rule from `'warn'` to `'error'`:

**Before:**
```javascript
'@typescript-eslint/no-unused-vars': [
  'warn',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  },
],
```

**After:**
```javascript
'@typescript-eslint/no-unused-vars': [
  'error',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  },
],
```

**Important**: Only variables/parameters prefixed with `_` are exempt from this rule.

---

## OBJECTIVE 3: Phase 3 API Enforcement Tightening

### 3A: Calendar Events API Route

**File**: `app/api/calendar/events/[id]/route.ts`

**Changes Required**:

1. **Add audit import at top**:
```typescript
import { logAudit } from '@/lib/audit';
import { AuditAction, AuditEntityType } from '@/lib/enums';
```

2. **Add tenant isolation helper function**:
```typescript
async function assertTenantIsolation(session) {
  if (!session?.user) {
    throw NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, firmId: true },
  });

  if (!user?.firmId) {
    throw NextResponse.json(
      { error: 'User not associated with a firm', code: 'NO_FIRM' },
      { status: 403 }
    );
  }

  return { user: { ...session.user, ...user } };
}
```

3. **Update GET handler** - Add audit logging after successful fetch:
```typescript
await logAudit({
  userId: user.id,
  action: AuditAction.VIEW,
  entityType: AuditEntityType.CalendarEvent,
  entityId: id,
  details: { eventTitle: event.title },
});
```

4. **Update PATCH handler** - Add audit logging after successful update:
```typescript
await logAudit({
  userId: user.id,
  action: AuditAction.UPDATE,
  entityType: AuditEntityType.CalendarEvent,
  entityId: id,
  details: {
    changedFields: Object.keys(data),
    previousStatus: existingEvent.status,
    newStatus: updatedEvent.status,
  },
});
```

5. **Update DELETE handler** - Add audit logging:
```typescript
await logAudit({
  userId: user.id,
  action: AuditAction.DELETE,
  entityType: AuditEntityType.CalendarEvent,
  entityId: id,
  details: { eventTitle: event.title },
});
```

6. **Tighten role checks** - Change line 150 from:
```typescript
const isAgencyOrAdmin = ['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role);
```
To:
```typescript
const isAgencyOrAdmin = ['ADMIN', 'AGENCY'].includes(user.role);
```

7. **Tighten DELETE role check** - Change line 302 from:
```typescript
if (!['ADMIN', 'REPORTER', 'SCOPIST', 'COURT_REPORTER', 'ATTORNEY', 'AGENCY'].includes(user.role))
```
To:
```typescript
if (!['ADMIN', 'AGENCY'].includes(user.role))
```

---

### 3B: Job Assignment API Route

**File**: `app/api/jobs/[id]/assign/route.ts`

**Changes Required**:

1. **Add imports**:
```typescript
import { logAudit } from '@/lib/audit';
import { AuditAction, AuditEntityType } from '@/lib/enums';
```

2. **Add role constants**:
```typescript
const ASSIGNMENT_ALLOWED_ROLES = ['ADMIN', 'AGENCY', 'COURT_REPORTER'] as const;
```

3. **Add tenant isolation to job fetch** - Change:
```typescript
const job = await db.job.findUnique({
  where: { id: jobId },
```
To:
```typescript
const job = await db.job.findFirst({
  where: {
    id: jobId,
    firmId: user.firmId, // TENANT ISOLATION
  },
```

4. **Add tenant isolation to scopist validation** - Change:
```typescript
const scopist = await db.user.findUnique({
  where: { id: validatedData.scopistId },
```
To:
```typescript
const scopist = await db.user.findFirst({
  where: {
    id: validatedData.scopistId,
    firmId: user.firmId, // SAME TENANT CHECK
    role: 'SCOPIST',
  },
```

5. **Add role check at API boundary** - After getting user, add:
```typescript
if (!ASSIGNMENT_ALLOWED_ROLES.includes(user.role as any)) {
  return NextResponse.json(
    { error: 'Insufficient permissions', code: 'FORBIDDEN' },
    { status: 403 }
  );
}
```

6. **Add audit logging after assignment creation**:
```typescript
await logAudit({
  userId: user.id,
  action: AuditAction.CREATE,
  entityType: AuditEntityType.Job,
  entityId: jobId,
  details: {
    action: 'SCOPIST_ASSIGNED',
    assignmentId: assignment.id,
    scopistId: scopist.id,
    scopistName: `${scopist.firstName} ${scopist.lastName}`,
  },
});
```

---

## VERIFICATION CHECKLIST

After making all changes, verify:

- [ ] `lib/calendar/calendar-types.ts` exists with CalendarToolbarProps export
- [ ] ESLint config has `'error'` for no-unused-vars (not `'warn'`)
- [ ] Calendar events route imports logAudit
- [ ] Calendar events GET handler logs VIEW action
- [ ] Calendar events PATCH handler logs UPDATE action
- [ ] Calendar events DELETE handler logs DELETE action
- [ ] Calendar events DELETE only allows ADMIN, AGENCY
- [ ] Jobs assign route imports logAudit
- [ ] Jobs assign route validates scopist is in same firm
- [ ] Jobs assign route validates job is in same firm
- [ ] Jobs assign route logs CREATE action
- [ ] Run `npm run typecheck` - should pass
- [ ] Run `npm run lint` - should pass

---

## FILES CHANGED SUMMARY

| File | Change Type |
|------|-------------|
| `lib/calendar/calendar-types.ts` | NEW |
| `eslint.config.mjs` | MODIFIED (warn → error) |
| `app/api/calendar/events/[id]/route.ts` | MODIFIED (audit + tenant) |
| `app/api/jobs/[id]/assign/route.ts` | MODIFIED (audit + tenant) |

---

## HARD CONSTRAINTS REMINDER

- ❌ No regex-based automated refactors
- ❌ No broad rewrites
- ❌ No speculative cleanup
- ❌ No new features
- ❌ No "while I'm here" changes
- ✅ Only the specific changes described above

---

## END OF STABILIZATION PROMPT

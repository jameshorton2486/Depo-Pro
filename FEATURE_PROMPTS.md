# 🔒 Cursor Feature Prompts (Build-Mode Safe)

**Status:** Canonical Templates for Feature Development  
**Date:** January 2025

---

## 🎯 How to Use

1. Copy the **CANONICAL PROMPT** below
2. Replace `<FEATURE DESCRIPTION HERE>` with your feature
3. Fill in `AFFECTED ROUTES` section
4. Paste into Cursor Chat
5. Follow the output format strictly

---

## 🔒 CANONICAL FEATURE PROMPT

```
You are acting as a Senior Staff Engineer implementing a new feature
inside a Supabase-only, RLS-secured Next.js application.

GLOBAL CONSTRAINTS (NON-NEGOTIABLE):
- Prisma does not exist. Do NOT reference it.
- Do NOT access Supabase directly from UI or API routes.
- ALL database access must live in lib/supabase/queries/*
- Enforce Row Level Security at all times.
- Do NOT bypass TypeScript with any, unknown, or ts-ignore.
- Preserve existing authorization rules.
- Do NOT modify unrelated routes or components.

TARGET ARCHITECTURE:
- UI → API Route → Query Module → Supabase
- API routes orchestrate only (auth, validation, response)
- Query modules contain all database logic
- Supabase client created via createSupabaseServerClient()

TASK:
Implement the following feature:

<FEATURE DESCRIPTION HERE>

AFFECTED ROUTES:
<List routes or pages impacted>

REQUIRED PROCESS:
1. Identify which domain query file is responsible
2. Create or extend lib/supabase/queries/<domain>.ts
3. Add explicit, typed query functions
4. Handle Supabase errors explicitly
5. Update API routes to call query helpers only
6. Map snake_case → camelCase before returning
7. Update UI to consume the new response shape
8. Add type definitions if needed

OUTPUT FORMAT (MANDATORY):
Section 1: Feature summary
Section 2: New/updated query functions
Section 3: API route changes
Section 4: UI changes (if any)
Section 5: Types/contracts added
Section 6: Verification checklist

STOP if the feature crosses domain boundaries.
Ask for confirmation before proceeding.

Begin.
```

---

## 🧠 FEATURE PROMPT VARIANTS

### Variant 1: Reporter Utilization Dashboard

```
TASK:
Implement the following feature:

Add reporter utilization dashboard

The dashboard should show:
- Total jobs assigned per reporter
- Jobs completed vs. in-progress
- Average turnaround time per reporter
- Reporter availability status
- Filterable by date range and firm

AFFECTED ROUTES:
- GET /api/admin/reporters/utilization
- GET /app/(dashboard)/admin/reporters/utilization/page.tsx
```

### Variant 2: Transcript Lock Status Indicators

```
TASK:
Implement the following feature:

Add transcript lock status indicators

The UI should display:
- Visual indicator when transcript is locked
- Who locked it and when
- Lock reason (if available)
- Ability to request unlock (if user has permission)

AFFECTED ROUTES:
- GET /api/transcripts/[id]/lock-status
- GET /app/(dashboard)/transcripts/[id]/page.tsx
```

### Variant 3: Job Lifecycle Timeline View

```
TASK:
Implement the following feature:

Add job lifecycle timeline view

The timeline should show:
- Job creation timestamp
- Assignment events
- Status transitions
- File uploads
- Transcript creation
- Completion timestamp

AFFECTED ROUTES:
- GET /api/jobs/[id]/timeline
- GET /app/(dashboard)/jobs/[id]/page.tsx
```

### Variant 4: Calendar Conflict Preview Modal

```
TASK:
Implement the following feature:

Add calendar conflict preview modal

When scheduling a new event, show:
- List of conflicting events
- Reporter availability status
- Suggested alternative times
- Ability to override conflicts (admin only)

AFFECTED ROUTES:
- POST /api/calendar/events/check-conflicts (enhance existing)
- GET /app/(dashboard)/calendar/page.tsx
```

### Variant 5: Audit Log Filtering by Firm

```
TASK:
Implement the following feature:

Add audit log filtering by firm

The audit log should support:
- Filter by firm_id
- Filter by date range
- Filter by action type
- Filter by user role
- Export filtered results

AFFECTED ROUTES:
- GET /api/audit (enhance existing)
- GET /app/(dashboard)/admin/audit/page.tsx
```

---

## 📋 QUERY MODULE SELECTION GUIDE

When implementing a feature, choose the correct query module:

| Feature Domain | Query File | Example Functions |
|---------------|------------|-------------------|
| Jobs | `lib/supabase/queries/jobs.ts` | `getJobById`, `listJobs`, `updateJobStatus` |
| Transcripts | `lib/supabase/queries/transcripts.ts` | `getTranscriptForExport`, `getTranscriptEdits` |
| Cases | `lib/supabase/queries/cases.ts` | `listCases`, `getCaseById` |
| Notes | `lib/supabase/queries/notes.ts` | `listNotesForJob`, `createNote` |
| Files | `lib/supabase/queries/files.ts` | `listFilesForJob`, `createFile` |
| Calendar | `lib/supabase/queries/calendar.ts` | `listCalendarEvents`, `createCalendarEvent` |
| Admin | `lib/supabase/queries/admin.ts` | `listUsers`, `updateUserRole` |
| Audit | `lib/supabase/queries/audit.ts` | `createAuditLog`, `listAuditLogs` |

---

## ✅ VERIFICATION CHECKLIST TEMPLATE

After implementing any feature, verify:

- [ ] **Query Functions**
  - [ ] All database access in `lib/supabase/queries/*`
  - [ ] Functions accept `SupabaseClient` as first parameter
  - [ ] Error handling is explicit
  - [ ] Uses `.single()` or `.maybeSingle()` correctly

- [ ] **API Routes**
  - [ ] No direct `.from()` calls
  - [ ] Auth check via `auth()` helper
  - [ ] Role authorization where needed
  - [ ] Calls query helpers only
  - [ ] Maps snake_case → camelCase

- [ ] **UI Components**
  - [ ] Consumes camelCase data only
  - [ ] No knowledge of table names
  - [ ] No knowledge of RLS policies
  - [ ] Proper loading/error states

- [ ] **Type Safety**
  - [ ] No `any` types
  - [ ] No `@ts-ignore` or `@ts-expect-error`
  - [ ] Explicit interfaces for all responses
  - [ ] Types match UI contracts

- [ ] **Code Quality**
  - [ ] `npm run lint` passes
  - [ ] `npm run typecheck` passes
  - [ ] `npm run dev` starts without errors
  - [ ] No Prisma references

---

## 🚫 ANTI-PATTERNS (NEVER DO THIS)

❌ **Direct Supabase in Routes**
```typescript
// ❌ NEVER
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('jobs').select('*');
  return NextResponse.json(data);
}
```

❌ **Business Logic in Routes**
```typescript
// ❌ NEVER
export async function POST() {
  // Complex business rules here
  if (condition1 && condition2 || condition3) {
    // 50 lines of logic
  }
}
```

❌ **snake_case in UI**
```typescript
// ❌ NEVER
<div>{job.created_by_id}</div>
<div>{job.deposition_date}</div>

// ✅ CORRECT
<div>{job.createdById}</div>
<div>{job.depositionDate}</div>
```

❌ **Type Assertions**
```typescript
// ❌ NEVER
const data = result as any;
const value = (obj as unknown as OtherType).field;

// ✅ CORRECT
interface ResponseType {
  field: string;
}
const data: ResponseType = result;
```

---

## 🎯 QUICK REFERENCE

| Task | Location | Pattern |
|------|----------|---------|
| Database access | `lib/supabase/queries/*.ts` | Query functions |
| Business logic | `lib/services/*.ts` | Pure functions |
| Auth/Authorization | Route handlers | `auth()` + role checks |
| Response formatting | Route handlers | snake_case → camelCase |
| UI data fetching | API routes | `fetch('/api/...')` |

---

**Remember:** Every feature must pass the verification checklist before commit.

**Architecture Status:** ✅ Supabase-Only  
**Build Mode:** ✅ Active  
**Prisma:** ✅ Completely Removed

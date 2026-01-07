# 🏗️ BUILD MODE GUIDE

**Status:** ✅ Architecture Finalized - Ready for Feature Development  
**Date:** January 2025

---

## 🧱 ARCHITECTURE RULES

### Before Writing Code

Ask these questions:

1. **Which query file does this belong in?**
   - Jobs → `lib/supabase/queries/jobs.ts`
   - Transcripts → `lib/supabase/queries/transcripts.ts`
   - Cases → `lib/supabase/queries/cases.ts`
   - Notes → `lib/supabase/queries/notes.ts`
   - Files → `lib/supabase/queries/files.ts`
   - Calendar → `lib/supabase/queries/calendar.ts`
   - Admin → `lib/supabase/queries/admin.ts`
   - Audit → `lib/supabase/queries/audit.ts`

2. **Does RLS already protect this data?**
   - Check if Row Level Security policies exist
   - Verify policies match your access requirements
   - Test with different user roles

3. **Is this read, write, or transition logic?**
   - Read → `get*()` or `list*()` functions
   - Write → `create*()`, `update*()`, `delete*()` functions
   - Transition → Status change functions (may need RPC)

---

## 🧠 QUERY RULES

### Every Query Must:

✅ **Accept SupabaseClient**
```typescript
export async function getJobById(
  supabase: SupabaseClient,
  jobId: string
) { ... }
```

✅ **Handle `{ error }`**
```typescript
const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).single();

if (error) {
  if (error.code === 'PGRST116') {
    return null; // Not found
  }
  throw error; // Other errors
}
```

✅ **Return raw DB shape (snake_case)**
```typescript
// Query returns: { case_id, created_by_id, deposition_date }
// NOT: { caseId, createdById, depositionDate }
```

✅ **Never assume admin access**
- Use authenticated `supabase` client (respects RLS)
- Use Admin API only for `auth.users` operations
- Never bypass RLS with service role in query functions

### Query Function Template

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export async function getResourceById(
  supabase: SupabaseClient,
  resourceId: string
) {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('id', resourceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error; // Other errors
  }

  return data;
}
```

---

## 🌐 ROUTE RULES

### Routes May:

✅ **Authenticate user**
```typescript
const session = await auth();
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

✅ **Authorize role**
```typescript
const userRole = session.user.role || 'REPORTER';
if (userRole !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

✅ **Call query helpers**
```typescript
const supabase = await createSupabaseServerClient();
const job = await getJobById(supabase, jobId);
```

✅ **Map response shape**
```typescript
// Map snake_case to camelCase
return NextResponse.json({
  id: job.id,
  caseId: job.case_id,
  createdById: job.created_by_id,
  depositionDate: job.deposition_date,
});
```

### Routes May NOT:

❌ **Call `.from()` directly**
```typescript
// ❌ WRONG
const { data } = await supabase.from('jobs').select('*');

// ✅ CORRECT
const job = await getJobById(supabase, jobId);
```

❌ **Contain business rules**
```typescript
// ❌ WRONG - Business logic in route
if (job.status === 'COMPLETED' && user.role !== 'ADMIN') {
  // Complex business logic here
}

// ✅ CORRECT - Business logic in service or query function
const canEdit = await checkJobEditPermission(supabase, jobId, userId);
```

❌ **Perform joins manually**
```typescript
// ❌ WRONG - Manual joins in route
const job = await getJob(supabase, jobId);
const assignments = await getAssignments(supabase, jobId);
const files = await getFiles(supabase, jobId);

// ✅ CORRECT - Use query function with includes
const job = await getJobById(supabase, jobId, {
  includeAssignments: true,
  includeFiles: true,
});
```

---

## 🎨 UI RULES

### UI May:

✅ **Consume camelCase data only**
```typescript
// API returns camelCase
const job = await fetch('/api/jobs/123').then(r => r.json());
// job.caseId, job.createdById, job.depositionDate
```

✅ **Assume role-based filtering already occurred**
```typescript
// UI doesn't need to filter - API already did
const jobs = await fetch('/api/jobs').then(r => r.json());
// All returned jobs are accessible to current user
```

### UI May NOT:

❌ **Know about RLS**
```typescript
// ❌ WRONG - UI checking RLS
if (user.role === 'ADMIN' || job.createdById === user.id) {
  // UI shouldn't know about RLS rules
}

// ✅ CORRECT - UI checks permissions from API
const permissions = await fetch(`/api/jobs/${jobId}/permissions`).then(r => r.json());
if (permissions.canEdit) {
  // Show edit button
}
```

❌ **Know about table names**
```typescript
// ❌ WRONG - UI references table names
const data = await supabase.from('jobs').select('*');

// ✅ CORRECT - UI calls API routes
const jobs = await fetch('/api/jobs').then(r => r.json());
```

---

## 🧪 VERIFICATION GATE (EVERY FEATURE)

**Before committing any feature, run:**

```bash
npm run lint
npm run typecheck
npm run dev
```

**All must pass with zero errors.**

### Lint Rules
- ✅ No unused variables (prefix with `_` if intentionally unused)
- ✅ No unused imports
- ✅ No `any` types (use proper TypeScript types)
- ✅ No `@ts-ignore` or `@ts-expect-error`

### Typecheck Rules
- ✅ Zero TypeScript errors
- ✅ All types are explicit
- ✅ No type assertions (`as any`, `as unknown`)

### Dev Server
- ✅ Application starts without errors
- ✅ No runtime errors in console
- ✅ Routes respond correctly

---

## 📋 QUERY LAYER STRUCTURE

```
lib/supabase/queries/
├── jobs.ts          ✅ Job CRUD + assignments
├── cases.ts         ✅ Case listing + access control
├── transcripts.ts   ✅ Transcript queries + export
├── notes.ts         ✅ Note CRUD
├── files.ts         ✅ File CRUD
├── calendar.ts      ✅ Calendar event CRUD
├── admin.ts         ✅ Admin operations (uses Admin API)
└── audit.ts         ✅ Audit log queries
```

---

## 🔄 MIGRATION PATTERN

When migrating a route from `db` wrapper to query layer:

1. **Identify domain** → Choose appropriate query file
2. **Create query functions** → Add to `lib/supabase/queries/<domain>.ts`
3. **Update route** → Replace `db.*` calls with query functions
4. **Map responses** → Convert snake_case → camelCase
5. **Test** → Verify functionality preserved
6. **Verify** → Run lint, typecheck, dev server

---

## 🚫 ANTI-PATTERNS (NEVER DO THIS)

❌ **Direct Supabase in routes**
```typescript
// ❌ NEVER
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('jobs').select('*');
  return NextResponse.json(data);
}
```

❌ **Business logic in routes**
```typescript
// ❌ NEVER
export async function POST() {
  // Complex business rules here
  if (condition1 && condition2 || condition3) {
    // 50 lines of logic
  }
}
```

❌ **Type assertions to bypass errors**
```typescript
// ❌ NEVER
const data = result as any;
const value = (obj as unknown as OtherType).field;
```

❌ **Mocks or stubs in production code**
```typescript
// ❌ NEVER
export async function getJob() {
  if (process.env.NODE_ENV === 'test') {
    return mockJob;
  }
  // Real implementation
}
```

---

## ✅ CORRECT PATTERNS

✅ **Query layer for all DB access**
```typescript
// ✅ CORRECT
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const jobs = await listJobs(supabase, userId, userRole);
  return NextResponse.json({ jobs });
}
```

✅ **Services for business logic**
```typescript
// ✅ CORRECT
// lib/services/job-permissions.ts
export async function canEditJob(jobId: string, userId: string): Promise<boolean> {
  // Business logic here
}

// app/api/jobs/[id]/route.ts
const canEdit = await canEditJob(jobId, userId);
```

✅ **Explicit types everywhere**
```typescript
// ✅ CORRECT
interface JobResponse {
  id: string;
  caseId: string;
  createdById: string;
}

const job: JobResponse = {
  id: dbJob.id,
  caseId: dbJob.case_id,
  createdById: dbJob.created_by_id,
};
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

**Remember:** Every feature must pass the verification gate before commit.

**Architecture Status:** ✅ Supabase-Only  
**Build Mode:** ✅ Active  
**Prisma:** ✅ Completely Removed

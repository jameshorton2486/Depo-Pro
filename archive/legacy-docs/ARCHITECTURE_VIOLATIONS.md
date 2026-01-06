# Architecture Violations Audit

## Ground Rules (Non-Negotiable)
1. **Supabase is the ONLY data access layer** - No Prisma anywhere
2. **Middleware handles authentication** - Auth checks in middleware, not API routes
3. **Services handle business logic** - Pure functions, receive data as parameters, NEVER import Supabase
4. **API routes are the bridge** - Fetch via Supabase, pass to services
5. **Roles from user.user_metadata.role** - No database user tables
6. **Snake_case for database columns** - firm_id, created_at, user_id

---

## 🔴 CRITICAL VIOLATIONS

### 1. Prisma Still Present (93 files)
**Rule Violated:** #1 - Supabase is the ONLY data access layer

**Files:**
- `lib/db.ts` - Prisma client singleton
- `app/(dashboard)/reporter/page.tsx` - Line 37: `prisma.job.findMany`
- `lib/workers/transcription-worker.ts` - Line 38: `db.job.update`
- 90+ other files importing `@prisma/client` or `@/lib/db`

**Action Required:** Remove all Prisma imports and replace with Supabase queries.

---

### 2. Services Importing Supabase (57 files)
**Rule Violated:** #3 - Services should NEVER import Supabase

**Files:**
- `lib/services/job-creation-service.ts`
- `lib/services/job-completion-service.ts`
- `lib/services/invoice-service.ts`
- `lib/services/billing-service.ts`
- `lib/services/confidence-analysis-service.ts`
- `lib/calendar/conflict-detection.ts`
- `lib/transcripts/status-service.ts`
- `lib/audit-service.ts`
- 49+ other service files

**Action Required:** Refactor services to receive data as parameters. Move Supabase calls to API routes.

---

### 3. Querying Users Table
**Rule Violated:** #5 - Roles come from user.user_metadata.role, no user tables

**Files:**
- `app/(dashboard)/admin/page.tsx` - Line 36: `supabase.from('users').select('id')`
- `lib/database/queries.ts` - Multiple user table queries
- `lib/supabase/queries.ts` - User table queries

**Action Required:** Remove all `users` table queries. Use Supabase Auth Admin API instead.

---

### 4. CamelCase Database Columns
**Rule Violated:** #6 - Snake_case for database columns

**Files:**
- `app/api/jobs/route.ts` - Transforming snake_case to camelCase (acceptable for API responses)
- Need to verify all Supabase queries use snake_case

**Action Required:** Audit all Supabase queries to ensure snake_case column names.

---

### 5. Business Logic in API Routes
**Rule Violated:** #4 - API routes should only bridge, not contain business logic

**Files:**
- Many API routes contain business logic instead of delegating to services

**Action Required:** Extract business logic to pure service functions.

---

## ✅ CORRECT PATTERNS

### Correct Service Pattern
```typescript
// ✅ CORRECT - Service receives data, no Supabase import
// lib/services/job-validation-service.ts
export function validateJobData(jobData: {
  title: string;
  caseName: string;
  depositionDate: Date;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!jobData.title) errors.push('Title required');
  if (!jobData.caseName) errors.push('Case name required');
  
  return { valid: errors.length === 0, errors };
}
```

### Correct API Route Pattern
```typescript
// ✅ CORRECT - API route bridges Supabase to service
// app/api/jobs/route.ts
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  
  // Fetch data from Supabase
  const { data: jobData } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  // Pass to service (pure function)
  const validation = validateJobData(jobData);
  
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }
  
  // Save via Supabase
  await supabase.from('jobs').insert(jobData);
  
  return NextResponse.json({ success: true });
}
```

---

## 📋 Migration Priority

### Phase 1: Remove Prisma (Critical)
1. Delete `lib/db.ts`
2. Replace all `db.*` calls with Supabase queries
3. Remove `prisma/` directory
4. Remove `@prisma/client` from package.json

### Phase 2: Fix Services (High)
1. Audit all files in `lib/services/`
2. Remove Supabase imports
3. Refactor to receive data as parameters
4. Move Supabase calls to API routes

### Phase 3: Remove Users Table Queries (High)
1. Replace `supabase.from('users')` with `supabase.auth.admin.listUsers()`
2. Use `user.user_metadata.role` for all role checks

### Phase 4: Verify Snake_Case (Medium)
1. Audit all Supabase queries
2. Ensure column names are snake_case
3. Transform to camelCase only in API responses

---

## 🎯 Next Steps

1. **Start with Phase 1** - Remove Prisma completely
2. **Then Phase 2** - Refactor services to be pure functions
3. **Then Phase 3** - Remove users table dependencies
4. **Finally Phase 4** - Verify column naming

# Depo-Pro – Current Architecture (Authoritative)

**Last Updated:** January 2025  
**Status:** Supabase-Only Runtime

---

## Core Principles

1. **Supabase is the ONLY data access layer** - No Prisma, no ORM
2. **Authentication via Supabase Auth** - Roles stored in `user_metadata.role`
3. **Middleware handles authentication** - Auth checks in middleware, not API routes
4. **Services are pure functions** - Receive data as parameters, NEVER import Supabase
5. **API routes are the bridge** - Fetch via Supabase, pass to services
6. **Snake_case for database columns** - `firm_id`, `created_at`, `user_id`

---

## Technology Stack

### Authentication
- **Provider:** Supabase Auth (`@supabase/ssr`)
- **Role Storage:** `user.user_metadata.role` (NOT database tables)
- **Session Management:** Cookies (SSR-compatible)

### Database Access
- **Provider:** Supabase Postgres via `supabase-js`
- **ORM:** ❌ **None** (Prisma fully removed)
- **Client Libraries:**
  - `@/lib/supabase/server` - Server components & API routes
  - `@/lib/supabase/browser` - Client components
  - `@/lib/supabase/admin` - Admin operations (service role)

### Authorization
- **Middleware:** Route-level access control
- **Route Registry:** `lib/permissions/route-access.ts`
- **Role Checks:** Based on `user.user_metadata.role`

---

## File Structure

### Runtime Code (NO Prisma Allowed)
```
app/              # Next.js App Router pages & API routes
lib/              # Business logic, services, utilities
middleware.ts     # Authentication & route protection
components/       # React components
```

### Archived Code (Prisma References OK)
```
archive/legacy-scripts/   # Prisma-era scripts
archive/legacy-docs/      # Migration documentation
archive/legacy-prisma/    # Prisma schema references
```

---

## Data Access Patterns

### ✅ CORRECT: Server Component
```typescript
// app/(dashboard)/admin/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';

const supabase = await createSupabaseServerClient();
const { data: jobs } = await supabase
  .from('jobs')
  .select('id, title, status, created_at')
  .eq('firm_id', firmId)
  .order('created_at', { ascending: false });
```

### ✅ CORRECT: API Route
```typescript
// app/api/jobs/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'ACTIVE');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ jobs: data });
}
```

### ✅ CORRECT: Service (Pure Function)
```typescript
// lib/services/job-validation.ts
export function validateJobData(jobData: {
  title: string;
  caseName: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!jobData.title) errors.push('Title required');
  if (!jobData.caseName) errors.push('Case name required');
  return { valid: errors.length === 0, errors };
}
```

### ❌ WRONG: Service Importing Supabase
```typescript
// ❌ DO NOT DO THIS
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getJob(id: string) {
  const supabase = await createSupabaseServerClient();
  // ... Supabase query
}
```

### ❌ WRONG: Using Prisma
```typescript
// ❌ DO NOT DO THIS
import { db } from '@/lib/db';
const job = await db.job.findUnique({ where: { id } });
```

---

## User & Role Management

### Getting User Data
```typescript
// ✅ CORRECT: From Supabase Auth
const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
const adminClient = getSupabaseAdminClient();
const { data: userData } = await adminClient.auth.admin.getUserById(userId);
const role = userData?.user?.user_metadata?.role;
```

### ❌ WRONG: Querying Users Table
```typescript
// ❌ DO NOT DO THIS
const user = await supabase.from('users').select('*').eq('id', userId).single();
```

**Why:** Users exist in `auth.users` (Supabase Auth), not in a `public.users` table. Roles come from `user_metadata.role`.

---

## Column Naming Convention

### Database (Supabase Queries)
- Use **snake_case**: `created_at`, `firm_id`, `job_id`, `user_id`

### Application Code (TypeScript)
- Use **camelCase**: `createdAt`, `firmId`, `jobId`, `userId`

### Transformation
```typescript
// Query with snake_case
const { data } = await supabase
  .from('jobs')
  .select('id, created_at, firm_id');

// Transform to camelCase for API response
const jobs = data.map(job => ({
  id: job.id,
  createdAt: job.created_at,
  firmId: job.firm_id,
}));
```

---

## Table Name Mappings

| Prisma Model (Old) | Supabase Table (Current) |
|-------------------|-------------------------|
| `Job` | `jobs` |
| `CalendarEvent` | `calendar_events` |
| `DepositionNote` | `deposition_notes` |
| `CSRRecord` | `csr_records` |
| `CSRProperNoun` | `csr_proper_nouns` |
| `Transcription` | `transcriptions` |
| `JobAssignment` | `job_assignments` |
| `JobFile` | `job_files` |

---

## Migration Status

### ✅ Completed
- All 11 target API routes migrated (see `API_ROUTES_MIGRATION_COMPLETE.md`)
- Config files cleaned (no Prisma references)
- Tooling updated (no Prisma expectations)
- Legacy code archived

### ⚠️ In Progress
- Dashboard pages (4 files need migration)
- Additional API routes (100+ files need migration)

### ✅ Archived
- Prisma-era scripts → `archive/legacy-scripts/`
- Migration documentation → `archive/legacy-docs/`
- Prisma schema references → `archive/legacy-prisma/`

---

## Verification

### Runtime Code Check
```powershell
# Should return ZERO matches
Get-ChildItem -Path app,lib,middleware.ts -Include "*.ts","*.tsx" -Recurse |
  Where-Object { $_.FullName -notmatch "node_modules|\.next|archive" } |
  Select-String -Pattern "@prisma/client|from '@/lib/db'|prisma\.|db\."
```

### Config Files Check
```powershell
# Should return nothing
Select-String -Path ".gitattributes",".gitignore",".prettierignore","eslint.config.mjs" -Pattern "prisma"
```

---

## What Changed

### Removed
- ❌ Prisma ORM (`@prisma/client`, `prisma`)
- ❌ `lib/db.ts` (Prisma client singleton)
- ❌ `prisma/` directory (schema, migrations)
- ❌ Database user tables (roles now in `user_metadata`)

### Added
- ✅ Supabase client utilities (`lib/supabase/`)
- ✅ Type definitions (`types/database.ts`)
- ✅ Route access registry (`lib/permissions/route-access.ts`)

---

## Next Steps

1. **Continue Runtime Migration**
   - Migrate remaining dashboard pages
   - Migrate remaining API routes
   - Use patterns from completed routes

2. **Add Health Checks**
   - `/api/auth/health` endpoint
   - Auth audit logging

3. **Rebuild Useful Scripts**
   - Rebuild only needed scripts using Supabase service role
   - Keep in `scripts/` (not legacy)

---

## Questions?

If you see Prisma references in:
- **Runtime code** (`app/`, `lib/`) → **MUST FIX**
- **Archived code** (`archive/`) → **OK, historical**
- **Documentation** → **OK if clearly labeled**

**This document is the single source of truth for current architecture.**

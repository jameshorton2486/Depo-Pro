# SEC-01 BATCH 1: Core Job Routes
# Migrate 6 routes to withRouteProtection
# Run in Claude Code
# Commit after completion before running Batch 2

## RULES — READ BEFORE ANY EDIT

1. Only modify the 6 files listed below. Do NOT touch any other files.
2. Do NOT modify lib/middleware/withRouteProtection.ts — it is FROZEN.
3. Do NOT modify any database schema, migrations, or Supabase config.
4. Do NOT rename any API routes or URL paths.
5. Do NOT introduce new npm dependencies.
6. Do NOT change the business logic inside any route handler — ONLY change how auth is checked.
7. Do NOT remove or rename any existing response fields or status codes.
8. After all changes: npm run typecheck && npm run build — both must pass zero errors.

## HOW THE MIGRATION WORKS

**Before (old pattern — various):**
```typescript
import { getCurrentUser } from '@/lib/auth/session';
// or: import { requireAuth } from '@/lib/security';
// or: import { requireAuthV2 } from '@/lib/permissions/api-guards';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // ... business logic using user.id, user.role, user.firm_id
}
```

**After (standard pattern):**
```typescript
import { withRouteProtection, ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST];

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  async (req: NextRequest, ctx: ProtectedContext) => {
    const { user, supabase } = ctx;
    // ... SAME business logic, but use ctx.user instead of getCurrentUser()
    //     and ctx.supabase instead of creating a new client
  }
);
```

**Key rules for the conversion:**
- Replace `getCurrentUser()` / `requireAuth()` / `requireAuthV2()` with the `withRouteProtection` wrapper
- The handler receives `(req, ctx)` where `ctx` has `{ user, supabase, params }`
- Use `ctx.user` for user info (id, role, firm_id, email)
- Use `ctx.supabase` for database queries (already authenticated)
- If the route creates its own supabase client, replace it with `ctx.supabase`
- Keep ALL existing business logic, error handling, and response shapes unchanged
- Choose ALLOWED_ROLES based on who should access the route (see per-route guidance below)

**Reference file to copy pattern from:** `app/api/jobs/[id]/lock/route.ts` — this file already uses withRouteProtection correctly. Read it first to understand the exact pattern.

## STEP 0: Read the template

Read `app/api/jobs/[id]/lock/route.ts` first. Understand how withRouteProtection wraps each handler. Copy this exact pattern.

Also read `lib/middleware/withRouteProtection.ts` to understand what ProtectedContext provides:
- `ctx.user` — { id, email, role, firm_id }
- `ctx.supabase` — authenticated Supabase client
- `ctx.params` — route params (like [id])

## FILES TO MIGRATE (6 routes)

### Route 1: app/api/jobs/route.ts

```
Handlers:     GET, POST (whichever exist)
Allowed roles for GET:  [ADMIN, COURT_REPORTER, SCOPIST]
Allowed roles for POST: [ADMIN, COURT_REPORTER]
Migration steps:
  1. Add imports: withRouteProtection, ProtectedContext, UserRole
  2. Remove old auth imports (getCurrentUser, requireAuth, requireAuthV2, etc.)
  3. Wrap each handler with withRouteProtection({ requireAuth: true, requireRole: [...] }, handler)
  4. Replace getCurrentUser() calls with ctx.user
  5. Replace any manual supabase client creation with ctx.supabase
  6. Keep all existing query logic, filters, pagination, response shapes unchanged
```

### Route 2: app/api/jobs/[id]/route.ts

```
Handlers:     GET, PATCH, DELETE (whichever exist)
Allowed roles for GET:    [ADMIN, COURT_REPORTER, SCOPIST, ATTORNEY]
Allowed roles for PATCH:  [ADMIN, COURT_REPORTER]
Allowed roles for DELETE: [ADMIN]
Migration: Same pattern. Use ctx.params for the [id] parameter.
If PATCH/DELETE have separate role checks, create separate withRouteProtection wrappers with different ALLOWED_ROLES.
```

### Route 3: app/api/jobs/[id]/status/route.ts

```
Handlers:     GET, PATCH (whichever exist)
Allowed roles for GET:   [ADMIN, COURT_REPORTER, SCOPIST]
Allowed roles for PATCH: [ADMIN, COURT_REPORTER, SCOPIST]
Migration: Same pattern.
```

### Route 4: app/api/jobs/[id]/assign/route.ts

```
Handlers:     POST (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER]
Migration: Same pattern.
```

### Route 5: app/api/jobs/[id]/review/route.ts

```
Handlers:     GET, POST (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
Migration: Same pattern.
```

### Route 6: app/api/jobs/[id]/review/submit/route.ts

```
Handlers:     POST (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
Migration: Same pattern.
```

## IMPORTANT: UserRole enum values

Read `lib/enums/roles.ts` to get the exact enum values. They may be:
- UserRole.ADMIN
- UserRole.COURT_REPORTER (or UserRole.REPORTER)
- UserRole.SCOPIST
- UserRole.ATTORNEY

Use whatever values actually exist in the enum. Do NOT guess.

## VALIDATION

After all 6 routes are migrated:

```bash
npm run typecheck   # zero errors
npm run build       # zero errors
```

Verify the pattern is correct:
```bash
rg -l "withRouteProtection" app/api/jobs/
```
Should show at least 7 files (6 new + the existing lock route).

## COMMIT

```bash
git add app/api/jobs/route.ts app/api/jobs/[id]/route.ts app/api/jobs/[id]/status/route.ts app/api/jobs/[id]/assign/route.ts "app/api/jobs/[id]/review/route.ts" "app/api/jobs/[id]/review/submit/route.ts"
git commit -m "sec-01 batch 1: migrate 6 core job routes to withRouteProtection"
```

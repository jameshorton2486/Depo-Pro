# SEC-01 BATCH 2: Job Feature Routes
# Migrate 6 routes to withRouteProtection
# Run in Claude Code AFTER Batch 1 is committed
# Prerequisites: Batch 1 committed. npm run build passes.

## RULES — SAME AS BATCH 1

1. Only modify the 6 files listed below.
2. Do NOT modify lib/middleware/withRouteProtection.ts — FROZEN.
3. Do NOT change business logic — ONLY change auth wrapping.
4. Do NOT rename routes, change response shapes, or add dependencies.
5. After all changes: npm run typecheck && npm run build must pass.

## PATTERN REFERENCE

Same pattern as Batch 1. Read `app/api/jobs/[id]/lock/route.ts` if you need a refresher.

```typescript
import { withRouteProtection, ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.SCOPIST];

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  async (req: NextRequest, ctx: ProtectedContext) => {
    const { user, supabase } = ctx;
    // existing business logic unchanged
  }
);
```

Replace old auth (getCurrentUser, requireAuth, requireAuthV2) with ctx.user.
Replace manual supabase client creation with ctx.supabase.
Keep ALL business logic, queries, and response shapes unchanged.

## FILES TO MIGRATE (6 routes)

### Route 1: app/api/jobs/[id]/export/route.ts

```
Handlers:     GET (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
Notes: This route generates document exports. Keep all export logic unchanged.
       Only wrap the handler with withRouteProtection.
```

### Route 2: app/api/jobs/[id]/flagged-words/route.ts

```
Handlers:     GET, PATCH (whichever exist)
Allowed roles for GET:   [ADMIN, COURT_REPORTER, SCOPIST]
Allowed roles for PATCH: [ADMIN, COURT_REPORTER, SCOPIST]
Notes: Critical review workflow route. Keep pagination, filtering, correction logic unchanged.
```

### Route 3: app/api/jobs/[id]/transcribe/route.ts

```
Handlers:     POST (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER]
Notes: Triggers the Deepgram transcription pipeline. Keep all pipeline trigger logic unchanged.
       Do NOT modify any transcription-related imports or calls.
```

### Route 4: app/api/jobs/[id]/medical-records/route.ts

```
Handlers:     GET, POST (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
Notes: Medical record management. Keep all medical extraction logic unchanged.
```

### Route 5: app/api/jobs/[id]/format-settings/route.ts

```
Handlers:     GET, PUT/PATCH (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
Notes: Speaker mapping and format settings. Keep all format logic unchanged.
```

### Route 6: app/api/jobs/[id]/upload/route.ts (if it exists)

```
If this file exists:
  Handlers:     POST
  Allowed roles: [ADMIN, COURT_REPORTER]
  Notes: File upload handler. Keep all storage logic unchanged.

If this file does NOT exist, skip it and note in the commit message.
```

## HANDLING MISSING FILES

Some routes listed above may not exist in the codebase. If a file doesn't exist:
- Skip it silently
- Do NOT create new route files
- Note which files were skipped in the commit message

## VALIDATION

```bash
npm run typecheck   # zero errors
npm run build       # zero errors
rg -l "withRouteProtection" app/api/jobs/   # should show 12+ files now
```

## COMMIT

```bash
git add app/api/jobs/[id]/export/route.ts app/api/jobs/[id]/flagged-words/route.ts app/api/jobs/[id]/transcribe/route.ts app/api/jobs/[id]/medical-records/route.ts app/api/jobs/[id]/format-settings/route.ts
git commit -m "sec-01 batch 2: migrate job feature routes to withRouteProtection"
```

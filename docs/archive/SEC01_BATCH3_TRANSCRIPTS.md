# SEC-01 BATCH 3: Transcript Routes
# Migrate all transcript routes to withRouteProtection
# Run in Claude Code AFTER Batch 2 is committed
# Prerequisites: Batches 1-2 committed. npm run build passes.

## RULES — SAME AS PREVIOUS BATCHES

1. Only modify the files listed below.
2. Do NOT modify lib/middleware/withRouteProtection.ts — FROZEN.
3. Do NOT change business logic — ONLY change auth wrapping.
4. Do NOT rename routes, change response shapes, or add dependencies.
5. After all changes: npm run typecheck && npm run build must pass.

## PATTERN (same as all batches)

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

## STEP 0: Find all transcript routes

Run this first to discover what exists:
```bash
Get-ChildItem -Path "app/api/transcripts" -Recurse -Filter "route.ts" | Select-Object FullName
```

## FILES TO MIGRATE

### Route 1: app/api/transcripts/route.ts

```
Handlers:     GET (list transcripts)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
```

### Route 2: app/api/transcripts/[id]/route.ts

```
Handlers:     GET, PATCH, DELETE (whichever exist)
Allowed roles for GET:    [ADMIN, COURT_REPORTER, SCOPIST, ATTORNEY]
Allowed roles for PATCH:  [ADMIN, COURT_REPORTER, SCOPIST]
Allowed roles for DELETE: [ADMIN]
```

### Route 3: app/api/transcripts/[id]/corrections/route.ts

```
Handlers:     GET, POST/PATCH (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
Notes: CRITICAL — this is where scopists save word corrections.
       Keep ALL correction logic, validation, and database writes unchanged.
       Do NOT touch the correction merge/save logic.
```

### Route 4: app/api/transcripts/[id]/export/route.ts

```
Handlers:     GET (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
Notes: Keep all export format logic unchanged.
```

### Route 5: app/api/transcripts/[id]/finalize/route.ts

```
Handlers:     POST (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
```

### Route 6: app/api/transcripts/[id]/status/route.ts

```
Handlers:     GET, PATCH (whichever exist)
Allowed roles for GET:   [ADMIN, COURT_REPORTER, SCOPIST]
Allowed roles for PATCH: [ADMIN, COURT_REPORTER, SCOPIST]
```

### Route 7: app/api/transcripts/[id]/words/route.ts

```
Handlers:     GET (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
```

### Any other transcript routes found in Step 0

Apply the same pattern. Default to ALLOWED_ROLES = [ADMIN, COURT_REPORTER, SCOPIST] unless the route clearly serves attorneys (then add ATTORNEY).

## HANDLING MISSING FILES

If any listed file doesn't exist, skip it. Do NOT create new files.

## VALIDATION

```bash
npm run typecheck   # zero errors
npm run build       # zero errors
rg -l "withRouteProtection" app/api/transcripts/   # should show all migrated files
```

## COMMIT

Stage all modified transcript route files:
```bash
git add app/api/transcripts/
git commit -m "sec-01 batch 3: migrate transcript routes to withRouteProtection"
```

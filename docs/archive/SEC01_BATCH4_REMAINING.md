# SEC-01 BATCH 4: Remaining Routes
# Migrate attorney, admin, profile, and other sensitive routes
# Run in Claude Code AFTER Batch 3 is committed
# Prerequisites: Batches 1-3 committed. npm run build passes.

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

const ALLOWED_ROLES = [...];

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  async (req: NextRequest, ctx: ProtectedContext) => {
    const { user, supabase } = ctx;
    // existing business logic unchanged
  }
);
```

## STEP 0: Discover remaining unprotected routes

Run this to find routes NOT yet using withRouteProtection:
```bash
Get-ChildItem -Path "app/api" -Recurse -Filter "route.ts" | ForEach-Object { $content = Get-Content $_.FullName -Raw; if ($content -notmatch "withRouteProtection" -and $content -notmatch "CRON_SECRET" -and $content -notmatch "webhook" -and $_.FullName -notmatch "health|contact|auth|client-errors") { $_.FullName } }
```

This excludes routes that are intentionally unprotected (health, webhooks, cron, auth, contact, client-errors).

## FILES TO MIGRATE

### Attorney routes: app/api/attorney/*/route.ts

```
Discover: Get-ChildItem -Path "app/api/attorney" -Recurse -Filter "route.ts"
Allowed roles for all attorney routes: [ADMIN, ATTORNEY, COURT_REPORTER]
Migrate each file found using the standard pattern.
If routes are sharing with scopists, add SCOPIST.
```

### Admin routes: app/api/admin/*/route.ts

```
Discover: Get-ChildItem -Path "app/api/admin" -Recurse -Filter "route.ts"
Allowed roles: [ADMIN]
Admin routes should ONLY allow ADMIN role.
```

### Profile route: app/api/profile/route.ts

```
Handlers:     GET, PATCH (whichever exist)
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST, ATTORNEY]
Notes: All authenticated users can read/update their own profile.
```

### Users route: app/api/users/route.ts (and any sub-routes)

```
Discover: Get-ChildItem -Path "app/api/users" -Recurse -Filter "route.ts"
Allowed roles for GET (list users): [ADMIN]
Allowed roles for PATCH (update user): [ADMIN]
```

### Calendar routes: app/api/calendar/*/route.ts

```
Discover: Get-ChildItem -Path "app/api/calendar" -Recurse -Filter "route.ts"
Allowed roles: [ADMIN, COURT_REPORTER, SCOPIST]
Notes: These are Phase 2 stub routes, but should still have proper auth wrapping.
```

### Any other routes found in Step 0

For any route discovered in Step 0 that isn't in the lists above:
- If it handles sensitive data (jobs, transcripts, users, billing) → migrate with appropriate roles
- If it's clearly a Phase 2 stub that already has requireAuthV2 → leave it alone (already secured in SEC-02)
- If unsure → migrate with [ADMIN, COURT_REPORTER, SCOPIST] as default

## DO NOT MIGRATE (intentionally unprotected)

Skip these — they have their own auth mechanisms:
- app/api/health/* — public monitoring
- app/api/auth/* — auth flow endpoints
- app/api/webhooks/* — signature-verified callbacks
- app/api/cron/* — CRON_SECRET verified
- app/api/contact/route.ts — public form with rate limiting
- app/api/client-errors/route.ts — error reporting
- app/api/jobs/[id]/transcribe/process-chunk/route.ts — INTERNAL_API_SECRET verified
- Any route already using withRouteProtection (from Batches 1-3)

## VALIDATION

```bash
npm run typecheck   # zero errors
npm run build       # zero errors
```

Count total routes now using withRouteProtection:
```bash
rg -l "withRouteProtection" app/api/ | Measure-Object | Select-Object Count
```
Target: 20+ routes.

## COMMIT

```bash
git add app/api/
git commit -m "sec-01 batch 4: migrate remaining routes to withRouteProtection (20+ total)"
```

## SEC-01 COMPLETE VERIFICATION

After all 4 batches:
```bash
# Total count
rg -l "withRouteProtection" app/api/ | Measure-Object | Select-Object Count

# Should be 20+. List them:
rg -l "withRouteProtection" app/api/

# Build must still pass
npm run typecheck
npm run build
```

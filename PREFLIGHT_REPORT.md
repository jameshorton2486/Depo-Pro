# Prefight Report

Date: 2026-03-09
Repo: `C:\Users\james\depo-pro`

## 1. Bugs From Previous Session

`BUGS_FOUND.md` exists and documents 1 bug:

1. `app/api/jobs/[id]/flagged-words/route.ts` `PATCHHandler`
   - Bug: an unrelated `SCOPIST` can mutate flagged-word edits outside their assignment/firm scope.
   - Expected: `403`
   - Actual: `200`

## 2. Auth / Middleware Files Read

### `lib/auth-compat.ts`

Not found in this repo.

Equivalent active auth helper appears to be:

- `lib/auth/session.ts`
  - `getCurrentUser(): Promise<SessionUser | null>`
  - Returns flat user shape:
    - `id`
    - `email`
    - `role`
    - `name`
    - `firmId`
  - Internally calls `createSupabaseServerClient()` and loads `profiles.role`, `profiles.full_name`, `profiles.firm_id`.

### `lib/middleware/withRouteProtection.ts`

Exists and is already active.

Exact call signature:

```ts
export function withRouteProtection(
  options: RouteProtectionOptions,
  handler: (
    request: NextRequest,
    context: ProtectedContext
  ) => Promise<NextResponse>
)
```

`RouteProtectionOptions`:

- `requireAuth?: boolean`
- `requireRole?: UserRole[]`
- `enforceTenant?: boolean`
- `requireFirm?: boolean`
- `rateLimit?: { limit: number; windowMs: number }`
- `auditAction?: string`

`ProtectedContext` provides:

- `user: { id: string; role: string; firm_id: string }`
- `supabase`
- `params: Record<string, string>`

Important behavior notes:

- Wrapper uses `getCurrentUser()` from `lib/auth/session.ts`
- Wrapper loads `profiles.firm_id` / `profiles.role`
- Wrapper performs auth, role checks, optional firm enforcement, and rate limiting
- Wrapper does **not** automatically call `verifyJobTenantAccess()`
- `auditAction` is metadata only; handlers still implement audit logging themselves

### `lib/supabase/client.ts`

Exists, but it is browser-only and exports a lazy proxy around `getSupabaseBrowserClient()`.

It does **not** expose server auth methods or `getUser()` directly.

### `lib/supabase/server.ts`

This is the actual server-side Supabase entrypoint:

- `createSupabaseServerClient(): Promise<SupabaseClient>`
- Uses:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Returns a server client with `supabase.auth.getUser()`

### Shape delta

`getCurrentUser()` returns flattened profile-backed data:

- `id`
- `email`
- `role`
- `name`
- `firmId`

Raw `supabase.auth.getUser()` returns only the auth user and does **not** include:

- `role`
- `firm_id`
- `firmId`
- `name`

Therefore any direct migration from a compat helper to raw `supabase.auth.getUser()` will also require a `profiles` lookup in routes that depend on role or firm data.

### `middleware.ts`

Not found at repo root.

There is no root `middleware.ts` file in the current workspace.

## 3. Exact Command: auth-compat route grep

Required command:

```sh
grep -rl "from.*auth-compat" app/api/ --include="*.ts" | sort
```

Exact command result in this environment:

- Failed
- Reason: no WSL/bash distribution is installed, so `bash -lc` cannot execute GNU `grep`

Equivalent repo-native search used:

```powershell
rg -n "auth-compat" app/api lib app --glob "*.ts"
```

Equivalent result:

- `0` matching files

Actual deprecated auth route count:

- `0`

Implication:

- The prompt assumption that ~21 API routes still import `auth-compat` is stale for this repo snapshot.

## 4. Exact Command: `.from('users')` confirmation

Required command:

```sh
grep -r "\.from('users')" lib/ app/ --include="*.ts" | grep -v node_modules
```

Exact command result in this environment:

- Failed for the same no-WSL/bash reason

Equivalent repo-native search used:

```powershell
rg -n "\.from\('users'\)" lib app --glob "*.ts"
```

Equivalent result:

- `0` matches

Implication:

- No active TypeScript query still targets a `users` table under `lib/` or `app/`.

## 5. Exact Command: `withRouteProtection` adoption

Required command:

```sh
grep -rl "withRouteProtection" app/api/ --include="*.ts" | wc -l
```

Exact command result in this environment:

- Failed for the same no-WSL/bash reason

Equivalent repo-native search used:

```powershell
rg -l "withRouteProtection" app/api --glob "*.ts" | Measure-Object | Select-Object -ExpandProperty Count
```

Equivalent result:

- `92`

Implication:

- The prompt assumption that adoption is likely 0 is stale.
- The wrapper is already widely adopted.

## 6. Export Implementation Read

Prompt path checked:

- `app/api/transcriptions/[id]/export/route.ts` -> not present

Actual active route found/read:

- `app/api/transcripts/[id]/export/route.ts`

Current state:

- Already wrapped with `withRouteProtection`
- Already performs export permission checks
- Already applies corrections before export
- Uses `lib/export.ts` and `lib/services/export.ts`

Support service read:

- `lib/services/export.ts`
  - Provides `exportLegalDocx()`
  - Applies corrections from `transcription_edits` and `flagged_words`

## 7. Error Boundary Inventory

### App-level files found

- `app/error.tsx`
- `app/global-error.tsx`

### Review route files found

- `app/(dashboard)/jobs/[id]/review/error.tsx`
- `app/(dashboard)/jobs/[id]/review/loading.tsx` -> not found

### Components

No root `components/ErrorBoundary.tsx`

Existing reusable boundary:

- `components/ui/error-boundary.tsx`

## 8. Additional Relevant Repo Mismatches vs Prompt

These affect implementation scope:

1. `lib/auth-compat.ts` does not exist.
2. Root `middleware.ts` does not exist.
3. The prompt’s `app/api/transcriptions/[id]/flagged-words/...` routes do not exist in this repo snapshot.
4. The active flagged-word review APIs are job-scoped:
   - `app/api/jobs/[id]/flagged-words/route.ts`
   - `app/api/jobs/[id]/review/route.ts`
5. The prompt’s `components/transcripts/FlaggedWordPanel.tsx` does not exist.
   - Active component is `components/transcripts/low-confidence-panel.tsx`
6. The prompt’s export API path is stale.
   - Active path is `app/api/transcripts/[id]/export/route.ts`

## 9. Old Prisma Backup Directory

`lib/supabase/queries/old-prisma-backup/` not found.

## 10. Environment Variable Audit Snapshot

### Active code references observed

Present in active code:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPGRAM_API_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

### Legacy / deprecated references observed

Active code under `app/` / `lib/` appears clean for:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `DIRECT_URL`

Legacy references remain heavily in docs, archived docs, and supporting markdown.

Manual action required:

- Do **not** edit `.env.local` in this session.
- `.env.local` currently contains live values for:
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `DEEPGRAM_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `NEXT_PUBLIC_APP_URL`
  - `CRON_SECRET`

## 11. Health Endpoint Snapshot

`app/api/health/route.ts` exists and delegates to `lib/health.ts`.

Current `lib/health.ts` status:

- Checks database
- Checks storage buckets
- Checks env vars
- Checks only whether Deepgram / Anthropic API keys are configured
- Does **not** perform live Deepgram or Anthropic API validation
- Response shape uses `checks`, not the prompt’s `services` format

## 12. Vercel Config Snapshot

`vercel.json` exists.

Relevant entries:

- `app/api/jobs/[id]/transcribe/route.ts` -> `maxDuration: 300`
- `app/api/jobs/[id]/transcribe/process-chunk/route.ts` -> `maxDuration: 300`
- `app/api/transcripts/[id]/export/route.ts` -> `maxDuration: 60`

Prompt path mismatch:

- Prompt references `app/api/transcriptions/[id]/export/route.ts`
- Repo uses `app/api/transcripts/[id]/export/route.ts`

## 13. Preflight Conclusion

Main blocker from the previous session is real and still outstanding:

- unauthorized `SCOPIST` mutation in `app/api/jobs/[id]/flagged-words/route.ts`

Several prompt assumptions are stale relative to the repo:

- no `auth-compat` importers
- no active `.from('users')` queries
- `withRouteProtection` is already broadly adopted
- multiple named route/component paths do not exist

Implementation must therefore target the repo’s current equivalents rather than the stale paths in the prompt.

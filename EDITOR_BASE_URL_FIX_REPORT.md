# Editor Base URL Fix Report

## Task 0 Verification

### Baseline worktree status

Requested baseline: `git status` clean.

Observed result:

```text
 M supabase/functions/editor-api/index.ts
 M supabase/functions/transcribe-callback/index.ts
 M supabase/functions/transcribe-start/index.ts
?? .tmp/
?? DEEPGRAM_GO_LIVE_CHECKLIST.md
?? EDITOR_LOAD_FAILURE_AUDIT.md
?? docs/audits/EDITOR_LOAD_PATH_E2E_AUDIT_2026-06-10.md
?? docs/audits/TRANSCRIPT_CREATION_AUDIT_2026-06-10.md
?? supabase/config.toml
```

Conclusion:

- The worktree is **not clean**.
- This diverges from the requested baseline.
- Per instruction, work stops here and no correctness fix is applied in this run.

### `src/main.tsx` current mount wiring

Observed:

- [src/main.tsx](/C:/Users/james/projects/depo-pro/src/main.tsx:37) calls:

```ts
configureClient(config.apiBaseUrl);
```

This matches the stated root cause.

### `isRealApiMode` availability

Observed:

- [src/lib/runtime/mode.ts](/C:/Users/james/projects/depo-pro/src/lib/runtime/mode.ts:5) exports `isRealApiMode()`
- Current imports/usages exist elsewhere in `src/`, so it is available for import into `src/main.tsx`

### `VITE_EDITOR_API_BASE_URL` usage in `src/`

Observed grep results:

- `.env.example` documents it:
  - [.env.example](/C:/Users/james/projects/depo-pro/.env.example:5)
- `scripts/editor-api-smoke.mjs` reads it:
  - [scripts/editor-api-smoke.mjs](/C:/Users/james/projects/depo-pro/scripts/editor-api-smoke.mjs:9)

Observed in `src/`:

- No `src/` file currently reads `VITE_EDITOR_API_BASE_URL`

Conclusion:

- The intended real-mode editor base is documented, but not wired into runtime app code.

### `index.html` standalone default

Observed:

- [index.html](/C:/Users/james/projects/depo-pro/index.html:15) sets:

```ts
apiBaseUrl: "/mock",
```

This matches the root-cause statement and confirms the standalone default remains mock-oriented.

### Typecheck

Command run:

```powershell
& 'C:\Program Files\PowerShell\7\pwsh.exe' -Command 'npm run typecheck'
```

Observed result:

- Passed

### Test suite

Command run:

```powershell
& 'C:\Program Files\PowerShell\7\pwsh.exe' -Command 'npm run test'
```

Observed result:

- Passed
- `43` test files
- `229` tests

## Outcome

The requested fix was **not applied** because the required baseline diverged:

- worktree not clean

All other Task 0 verification points matched the reported root cause:

- `src/main.tsx` currently uses `config.apiBaseUrl` directly
- `index.html` standalone default is `"/mock"`
- `VITE_EDITOR_API_BASE_URL` is documented but not consumed by runtime app code
- typecheck and tests pass at baseline

## Next Step

If you want the fix applied anyway despite the dirty worktree, run a new fix prompt that explicitly authorizes proceeding on a dirty branch/worktree and names which existing uncommitted changes should be preserved.

## Re-Run Check — 2026-06-10

The fix gate was re-run after the later request to apply the `main.tsx` wiring.

Observed current `git status --short`:

```text
?? .tmp/
?? DEEPGRAM_GO_LIVE_CHECKLIST.md
?? EDITOR_BASE_URL_FIX_REPORT.md
?? EDITOR_LOAD_FAILURE_AUDIT.md
?? docs/audits/EDITOR_LOAD_PATH_E2E_AUDIT_2026-06-10.md
?? docs/audits/TRANSCRIPT_CREATION_AUDIT_2026-06-10.md
```

Additional verification from that re-run:

- [src/main.tsx](/C:/Users/james/projects/depo-pro/src/main.tsx:37) still directly calls `configureClient(config.apiBaseUrl);`
- `.env.example` still documents `VITE_EDITOR_API_BASE_URL`
- no `src/` file reads `VITE_EDITOR_API_BASE_URL`
- `npm run typecheck` passed
- `npm run test` passed with `229/229`

Conclusion:

- The requested `main.tsx` fix remains blocked by the same clean-worktree gate.
- The only remaining blockers are untracked local audit/temp files, not failing tests or source instability.

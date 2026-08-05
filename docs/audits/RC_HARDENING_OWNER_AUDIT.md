# RC Hardening Owner Audit

Audit date: 2026-07-22
Branch: `codex/rc-hardening-pr20`
Base: `origin/feature/stage3-workspace-core` at `30a11b3531beb6228264af69faa45a20ec632546`

## Scope

PR #20 owns release-candidate hardening only:

- reliability hardening;
- operational hardening;
- release hardening;
- regression protection.

It does not own new product capability or behavior changes in completed architectural owners.

## Hardening inventory

| Finding | Classification | PR #20 action |
| --- | --- | --- |
| Formatter export polling could continue indefinitely when an export remains `QUEUED` or `PROCESSING` | Reliability hardening | Add bounded adapter polling timeout and regression coverage. |
| Root `npm run lint` can traverse local scratch/cache directories and fail on untracked artifacts | Release hardening | Harden ESLint ignores for `.tmp`, pytest caches, and Python bytecode caches. |
| Export request staging bucket has no lifecycle rule in the live bucket description | Operational release evidence | Document required bucket lifecycle verification in the RC runbook. No production bucket mutation was performed in this PR. |
| Supabase linked migration state previously showed remote-only historical migrations | Release governance | Document required migration reconciliation check in the RC runbook. No schema change was made in this PR. |
| TXT/JSON exports are application-local while DOCX/PDF use the production formatter path | Documentation boundary | Preserve existing boundary; no formatter or export-contract change. |

## Implemented hardening changes

### Bounded formatter export polling

Owner: Export Adapter / Stage 7 orchestration.

Change:

- `ExportAdapter.waitForCompletion` now accepts `timeoutMs`.
- A stuck `QUEUED` or `PROCESSING` job throws `ExportPollingTimeoutError` after the configured timeout.
- Stage 7 Formatter Service export UI passes a five-minute timeout, matching the formatter service execution timeout class without changing formatter behavior.
- Polling still preserves cancellation via `AbortSignal`.

Why this is hardening:

- It prevents an unrecoverable UI polling loop when a job is stranded by infrastructure failure.
- It does not alter the formatter, certification, compiler, geometry, editorial, or export contract owners.
- It only bounds adapter-side waiting and surfaces a deterministic retryable client error.

Regression coverage:

- `src/lib/export/exportAdapter.test.ts` verifies timeout failure is deterministic and typed.

### Lint hygiene for release verification

Owner: Repository release engineering.

Change:

- ESLint ignores generated local scratch and cache directories:
  - `.tmp/**`
  - `**/.pytest_cache/**`
  - `**/__pycache__/**`

Why this is hardening:

- It ensures release verification inspects integrated source rather than local temporary worktrees or Python test caches.
- It does not exclude production TypeScript, Supabase Edge Function source, formatter source, or committed tests.

Regression coverage:

- The acceptance gate for this change is `npm run lint` from the PR #20 worktree.

## Explicit non-changes

PR #20 did not modify:

- compiler semantics;
- transcript geometry;
- unified rendering;
- editorial normalization;
- formatter core/layout behavior;
- certification lifecycle or lock semantics;
- export service contract shape;
- Stage S scoring or repair-burden behavior;
- user-facing export capabilities.

## Operational evidence required before merge approval

Before PR #20 can be approved for merge, record fresh evidence for:

- full repository tests;
- typecheck;
- root lint;
- production build;
- `git diff --check`;
- formatter service tests;
- Deno checks for export adapter functions;
- production synthetic export through the established export path;
- Verify;
- Cursor Bugbot.

## PR #20 validation evidence

Collected on 2026-07-22 from `C:\tmp\depo-pro-pr20-rc-hardening`.

| Gate | Result |
| --- | --- |
| Focused export tests | PASS — 2 files, 20 tests |
| Typecheck | PASS — `npm run typecheck` |
| Root lint | PASS — `npm run lint` |
| Production build | PASS — `npm run build` |
| Full repository tests | PASS — 114 files, 738 tests |
| Deno Edge Function check | PASS — `export-adapter` and `export-adapter-relay` |
| Formatter service tests | PASS — 27 tests using explicit pytest temp directory |
| Whitespace | PASS — `git diff --check` |
| Export staging bucket lifecycle read-only check | OBSERVED `null`; lifecycle rule not configured in the bucket description |
| Supabase linked migration check | BLOCKED — Supabase CLI rejected the stored access token as invalid |

Production synthetic export validation used fabricated data only:

| Field | Value |
| --- | --- |
| Synthetic case | `RC17C-RELAY-CASE-76b2a0601f5f` |
| Synthetic transcript | `rc17c-relay-transcript-76b2a0601f5f` |
| Export job | `export-e930abb1e1169d28412aa3a07e00ca0b` |
| Staged request object | `exports/requests/export-e930abb1e1169d28412aa3a07e00ca0b.json` |
| Inline formatter envelope size | 1,252,365 bytes |
| Relay Cloud Task envelope size | 205 bytes |
| Observed lifecycle | `QUEUED -> PROCESSING -> COMPLETED` |
| Duplicate create result | `COMPLETED` |
| Error | `null` |
| Staged request cleanup | PASS — object returned 404 after terminal completion |

Persisted production objects:

| Object | Generation | MD5 | CRC32C | Bytes |
| --- | ---: | --- | --- | ---: |
| ExportJob JSON | `1784738095177964` | `f4h8bUZBGbx/+BTXpB4PZw==` | `Dx66DQ==` | 2329 |
| DOCX | `1784738094813088` | `jbeQnu96wRe1V+Ij9dCa/w==` | `awEHkg==` | 37021 |
| PDF | `1784738094994205` | `KKInJzvfYKIcjppdyGCtew==` | `9enmOg==` | 28201 |
## Remaining release-governance checks

These checks are not implemented as schema or cloud changes in this PR because they require live operational authority or updated credentials:

1. Supabase migration reconciliation:
   - current Supabase CLI auth rejected the local token during PR #20 inventory;
   - rerun `supabase migration list --linked` after auth is restored;
   - confirm no unexpected remote-only migrations remain, or document the exact provenance before final RC declaration.
2. Export staging lifecycle:
   - live `gs://depo-pro-exports` bucket description returned no lifecycle configuration during PR #20 inventory;
   - configure and verify lifecycle cleanup for orphaned `exports/requests/` objects as a production operations step before final release if not already managed outside this repo.

## Boundary conclusion

The implemented changes are adapter/release-engineering hardening. They do not move ownership between Certification, Formatter Service, Export Adapter, Compiler, Geometry, Unified Rendering, Editorial, or Stage S.
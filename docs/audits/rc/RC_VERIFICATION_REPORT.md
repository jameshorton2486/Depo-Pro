# Release Candidate Verification Report

Verification date: 2026-07-22
Integration commit: `ceb1f3fdee1bec35d628e1141ed3533e45081bf0`
Branch under verification: `codex/export-path-baseline` from `origin/feature/stage3-workspace-core`

## Scope

Authorized scope was limited to:

- establishing the export-path baseline;
- executing full Release Candidate verification against that baseline;
- documenting results and findings.

PR #20 implementation, merge, and deployment were not authorized and were not performed.

## Environment

| Item | Result |
| --- | --- |
| Git integration commit | `ceb1f3fdee1bec35d628e1141ed3533e45081bf0` |
| Export Adapter | Supabase `export-adapter` v12 |
| Export Adapter Relay | Supabase `export-adapter-relay` v1 |
| Formatter Service | Cloud Run `depo-pro-formatter-00009-26b` |
| Formatter image | `17b-20260721-8` |
| Cloud Tasks queue | `depo-pro-formatter`, `RUNNING` |
| Artifact bucket | `gs://depo-pro-exports` |

## Verification matrix

| Area | Verification | Result |
| --- | --- | --- |
| Certification | Certification tests and migration state reviewed; PR #4 owner audit remains present | PASS |
| Export Adapter | Protocol/UI tests included in full suite; production synthetic export passed | PASS |
| Formatter Service | Python formatter service suite passed in isolated temp venv | PASS |
| Compiler / transcript package | Full Vitest suite passed | PASS |
| Geometry | Geometry tests included in full Vitest suite | PASS |
| Unified Rendering | Unified rendering tests included in full Vitest suite | PASS |
| Editorial | Editorial tests included in full Vitest suite | PASS |
| Stage S | Stage S tests and artifact checks passed with `STAGE_S_WRITE=1` | PASS |
| Export pipeline end-to-end | Production adapter -> relay -> formatter -> storage export completed | PASS |
| Security / auth path | OIDC/IAM path exercised by production synthetic export; Supabase auth used fabricated anon user | PASS |

## Local gates

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | PASS |
| Production-source lint | `npx eslint src supabase scripts` | PASS |
| Deno Edge Function check | `deno check supabase/functions/export-adapter/index.ts supabase/functions/export-adapter-relay/index.ts` | PASS |
| Production build | `npm run build` | PASS |
| Full Vitest suite | `STAGE_S_WRITE=1 npm test -- --run` | PASS — 114 files, 737 tests |
| Formatter service tests | temp venv + `PYTHONPATH=.` + `python -m pytest formatter_service/tests` | PASS — 27 tests |

Standard `npm run lint` was attempted and failed because ESLint traversed the untracked local scratch checkout `.tmp/pr18`, which contains stale binary/generated files. The production-source lint command above excludes local scratch and passed. The `.tmp` directory is not tracked by Git and is not part of the integrated branch.

## Production export validation

The fabricated production export baseline completed successfully:

```text
Application credentials
  -> Export Adapter
  -> staged GCS render-model request
  -> Cloud Tasks relay
  -> Export Adapter Relay
  -> private Cloud Run Formatter Service
  -> Cloud Storage artifacts
  -> signed URLs
  -> ExportJob COMPLETED
```

Observed job lifecycle:

```text
QUEUED -> PROCESSING -> COMPLETED
```

Production job:

- Case: `RC17C-RELAY-CASE-229ce94fbb81`
- Transcript: `rc17c-relay-transcript-229ce94fbb81`
- Job: `export-8df7735e776d5560b3afc6c7c5d507b8`
- Duplicate create: returned same completed job
- Error: `null`
- Staged request cleanup: verified by 404 after terminal response

Artifact metadata is recorded in `docs/audits/rc/EXPORT_PATH_BASELINE.md`.

## Findings

### PASS

No release-blocking regression was observed in the integrated export path.

### WARNING — Local scratch interferes with root lint command

`npm run lint` scans `.` and therefore traversed untracked `.tmp/pr18` local scratch content. Production-source lint passed when scoped to tracked JS/TS source roots. This is a local workspace hygiene issue, not an integrated source failure.

### WARNING — Remote-only Supabase migrations

`supabase migration list --linked` shows several remote-only migration versions from 2026-07-17 through 2026-07-19. The certification migrations required by PR #4 are applied remotely. The remote-only entries should be reconciled before final release governance.

### WARNING — TXT/JSON production artifact boundary

The production Formatter Service baseline produces DOCX/PDF artifacts. TXT and JSON exports remain application-local export actions and are verified by repository tests, not by the production formatter path.

## Decision gate

The export-path baseline is established and the integrated RC verification passed with warnings.

This report does not itself authorize PR #20 implementation. Per governance, PR #20 may only begin after explicit owner approval of this baseline and verification result.

# Release Candidate Operations Runbook

Last updated: 2026-07-22

## Purpose

This runbook records the operational checks required after the export-path baseline and before final Release Candidate declaration. It is an operations checklist, not an implementation plan for new product features.

## Source baseline

Use the integration branch:

```powershell
git fetch origin
git checkout feature/stage3-workspace-core
git pull --ff-only origin feature/stage3-workspace-core
```

The export-path baseline tag is:

```text
rc-2026.1-export-path-baseline
```

## Local release gates

Run from a clean checkout:

```powershell
npm run typecheck
npm run lint
npm run build
npm test -- --run
git diff --check
```

Formatter Service gate:

```powershell
python -m pytest formatter_service/tests
```

If the system Python does not have the formatter dependencies installed, create a temporary virtual environment outside the repository, install `formatter_service/requirements.txt` plus `pytest`, and run with `PYTHONPATH=.`.

Supabase Edge Function static gate:

```powershell
deno check supabase/functions/export-adapter/index.ts supabase/functions/export-adapter-relay/index.ts
```

## Production export validation

Run one fabricated synthetic export through the integrated path:

```text
Application
  -> Export Adapter
  -> GCS staged request
  -> Cloud Tasks
  -> Export Adapter Relay
  -> Formatter Service
  -> Cloud Storage
  -> Signed URLs
  -> ExportJob COMPLETED
```

Record:

- synthetic case id;
- synthetic transcript id;
- export job id;
- idempotency key;
- observed lifecycle states;
- staged request object name;
- confirmation that staged request cleanup returns 404 after terminal completion;
- DOCX/PDF object names;
- DOCX/PDF object generations, hashes, and byte sizes;
- duplicate create/idempotency result;
- formatter service revision;
- export-adapter and export-adapter-relay versions.

Do not use or mutate client transcript data for this validation.

## Supabase migration reconciliation

Before final RC declaration, verify the linked migration state:

```powershell
supabase migration list --linked
```

Acceptance:

- every remote migration has a corresponding local migration file, or a documented release-governance explanation exists for the exception;
- certification lock migrations remain present remotely;
- no schema reconciliation is performed from an unauthenticated or stale CLI session.

If the CLI reports an invalid access token, refresh Supabase authentication first. Do not infer remote migration state from stale logs.

## Export staging lifecycle

The export adapter stages large render models under:

```text
gs://depo-pro-exports/exports/requests/
```

Terminal relay completion deletes the staged request object. A bucket lifecycle rule should also remove orphaned request objects if a task never reaches terminal relay cleanup.

Read-only check:

```powershell
gcloud storage buckets describe gs://depo-pro-exports --format="json(lifecycle_config)"
```

Acceptance:

- lifecycle configuration exists for orphaned staged request objects, or
- release governance explicitly accepts the operational risk and schedules the bucket policy change before production launch.

No lifecycle policy should delete:

- `exports/jobs/` job records;
- `exports/artifacts/` DOCX/PDF artifacts;
- idempotency records needed for duplicate request handling.

## Independent review gates

Before PR #20 merge approval:

- GitHub Verify must pass on the PR head.
- Cursor Bugbot must pass or all valid findings must be resolved with regression coverage.
- Worktree must be clean except intentional committed changes.
- Final merge approval must be explicit.

## PR #20 boundary

Allowed:

- reliability hardening;
- operational hardening;
- release hardening;
- regression tests;
- release/audit documentation.

Not allowed without separate owner decision:

- compiler changes;
- geometry changes;
- unified rendering changes;
- editorial changes;
- formatter redesign;
- export adapter feature additions;
- certification workflow changes;
- new end-user functionality.
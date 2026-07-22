# Export-Path Baseline

Baseline date: 2026-07-22
Integration branch: `feature/stage3-workspace-core`
Baseline commit: `ceb1f3fdee1bec35d628e1141ed3533e45081bf0`
Baseline branch: `codex/export-path-baseline`

## Governance state

Completed owners at this baseline:

- PR #4 — Certification Mutation Lock
- PR #17B — Formatter Service Infrastructure
- PR #17C — Export Adapter Integration

PR #20 remains unauthorized at this baseline. This document records integrated export behavior only.

## Runtime identifiers

| Component | Baseline value |
| --- | --- |
| Supabase project | `lqxiuwlwzkofdfitxuqe` |
| Export Adapter Edge Function | `export-adapter` v12, ID `20e7228d-bffe-4496-bbb8-7ba790806dcb` |
| Export Adapter Relay Edge Function | `export-adapter-relay` v1, ID `2a452d94-7959-461d-8773-ecfcf9d7ce2b` |
| Cloud Run formatter service | `depo-pro-formatter` |
| Cloud Run revision | `depo-pro-formatter-00009-26b` |
| Formatter image | `us-central1-docker.pkg.dev/depo-pro-website/depo-pro/depo-pro-formatter:17b-20260721-8` |
| Formatter version env | `17b-20260721-8` |
| Cloud Tasks queue | `projects/depo-pro-website/locations/us-central1/queues/depo-pro-formatter` |
| Artifact bucket | `gs://depo-pro-exports` |

## Production configuration

Cloud Run formatter:

- URL: `https://depo-pro-formatter-skgci45tcq-uc.a.run.app`
- Route: `POST /tasks/format`
- Runtime service account: `depo-pro-formatter@depo-pro-website.iam.gserviceaccount.com`
- Container port: `8080`
- Timeout: 300 seconds
- Artifact bucket env: `depo-pro-exports`
- Signed URL TTL env: 900 seconds

Cloud Tasks queue:

- State: `RUNNING`
- Max dispatches per second: 500
- Max concurrent dispatches: 1000
- Max attempts: 100
- Backoff: 0.100s minimum, 3600s maximum

Storage bucket:

- Name: `depo-pro-exports`
- Location: `US-CENTRAL1`
- Storage class: `STANDARD`
- Soft-delete retention: 604800 seconds
- Uniform bucket-level access: `false`

## Supabase migration state

Linked remote migration list was verified on 2026-07-22. Certification lock migrations are applied remotely:

- `20260722020816`
- `20260722022713`
- `20260722024834`

Warning: the linked migration list also shows remote-only migrations from 2026-07-17 through 2026-07-19 that are not present as local migration files in this checkout. That is not an export-path execution failure, but it should be reconciled before final release governance.

## Canonical production baseline fixture

The production baseline used fabricated data only.

| Field | Value |
| --- | --- |
| Synthetic case | `RC17C-RELAY-CASE-229ce94fbb81` |
| Synthetic transcript | `rc17c-relay-transcript-229ce94fbb81` |
| Export job | `export-8df7735e776d5560b3afc6c7c5d507b8` |
| Idempotency key | `rc17c-relay-request-229ce94fbb81` |
| Staged request object | `exports/requests/export-8df7735e776d5560b3afc6c7c5d507b8.json` |
| Completed job object | `exports/jobs/export-8df7735e776d5560b3afc6c7c5d507b8.json` |
| Inline formatter envelope size | 1,252,365 bytes |
| Relay Cloud Task envelope size | 205 bytes |

The staged request object returned 404 after terminal formatter response, confirming relay cleanup.

Observed lifecycle:

```text
QUEUED -> PROCESSING -> COMPLETED
```

Duplicate idempotent create returned the same completed job.

## Baseline artifacts

The canonical binary artifacts remain in Cloud Storage and are referenced by immutable object generation and hash metadata.

| Artifact | GCS object | Generation | MD5 | CRC32C | Bytes |
| --- | --- | ---: | --- | --- | ---: |
| ExportJob JSON | `gs://depo-pro-exports/exports/jobs/export-8df7735e776d5560b3afc6c7c5d507b8.json` | `1784736034270088` | `lXCoCY43bT+qYn0JX5SDEw==` | `hR4mig==` | 2329 |
| DOCX | `gs://depo-pro-exports/exports/artifacts/export-8df7735e776d5560b3afc6c7c5d507b8/transcript.docx` | `1784736033852714` | `EVq0A5LAH1P4fyL20F6Qow==` | `ObVWjA==` | 37021 |
| PDF | `gs://depo-pro-exports/exports/artifacts/export-8df7735e776d5560b3afc6c7c5d507b8/transcript.pdf` | `1784736034074451` | `5wtuPn2S89J2etQYy++aLQ==` | `lEonDg==` | 28201 |

DOCX and PDF signed URLs were generated with expiration `2026-07-22T16:15:33.740256+00:00`.

TXT and JSON exports are not produced by the production Formatter Service path at this baseline. TXT/package JSON remain local application export actions and are covered by repository tests rather than production formatter artifacts.

## Deterministic expectations

For this baseline fixture:

- identical `transcriptId + idempotencyKey` must return job `export-8df7735e776d5560b3afc6c7c5d507b8`;
- the adapter must stage the large render model to GCS rather than inline it in Cloud Tasks;
- the Cloud Task payload must remain a bounded relay reference;
- the relay must forward the unchanged formatter envelope;
- the formatter must produce DOCX and PDF artifacts;
- completed job state must be immutable;
- staged request cleanup must occur after terminal formatter response;
- signed URLs must be present for produced artifacts.

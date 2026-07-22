# Export Adapter Owner Audit

## Scope

- Roadmap pull request: PR #17C — Export Adapter Integration
- Branch: `pr17c-export-adapter`
- Base: `feature/stage3-workspace-core` at `ffee3e383f85d3850e101268935ff88c160f121b`
- Owner: Export Adapter

## Owns

The Export Adapter owns authenticated export orchestration, persisted-certification verification, canonical request routing, large-request staging, relay dispatch, initial `ExportJob` creation, Cloud Tasks dispatch, status propagation, artifact metadata retrieval, queued cancellation, adapter-level errors, and caller idempotency propagation.

## Consumes

| Owner | Consumed authority | Adapter behavior |
| --- | --- | --- |
| Certification | Persisted `certification_date` | Requires the existing database certification record; does not reinterpret checklist rules |
| Compiler pipeline | Structured Transcript Package | Calls the existing package builder without modifying compiler behavior |
| Geometry | Geometry Layout Model | Passes the existing geometry output through unchanged |
| Unified Rendering | `UnifiedRenderModel` | Sends the completed model as the formatter request input |
| Editorial | Deterministic editorial render model | Applies the existing Editorial API before dispatch without adding rules |
| Export Contract | `ExportServiceRequest` and `ExportJob` | Uses the frozen contract and existing transition states |
| Formatter Service | Private `POST /tasks/format` worker | Relays the unchanged formatter envelope after loading the staged canonical request and does not format artifacts |

## Explicitly Does Not Own

The adapter does not own or modify compiler semantics, transcript meaning, paragraph ownership, geometry decisions, Unified Rendering construction, Editorial rules, Certification rules, formatter core, physical-line pagination, artifact contents, retry leases, Stage S, or the frozen API contract types.

## Lifecycle

The adapter creates a deterministic job identifier from `(transcriptId, idempotencyKey)`, persists `QUEUED`, stages the canonical formatter request under `exports/requests/{jobId}.json`, and schedules a bounded Cloud Task containing only the staged object reference. The adapter-owned relay verifies Google Cloud Tasks OIDC, loads the staged request, and forwards the unchanged `{ jobId, request }` formatter envelope to the private Formatter Service. The Formatter Service owns `PROCESSING`, `COMPLETED`, and operational `FAILED` updates. Polling returns stored formatter output without changing artifact metadata.

Cancellation is bounded to a task that is still `QUEUED`. The adapter deletes that named Cloud Task before recording the existing contract state `FAILED` with `error = "export cancelled"`. Once dispatch has begun, cancellation returns conflict and does not interfere with the Formatter Service lease.

## Authentication and Authorization

The client invokes an authenticated Supabase Edge Function with its user JWT. The function validates the caller with Supabase Auth and performs transcript and certification reads through the caller-scoped Supabase client so existing RLS remains authoritative. The `export-adapter-relay` function is not a user endpoint; it accepts only Google Cloud Tasks OIDC for the configured relay audience and service account. Google credentials are server-side secrets only and are never exposed to the browser or committed to Git.

## Geometry Preservation

`buildCanonicalExportRenderModel` composes existing owner APIs:

`Display Document → CFE → persisted line types/regions → Structured Transcript Package → Geometry → Unified Render Model → Editorial`

The adapter does not infer tabs, margins, roles, page geometry, or physical wrapping. The completed model is passed directly into `buildExportServiceRequest`.

## Regression Coverage

Focused tests cover:

- successful certified orchestration;
- certification-date enforcement;
- unchanged formatter request and geometry;
- production-sized render model staging with bounded Cloud Tasks payload;
- relay request validation and staged request matching;
- queued and processing progress propagation;
- completed signed-artifact retrieval;
- formatter failure propagation;
- retry and duplicate idempotency-key reuse;
- queued idempotent replay dispatch recovery;
- queued cancellation, processing cancellation conflict, and generation-conflict recovery;
- malformed formatter responses;
- cross-transcript job access rejection;
- canonical owner-pipeline composition;
- Export screen certification gating and formatter controls;
- continued lifecycle polling when cancellation fails;
- disabled formatter controls while the initial create request is pending;
- active polling abort on unmount.

## Validation Evidence

Local implementation evidence:

- focused Export Adapter/UI protocol suite: 20 targeted tests passed for the latest staging and UI fixes;
- full repository suite: 737 tests passed with `STAGE_S_WRITE=1`;
- TypeScript typecheck: passed;
- ESLint: passed;
- production build: passed;
- Deno Edge Function check: passed for `export-adapter` and `export-adapter-relay`;
- `git diff --check`: passed.

Deployment evidence:

- Supabase project: `lqxiuwlwzkofdfitxuqe`;
- Edge Functions: `export-adapter` and `export-adapter-relay`;
- deployed versions: `export-adapter` v10 and `export-adapter-relay` v1;
- function IDs: `export-adapter` `20e7228d-bffe-4496-bbb8-7ba790806dcb`; `export-adapter-relay` `2a452d94-7959-461d-8773-ecfcf9d7ce2b`;
- bundle SHA-256: pending final bundle digest capture after commit;
- status: both functions `ACTIVE`.

Production end-to-end acceptance passed after the relay deployment on July 22, 2026. Fabricated case `RC17C-RELAY-CASE-126fd114cbe2`, transcript `rc17c-relay-transcript-126fd114cbe2`, and job `export-8a4d4573e1719426d6aa03ee9536312c` traversed Application credentials -> Export Adapter -> staged GCS request object -> Cloud Tasks relay -> private Formatter Service -> Cloud Storage. The inline formatter body would have been 1,252,365 bytes; the relay task body was 205 bytes. Observed job lifecycle was `QUEUED -> PROCESSING -> COMPLETED`, with DOCX/PDF signed artifacts and duplicate idempotent create returning the same completed job. The staged request object `exports/requests/export-8a4d4573e1719426d6aa03ee9536312c.json` was deleted after terminal formatter response; the completed job object remains at `exports/jobs/export-8a4d4573e1719426d6aa03ee9536312c.json` generation `1784729586749606`.

The dedicated runtime identity is `depo-pro-export-adapter@depo-pro-website.iam.gserviceaccount.com`. Its only project roles remain `roles/cloudtasks.enqueuer` and `roles/cloudtasks.taskDeleter`. The service account policy is self-scoped to `roles/iam.serviceAccountUser` and `roles/iam.serviceAccountOpenIdTokenCreator`; the latter is required for relay-generated formatter Cloud Run audience tokens. `roles/run.invoker` remains scoped to `depo-pro-formatter`, and `roles/storage.objectUser` remains scoped to `gs://depo-pro-exports`.

One user-managed JSON key exists because the Supabase Edge Function has no Google ambient identity. Supabase secret digests confirmed installation, and the temporary local key file was deleted immediately afterward. Production resource identifiers and synthetic job evidence are recorded in `docs/operations/EXPORT_ADAPTER_DEPLOYMENT.md`.

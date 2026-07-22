# Export Adapter Owner Audit

## Scope

- Roadmap pull request: PR #17C — Export Adapter Integration
- Branch: `pr17c-export-adapter`
- Base: `feature/stage3-workspace-core` at `ffee3e383f85d3850e101268935ff88c160f121b`
- Owner: Export Adapter

## Owns

The Export Adapter owns authenticated export orchestration, persisted-certification verification, canonical request routing, initial `ExportJob` creation, Cloud Tasks dispatch, status propagation, artifact metadata retrieval, queued cancellation, adapter-level errors, and caller idempotency propagation.

## Consumes

| Owner | Consumed authority | Adapter behavior |
| --- | --- | --- |
| Certification | Persisted `certification_date` | Requires the existing database certification record; does not reinterpret checklist rules |
| Compiler pipeline | Structured Transcript Package | Calls the existing package builder without modifying compiler behavior |
| Geometry | Geometry Layout Model | Passes the existing geometry output through unchanged |
| Unified Rendering | `UnifiedRenderModel` | Sends the completed model as the formatter request input |
| Editorial | Deterministic editorial render model | Applies the existing Editorial API before dispatch without adding rules |
| Export Contract | `ExportServiceRequest` and `ExportJob` | Uses the frozen contract and existing transition states |
| Formatter Service | Private `POST /tasks/format` worker | Dispatches through Cloud Tasks and does not format artifacts |

## Explicitly Does Not Own

The adapter does not own or modify compiler semantics, transcript meaning, paragraph ownership, geometry decisions, Unified Rendering construction, Editorial rules, Certification rules, formatter core, physical-line pagination, artifact contents, retry leases, Stage S, or the frozen API contract types.

## Lifecycle

The adapter creates a deterministic job identifier from `(transcriptId, idempotencyKey)`, persists `QUEUED`, and schedules the unchanged formatter envelope. The Formatter Service owns `PROCESSING`, `COMPLETED`, and operational `FAILED` updates. Polling returns stored formatter output without changing artifact metadata.

Cancellation is bounded to a task that is still `QUEUED`. The adapter deletes that named Cloud Task before recording the existing contract state `FAILED` with `error = "export cancelled"`. Once dispatch has begun, cancellation returns conflict and does not interfere with the Formatter Service lease.

## Authentication and Authorization

The client invokes an authenticated Supabase Edge Function with its user JWT. The function validates the caller with Supabase Auth and performs transcript and certification reads through the caller-scoped Supabase client so existing RLS remains authoritative. Google credentials are server-side secrets only and are never exposed to the browser or committed to Git.

## Geometry Preservation

`buildCanonicalExportRenderModel` composes existing owner APIs:

`Display Document → CFE → persisted line types/regions → Structured Transcript Package → Geometry → Unified Render Model → Editorial`

The adapter does not infer tabs, margins, roles, page geometry, or physical wrapping. The completed model is passed directly into `buildExportServiceRequest`.

## Regression Coverage

Focused tests cover:

- successful certified orchestration;
- certification-date enforcement;
- unchanged formatter request and geometry;
- queued and processing progress propagation;
- completed signed-artifact retrieval;
- formatter failure propagation;
- retry and duplicate idempotency-key reuse;
- queued cancellation and processing cancellation conflict;
- malformed formatter responses;
- cross-transcript job access rejection;
- canonical owner-pipeline composition;
- Export screen certification gating and formatter controls.

## Validation Evidence

Local implementation evidence:

- focused Export Adapter/UI protocol suite: 17 tests passed;
- full repository suite: 726 tests passed;
- TypeScript typecheck: passed;
- ESLint: passed;
- production build: passed;
- Deno Edge Function check: passed;
- `git diff --check`: passed.

Deployment evidence:

- Supabase project: `lqxiuwlwzkofdfitxuqe`;
- Edge Function: `export-adapter`;
- deployed version: `2`;
- function ID: `20e7228d-bffe-4496-bbb8-7ba790806dcb`;
- bundle SHA-256: `39198d752fd550c957b5f77068d8ceab06336b6607c25b8fbd53dfb5a1eca5dc`;
- status: `ACTIVE` with JWT verification enabled.

Production end-to-end acceptance passed on July 22, 2026. The authenticated fabricated export traversed Application credentials → Export Adapter → Cloud Tasks → private Formatter Service → Cloud Storage and reached `COMPLETED` with DOCX and PDF signed artifacts. Repeating the same idempotency key returned the same completed job.

The dedicated runtime identity is `depo-pro-export-adapter@depo-pro-website.iam.gserviceaccount.com`. Its only project roles are `roles/cloudtasks.enqueuer` and `roles/cloudtasks.taskDeleter`. Self-impersonation is limited to `roles/iam.serviceAccountUser` on that same service account. `roles/run.invoker` is scoped to `depo-pro-formatter`, and `roles/storage.objectUser` is scoped to `gs://depo-pro-exports`.

One user-managed JSON key exists because the Supabase Edge Function has no Google ambient identity. Supabase secret digests confirmed installation, and the temporary local key file was deleted immediately afterward. Production resource identifiers and synthetic job evidence are recorded in `docs/operations/EXPORT_ADAPTER_DEPLOYMENT.md`.

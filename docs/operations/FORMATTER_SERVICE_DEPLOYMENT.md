# Formatter Service Deployment

## Scope

Depo-Pro is the authoritative repository for the formatter core and Formatter Service. The pre-existing local desktop formatter is a migration source only; its CustomTkinter application is not deployed.

The Formatter Service consumes completed render-model content. It does not change compiler semantics, geometry, editorial rules, or the versioned export contract.

## Google Cloud resources

| Item | Value |
| --- | --- |
| Project | `depo-pro-website` (`998226709838`) |
| Region | `us-central1` |
| Cloud Run service | `depo-pro-formatter` |
| Artifact Registry repository | `us-central1-docker.pkg.dev/depo-pro-website/depo-pro` |
| Artifact bucket | `gs://depo-pro-exports` |
| Runtime service account | `depo-pro-formatter@depo-pro-website.iam.gserviceaccount.com` |
| Cloud Tasks queue | `depo-pro-formatter` (`us-central1`) |

## Authorization boundary

The Formatter Service is a trusted internal service. The Depo-Pro Export Adapter authenticates the user, authorizes transcript access, records audit information, and constructs the export request before invoking Cloud Run. Cloud Run authenticates that adapter through IAM. The formatter does not query Supabase, implement row-level security, or make transcript-authorization decisions.

## Required runtime configuration

| Name | Purpose | Source |
| --- | --- | --- |
| `EXPORT_ARTIFACT_BUCKET` | Artifact destination | Cloud Run environment variable |
| `EXPORT_ARTIFACT_URL_TTL_SECONDS` | Signed-download lifetime | Cloud Run environment variable |
| `FORMATTER_VERSION` | Formatter release identifier | Container build metadata |

No application secret is required for the Formatter Service. Cloud Run IAM and the attached runtime service account provide service-to-service authentication and artifact access. Future secrets, if any, must be supplied through Secret Manager rather than committed to this repository.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | Liveness and readiness check; no transcript data |
| `POST /tasks/format` | Private Cloud Tasks worker endpoint |

The Export Adapter, introduced separately, owns the public `POST /exports`, job polling, and artifact retrieval contract. It persists a queued job, then schedules the private worker through Cloud Tasks. The worker updates job status from `PROCESSING` to `COMPLETED` or `FAILED` and stores artifacts in Cloud Storage.

## Formatter boundary

The migrated formatter core is the sole DOCX/PDF formatting authority in Depo-Pro. The service adapter invokes that core and does not implement independent layout, editorial, or pagination rules.
## Execution invariants

The Cloud Tasks worker claims the `(transcriptId, idempotencyKey)` pair before formatter execution. A duplicate task resolves to the claimed job instead of generating another artifact set. Completed jobs are immutable: retries return their existing artifact metadata and never invoke `formatter_core` again.

The render model is input-only. The worker passes its completed line content to `formatter_core` and does not alter content, calculate geometry, or apply editorial rules.

A malformed task records `FAILED` without retry eligibility. Operational formatter failures record `FAILED` and return a retryable worker failure so Cloud Tasks can retry the same idempotent job. Internal retry metadata is stored with the job record; public responses remain the unchanged `ExportJob` contract.

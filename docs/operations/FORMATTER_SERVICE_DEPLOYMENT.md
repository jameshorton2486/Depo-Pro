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

## Production infrastructure gate

The authenticated production gate passed on 2026-07-21 against Cloud Run revision `depo-pro-formatter-00006-rm6` and image `17b-20260721-5`.

| Check | Verified value |
| --- | --- |
| Cloud Tasks target | `POST https://depo-pro-formatter-skgci45tcq-uc.a.run.app/tasks/format` |
| OIDC audience | `https://depo-pro-formatter-skgci45tcq-uc.a.run.app` |
| OIDC identity | `depo-pro-formatter@depo-pro-website.iam.gserviceaccount.com` |
| FastAPI route | `POST /tasks/format` |
| Synthetic job | `pr17b-synthetic-final-20260721-05` |
| Final job status | `COMPLETED` |
| Retry eligibility | `false` |
| DOCX object | `gs://depo-pro-exports/exports/artifacts/pr17b-synthetic-final-20260721-05/transcript.docx` |
| DOCX MD5 | `nWs25WNMdjyjQuqLP2oO5w==` |
| PDF object | `gs://depo-pro-exports/exports/artifacts/pr17b-synthetic-final-20260721-05/transcript.pdf` |
| PDF MD5 | `YDjtnQ9CaAtpN9BfAiLLNQ==` |
| Processing lease | Released after completion |
| DOCX physical lines | 19 numbered lines; no artificial blank lines |
| DOCX geometry | Q/A tabs at 0.5\"/1.0\"; parenthetical tab at 2.0\" |

The task reached the private IAM-protected Cloud Run service, executed the registered FastAPI route, invoked `formatter_core`, uploaded both requested artifacts, generated signed URLs through IAM `signBlob`, persisted the completed job in Cloud Storage, and returned success to Cloud Tasks. The completed task was removed from the queue automatically.

An authenticated duplicate dispatch using the identical job and idempotency key also returned success without rewriting state. The job object retained generation `1784673201119863`, the DOCX retained generation `1784673200597111`, and the PDF retained generation `1784673200958653`; Cloud Tasks removed the duplicate task after acknowledgement.
## Review-correction production gate

The final review-correction image was deployed on 2026-07-21 (America/Chicago) as Cloud Run revision `depo-pro-formatter-00007-2z7`, serving 100% of traffic from image `17b-20260721-6` (digest `sha256:5ad5848d701206684f9387b1f64987b86efcc091b899c4b26940dcd6a181acef`; Cloud Build `ed2e2a1a-221f-4cc4-92ee-0374f912129a`).

| Check | Verified value |
| --- | --- |
| Synthetic job | `pr17b-review-final-20260721-06` |
| Final status | `COMPLETED`; `retryEligible=false`; `error=null` |
| Job generation / MD5 | `1784692126265112` / `MtuJG5fGTBUa8IN9oNdH2Q==` |
| DOCX generation / MD5 / bytes | `1784692125927031` / `mK3gizz/n33FDuJoGc4+IQ==` / `37146` |
| PDF generation / MD5 / bytes | `1784692126092221` / `4flinoc+d7kIz0hJ7LHoFQ==` / `20098` |
| Physical lines | 11 numbered physical lines from 3 logical render lines |
| Artificial blank lines | 0 |
| Global geometry | 1.25-inch left margin; 0.75-inch right margin; 28-point line spacing |
| Line geometry | Q/A tabs at 0.5/1.0 inches; continuation at 1.0 inch; parenthetical at 2.0 inches |
| Duplicate dispatch | Acknowledged; job, DOCX, and PDF generations and MD5 values remained unchanged |
| Malformed named task | `pr17b-malformed-final-20260721-06` persisted `FAILED`, `retryEligible=false`, then left the queue |
| Malformed completed-job replay | Acknowledged; completed job generation and MD5 remained unchanged |

The processing-lease renewal, stale takeover, owner-token conditional release, and lost-lease publication guards are verified by deterministic storage/worker regression tests. Production validation used only fabricated transcript data and did not read or mutate client data.
### Final reviewed runtime promotion

After the final lost-lease failure-write regression was added, runtime commit `1608991` was built as image `17b-20260721-7` (digest `sha256:acdac57aedfb03764f0b438bf1b771479611bce51d2baf70890984c5fe29c2df`; Cloud Build `ee37d48f-a98c-4433-9d7c-659c5d707d83`) and deployed as revision `depo-pro-formatter-00008-wvb` with 100% traffic. Synthetic job `pr17b-final-head-20260721-07` completed with signed DOCX and PDF artifacts and `retryEligible=false`.

| Object | Generation | MD5 | Bytes |
| --- | ---: | --- | ---: |
| Job | `1784692637688028` | `sOK82ns2c3+S/C12pGoaqg==` | — |
| DOCX | `1784692637359481` | `th3qrmkDn2wYdmcKFcUnMQ==` | `37038` |
| PDF | `1784692637532331` | `fq47sfinM3oOU1FfkyHexg==` | `19564` |

# AI-Review HTTP 500 Root-Cause Report

Date: 2026-08-10  
Transcript: `tr_1786372056908_hyjqv3`  
Deployed function: `ai-review`, version 10

## Finding

The observed HTTP 500 is a deterministic pre-provider database-loading failure. It is downstream from successful canonical transcript creation and is unrelated to Deepgram ingestion.

The deployed legacy path queries two columns that do not exist in production:

- `transcript_utterances.speaker_role`
- `speaker_resolution_current.speaker_id`

Production instead has speaker role data on `transcript_speakers`, while `speaker_resolution_current` uses `raw_speaker_id`. The function returns `{ "error": "Failed to load transcript data" }` as soon as either query fails. Thomas has null `ai_review_meta`, consistent with failure before provider invocation or persistence.

## Required diagnostic dimensions

| Dimension | Evidence | Finding |
|---|---|---|
| Function/deployment | Supabase lists `ai-review` version 10; failure followed the fresh Thomas callback | Exact deployed subsystem identified |
| Request | JSON body accepts `transcript_id` and optional `force_rerun` | Request shape is valid and sufficient |
| Response/error | HTTP 500; function branch returns `Failed to load transcript data` | Error is generated locally before Anthropic |
| Failing operation | Parallel selects include nonexistent utterance and speaker-resolution columns | Immediate root cause |
| Configuration | Required Supabase/service-role/Anthropic secrets passed the initial guard; `AI_REVIEW_BRIDGE` is absent | Legacy path was selected; missing bridge flag is not the immediate failure |
| Authentication | Transcript row was found and execution reached child-table loading | Not an authentication failure |
| Schema assumptions | Code expects a later `speaker_resolution_current` schema that production never acquired | Migration/schema drift |
| Provider behavior | Provider call occurs only after successful input loading | Provider was not called |
| Timeout | Failure occurred in about 1.3 seconds | Not a provider or Edge timeout |
| Prompt size | No prompt was constructed/sent | Not causal in this incident |
| Parsing | No model response existed to parse | Not causal in this incident |
| Persistence | No suggestions or completion metadata were written | Failure precedes persistence; later persistence paths also have defects |
| Retry | `force_rerun` bypasses completed-review skipping but repeats the same schema failure | Retry is non-remediating and can become risky after partial writes |
| Duplicate-correction risk | Legacy writes are row-by-row and lack one atomic run boundary; bridge inserts run/corrections separately | Partial retries could duplicate or leave mixed state |
| Architectural interaction | Legacy word/speaker/structure suggestions overlap the ATIA TIE/`CorrectionObject` path | Duplicate responsibility is confirmed |

## Additional defects exposed by characterization

1. Both legacy and bridge queries omit pagination. Supabase's default 1,000-row response cap would truncate Thomas from 1,757 utterances and 13,952 words even after the invalid projections were repaired.
2. `speaker_resolution_current` is empty in production. The legacy path constructs speaker issues exclusively from that table, so it would see no speaker issues for Thomas even if the query succeeded.
3. The historical migration used `create table if not exists` against an older table of the same name. The create became a no-op, leaving the incompatible old schema in place.
4. The local migration that creates `correction_runs` and `corrections` is not applied remotely. Enabling the bridge in production would therefore fail at persistence.
5. The bridge and legacy input context hardcode `Miah Bardot, CSR No. 12129`, making case-specific knowledge part of general production behavior.
6. Legacy speaker suggestion updates ignore database errors and target the nonexistent `speaker_id`, so successful provider output could be reported complete while speaker proposals were not persisted.
7. There is no Edge-function integration test covering production projections, pagination, atomicity, or the real schema. Unit tests cover helper functions only.

## Classification

- Implementation defect: **yes** — invalid projections, missing pagination, ignored speaker-update errors.
- Configuration defect: **yes, latent** — bridge disabled and its required production tables absent.
- Architectural defect: **yes** — incompatible speaker authorities and non-atomic mixed persistence.
- Obsolete subsystem: **legacy path is a retirement candidate**, but legacy code must remain until characterization and migration gates pass.
- Duplicate responsibility: **yes** — legacy review overlaps the approved TIE/CorrectionObject architecture.

## Architectural disposition

Do not merely patch the HTTP 500 and preserve the current subsystem indefinitely. The approved surviving responsibility is proposal-only AI review that reads complete canonical evidence, uses canonical case context, emits validated `CorrectionObject` records through the vendor-neutral provider boundary, and requires human review before one audited correction-application path updates the Working Transcript.

Before any production enablement, the implementation must:

1. choose and document one canonical speaker authority;
2. reconcile migrations without destructive production guessing;
3. paginate every large transcript input;
4. remove case-specific reporter defaults from general review context;
5. characterize idempotency and atomic persistence;
6. test against the production-shaped schema with more than 1,000 utterances and words;
7. keep the legacy path available only as the ATIA migration fallback until the deletion gate is satisfied.


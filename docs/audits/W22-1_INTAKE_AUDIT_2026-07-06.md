# W22-1 Intake Audit — 2026-07-06

Branch context: `feature/stage3-workspace-core`

Mode: read-only audit

Scope: canonical intake pipeline from Deepgram callback payload to transcript finalize.

## A. Pipeline-Order Diagram

### A1. Actual Current Pipeline

The current order of operations is:

1. `transcribe-start/index.ts`
   - validates auth, case, audio, and duration
   - chooses single-source vs auto-chunk path using `AUTO_CHUNK_THRESHOLD_SECONDS` at [supabase/functions/transcribe-start/index.ts:225](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-start\index.ts:225)
   - builds auto-chunk manifest via `buildAutoChunkManifest(...)` at [src/lib/transcript/autoChunking.ts:58](C:\Users\james\projects\depo-pro\src\lib\transcript\autoChunking.ts:58)
   - persists request artifact and creates queued transcription job

2. `transcribe-callback/index.ts`
   - loads job and request artifact at [supabase/functions/transcribe-callback/index.ts:129](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:129)
   - uploads raw Deepgram callback payload as artifact at [supabase/functions/transcribe-callback/index.ts:150](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:150)
   - parses callback payload at [supabase/functions/transcribe-callback/index.ts:275](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:275)
   - runs `integrityAudit(parsed.response)` on raw Deepgram JSON at [supabase/functions/transcribe-callback/index.ts:174](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:174)

3. Failure branch if raw audit fails
   - persists a `needs_manual_review` transcript row via `persistManualReviewTranscript(...)` at [supabase/functions/transcribe-callback/index.ts:846](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:846)
   - marks job `failed` with integrity failure message at [supabase/functions/transcribe-callback/index.ts:183](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:183)

4. Success branch for raw audit
   - advances/finalizes through `advanceOrFinalizeMultifileJob(...)` at [supabase/functions/transcribe-callback/index.ts:193](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:193)
   - per source, loads source transcript segments using `normalizeTranscriptResponse(parsed.response)` at [supabase/functions/transcribe-callback/index.ts:1092](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:1092)
   - merges via `mergeSourceTranscriptSegments(...)` at [supabase/functions/transcribe-callback/index.ts:203](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:203)

5. Canonical persistence
   - `ingestTranscript(...)` writes `transcripts`, `transcript_speakers`, `transcript_utterances`, `transcript_words` at [supabase/functions/transcribe-callback/index.ts:306](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:306)

6. Job completion update
   - job status is set to `complete` immediately after ingest at [supabase/functions/transcribe-callback/index.ts:233](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:233)

7. Boundary post-processing
   - `runBoundaryEngine(...)` executes only after the job is already marked complete at [supabase/functions/transcribe-callback/index.ts:240](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:240)
   - boundary detection chain is:
     - `detectFormalOpening(...)` [supabase/functions/transcribe-callback/index.ts:660](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:660)
     - `applyPreRecordCutoff(...)` [supabase/functions/transcribe-callback/index.ts:661](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:661)
     - `detectOffRecordSections(...)` [supabase/functions/transcribe-callback/index.ts:662](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:662)
     - `applyOffRecordSections(...)` [supabase/functions/transcribe-callback/index.ts:663](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:663)
     - `detectPostRecordContent(...)` [supabase/functions/transcribe-callback/index.ts:664](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:664)
     - `applyPostRecordCutoff(...)` [supabase/functions/transcribe-callback/index.ts:665](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:665)
     - `generateSyntheticParentheticals(...)` [supabase/functions/transcribe-callback/index.ts:676](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:676)

8. AI review trigger
   - `triggerAiReview(...)` fires after boundary processing at [supabase/functions/transcribe-callback/index.ts:241](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:241)

### A2. Ordering Violations

1. `integrityAudit(...)` runs against raw Deepgram payload only, before canonical normalization and persistence, so it cannot enforce canonical invariants like `utterance.text == join(words)` or detect persisted orphan/ordering defects. Evidence:
   - audit input is `parsed.response` at [supabase/functions/transcribe-callback/index.ts:174](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:174)
   - audit implementation inspects raw utterance/word objects, not normalized rows, at [src/lib/transcript/integrityAudit.ts:140](C:\Users\james\projects\depo-pro\src\lib\transcript\integrityAudit.ts:140)

2. Job status is set to `complete` before boundary post-processing runs. That means the canonical transcript is declared finalized before all W22-1 responsibilities are complete. Evidence:
   - `updateJob(... status: "complete" ...)` at [supabase/functions/transcribe-callback/index.ts:233](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:233)
   - `runBoundaryEngine(...)` at [supabase/functions/transcribe-callback/index.ts:240](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:240)

3. Boundary processing mutates persisted transcript rows after ingest and after completion status, so canonical completion is not currently gated on boundary success.

### A3. Formatting / Rendering Before Corrections

No formatting or workspace rendering occurs in the intake/finalize path audited here. Rendering lives later in `workspacePresentation.ts` and `buildEditorContent.ts`, outside W22-1. Therefore there is no render-before-correction violation inside the callback pipeline itself.

## B. Reuse Map

### B1. Capability Classification

| W22-1 capability | Status | Evidence | Reuse decision |
|---|---|---|---|
| Intake normalization from raw Deepgram JSON | EXISTS | `normalizeTranscriptResponse(...)` builds canonical speakers/utterances/words at [src/lib/transcript/normalize.ts:174](C:\Users\james\projects\depo-pro\src\lib\transcript\normalize.ts:174) | REUSE |
| `utterance.text` derived from canonical words | EXISTS in normalize path | `text: utteranceWords.map((word) => word.raw_text).join(" ")` at [src/lib/transcript/normalize.ts:233](C:\Users\james\projects\depo-pro\src\lib\transcript\normalize.ts:233) | REUSE |
| Raw Deepgram integrity audit | PARTIAL | `integrityAudit(...)` validates shape, speaker presence, confidence, timing gaps/overlaps on raw payload at [src/lib/transcript/integrityAudit.ts:140](C:\Users\james\projects\depo-pro\src\lib\transcript\integrityAudit.ts:140) | EXTEND |
| Canonical row-coherence integrity gate | MISSING | no check after normalize/merge/ingest enforces `utterance.text == join(words)` or orphan-free canonical rows | BUILD |
| Single-source merge path | EXISTS | `mergeSingleTranscript(...)` at [src/lib/transcript/multifileMerge.ts:82](C:\Users\james\projects\depo-pro\src\lib\transcript\multifileMerge.ts:82) | REUSE |
| Virtual-chunk overlap merge | PARTIAL | exact text+timing dedup at [src/lib/transcript/multifileMerge.ts:182](C:\Users\james\projects\depo-pro\src\lib\transcript\multifileMerge.ts:182) | EXTEND |
| Auto-chunk threshold and manifest creation | EXISTS | threshold and manifest builder at [src/lib/transcript/autoChunking.ts:1](C:\Users\james\projects\depo-pro\src\lib\transcript\autoChunking.ts:1) and [src/lib/transcript/autoChunking.ts:58](C:\Users\james\projects\depo-pro\src\lib\transcript\autoChunking.ts:58) | REUSE |
| Auto-chunk dispatch in start function | EXISTS but externally suspect | single vs chunked branch at [supabase/functions/transcribe-start/index.ts:225](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-start\index.ts:225) | REUSE in W22-1, redesign deferred |
| Boundary detection (formal opening, off-record, post-record) | EXISTS | detection functions at [src/lib/transcript/boundaryEngine.ts:79](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:79), [src/lib/transcript/boundaryEngine.ts:97](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:97), [src/lib/transcript/boundaryEngine.ts:109](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:109) | REUSE |
| Boundary application and synthetic procedural rows | EXISTS | apply and synthetic generation at [src/lib/transcript/boundaryEngine.ts:145](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:145), [src/lib/transcript/boundaryEngine.ts:167](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:167), [src/lib/transcript/boundaryEngine.ts:188](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:188) | REUSE |
| Boundary back-reference preservation | PARTIAL | preserved by `utterance_id`, but synthetic rows do not carry explicit `source_utterances` arrays in boundary-layer types; `BoundaryUtteranceView` has no back-reference field at [src/lib/transcript/boundaryEngine.ts:40](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:40) | EXTEND |
| Finalize orchestration | PARTIAL | callback orchestrates audit, merge, ingest, boundary, AI review at [supabase/functions/transcribe-callback/index.ts:129](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-callback\index.ts:129) | EXTEND |

### B2. Task 2 — Normalization State

Invariant audited: `utterance.text == join(words)`.

Result: `EXISTS` for the core normalization path.

Evidence:

- `normalizeTranscriptResponse(...)` assigns canonical utterance text from canonical words at [src/lib/transcript/normalize.ts:233](C:\Users\james\projects\depo-pro\src\lib\transcript\normalize.ts:233)
- it does not prefer `utterance.transcript` when constructing the persisted normalized shape

Important caveat:

- this invariant exists in normalization code, but is not currently enforced as a post-normalization finalize invariant
- later persistence and save paths can still violate it, as previously documented in `docs/audits/DUP_OPENING_AUDIT_2026-07-06.md`

### B3. Task 3 — Integrity Gate State

Current `integrityAudit.ts` support:

| Required invariant | Current status | Evidence |
|---|---|---|
| `utterance.text == string_agg(words.raw_text by word_index)` | MISSING | raw audit has no normalized-row comparison and no canonical text join enforcement |
| duplicated spans surviving chunk merges | PARTIAL | raw audit checks utterance timing overlaps at [src/lib/transcript/integrityAudit.ts:223](C:\Users\james\projects\depo-pro\src\lib\transcript\integrityAudit.ts:223), but does not inspect merged canonical output for surviving duplicate wording spans |
| contiguous monotonic word timings | PARTIAL | raw audit checks utterance ordering, end-before-start, gap and overlap patterns at [src/lib/transcript/integrityAudit.ts:214](C:\Users\james\projects\depo-pro\src\lib\transcript\integrityAudit.ts:214), but it does not validate normalized canonical `word_index` contiguity or monotonic per-word ordering after merge |
| no orphaned utterances | MISSING | no post-normalize/post-ingest orphan validation exists |

Conclusion:

The current integrity gate is a raw Deepgram payload quality screen, not a canonical transcript finalize gate.

## C. Concrete W22-1 Implementation Plan

### Scoped Commit 1

Commit goal:

- introduce a canonical transcript integrity checker that runs on normalized/merged transcript data before finalize succeeds

Planned scope:

- add a new canonical integrity helper under `src/lib/transcript/`
- validate:
  - `utterance.text == join(words)`
  - every utterance referenced by words exists
  - every utterance has at least one word unless explicitly synthetic/manual-review scoped
  - `word_index` is contiguous and monotonic
  - word timings are monotonic in canonical order
- integrate the check into `transcribe-callback/index.ts` after merge and before `ingestTranscript(...)`

Why this is W22-1:

- this is the missing invariant gate the current raw audit cannot provide

### Scoped Commit 2

Commit goal:

- fix finalize ordering so completion depends on successful boundary processing

Planned scope:

- reorder callback finalize path so:
  - canonical integrity gate passes
  - transcript ingests
  - boundary engine completes successfully
  - only then is job marked `complete`
- if boundary processing fails, route to explicit failure/review state rather than silent completion

Why this is W22-1:

- boundary awareness is explicitly in scope for the canonical working transcript

### Scoped Commit 3

Commit goal:

- harden overlap diagnostics and canonical failure signaling without redesigning chunk dispatch

Planned scope:

- add canonical duplicate-span detection on merged output or at minimum integrity failure hooks that detect incoherent overlap outcomes
- add explicit diagnostics when long-audio jobs finalize single-source in patterns associated with integrity risk
- preserve existing auto-chunk dispatch architecture

Why this is W22-1:

- the prompt allows detection/reporting of auto-chunk gap risk but not chunking redesign

### Scoped Commit 4

Commit goal:

- regression tests for canonical intake invariants

Planned scope:

- normalize idempotency test
- oversized utterance-text seed
- overlap wording-drift seed
- finalize gating tests
- boundary-order regression tests

## D. Freeze Impact

| Planned change | Schema change | New dependency | Canonical-layer touch | Freeze assessment |
|---|---|---|---|---|
| Canonical integrity checker module | no | no | read-only validation of canonical data before finalize | safe |
| Callback finalize ordering change | no | no | orchestration only | safe |
| Merge diagnostics / integrity failure signaling | no | no | validates merged canonical output | safe |
| Boundary back-reference extension in in-memory/output types | no | no | additive metadata only | likely safe |

Notes:

- no schema or migration is required for the core W22-1 work described above
- no new dependency is justified
- the canonical timed word layer remains immutable; the work is validation and orchestration, not lexical mutation

## E. Separate-Prompt Candidates

The following should remain outside W22-1 unless a later audit narrows them substantially:

1. Auto-chunk dispatch redesign
   - current code already dispatches chunked requests above threshold at [supabase/functions/transcribe-start/index.ts:225](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-start\index.ts:225)
   - the prior duplicate-opening audit indicates live jobs may still have finalized single-source above threshold, but resolving that requires live-path investigation beyond this code-only audit
   - recommendation: separate prompt if live repro is needed

2. Speaker semantic resolution
   - belongs in W22-2, not W22-1

3. Q/A reconstruction, appearance assembly, and front matter generation
   - belongs in W22-2

4. Lexical correction, dictionaries, and metadata normalization
   - belongs in W22-3

5. Punctuation and spacing standards
   - belongs in W22-4

6. AI context and suggestion validation
   - belongs in W22-5

## Known-Defect Confirmation

### Duplicate opening: `tr_1783355404197_y71d97`

Cross-reference result:

- `docs/audits/DUP_OPENING_AUDIT_2026-07-06.md` already established that the confirmed defect for this job is `transcript_utterances.text` inconsistency, not a visible duplicate in canonical word rows
- the current raw `integrityAudit(...)` would not catch that defect because it never inspects persisted or normalized canonical `utterance.text` against joined canonical words
- therefore, under current code, the integrity gate would still miss that exact defect class

### Prior 8 inconsistent transcripts

Status in this session:

- not re-confirmed live

Reason:

- this audit session had code access but no live database query path configured
- the current evidence remains the list recorded in `docs/audits/DUP_OPENING_AUDIT_2026-07-06.md`

Implication:

- W22-1 should treat those previously documented inconsistencies as seed fixtures for regression and live verification when implementation is run

### Long-audio auto-chunk gap

Code-path confirmation:

- `transcribe-start/index.ts` does attempt to auto-chunk any first audio source whose duration exceeds `AUTO_CHUNK_THRESHOLD_SECONDS` at [supabase/functions/transcribe-start/index.ts:225](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-start\index.ts:225)
- `submitAutoChunkedJob(...)` exists and builds a manifest at [supabase/functions/transcribe-start/index.ts:606](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-start\index.ts:606) and [supabase/functions/transcribe-start/index.ts:629](C:\Users\james\projects\depo-pro\supabase\functions\transcribe-start\index.ts:629)

Current detection gap:

- the current integrity gate does not detect or report “this >4500s job unexpectedly finalized single-source” as a canonical-risk condition
- that detection should be added in W22-1, but redesign of dispatch remains a separate prompt

## Boundary Engine Status

| Capability | Status | Evidence |
|---|---|---|
| Formal opening detection | EXISTS | `detectFormalOpening(...)` at [src/lib/transcript/boundaryEngine.ts:79](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:79) |
| Off-record section detection | EXISTS | `detectOffRecordSections(...)` at [src/lib/transcript/boundaryEngine.ts:97](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:97) |
| Post-record cutoff detection | EXISTS | `detectPostRecordContent(...)` at [src/lib/transcript/boundaryEngine.ts:109](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:109) |
| Pre-record cutoff application | EXISTS | `applyPreRecordCutoff(...)` at [src/lib/transcript/boundaryEngine.ts:145](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:145) |
| Post-record cutoff application | EXISTS | `applyPostRecordCutoff(...)` at [src/lib/transcript/boundaryEngine.ts:156](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:156) |
| Off-record exclusion application | EXISTS | `applyOffRecordSections(...)` at [src/lib/transcript/boundaryEngine.ts:167](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:167) |
| Synthetic procedural parentheticals | EXISTS | `generateSyntheticParentheticals(...)` at [src/lib/transcript/boundaryEngine.ts:188](C:\Users\james\projects\depo-pro\src\lib\transcript\boundaryEngine.ts:188) |
| Source-utterance back-reference preservation | PARTIAL | existing utterances preserve `utterance_id`, but boundary-layer view type has no explicit `source_utterances` field and synthetic outputs do not record provenance beyond generated ID pattern |

## Summary

W22-1 should not build a new intake engine. The correct implementation is:

- REUSE normalization
- EXTEND raw integrity audit strategy with a canonical integrity gate
- REUSE boundary detection logic
- EXTEND callback orchestration so completion is gated on canonical integrity plus boundary success
- EXTEND merge diagnostics rather than redesign chunking in this prompt

The largest missing piece is not normalization. It is the absence of a canonical finalize gate after merge and before completion.

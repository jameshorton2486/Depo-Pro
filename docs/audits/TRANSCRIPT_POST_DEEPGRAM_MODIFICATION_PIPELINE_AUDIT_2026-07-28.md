# Transcript Post-Deepgram Modification Pipeline Audit

**Date:** 2026-07-28  
**Repository state audited:** branch `fix/deepgram-diarize-model-conflict`, commit `d741424`  
**Scope:** Files that can transform, filter, annotate, persist, or change the presentation of a Deepgram transcript after Deepgram has produced a response. Test files are excluded from the runtime inventory.  
**Git status at audit:** clean. Every runtime file listed below is tracked in Git and present in `HEAD` unless explicitly stated otherwise.

## Executive summary

The checked-out application does not take the Deepgram response directly to the Workspace. It has four materially different kinds of post-Deepgram behavior:

1. **Canonicalization:** Deepgram responses are validated, normalized, split at word-level speaker changes, merged across sources/chunks, assigned new canonical IDs, and persisted.
2. **Automatic persisted enrichment:** after the transcript is marked complete, the boundary engine can hide source utterances and create synthetic parentheticals. AI review can persist suggestions and can also write `working_text` automatically when an environment flag is enabled.
3. **Workspace presentation:** before TipTap displays the document, the frontend filters excluded utterances, runs deterministic word/phrase replacements, adds flags, resegments speaker turns, computes page geometry, and can infer speaker labels and Q/A structure. Much of this occurs even before the operator confirms inferred structure.
4. **User-driven persistence:** editing, accepting AI suggestions, changing speakers, and certain review actions write back through `editor-api` and database RPCs.

The most consequential finding is that the initial Workspace is **not an immutable Deepgram baseline**. The unconfirmed/raw-label path still executes `cfe()`, which can change displayed tokens and phrases, insert scopist flags, resegment utterances, and paginate the document. It also filters `excluded_from_output` utterances before rendering.

## Status terminology

| Status | Meaning |
|---|---|
| **Automatic / fully wired** | Reachable from the normal production call graph without an operator selecting a special action. |
| **Conditional / fully wired** | Reachable, but only for multi-file audio, a configured environment flag, inferred structure confirmation, a retry condition, or another explicit condition. |
| **User action / fully wired** | Reachable only after the operator edits, accepts, rejects, reassigns, or requests re-review. |
| **Display-only / fully wired** | Changes the Workspace representation but does not itself update canonical database rows. |
| **Support / fully wired** | Routes, maps, validates, or persists mutations but does not decide the transcript wording itself. |
| **Not in Workspace runtime** | Committed code exists, but the checked-out Workspace production call graph does not invoke it. It may be used by export or tests. |
| **Deployment unverified** | Source wiring exists, but this repository inspection does not prove that the corresponding remote function, Cloud Run revision, queue, secret, or cron job is currently deployed. |

## Actual execution pipeline

```text
Deepgram callback
  -> raw response integrity audit
  -> store response artifact
  -> advance next source/chunk OR dispatch finalize task
  -> Cloud Run finalize worker
       -> load stored response artifacts
       -> normalize each response
       -> merge sources/chunks
       -> canonical integrity audit
       -> persist transcript/speakers/utterances/words/audit
       -> mark transcript complete
       -> boundary engine (awaited, best effort)
       -> trigger AI review (fire-and-forget)
  -> Workspace selects completed transcript
       -> editor-api maps database rows to EditorDocument
       -> DocumentContext loads the document
       -> TranscriptEditor calls buildEditorContent
       -> excluded utterances filtered
       -> CFE token/phrase changes + flags + segmentation + pagination
       -> optional inferred labels/Q&A + paragraph fixes
       -> TipTap display
  -> operator edits / speaker changes / suggestion decisions
       -> workspaceService/client/editor-api
       -> database RPCs or row updates + audit log
```

## A. Callback, canonicalization, and persistence

| Order | File | What it does to or around the transcript | Runtime status | Persisted effect |
|---:|---|---|---|---|
| 1 | `supabase/functions/transcribe-callback/index.ts` | Receives each Deepgram callback, saves the raw response artifact, runs the raw-response audit, persists a manual-review transcript on failure, advances multi-source work, and dispatches finalization after the last source. | **Automatic / fully wired**; deployment unverified | Writes response artifacts and job status; can write a `needs_manual_review` transcript. |
| 2 | `src/lib/transcript/integrityAudit.ts` | Audits the provider response before canonicalization: response structure, utterances, timing, speaker coverage, confidence, duplicate IDs, and other raw-response conditions. | **Automatic / fully wired** through `transcribe-callback` | No wording changes; gates whether processing continues. |
| 3 | `src/lib/transcript/multifileCallbackFlow.ts` | Decides whether to submit the next source or finalize after the current callback. | **Conditional / fully wired** | Updates job progress; does not rewrite transcript text. |
| 4 | `src/lib/transcript/autoChunking.ts` | Reconstructs the ordered list of original sources or virtual chunks from audio rows/manifests. | **Conditional / fully wired** in start, callback, and finalizer paths | Controls source ordering and chunk offsets. |
| 5 | `supabase/functions/transcribe-callback/finalizeTasks.ts` | Creates the authenticated Cloud Tasks request for `/tasks/finalize`. | **Automatic / fully wired** after the final callback; deployment/configuration unverified | No transcript wording change. |
| 6 | `transcript_finalize_service/main.ts` | Cloud Run HTTP entry point. Validates job state/lease and invokes `finalizeTranscriptJob`. | **Automatic / fully wired in source**; remote deployment unverified | Starts canonical rebuild/finalization. |
| 7 | `transcript_finalize_service/Dockerfile` | Packages the finalization worker. | **Support / fully wired in build source** | No runtime transcript transformation itself. |
| 8 | `supabase/functions/_shared/transcriptFinalize.ts` | Main I/O orchestrator: downloads stored responses, calls normalization/merge/audit, cleans partial prior rows, inserts canonical tables, marks the job complete, runs boundary enrichment, and triggers AI review. | **Automatic / fully wired** | Inserts/deletes/updates `transcripts`, `transcript_speakers`, `transcript_utterances`, `transcript_words`, and `transcript_audit_log`. |
| 9 | `src/lib/transcript/normalize.ts` | Converts a Deepgram response into canonical speakers, utterances, and words. Uses punctuated words, creates new IDs, creates fallback utterances when needed, and **splits a Deepgram utterance whenever word-level speakers change**. | **Automatic / fully wired** | Changes structure and IDs; initializes immutable `raw_text` and null `working_text`. |
| 10 | `src/lib/transcript/multifileMerge.ts` | Merges normalized sources/chunks, offsets timestamps, resequences canonical word/utterance IDs, and handles chunk seams. For separate source files, it namespaces speaker IDs/labels by source. | **Conditional / fully wired** | Changes IDs, timestamps, source labels, and combined ordering. It does **not** prove that Speaker 0 in separate files is the same human. |
| 11 | `src/lib/transcript/finalizationPipeline.ts` | Pure composition of merge plus canonical integrity audit. | **Automatic / fully wired** | No additional wording transformation beyond the merge; returns pass/fail result. |
| 12 | `src/lib/transcript/canonicalIntegrity.ts` | Validates canonical IDs, relationships, timing, ordering, utterance text versus joined raw words, and suspicious duplicate seams. | **Automatic / fully wired** | No wording changes; failure routes the transcript to manual review. |
| 13 | `src/lib/transcript/types.ts` | Defines the Deepgram response shapes consumed by the pipeline. | **Support / fully wired** | Type-only. |
| 14 | `src/lib/transcriptionJobs.ts` | Defines job state and artifact naming/path/hash helpers used throughout callback/finalization. | **Support / fully wired** | Controls artifact identity and job metadata, not transcript wording. |
| 15 | `supabase/functions/_shared/models.ts` | Supplies the configured AI model name to server-side enrichment. | **Support / fully wired** | No direct change. |

### Important canonicalization behavior

- `normalize.ts` prefers `punctuated_word` over Deepgram's unpunctuated `word`.
- Deepgram utterance boundaries are not guaranteed to survive: utterances are split on word-level speaker changes.
- Canonical word and utterance IDs are generated/resequenced.
- Multi-source timestamps are offset into one time line.
- The raw provider artifact remains stored separately, but the Workspace loads canonical database rows rather than rendering that artifact directly.

## B. Automatic post-completion enrichment

| Order | File | What it does | Runtime status | Persisted effect |
|---:|---|---|---|---|
| 16 | `src/lib/transcript/boundaryEngine.ts` | Uses deterministic application functions plus Claude-assisted detection for the formal opening, off-record sections, and post-record content. Produces exclusion flags and synthetic parenthetical definitions. | **Automatic / fully wired** when `ANTHROPIC_API_KEY` exists; otherwise explicitly skipped | Its results are persisted by `transcriptFinalize.ts`. |
| 17 | `supabase/functions/_shared/transcriptFinalize.ts` (`runBoundaryEngine`) | Loads persisted utterances, calls `boundaryEngine`, upserts `excluded_from_output` and `exclusion_reason`, deletes/recreates boundary-generated synthetic rows, and inserts synthetic words/utterances. | **Automatic / fully wired**, best effort | **Yes:** hides source material from later Workspace rendering and adds synthetic content. |
| 18 | `supabase/functions/ai-review/index.ts` | Loads transcript/case rows, invokes AI suggestion generation, writes word suggestions, speaker resolutions, and proposed line types. It can write `working_text` when auto-apply is enabled. | **Automatic trigger after finalization; also user-rerunnable**; remote deployment unverified | **Yes:** suggestions and metadata always; `working_text` when `AI_REVIEW_AUTO_APPLY` enables it. |
| 19 | `src/lib/transcript/aiReview.ts` | Builds AI-review inputs, selects ambiguous words and speaker/structure issues, decides skip behavior, and creates the auto-apply update/audit plan. | **Conditional / fully wired** through `ai-review` | Can direct `working_text` replacement and accepted suggestion status. |
| 20 | `src/lib/transcript/aiSuggestionEngine.ts` | Builds the Anthropic prompt, calls the model, parses suggestions, clamps confidence, and marks word suggestions above `0.92` as auto-apply candidates. | **Conditional / fully wired** through `ai-review` | Returns suggestions; persistence is performed by `ai-review/index.ts`. |

### Timing detail

`transcriptFinalize.ts` updates the transcription job to `complete` **before** boundary enrichment. It then awaits boundary processing inside a best-effort `try` block and fires AI review without awaiting its completion. Therefore:

- the Workspace can become eligible to open while the finalizer is still applying boundary updates;
- AI results can arrive after the Workspace has already loaded;
- enrichment is not a single strictly sequential, atomic stage;
- boundary/AI failures do not revert the transcript from `complete` to failed.

## C. Workspace loading and mapping

These files do not independently decide corrections, but they determine which persisted layer reaches the editor and are essential parts of every modification path.

| Order | File | Role | Runtime status | Important behavior |
|---:|---|---|---|---|
| 21 | `src/components/DepoEditor.tsx` | Selects a completed transcript, mounts `DocumentProvider`, and mounts the editor. | **Support / fully wired** | Workspace chooser only shows transcript rows with `status === "completed"`. |
| 22 | `src/api/transcriptRepository.ts` | Reads transcript job/snapshot rows and performs direct Supabase repository operations for fallback modes. | **Support / fully wired** | Supplies persisted speakers, utterances, and words to `workspaceService`. |
| 23 | `src/api/workspaceService.ts` | Resolves transcript IDs, loads documents/audio, routes saves, performs concurrency checks, and contains a direct-Supabase fallback persistence path. | **Support / fully wired** | It does **not** call `workspacePresentation.ts` or `buildEditorContent.ts`; those claims in the supplied report are incorrect. |
| 24 | `src/api/client.ts` | Single frontend network module; routes document and mutation requests to `editor-api`. | **Support / fully wired** | No correction logic itself. |
| 25 | `supabase/functions/editor-api/index.ts` | Maps database rows into the frozen `EditorDocument` contract and implements document, working-text, review, speaker, and suggestion endpoints. | **Automatic for load; user action for writes / fully wired**; deployment unverified | The word mapper exposes current text from the persisted working/raw layers; mutation handlers write and audit operator decisions. |
| 26 | `src/context/DocumentContext.tsx` | Loads the document, holds the working copy, computes the correction report, records utterance edits, autosaves after two seconds, and exposes save/review/speaker actions. | **Automatic and user action / fully wired** | It does **not** persist transcript content to `localStorage`. Layer choices are session state. |

## D. Initial and optional Workspace presentation transformations

| Order | File | What it changes in the displayed transcript | Runtime status | Database effect |
|---:|---|---|---|---|
| 27 | `src/components/TranscriptEditor/TranscriptEditor.tsx` | Calls `buildEditorContent`, pushes the resulting JSON into TipTap, detects edited utterance text, and sends edits to `DocumentContext`. | **Automatic + user action / fully wired** | Display itself is local; detected edits are persisted by the save path. |
| 28 | `src/lib/buildEditorContent.ts` | Filters every utterance with `excluded_from_output === true`; selects inferred versus raw-label presentation; always runs CFE when display-turn segmentation is enabled; converts results to TipTap nodes and page breaks. | **Display-only / fully wired** | No direct DB write, but it determines the initial visible transcript. |
| 29 | `src/lib/format/cfe.ts` | Resegments mixed-speaker utterances, assigns Q/A/speaker-line roles from speaker roles, applies deterministic token and phrase corrections, changes date/number formatting, inserts stutter dashes and inline scopist flags, computes spacing, and paginates. | **Display-only / fully wired on the initial unconfirmed path** | No direct DB write. The operator edits the already-transformed TipTap text, so a later edit/save can persist text derived from this view. |
| 30 | `src/lib/transcript/correctionRegistry.ts` | Contains hard-coded deterministic token/phrase replacements and ambiguous-token rules used by CFE. Examples include case-number rewriting, names, medical terms, objection phrases, and slash-date formatting. | **Display-only / fully wired through CFE** | No direct DB write. This is one of the main sources of non-Deepgram wording in the initial Workspace. |
| 31 | `src/editor/pagination.ts` | Assigns page and line positions using estimated word counts and speaker roles. | **Display-only / fully wired through CFE and the legacy builder** | No DB write. |
| 32 | `src/lib/format/geometryProfile.ts` | Defines margins, tab stops, line spacing, and page geometry used by CFE/TipTap. | **Display-only / fully wired** | No DB write. |
| 33 | `src/lib/format/abbreviationRegistry.ts` | Loads canonical abbreviation and spacing rules for CFE and workspace presentation. | **Display-only / fully wired** | No DB write. |
| 34 | `Canonical Standards Folder/abbreviation_registry.json` | Data source for one-space abbreviations, punctuation spacing, and related formatting decisions. | **Display-only / fully wired through `abbreviationRegistry.ts`** | No DB write. |
| 35 | `src/lib/format/grouping.ts` | Exposes the display-turn-segmentation switch and segmentation helpers. | **Display-only / fully wired** | The current flag causes the CFE path to be used. |
| 36 | `src/lib/transcript/workspacePresentation.ts` | Resolves visible word layers, infers display speaker labels/roles from transcript text and case metadata, classifies Q/A/colloquy, calls CFE, creates presentation paragraphs, and inserts structural labels. | **Display-only / fully wired**; the full structural path is conditional on confirmation | Does not load the database itself and does not directly persist changes. |
| 37 | `src/lib/transcript/paragraphDisplayImprovements.ts` | Applies display-text cleanup and paragraph presentation improvements after paragraphs are created. | **Conditional display-only / fully wired through `workspacePresentation.ts`** | No DB write. |
| 38 | `src/lib/transcript/qaFixer.ts` | Splits embedded objections and short answers out of question paragraphs, rewrites objection-specific `Four/form` wording, and remerges compatible paragraphs. | **Conditional display-only / fully wired through `workspacePresentation.ts`** | No DB write. |
| 39 | `src/editor/stageS/colloquy.ts` | Formats colloquy labels and honorific spacing used in presentation. | **Conditional display-only / fully wired** | No DB write. |
| 40 | `src/lib/format/honorificHelper.ts` | Normalizes/removes honorific prefixes during speaker-label presentation. | **Conditional display-only / fully wired** | No DB write. |
| 41 | `src/components/StructureReviewBanner/StructureReviewBanner.tsx` | Lets the operator enable inferred Q/A/roles or retain raw speaker labels. | **User action / fully wired** | Changes React presentation state only. “Keep Raw Labels” still uses CFE and is therefore not a raw Deepgram view. |

### Initial display path as currently implemented

When `structureConfirmed` is false, `buildEditorContent.ts` does **not** bypass transformations. It:

1. removes excluded utterances;
2. calls `cfe(displayDoc, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry)`;
3. applies the correction registry's deterministic text replacements;
4. adds inline flags and spacing changes;
5. segments turns and computes legal transcript page/line geometry;
6. renders the result into TipTap.

This is the direct source-code reason the initial Workspace can differ substantially from a Deepgram Playground transcript.

## E. User-driven transcript mutation files

| File | User action | Wiring | Persisted change |
|---|---|---|---|
| `src/components/Toolbar/Toolbar.tsx` | Manual Save | **User action / fully wired** | Invokes `DocumentContext.saveNow`; permanent Save control. |
| `src/components/TranscriptEditor/TranscriptEditor.tsx` | Direct text editing | **User action / fully wired** | Diffs utterance text and queues working-text saves. |
| `src/context/DocumentContext.tsx` | Edit/autosave | **User action / fully wired** | Sends utterance `working_text` changes after two seconds or manual Save. |
| `src/components/SpeakerPanel/SpeakerPanel.tsx` | Rename/role-map speakers and confirm mappings | **User action / fully wired** | Updates speaker rows; can update utterance and word speaker IDs through `editor-api`. |
| `src/components/SpeakerPanel/SpeakerPanel.helpers.ts` | Speaker persistence helper | **User action / fully wired** | Routes speaker updates through `workspaceApi`. |
| `src/components/UtteranceContextMenu/UtteranceContextMenu.tsx` | Reassign one utterance to another speaker | **User action / fully wired** | Updates the utterance and its words; marks manual reassignment where supported. |
| `src/components/CorrectionsPanel/AISuggestionsSection.tsx` | Accept/reject/edit AI word suggestions | **User action / fully wired** | Accept can write `working_text`; reject changes suggestion status; actions are audited. |
| `src/components/AIReviewBanner/AIReviewBanner.tsx` | Force AI re-review | **User action / fully wired** | Clears/reset suggestion metadata and invokes AI review again. |
| `src/components/ConfidencePanel/ConfidencePanel.tsx` | Mark low-confidence words reviewed/unreviewed | **User action / fully wired** | Updates review state, not wording. |
| `src/components/SuggestionsPanel/SuggestionsPanel.tsx` | Resolve legacy suggestion records | **User action / fully wired if legacy suggestions exist** | Invokes the legacy suggestion-resolution RPC. |
| `src/api/workspaceService.ts` | All frontend mutation wrappers and fallback writes | **User action / fully wired** | Routes or directly performs working-text, review, speaker, and suggestion writes; appends audit rows in fallback mode. |
| `src/api/client.ts` | HTTP transport for editor mutations | **Support / fully wired** | Sends mutations to `editor-api`. |
| `supabase/functions/editor-api/index.ts` | Authoritative server mutation handlers | **User action / fully wired in source**; deployment unverified | Writes words, speakers, utterances, review state, suggestion state, and audit records. |
| `supabase/migrations/20260606113000_editor_api_working_rpc.sql` | Defines `editor_apply_working_changes` | **Schema support / fully wired** | Converts utterance-level editor text changes into persisted working-word/utterance changes and audit behavior defined by the RPC. |
| `supabase/migrations/20260606114500_editor_api_resolve_suggestion_rpc.sql` | Defines legacy `editor_resolve_suggestion` | **Schema support / conditionally wired** | Applies/rejects legacy suggestions. |
| `supabase/migrations/20260722020816_enforce_certification_lock.sql` | Prevents mutation of certified transcripts | **Schema support / fully wired if migration applied** | Blocks post-certification changes. |

## F. Retry and recovery files

These files can cause the canonicalization pipeline to run again, but do not introduce an alternate transformation algorithm.

| File | Role | Runtime status |
|---|---|---|
| `supabase/functions/transcribe-watchdog/index.ts` | Finds stale jobs, resubmits Deepgram work, or redispatches finalization. | **Conditional / fully wired in source**; actual schedule/deployment unverified. |
| `src/lib/transcript/watchdogPolicy.ts` | Pure decision policy for watchdog actions. | **Conditional / fully wired** through watchdog. |
| `supabase/migrations/20260724130000_transcription_watchdog.sql` | Attempts to install pg_cron/pg_net schedules when required Vault secrets exist; otherwise emits notices and expects an external scheduler. | **Deployment-time conditional**; the migration text does not prove the cron exists remotely. |
| `supabase/functions/recover-transcript/index.ts` | Operator endpoint that promotes an eligible job to `finalizing` and redispatches the stored responses without rerunning Deepgram. | **Manual / fully wired in source**; deployment unverified. |
| `src/lib/transcript/recoveryPolicy.ts` | Decides whether recovery should proceed, no-op, or refuse based on job status. | **Manual / fully wired** through recovery function. |

## G. Committed transcript-processing files that are not part of the current Workspace display path

These files are real and committed, but should not be described as modifying the transcript that initially appears in the Workspace unless another production caller is added.

| File/group | Actual current use | Workspace runtime status |
|---|---|---|
| `src/lib/transcript/correctionEngines.ts` | Deterministic correction-engine library; non-test production import is only a type import from `correctionValidator.ts`. | **Not wired to Workspace correction execution.** |
| `src/lib/transcript/correctionValidator.ts` | Validation types/functions used by formatting/geometry modules and tests. | **Not called by current Workspace render path.** |
| `src/lib/transcript/formattingEngine.ts` | Separate formatting composition over validation blocks. | **Not imported by a current runtime caller.** |
| `src/lib/transcript/structureEngine.ts` | AI/pure structure engine and dialogue block types. | **Not called by Workspace; only its types feed packaging.** |
| `src/lib/transcript/depositionRegionEngine.ts` | Classifies deposition regions for the export adapter. | **Export path, not initial Workspace.** |
| `src/lib/transcript/editorialEngine.ts` | Applies editorial rules to unified render models. | **Export/Stage-S validation path, not initial Workspace.** |
| `src/lib/transcript/entityRegistry.ts` | Builds entity registries. | **No current initial Workspace caller; unified-render input is currently nullable.** |
| `src/lib/transcript/geometryEngine.ts` | Produces structured geometry layouts. | **Export/Stage-S path, distinct from Workspace CFE pagination.** |
| `src/lib/transcript/structuredTranscript.ts` | Reads normalized persisted line types. | **Export path, not initial Workspace.** |
| `src/lib/transcript/structuredTranscriptPackage.ts` | Packages paragraphs/dialogue for structured export. | **Export/Stage-S path, not initial Workspace.** |
| `src/lib/transcript/transcriptParagraphs.ts` and `transcriptParagraphTypes.ts` | Build paragraph packages for export/unified rendering. | **Export path. Do not confuse with the different `buildTranscriptParagraphs` in `workspacePresentation.ts`.** |
| `src/lib/transcript/unifiedRendering.ts` | Produces shared Workspace/TXT-like render models and parity validation for export/Stage-S. | **Not used by the current TipTap Workspace.** |

## H. Errors and unsupported claims in the supplied report

The attached report should not be used as an authoritative production inventory. Verified issues include:

1. **Nonexistent filenames:** it lists `src/lib/transcript/boundaryDetection.ts` and `src/lib/transcript/aiReviewEngine.ts`; the actual files are `boundaryEngine.ts`, `aiReview.ts`, and the `supabase/functions/ai-review/index.ts` I/O entry point.
2. **Missing worker entry point:** it omits `transcript_finalize_service/main.ts`, the only production caller of `finalizeTranscriptJob`.
3. **Incorrect speaker-merge claim:** current multi-source merge namespaces speakers per source; it does not establish that Speaker 0 in every file is the same person.
4. **Incorrect AI claim:** AI output is not always suggestion-only. With `AI_REVIEW_AUTO_APPLY` enabled, high-confidence word suggestions write `working_text` and are marked accepted.
5. **Incorrect Workspace call graph:** `workspaceService.ts` does not call `workspacePresentation.ts`, and `DocumentContext.tsx` does not call `buildEditorContent.ts`. `TranscriptEditor.tsx` calls `buildEditorContent.ts`, which calls presentation/CFE helpers.
6. **Incorrect database-loading claim:** `workspacePresentation.ts` is a pure frontend transformation module; it does not load canonical rows.
7. **Incorrect local-storage claim:** `DocumentContext.tsx` does not persist transcript content or layer toggles to local storage.
8. **Incorrect reversibility claim:** current CFE transformations are derived/display-only, but excluded utterances and synthetic boundary rows are persisted, and accepted/auto-applied AI suggestions can alter `working_text`.
9. **Incorrect strict-sequencing claim:** the transcript is marked complete before best-effort boundary and fire-and-forget AI enrichment finish.
10. **Incorrect “no initial modifications” implication:** CFE deterministic corrections and filtering run before inferred structure is confirmed.
11. **Wrong table name:** canonical metadata is written to `transcripts`, not `transcriptions`.
12. **Function-name mismatch:** the repository contains `supabase/functions/transcribe-watchdog`, not `transcription-watchdog`.
13. **Unsupported deployment assertions:** PR numbers, Cloud Run revision identifiers, Vercel status, deployed Edge Function status, and five-minute scheduler operation are not established by the checked-out source alone.
14. **Unsupported constitutional-law assertion:** the attached conclusion claims every transformation is reversible and never overwrites recognized text until approval. `raw_text` is preserved, but other persisted/display layers are automatically changed, filtered, or synthesized before operator approval.

## I. Direct answers to the requested status questions

### Are the files committed?

Yes. All runtime files named in sections A-F are tracked by Git and present in `HEAD` at `d741424`. The worktree was clean during the audit.

### Are they totally wired into the application?

Not all in the same sense:

- Sections A-D are reachable from the normal source call graph, subject to stated conditions.
- Section E is wired but requires operator actions.
- Section F is wired in source but requires deployment/runtime configuration or manual invocation.
- Section G contains committed engines that are not part of the initial Workspace pipeline.
- Source inspection proves wiring, not remote deployment health. Confirming live status requires checking Supabase function deployments/logs, Cloud Tasks, Cloud Run, secrets, and the pg_cron job in the target project.

## J. Recommended diagnostic boundary

For a true Deepgram-baseline Workspace, the initial display path must bypass at least these automatic transformations:

- boundary exclusion filtering in `buildEditorContent.ts`;
- CFE corrections and flags in `cfe.ts`/`correctionRegistry.ts`;
- CFE turn segmentation and pagination;
- accepted/auto-applied AI `working_text` selection;
- synthetic boundary utterances;
- inferred speaker labels and Q/A paragraph transformations.

The baseline should read immutable `raw_text`, retain Deepgram speaker numbers and canonical order, and expose every later transformation as a separately selectable layer.

# Wave 22 Pre-Workspace Processing Audit — 2026-07-06

Branch context: `feature/stage3-workspace-core`

Mode: read-only architecture audit

Scope: current path from Deepgram callback ingestion to Stage 3 Workspace render in the Vite/React/Supabase application.

## A. Executive Summary

The current transcript pipeline is materially shallower than the product behavior now requires. The codebase already contains pieces of a pre-workspace engine, but they are split across four different phases with conflicting ownership:

1. Ingestion/finalize in `supabase/functions/transcribe-callback/index.ts`
2. Boundary cleanup after finalize in `boundaryEngine.ts`
3. Workspace-time correction and structuring in `workspacePresentation.ts`, `qaFixer.ts`, and `buildEditorContent.ts`
4. Review-only detection and AI suggestion generation in `correctionOrchestrator.ts`, `correctionEngines.ts`, `aiReview.ts`, and `aiSuggestionEngine.ts`

The result is predictable:

- Canonical transcript rows are created too early.
- Structural reconstruction happens too late, during render.
- Metadata-aware corrections are fragmented between deterministic registries, AI review, and human review flags.
- The workspace is being used both as a transcript editor and as a transcript preparation engine.

The core architectural issue is not “AI quality.” It is phase placement. The system currently finalizes a transcript before it has:

- fully validated canonical integrity
- reconstructed boundaries and proceeding structure
- resolved metadata-backed names and role labels
- reduced obvious legal/medical/domain noise
- separated deterministic correction from human review

The recommended fix is a new pre-workspace processing subsystem that sits between immutable canonical ingestion and workspace rendering. That subsystem should own transcript cleanup, structure, metadata-backed normalization, deterministic lexical repair, punctuation normalization, contextual AI review, and validation. The workspace should render the resulting working transcript and expose only high-value review surfaces.

The most important audit conclusion is this: every correction class needs one canonical owner. Today several classes have no owner, and several others have two or three.

## B. Actual Current Pipeline

### B1. Real Current Pipeline

The actual code path today is:

1. `Deepgram callback payload`
2. `integrityAudit(parsed.response)`
3. `normalizeTranscriptResponse(response)`
4. `mergeSourceTranscriptSegments(sourceSegments)` for multi-source or virtual-chunk jobs
5. `ingestTranscript(...)` persists `transcripts`, `transcript_speakers`, `transcript_utterances`, `transcript_words`
6. `runBoundaryEngine(...)` mutates `transcript_utterances` and may insert synthetic boundary utterances/words
7. `triggerAiReview(transcriptId)` starts post-finalize AI suggestion generation
8. `loadTranscriptSnapshot(...)` loads persisted rows into an `EditorDocument`
9. `buildEditorDocumentFromSnapshot(...)` maps persisted words into workspace-visible words
10. `buildCorrectionReport(...)` computes review defects and flags in `DocumentContext`
11. `buildEditorContent(...)` and `buildTranscriptParagraphs(...)` perform structure/presentation inference during render
12. Operator edits are saved back through the editor API

### B2. Stage Map With File Ownership

| Stage | Module | Input | Output | Mutable | Unit | Deterministic / AI |
|---|---|---|---|---|---|---|
| Integrity audit | `src/lib/transcript/integrityAudit.ts` via callback | raw Deepgram JSON | audit pass/fail + metrics | no | transcript | deterministic |
| Normalization | `src/lib/transcript/normalize.ts` | Deepgram words/utterances | canonical speakers/utterances/words arrays | no | word + utterance | deterministic |
| Multi-source merge | `src/lib/transcript/multifileMerge.ts` | normalized segment arrays | merged normalized transcript | no | word + utterance | deterministic |
| Auto-chunk source planning | `src/lib/transcript/autoChunking.ts` | duration + source metadata | chunk manifest | no | source/chunk | deterministic |
| Canonical persistence | `supabase/functions/transcribe-callback/index.ts` `ingestTranscript(...)` | normalized merged transcript | DB rows | yes | transcript + word + utterance | deterministic |
| Boundary cleanup | `src/lib/transcript/boundaryEngine.ts` called from callback | persisted utterance rows | excluded rows + synthetic boundary rows | yes | utterance | AI-assisted |
| AI review prep | `src/lib/transcript/aiReview.ts` | persisted utterances/words/speakers | suggestion input + persisted AI suggestion plan | yes | word + utterance + speaker | mixed |
| Workspace load | `src/api/workspaceService.ts` | persisted snapshot | `EditorDocument` | no | word + utterance | deterministic |
| Review detection | `src/lib/transcript/correctionOrchestrator.ts` | `EditorDocument` | defect report | no | word + speaker | deterministic |
| Deterministic correction helpers | `src/lib/transcript/correctionEngines.ts` | workspace blocks | corrected blocks + flags | no by default | block + word | deterministic plus optional AI |
| Render-time structuring | `src/lib/transcript/workspacePresentation.ts`, `src/lib/transcript/qaFixer.ts`, `src/lib/buildEditorContent.ts` | `EditorDocument` | paragraphs + TipTap JSON | no | paragraph + formatted line | deterministic heuristics |
| Export rendering | `src/lib/transcriptDownloads.ts`, Stage S formatting stack | `EditorDocument` | TXT/Word/JSON export | no | formatted line/page | deterministic |

### B3. Key Architectural Observations

1. Canonical persistence currently happens before metadata-aware cleanup.
2. Boundary cleanup is the only post-persist transcript rewrite stage in the callback path.
3. Speaker-role inference, Q/A inference, by-line generation, colloquy normalization, and QA repair are currently render-time behaviors, not canonical working-transcript behaviors.
4. Review flags are calculated after workspace load, not before workspace entry.
5. AI review operates as a post-finalize suggestion layer, not as the final pass of a pre-workspace processing engine.

### B4. Immutable vs Mutable Layers Today

- Immutable by rule:
  - Deepgram response artifact
  - `transcript_words.raw_text`
- Mutable today:
  - `transcript_words.working_text`
  - `transcript_words.text`
  - `transcript_utterances.text`
  - `transcript_utterances.excluded_from_output`
  - synthetic boundary utterances/words
  - AI suggestion columns
  - speaker display/role assignments

### B5. Where the Workspace Really Renders From

The workspace renders from words, not from `transcript_utterances.text`.

Relevant path:

- `loadTranscriptSnapshot(...)`
- `buildEditorDocumentFromSnapshot(...)` in `workspaceService.ts`
- `buildEditorContent(...)`
- `buildTranscriptParagraphs(...)`

This matters because structural and duplication defects seen in the workspace are either:

- already present in persisted word rows
- introduced by render-time paragraph assembly
- or caused by edit/save corruption in the working layer

They are not explained by `utterance.text` alone.

## C. Defect-by-Defect Root Cause Table

| Defect class | Confirmed? | Current entry point | Why it survives to workspace | Correct owner | Repair type |
|---|---|---|---|---|---|
| Reporter opening duplicated | yes | either canonical mismatch in finalize/save layer or overlap miss in chunk merge; confirmed canonical inconsistency exists for `tr_1783355404197_y71d97` | no pre-workspace integrity gate enforces `utterance.text == join(words)`; chunk dedup is exact-text only; workspace then renders from surviving words or corrupted saves | Transcript Integrity Audit for mismatch prevention; Boundary Engine for overlap/opening dedup ownership | deterministic |
| Opening / appearance structure not reconstructed | yes | transcript enters workspace as plain speaker turns from normalize/merge | structure is inferred only during render in `workspacePresentation.ts` and `qaFixer.ts`, not written as a stable working transcript phase | Structural Reconstruction Engine | deterministic + metadata-driven |
| Speaker names and witness/case metadata not normalized before workspace | yes | normalize assigns `Speaker N`; no metadata reconciliation occurs before workspace | `buildDisplayDocument(...)` tries to infer labels late from `CaseRecord`; AI review flags generic speakers after load rather than resolving them before load | Speaker Resolution Engine and Metadata Engine | metadata-driven |
| Legal-common words flagged unnecessarily | yes | `generateScopistFlags(...)` flags title-case/proper-noun-like tokens without a mature legal dictionary | no pre-workspace lexical registry suppresses obvious legal vocabulary; review layer sees too much raw noise | Legal Dictionary Engine | deterministic dictionary |
| Attorney appearance blocks not assembled | yes | canonical utterances remain diarized speech turns | no pre-workspace appearance reconstruction phase converts openings into appearance blocks; render heuristics only partially repair this | Structural Reconstruction Engine | deterministic + metadata-driven |
| Workspace shows too many low-value review flags | yes | `buildCorrectionReport(...)` and AI review operate on underprocessed transcript | deterministic cleanup and metadata normalization have not happened first, so review surfaces absorb cleanup duties | Validation Engine | deterministic gating |
| Context-sensitive company/name corrections miss metadata context | yes | AI and deterministic passes do not have a consolidated entity registry from case metadata | metadata context is not built into a single pre-workspace entity-resolution pass; some heuristics exist, but late and incomplete | Case Dictionary / Registry Engine | metadata-driven + contextual AI fallback |
| Formatting happens before transcript cleanup is complete | yes | `buildEditorContent(...)` and `workspacePresentation.ts` perform structure and display inference at render time | render layer is compensating for missing processing phases, so presentation masks and mixes transcript cleanup concerns | Stage S Rendering should only consume processed working transcript | rendering-only after upstream cleanup |

### C1. Reporter Opening Duplicated

Evidence:

- `docs/audits/DUP_OPENING_AUDIT_2026-07-06.md` confirms a canonical inconsistency in `transcript_utterances.text` for `utt_000000`.
- `multifileMerge.ts` overlap dedup requires case-insensitive exact text plus `0.35s` timing tolerance, which is too strict for wording drift across chunk overlap windows.
- the workspace renders from words, so visible duplication must be either word-layer persistence or render-time assembly, not merely bad utterance text.

Root cause:

- no integrity gate validates canonical row coherence after ingest
- overlap-dedup ownership is too narrow and text-exact
- no opening-specific structural pass normalizes the videographer opening before workspace

### C2. Opening / Appearance Structure Not Reconstructed

Evidence:

- `normalize.ts` emits speaker turns only
- `workspacePresentation.ts` tries to infer reporter/videographer/witness/attorney roles by text patterns and case record
- `qaFixer.ts` repairs paragraph shapes after render-time segmentation

Root cause:

- structure inference exists, but only as a display-time heuristic
- there is no durable pre-workspace representation of openings, by-lines, Q/A, appearance blocks, or parentheticals

### C3. Speaker Names And Metadata Not Normalized Before Workspace

Evidence:

- `normalize.ts` emits `Speaker ${speakerIndex}`
- `buildDisplayDocument(...)` in `workspacePresentation.ts` tries to map generic labels to witness/attorney/reporter roles from aggregate text patterns and case record data
- `buildSpeakerIssues(...)` in `aiReview.ts` flags generic labels after load rather than resolving them before load

Root cause:

- speaker resolution is in the wrong phase
- metadata exists but is not used as a first-class pre-workspace entity resolution pass

### C4. Legal-Common Words Flagged Too Early

Evidence:

- `generateScopistFlags(...)` in `correctionEngines.ts` flags many capitalized words unless covered by keyterms or confirmed spellings
- no dedicated legal lexicon is consulted before this flagging pass

Root cause:

- review flagging is acting as a substitute for a legal dictionary engine
- current registry coverage is too narrow and too late

### C5. Attorney Appearance Blocks Not Assembled

Evidence:

- current canonical rows preserve utterance timing, not proceeding semantics
- render-time `buildTranscriptParagraphs(...)` creates Q/A/colloquy/by-line output only in the workspace

Root cause:

- there is no pre-workspace appearance/opening assembler
- the system treats opening statements as generic utterances until render

### C6. Workspace Shows Too Many Low-Value Review Flags

Evidence:

- `buildCorrectionReport(...)` raises deterministic, ambiguous, low-confidence, speaker, and money issues after document load
- `buildAmbiguousFlags(...)` in `aiReview.ts` forwards low-confidence and flagged words into AI suggestion generation

Root cause:

- review systems are consuming transcript cleanup debt
- deterministic issues are not being resolved or suppressed upstream

### C7. Context-Sensitive Entity Corrections Do Not Use Enough Metadata

Evidence:

- `applyConfirmedSpellings(...)` and metadata correction helpers exist but are not part of a single required pre-workspace phase
- `buildSuggestionCaseRecord(...)` passes only a thin slice of metadata into AI suggestions
- no consolidated entity registry exists for witness names, attorney names, firms, companies, medical providers, exhibit names, or repeated case-specific terms

Root cause:

- metadata is under-modeled as a transcript-correction input
- entity resolution is fragmented between deterministic maps and AI fallback

### C8. Formatting Happens Too Early

Evidence:

- `buildEditorContent(...)` combines structuring, line role derivation, pagination geometry, display word resolution, and paragraph composition
- `workspacePresentation.ts` infers legal transcript structure at render time

Root cause:

- Stage S rendering currently owns upstream transcript preparation responsibilities
- render-time heuristics are compensating for missing pre-workspace phases

## D. Recommended Engine Ownership Matrix

| Correction type | Primary owner | Secondary consumers | Why |
|---|---|---|---|
| Canonical row coherence (`utterance.text`, word joins, ordinal integrity) | Transcript Integrity Audit | Validation Engine | This must fail or quarantine before workspace |
| Virtual-chunk overlap dedup | Boundary Detection Engine | Integrity Audit | It is transcript assembly, not render |
| Formal opening dedup and segmentation | Boundary Detection Engine | Structural Reconstruction Engine | Opening boundaries determine what downstream structure sees |
| Reporter/videographer/witness/attorney role mapping | Speaker Resolution Engine | Structural Reconstruction Engine | Structure depends on speaker roles being resolved first |
| Witness, attorney, firm, company, and case-style entity normalization | Metadata Engine | Case Dictionary / Registry Engine | Metadata must be authoritative before AI |
| Legal-common lexical suppression | Legal Dictionary Engine | Validation Engine | This reduces useless flags before review |
| Medical terminology normalization | Medical Dictionary Engine | AI Context Engine | Deterministic domain dictionary should run before AI |
| Confirmed spelling propagation | Case Dictionary / Registry Engine | Validation Engine | Once confirmed, it becomes deterministic |
| Attorney appearance / opening / by-line reconstruction | Structural Reconstruction Engine | Stage S Rendering | This is transcript structure, not display chrome |
| Oath-response and common garble rules | Deterministic Correction Engine | Validation Engine | These are rule-based replacements with clear evidence |
| Canonical punctuation normalization | Canonical Punctuation Engine | Stage S Rendering | Transcript text should be punctuated before display/export |
| Contextual unresolved token review | AI Context Engine | Validation Engine | AI should only handle the remainder after deterministic passes |
| Low-value review suppression and scoring | Validation Engine | Workspace-only review tooling | Workspace should receive curated review items |
| Page layout, tabs, and output formatting | Stage S Rendering | Export | Rendering should consume processed transcript, not fix it |

### D1. Explicit Owner Decisions

1. Speaker resolution belongs to `Speaker Resolution Engine`, not to `workspacePresentation.ts`.
2. Opening reconstruction belongs to `Structural Reconstruction Engine`, not to `qaFixer.ts`.
3. Legal-common term suppression belongs to `Legal Dictionary Engine`, not to `generateScopistFlags(...)`.
4. Entity-aware corrections belong to `Metadata Engine` and `Case Dictionary / Registry Engine`, with AI only as fallback.
5. Formatting belongs last, in `Stage S Rendering`.

## E. Proposed Pre-Workspace Processing Architecture

### E1. Target Architecture

Recommended pipeline:

1. Deepgram JSON
2. Canonical Transcript Ingest
3. Phase 0 Transcript Integrity Audit
4. Phase 1 Boundary Detection
5. Phase 2 Speaker Resolution
6. Phase 3 Structural Reconstruction
7. Phase 4 Deterministic Corrections
8. Phase 5 Canonical Punctuation Engine
9. Phase 6 AI Context Engine
10. Phase 7 Correction Validation
11. Phase 8 Stage S Rendering
12. Workspace

### E2. Phase Definitions

#### Phase 0 — Transcript Integrity Audit

Input:

- normalized or merged canonical transcript candidate

Responsibilities:

- validate word/utterance ordering
- validate utterance text equals joined words for any derived text fields
- validate no orphan words or utterances
- validate chunk-merge overlap outcomes
- quarantine transcripts that fail invariants

Output:

- canonical transcript accepted or routed to manual review

#### Phase 1 — Boundary Detection

Input:

- canonical accepted transcript

Responsibilities:

- detect pre-record, off-record, post-record boundaries
- detect formal opening spans
- detect duplicated overlap spans in opening-like regions
- insert synthetic parentheticals where required

Output:

- boundary-annotated working transcript

#### Phase 2 — Speaker Resolution

Input:

- boundary-cleaned transcript + case metadata

Responsibilities:

- resolve generic `Speaker N` labels to roles
- map likely witness/attorney/reporter/videographer identities
- mark unresolved speakers explicitly for review

Output:

- role-resolved transcript with speaker confidence metadata

#### Phase 3 — Structural Reconstruction

Input:

- role-resolved transcript

Responsibilities:

- build appearance blocks
- reconstruct opening/proceedings/examination/by-line structure
- segment Q/A/colloquy/parenthetical units
- persist stable working block types rather than inferring them on every render

Output:

- structured working transcript

#### Phase 4 — Deterministic Corrections

Input:

- structured working transcript + metadata + registries

Responsibilities:

- apply metadata-backed entity normalization
- apply legal and medical dictionaries
- apply confirmed spelling propagation
- apply deterministic garble maps
- suppress obvious non-issues before review

Output:

- deterministically corrected working transcript + correction log

#### Phase 5 — Canonical Punctuation Engine

Input:

- deterministically corrected transcript

Responsibilities:

- normalize punctuation and honorific spacing
- preserve verbatim-protected testimony tokens
- standardize transcript-printing forms where rules are deterministic

Output:

- punctuated working transcript

#### Phase 6 — AI Context Engine

Input:

- punctuated transcript + unresolved defects + metadata entity registry

Responsibilities:

- resolve only residual context-sensitive issues
- suggest speaker and structure fixes only when prior deterministic phases could not
- never own metadata-backed corrections already solvable upstream

Output:

- AI suggestions and optional auto-applies for high-confidence residuals

#### Phase 7 — Correction Validation

Input:

- final working transcript candidate + correction log + unresolved issues

Responsibilities:

- score remaining review items
- suppress low-value flags
- reject transcripts with unresolved high-risk integrity issues
- compute curated workspace review queues

Output:

- workspace-ready transcript package

#### Phase 8 — Stage S Rendering

Input:

- validated workspace-ready transcript package

Responsibilities:

- formatting, pagination, tabs, line roles, export views
- no transcript cleanup or meaning-changing inference

Output:

- renderable workspace/export document

### E3. Reuse of Existing Modules

Reuse candidates:

- `integrityAudit.ts` as Phase 0 seed
- `boundaryEngine.ts` as Phase 1 seed
- role heuristics from `workspacePresentation.ts` as Phase 2 seed
- paragraph/line grouping from `workspacePresentation.ts` and `buildEditorContent.ts` as Phase 3 seed, but moved earlier
- deterministic registries in `correctionRegistry.ts` and `correctionEngines.ts` as Phase 4 seed
- `normalizeHonorificSpacing`, colloquy helpers, and abbreviation registry as Phase 5 seed
- `aiReview.ts` and `aiSuggestionEngine.ts` as Phase 6 seed
- `buildCorrectionReport(...)` and current review metrics as Phase 7 seed
- Stage S/CFE/pagination stack as Phase 8

### E4. Responsibilities That Must Move Earlier

- generic speaker resolution
- Q/A and by-line inference
- appearance/opening assembly
- obvious metadata-based name corrections
- legal-common lexical suppression
- deterministic phrase and terminology corrections

These should not remain workspace-time behaviors.

## F. Workspace Role Redefinition

### F1. What the Workspace Should Receive

The workspace should load:

- immutable canonical raw words
- a processed working transcript layer derived from those words
- resolved speaker roles and best-known display names
- reconstructed proceeding structure
- deterministic lexical corrections already applied
- curated unresolved AI suggestions and high-value human review flags only

### F2. What Should Stay In Workspace

- human proofreading
- acceptance/rejection of residual suggestions
- speaker corrections when still unresolved
- manual structure overrides in rare edge cases
- audio-synced review
- export preview

### F3. What Should Leave Workspace

- first-pass speaker identity inference
- first-pass Q/A reconstruction
- formal opening reconstruction
- legal-common word suppression
- routine metadata entity correction
- deterministic garble repair
- punctuation cleanup that can be done without human judgment

### F4. Why This Matters

As long as the workspace is the first place where transcript structure becomes legible, every later feature will keep compensating for upstream debt:

- audio review will seem noisy
- flags will seem excessive
- exports will depend on render heuristics
- edits will feel unstable because meaning and formatting are intertwined

## G. Prioritized Implementation Roadmap

### Phase A — Foundational Integrity

Goal:

- establish canonical invariants before any higher-level cleanup

Scope:

- harden `integrityAudit.ts`
- add post-merge row-coherence checks
- reject or quarantine transcripts with `utterance.text` / word mismatch
- expand overlap-dedup diagnostics for virtual chunks

Principal modules:

- `src/lib/transcript/integrityAudit.ts`
- `src/lib/transcript/multifileMerge.ts`
- `supabase/functions/transcribe-callback/index.ts`

Data risk:

- medium, because this gates persistence/finalization

User-facing outcome:

- duplicate/corrupt openings stop entering the workspace silently

Tests to add first:

- chunk-overlap wording-drift seed from the Etminan opening
- invariant test that persisted utterance text equals joined canonical words where derived
- single-source and multi-chunk finalize-path regression tests

### Phase B — Deterministic Pre-Processing

Goal:

- move structure and obvious corrections out of workspace render

Scope:

- add pre-workspace speaker resolution pass
- add appearance/opening/QA structural reconstruction pass
- move deterministic registries into callback-side working transcript preparation

Principal modules:

- new pre-workspace orchestrator module under `src/lib/transcript/`
- `boundaryEngine.ts`
- extracted heuristics from `workspacePresentation.ts`
- `correctionEngines.ts`

Data risk:

- medium to high if persisted as working-layer rows; low if staged separately first

User-facing outcome:

- transcript opens in the workspace already shaped like a deposition, not raw diarized speech

Tests to add first:

- videographer opening reconstruction
- attorney appearance block assembly
- by-line insertion and Q/A segmentation fixtures

### Phase C — Metadata / Context Enrichment

Goal:

- make metadata authoritative for names, parties, firms, and repeated terms

Scope:

- build entity registry from `CaseRecord`
- add confirmed spelling propagation pipeline-wide
- add legal and medical dictionary passes before AI
- enrich AI suggestion input with full entity registry, not the thin current case record subset

Principal modules:

- `correctionEngines.ts`
- `aiReview.ts`
- `aiSuggestionEngine.ts`
- new registry builder module

Data risk:

- medium; errors here can over-normalize names if not gated

User-facing outcome:

- obvious case names, firms, witness names, and repeated domain terms stop surfacing as noise

Tests to add first:

- witness name normalization from metadata
- company/entity correction using case metadata
- legal-common term suppression regression set

### Phase D — Validation And Review Signal Reduction

Goal:

- reduce noisy review surfaces and reserve the workspace for real human judgment

Scope:

- replace broad proper-noun heuristics with scored review queues
- separate deterministic fixes from unresolved review items
- classify residual defects by severity and confidence

Principal modules:

- `correctionOrchestrator.ts`
- `correctionEngines.ts`
- `aiReview.ts`

Data risk:

- low to medium; mainly affects review visibility

User-facing outcome:

- fewer low-value flags, more meaningful queues

Tests to add first:

- legal-common words no longer flagged
- low-confidence words suppressed when resolved upstream
- unresolved-only review queue generation

### Phase E — Stage S / Render Alignment

Goal:

- make render a pure consumer of processed transcript state

Scope:

- remove transcript-cleanup logic from render path
- keep `buildEditorContent(...)` focused on display composition and geometry
- narrow `qaFixer.ts` to presentation-only cleanup or retire its transcript-semantic responsibilities

Principal modules:

- `workspacePresentation.ts`
- `buildEditorContent.ts`
- `qaFixer.ts`
- Stage S formatting stack

Data risk:

- low if upstream phases are complete

User-facing outcome:

- stable rendering across workspace and export, with less hidden inference

Tests to add first:

- same processed transcript yields stable workspace paragraphs and export lines
- no semantic differences between workspace and export reconstruction

## H. Risks, Data Boundaries, and Deferred Decisions

### H1. Sacred Data Boundaries

Must remain protected:

- `transcript_words.raw_text` is immutable
- canonical ingest should remain traceable to Deepgram artifacts
- historical cleanup of already-finalized transcripts is a separate decision from forward-path prevention

### H2. High-Risk Areas

1. Writing semantic cleanup directly into canonical rows without an explicit working layer model
2. Bundling historical backfill with forward-path pipeline changes
3. Letting AI rewrite material already solvable through metadata or deterministic registries
4. Preserving render-time heuristics while also adding pre-workspace processing, which would create dual ownership

### H3. Deferred Decisions

These should be explicit follow-on decisions, not folded into Wave 22 by accident:

- whether to backfill existing finalized transcripts that already contain canonical inconsistencies
- whether to persist structured working blocks in new tables/columns or derive them into an intermediate artifact
- whether boundary AI remains model-backed or gains deterministic prefilters before AI invocation
- whether AI auto-apply remains enabled for any class beyond tightly-scoped residual corrections

### H4. Non-Goals For Wave 22

- redesigning the TipTap editor
- replacing Stage S geometry/pagination
- changing frozen API contract types in `src/api/types.ts`
- broad export redesign
- real-time collaboration

### H5. Final Recommendation

Do not continue shipping point fixes as if these are isolated transcript bugs. The codebase is already signaling the correct architecture:

- immutable canonical ingest
- explicit pre-workspace processing
- render last

Wave 22 should formalize that architecture and move transcript cleanup out of the workspace path. The first implementation prompt after this audit should start with Phase A integrity work, because every later improvement depends on reliable canonical and working-layer boundaries.

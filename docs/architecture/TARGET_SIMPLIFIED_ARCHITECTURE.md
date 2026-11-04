# Depo-Pro Target Simplified Architecture

---
authority_tier: T2
status: DRAFT
owner: Architecture
scope: target-simplified-system-architecture
supersedes: null
superseded_by: null
approved_by: null
version: 0.1.0
effective_date: null
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: NONE
implementation_status: PARTIAL
---

This Phase F draft translates the controlling product workflow into the minimum surviving architecture. It does not supersede `docs/architecture/MASTER_ARCHITECTURE.md` and cannot become authoritative without the required T2 ratification.

## Architectural sentence

Depo-Pro takes canonical case data and audio, transcribes the deposition once, preserves immutable provider evidence, creates one Working Transcript through controlled proposals and human decisions, combines the reviewed transcript with exhibits and UFM finalization, records human certification history, and renders one current Certified Transcript through pure output adapters.

## Stage boundaries

| Stage | Owner | Canonical representation | Allowed inputs | Allowed outputs | Prohibited behavior |
|---|---|---|---|---|---|
| Canonical case data | Intake | Source-owned `CaseRecord` fields plus provenance | Notice, notes, reporter input, directory/profile data | Canonical fields, conflicts, confidence, keyterms | Downstream builders renormalizing persisted truth |
| Audio | Intake/transcription | Case audio record plus immutable storage object | User-selected media | Provider-ready media reference and checksum | Implicit retranscription or silent source replacement |
| Deepgram transcription | Transcription | Provider response and normalized canonical rows | Audio and canonical provider keyterms | Raw evidence, speakers, utterances, words, job evidence | Routine chunk/merge routing or repeated billing after success |
| Immutable raw evidence | Transcript | Stable speaker/utterance/word IDs, `raw_text`, time, confidence, provider artifacts | One successful provider result | Read-only evidence for hydration, audit, and proposals | AI, Workspace, UFM, or export mutation |
| Controlled AI processing | Transcript Intelligence | Versioned `CorrectionObject` proposals grouped in idempotent runs | Complete evidence, canonical case context, approved terminology | Validated proposals and uncertainty | Whole-transcript authority, hidden auto-application, direct certification |
| Working Transcript | Transcript | Persisted editable `text`, reviewed structure/roles, decision/audit state | Raw evidence plus accepted deterministic, AI, and human corrections | One reopenable editable transcript | Visible version proliferation or mutation of raw evidence |
| Workspace | Workspace | Temporary component state backed by Working Transcript persistence | Working Transcript, audio, proposals, exhibits | Human edits, decisions, speaker/structure corrections, audit events | Competing persistence, render-time correction, hidden transcript copies |
| Exhibits | Exhibits | Canonical exhibit records, files, and transcript links | Human-managed exhibit evidence | Stable finalization interface | Reinterpreting transcript or case truth |
| UFM/finalization | Finalization | Finalized transcript data model | Reviewed Working Transcript, canonical case data, exhibits | Deterministic insertions, validation result, certification candidate | Substantive transcript correction or independent canonicalization |
| Certification | Certification | Immutable certification/reissue records and current pointer | Human-approved finalization candidate | Current Certified Transcript reference and preserved history | AI certification or deletion of prior certification evidence |
| Rendering/export | Rendering/Export | One finalized-data contract | Current certified model | DOCX, PDF, TXT, JSON/package adapters | Transcript mutation or format-specific reinterpretation of content |

## Current architecture

The repository contains the required product capabilities, but their responsibilities are distributed across overlapping implementations:

- canonical case policies coexist with parser-, UI-, UFM-, and exporter-local formatting;
- raw evidence and editable overlays are generally separated, but Workspace presentation still contains automatic transforms;
- speaker identity and role exist across incompatible table/column assumptions;
- Q/A, objection, colloquy, punctuation, and paragraph decisions occur in multiple TS and Python engines;
- legacy AI review, a TS bridge, suggestion engines, Python TIE/provider adapters, and quarantined AI code overlap;
- transcript jobs/retranscription history can surface as user-visible versions;
- Stage S, UFM, spec-engine, unified rendering, formatter services, and exporters overlap in final presentation;
- recovery architecture remains physically present although normal auto-chunk routing is disabled.

## Target architecture

### 1. Canonical Intake boundary

`FieldRegistry` and canonical policies own persisted case normalization. Parsers write only source-owned fields. Confidence, provenance, confirmation, and conflict state remain distinct from canonical formatting. Keyterm/provider adapters and UFM consume canonical values.

### 2. Transcribe-once evidence boundary

The normal route performs one Deepgram transcription. Provider artifacts and canonical word/utterance/speaker evidence are immutable. Large collections are read completely through pagination. Chunk/merge and retranscription survive only behind explicit exceptional-recovery operations.

### 3. Proposal-only intelligence boundary

All AI and contextual deterministic engines produce validated CorrectionObjects or explicit uncertainty. Provider invocation lives behind `transcript_formatter/providers`. A correction run is atomic and idempotent. Failure leaves the Working Transcript unchanged. Legacy paths remain characterization/fallback until consumers migrate and deletion gates pass.

### 4. One Working Transcript boundary

Persisted transcript rows are the editable authority. `raw_text` and provider evidence do not change. Workspace state is a temporary buffer, not another version. Manual Save and autosave share one persistence transaction. Accepted human decisions override automation and survive reopen.

### 5. Reviewed structure boundary

Speaker identity/role and line structure become explicit persisted reviewed state. Inference produces proposals. Rendering consumes approved structure and does not reclassify dialogue. Unknown roles or boundaries remain visible uncertainty.

### 6. One finalization model

Working Transcript, canonical case data, and exhibits enter a pure finalization boundary. UFM composes required sections and validates readiness. Stage S observes/validates; it does not silently repair substantive content. The result is one immutable certification candidate.

### 7. Certification and reissue

A reporter certifies explicitly. A later correction reopens the same Working Transcript, creates a new reviewed candidate, and records a reissue/supersession relationship. The UI presents one current Certified Transcript while retaining prior certification evidence internally.

### 8. Pure rendering adapters

One finalized-data contract supplies all output formats. Geometry and pagination have one documented authority. DOCX, PDF, TXT, and package adapters perform format mechanics only and cannot change canonical text, roles, case data, or certification state.

## Public boundaries

| Boundary | Public operations |
|---|---|
| Intake | load/save canonical case; report conflicts/provenance; build provider keyterms |
| Transcript evidence | ingest once; load complete evidence; audit invariants |
| Intelligence | start idempotent run; list proposals; accept/reject/edit proposal |
| Working Transcript | load; save atomic changes; assign speaker/role; set reviewed line type; append audit event |
| Exhibits | load/save exhibit records and links |
| Finalization | build/validate immutable candidate from explicit inputs |
| Certification | certify; reopen for correction; reissue; resolve current certified record |
| Rendering | render certified model to supported formats without mutation |

## Dependency rules

- Intake may not depend on transcript rendering or certification.
- Provider integrations may depend on canonical context contracts, not UI state.
- Raw evidence may not depend on Working Transcript, AI, Workspace, or rendering.
- AI may read evidence and context and write proposals only.
- Workspace may read proposals and write Working Transcript decisions, never raw evidence.
- UFM/finalization may consume canonical inputs but may not call AI or Intake parsers.
- Certification may consume finalization output but may not infer content.
- Rendering may consume a certified/finalized model but may not call persistence mutation APIs.
- Recovery may invoke ingestion only through an explicit exceptional operation and may not alter successful evidence silently.

## Elimination map

| Candidate | Why it should disappear from the target | Prerequisite |
|---|---|---|
| Automatic correction-registry substitution during render | Creates a hidden text authority | Existing C1/C1b behavior retained; remove remaining consumers after characterization |
| Parallel paragraph/Q&A reconstructors | Produce different structure from the same evidence | Shared reviewed line-type contract and parity fixtures |
| Legacy AI direct suggestion/application paths | Duplicate TIE and lack atomic, complete input handling | CorrectionObject pipeline, Workspace review integration, production-shaped tests |
| Case-specific AI reporter defaults | Benchmark/case data embedded in general behavior | Canonical context envelope with explicit missing values |
| Normal-path auto-chunk/multifile routing | Historical source of corruption and unnecessary normal complexity | Keep accepted disabled policy; retain exceptional recovery evidence |
| User-visible retranscription/version selection | Violates one Working Transcript model | Canonical loader/current pointer and exceptional admin recovery |
| Render-time substantive correction | Can overwrite accepted human work | All corrections resolved before finalization |
| Duplicate UFM/case normalization | Creates competing case authority | UFM inputs switched to canonical fields |
| Competing final output models | Allows divergent certified text | Golden parity and one finalized-data contract |

## Migration map

1. Protect the Working Transcript round trip and raw-evidence immutability with integration tests.
2. Define one speaker identity/role and reviewed line-type contract; reconcile local schemas non-destructively.
3. Characterize all correction producers and application sites; route new proposals through CorrectionObject validation.
4. Add an idempotent correction-run boundary and Workspace accept/reject/edit workflow locally.
5. Migrate paragraph/Q&A consumers to reviewed structure and one presentation model.
6. Remove routine transcript-version selection from user flows while preserving job and certification history.
7. Make UFM/Stage S consume an immutable finalization candidate and prohibit substantive mutation.
8. Converge output paths on one finalized-data contract using golden parity tests.
9. Apply the four-part deletion gate to each zero-consumer legacy module.
10. Prepare production migration and deployment candidate reports; stop at the required Human Gates.

## Compatibility requirements

- Existing canonical IDs, raw words, timestamps, confidence, and speaker clusters remain intact.
- The verified 1,757-utterance transcript continues to load completely.
- Manual Save remains available; autosave may supplement it.
- Audio synchronization and virtualized Workspace performance remain stable.
- Human corrections survive close/reopen and cannot be silently overwritten by AI or rendering.
- Existing certification evidence and historical transcript jobs are never destructively removed.
- Supported deliverables retain required substantive content, geometry, numbering, and certification semantics.
- Legacy AI remains callable only as migration fallback until ATIA gates pass; no new dependence is introduced.
- No production deployment, destructive production-data migration, remote-history rewrite, or final merge occurs without its Human Gate.

## Decisions requiring ratification or a Human Gate

- Ratification of this target architecture as T2 authority.
- Exact canonical database columns and non-destructive migration for speaker roles, correction runs, Working/current Certified pointers, and reissue history.
- Production deployment of Edge Function or database changes.
- Final selection and retirement of competing rendering/export implementations after golden parity evidence.
- Final integration into the authoritative remote branch lineage.

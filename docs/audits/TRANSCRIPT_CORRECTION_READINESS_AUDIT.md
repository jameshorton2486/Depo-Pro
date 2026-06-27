# Transcript Correction Readiness Audit

Date: 2026-06-26
Branch: feature/stage3-workspace-core
Mode: Read-only architecture audit

## Purpose

This report answers the architectural question, not just the code inventory question:

Can DEPO-PRO already support a complete transcript correction pipeline from raw Deepgram output to corrected workspace display and clean delivery export, and if not, what is missing?

## Readiness Verdict

DEPO-PRO is partially ready now.

It already has four working correction layers:

1. Canonical timed ingest from raw Deepgram JSON into normalized speakers, utterances, and words.
2. Deterministic display-layer correction through the formatter and paragraph post-processing.
3. Manual human correction in the workspace with persistence back to `working_text`, speaker assignments, and review state.
4. Clean delivery export that strips inline flags while preserving verbatim tokens.

It does not yet have a single orchestrated “transcript correction pipeline” that:

1. Classifies every defect by layer automatically.
2. Applies safe deterministic corrections in one auditable pass before workspace render.
3. Separates source-level retranscription fixes from display-only fixes in one operator workflow.
4. Provides a dedicated review queue for ambiguous, context-dependent corrections.
5. Supports full participant-directory grade speaker reassignment across synthetic participants and persisted utterance remapping.

## Current Capability Assessment

### Ready Today

- Raw Deepgram callbacks are normalized into canonical rows through `normalizeTranscriptResponse`, then inserted into `transcripts`, `transcript_speakers`, `transcript_utterances`, and `transcript_words` during callback ingestion.
  Evidence:
  - [supabase/functions/transcribe-callback/index.ts:3](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:3)
  - [supabase/functions/transcribe-callback/index.ts:165](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:165)
  - [supabase/functions/transcribe-callback/index.ts:243](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:243)
  - [supabase/functions/transcribe-callback/index.ts:610](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:610)
  - [src/lib/transcript/normalize.ts:174](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:174)

- Workspace load reconstructs an `EditorDocument` from persisted transcript rows without mutating `raw_text`; display text comes from `working_text ?? raw_text`.
  Evidence:
  - [src/api/workspaceService.ts:76](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:76)
  - [src/api/workspaceService.ts:108](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:108)
  - [src/api/workspaceService.ts:135](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:135)
  - [src/api/workspaceService.ts:151](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:151)

- Deterministic text correction already exists in the formatter layer:
  - sentence spacing from the abbreviation registry
  - slash date normalization
  - deterministic garble corrections
  - inline flag emission for low-confidence and implausible-money tokens
  Evidence:
  - [src/lib/format/cfe.ts:85](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:85)
  - [src/lib/format/cfe.ts:176](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:176)
  - [src/lib/format/cfe.ts:540](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:540)
  - [src/lib/format/cfe.ts:586](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:586)

- Structured workspace correction already exists as a display-layer pass:
  - speaker inference
  - Q/A classification
  - headings and by-lines
  - Q/A objection splitting
  - K. normalization
  - paragraph remerge
  Evidence:
  - [src/lib/transcript/workspacePresentation.ts:254](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:254)
  - [src/lib/transcript/workspacePresentation.ts:408](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:408)
  - [src/lib/transcript/workspacePresentation.ts:513](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:513)
  - [src/lib/transcript/qaFixer.ts:122](C:/Users/james/projects/depo-pro/src/lib/transcript/qaFixer.ts:122)
  - [src/lib/transcript/qaFixer.ts:139](C:/Users/james/projects/depo-pro/src/lib/transcript/qaFixer.ts:139)

- The workspace editor already renders the corrected display layer before the user sees it once `structureConfirmed` is true.
  Evidence:
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:128](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:128)
  - [src/lib/buildEditorContent.ts:157](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:157)
  - [src/lib/buildEditorContent.ts:166](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:166)
  - [src/lib/buildEditorContent.ts:172](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:172)

- Clean delivery export already strips `[SCOPIST: FLAG ...]` spans while preserving the annotated token.
  Evidence:
  - [src/lib/transcriptDownloads.ts:9](C:/Users/james/projects/depo-pro/src/lib/transcriptDownloads.ts:9)
  - [src/lib/transcriptDownloads.ts:17](C:/Users/james/projects/depo-pro/src/lib/transcriptDownloads.ts:17)
  - [src/lib/format/serialize.ts:30](C:/Users/james/projects/depo-pro/src/lib/format/serialize.ts:30)
  - [src/lib/format/serialize.ts:35](C:/Users/james/projects/depo-pro/src/lib/format/serialize.ts:35)
  - [src/lib/transcript/workspacePresentation.ts:104](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:104)
  - [src/lib/transcript/workspacePresentation.ts:683](C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:683)

### Missing for a Complete Correction Pipeline

- No single correction orchestrator exists. Correction logic is split across callback ingest, CFE, workspace presentation, qaFixer, manual editing, and export serialization.
- No defect-classification layer exists that decides automatically whether a problem should be solved by:
  - retranscription/keyterms
  - deterministic formatter correction
  - structured paragraph transformation
  - speaker reassignment
  - inline flagging
  - human edit only
- No first-class review queue exists for ambiguous ASR substitutions like `accent` vs. `accident`.
- No bulk deterministic correction registry exists outside the formatter map; corrections are scattered by concern.
- Participant-directory grade reassignment is incomplete. Step 2 now creates synthetic speakers, but the broader participant mapping architecture is still post-beta sequence work.

## Layer Classification

### Source-Layer Ready

- Retranscription support and keyterm normalization already exist.
  Evidence:
  - [src/api/transcriptionService.ts:73](C:/Users/james/projects/depo-pro/src/api/transcriptionService.ts:73)

### Display-Layer Ready

- Formatter corrections and flagging.
- Structured paragraph transformation.
- Clean export stripping.

### Human-in-the-Loop Ready

- Manual utterance editing persists through `working_text`.
  Evidence:
  - [src/context/DocumentContext.tsx:327](C:/Users/james/projects/depo-pro/src/context/DocumentContext.tsx:327)
  - [src/api/workspaceService.ts:290](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:290)
  - [src/api/workspaceService.ts:322](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:322)
  - [src/api/workspaceService.ts:335](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:335)

### Not Yet Operational as One Pipeline

- No unified transcript-correction planner.
- No comprehensive ambiguous-term review workflow.
- No source-to-display “why was this token changed?” audit surface exposed in the UI.

## Architectural Conclusion

DEPO-PRO does not need “more AI” first. It already has enough architecture to support a serious correction pipeline, but the pieces are still distributed.

The immediate need is not a new model layer. The immediate need is a correction orchestration layer that:

1. Routes each defect to the correct existing layer.
2. Makes ambiguous cases reviewable instead of silently changed.
3. Consolidates deterministic rules into one auditable correction surface.
4. Connects retranscription, deterministic cleanup, structure inference, and clean delivery into one operator-visible workflow.

That makes the application correction-capable. It does not yet make it correction-system complete.

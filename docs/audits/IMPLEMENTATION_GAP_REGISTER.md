# Implementation Gap Register

Date: 2026-06-26
Branch: feature/stage3-workspace-core

## Gap G1 — No Unified Correction Orchestrator

### Status

Not implemented.

### Evidence

- Correction logic is distributed across:
  - callback ingest
  - formatter
  - paragraph display improvements
  - qaFixer
  - workspace manual save path
  - speaker persistence
  - clean export
- No single module classifies or routes issues across those layers.

### Impact

- Operators must decide manually whether a problem should be fixed by:
  - retranscription
  - deterministic display correction
  - manual edit
  - speaker reassignment
  - flagging

### Layer

Display-layer safe if implemented as an orchestration/reporting layer.

## Gap G2 — No Formal Defect Taxonomy

### Status

Not implemented.

### Evidence

- There is no runtime classifier that tags defects as:
  - source ASR issue
  - deterministic garble
  - structural Q/A issue
  - speaker attribution issue
  - ambiguous review-only issue

### Impact

- The system cannot automatically decide what to fix now versus what to flag.

### Layer

Display-layer safe.

## Gap G3 — Ambiguous-Term Review Workflow Is Indirect

### Status

Partial.

### Evidence

- `cfe` can emit inline flags.
  - [src/lib/format/cfe.ts:263](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:263)
  - [src/lib/format/cfe.ts:586](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:586)
- Workspace can display those flags.
  - [src/lib/buildEditorContent.ts:141](C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts:141)
- There is no dedicated correction queue specifically for ambiguous substitutions like `accent` vs. `accident`.

### Impact

- Ambiguous fixes are visible, but not operationalized as a dedicated task list.

### Layer

Display-layer safe.

## Gap G4 — Retranscription and Display Correction Are Not Unified

### Status

Partial.

### Evidence

- Keyterm normalization exists.
  - [src/api/transcriptionService.ts:73](C:/Users/james/projects/depo-pro/src/api/transcriptionService.ts:73)
- Display-layer deterministic correction exists.
  - [src/lib/format/cfe.ts:85](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:85)
- Nothing in the UI or service layer coordinates “retry with better keyterms first, then fall back to deterministic display correction.”

### Impact

- High-value source fixes and low-risk display fixes are disconnected workflows.

### Layer

Display-layer safe for orchestration, source-layer for retranscription execution.

## Gap G5 — Structure Banner Has No Distinct Dismiss State

### Status

Partially implemented, behaviorally ambiguous.

### Evidence

- `StructureReviewBanner` exposes both confirm and dismiss.
  - [src/components/StructureReviewBanner/StructureReviewBanner.tsx:6](C:/Users/james/projects/depo-pro/src/components/StructureReviewBanner/StructureReviewBanner.tsx:6)
- In `TranscriptEditor`, both buttons call `confirmStructure`.
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:321](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:321)
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:322](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:322)
  - [src/components/TranscriptEditor/TranscriptEditor.tsx:323](C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:323)

### Impact

- The system has no persisted “keep raw labels” mode.
- That makes the structure review control read as a choice in the UI but not in state.

### Layer

Display-layer safe.

## Gap G6 — Correction Provenance Is Not Surfaced End-to-End

### Status

Partial.

### Evidence

- Workspace audit entries exist for manual edits and speaker assignment.
  - [src/api/workspaceService.ts:245](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:245)
- Deterministic formatter corrections do not generate user-visible provenance objects; they are applied in render.

### Impact

- The operator can see output changes, but not a normalized ledger of:
  - what changed
  - why
  - which rule applied
  - whether it came from source, formatter, qaFixer, or human edit

### Layer

Display-layer safe if implemented as metadata, not canonical token rewriting.

## Gap G7 — Batch Deterministic Correction Registry Is Narrow

### Status

Partial.

### Evidence

- `DETERMINISTIC_GARBLE_CORRECTIONS` exists, but it is a flat string map embedded in `cfe.ts`.
  - [src/lib/format/cfe.ts:85](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:85)
- Q/A-specific objection normalization exists separately in `qaFixer.ts`.
  - [src/lib/transcript/qaFixer.ts:12](C:/Users/james/projects/depo-pro/src/lib/transcript/qaFixer.ts:12)

### Impact

- Deterministic rules are split by module and not centrally auditable as one correction registry.

### Layer

Display-layer safe.

## Gap G8 — Participant Directory Is Still Incomplete

### Status

Partially implemented post-beta sequence.

### Evidence

- Step 1 nullable `deepgram_speaker` is complete.
- Step 2 synthetic participant creation is complete.
- Full participant directory, attribution map, and synthetic speaker insert path for all workflows remain staged post-beta.

### Impact

- Speaker attribution issues involving merged diarization are not fully solved system-wide yet.

### Layer

Post-beta schema and workflow work.

## Gap G9 — Export Presentation Is Still Simpler Than Certified Output

### Status

Not implemented for full certification-grade layout in the web export path.

### Evidence

- Word export is HTML-wrapped monospace text, not a certified DOCX layout engine.
  - [src/lib/transcriptDownloads.ts:37](C:/Users/james/projects/depo-pro/src/lib/transcriptDownloads.ts:37)
- Export screen still contains a local raw formatter path using `serializeFormattedDocument`.
  - [src/components/ExportScreen/ExportScreen.tsx:64](C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:64)

### Impact

- Clean text is improved, but final presentation fidelity is still short of full certified transcript appearance.

### Layer

Display/export-layer safe in SaaS; desktop path also relevant.

## Gap G10 — No Pre-Render Correction Readiness Report in UI

### Status

Not implemented.

### Evidence

- There is no service or component that summarizes:
  - deterministic fixes applied
  - flagged ambiguities
  - retranscription candidates
  - unresolved speaker issues

### Impact

- Operators inspect the transcript ad hoc instead of starting from a correction dashboard.

### Layer

Display-layer safe.

## Gap Classification Summary

### Display-layer Safe

- G1 unified correction orchestrator
- G2 defect taxonomy
- G3 ambiguous-term review workflow
- G4 retranscription/display correction coordination layer
- G5 structure-banner state split
- G6 correction provenance surfacing
- G7 centralized deterministic rule registry
- G9 certified-grade SaaS export improvements
- G10 correction readiness dashboard

### Canonical-Layer Unsafe

- Silent auto-rewrites of ambiguous testimony content at the stored token layer
- Any feature that mutates `raw_text`
- Any feature that changes timestamp-bearing token segmentation directly

### Post-Beta

- G8 participant directory completion

### Deferred by Design

- Full automatic certification authority
- Silent acceptance of AI suggestions without human review

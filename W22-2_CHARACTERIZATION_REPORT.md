# W22-2 Transcript Intelligence Consolidation Characterization Report

## Executive Summary

W22-2 is not a new engine. The repository already contains most of the underlying transcript-intelligence logic, but it is split across three competing ownership layers:

1. A newer pre-workspace pipeline centered on `preWorkspaceStructure.ts` and `structureEngine.ts`
2. An older render-time workspace path centered on `workspacePresentation.ts`, `qaFixer.ts`, and `buildEditorContent.ts`
3. A separate speaker-resolution path centered on `speakerResolutionEngine.ts`

The current architecture therefore has capability overlap, not capability absence. The audit result is that roughly **65-75%** of the intended transcript-intelligence consolidation already exists in reusable form. The minimum W22-2 implementation is to make the pre-workspace path authoritative, wire speaker resolution into it, and remove workspace/export dependence on render-time reconstruction.

## Current Transcript Intelligence

### What already exists

- Canonical transcript normalization already produces stable speaker, utterance, and word rows in `src/lib/transcript/normalize.ts`.
- Boundary-aware synthetic parentheticals already exist in `src/lib/transcript/boundaryEngine.ts`.
- Deterministic speaker-resolution infrastructure already exists in `src/lib/transcript/speakerResolutionEngine.ts`.
- Deterministic structure classification already exists in `src/lib/transcript/structureEngine.ts`.
- A pre-workspace orchestrator already exists in `src/lib/transcript/preWorkspaceStructure.ts`, including persisted `line_type` assignment and inclusion-page envelope generation.
- Deterministic correction and late AI review engines already exist in `src/lib/transcript/correctionEngines.ts`, `src/lib/transcript/aiReview.ts`, and `src/lib/transcript/aiSuggestionEngine.ts`.

### What still happens too late

- Speaker-role inference
- Display-label inference
- Proceedings / examination / by-line insertion
- Q./A. repair
- Colloquy shaping
- Some parenthetical handling

Those behaviors still live in `workspacePresentation.ts`, `qaFixer.ts`, and parts of `buildEditorContent.ts`, which means the workspace is still reconstructing the transcript instead of consuming a reconstructed transcript.

## Architecture Diagram

```text
Current effective path

Deepgram
  -> normalize.ts
  -> callback ingest / boundary / AI-last
  -> workspaceService.ts
  -> DocumentContext.tsx
  -> workspacePresentation.ts + qaFixer.ts + buildEditorContent.ts
  -> TranscriptEditor / export formatting

Existing but only partially authoritative side-path

Case metadata + canonical transcript
  -> speakerResolutionEngine.ts
  -> structureEngine.ts
  -> preWorkspaceStructure.ts
  -> line_type + inclusionPages

Recommended permanent path

Canonical transcript
  -> boundaryEngine.ts
  -> speakerResolutionEngine.ts
  -> structureEngine.ts
  -> preWorkspaceStructure.ts
  -> correctionEngines.ts
  -> aiReview.ts / aiSuggestionEngine.ts
  -> workspaceService.ts
  -> buildEditorContent.ts / TranscriptEditor / export consumers
```

## Current Responsibilities

### Canonical intake

- `src/lib/transcript/normalize.ts`
  - Creates canonical speakers, utterances, and words.
  - Leaves speakers generic as `Speaker N`.
  - Does not perform transcript intelligence beyond basic canonical segmentation.

### Metadata and participant sources

- `src/lib/ufm/buildUfmMetadata.ts`
  - Already assembles appearance metadata, proceeding date fields, and preferred appearance labels from case record + participant directory.
- `src/lib/transcript/inclusionPages.ts`
  - Formats UFM/inclusion-page content for display and export.
- `src/api/workspaceService.ts`
  - Surfaces `inclusionPages`, `pipelineState`, and `speakerMapConfirmed` to the client.

### Speaker resolution

- `src/lib/transcript/speakerResolutionEngine.ts`
  - Real engine with AI prompt integration, metadata authority, exam transition tracking, speaker-map confirmation, and override flow.
  - Best candidate for permanent speaker-resolution ownership.
- `src/lib/transcript/deterministicSpeakerMap.ts`
  - Older render-time heuristic speaker mapper that rewrites labels from transcript text patterns and case metadata.
  - Duplicates responsibilities already better owned by `speakerResolutionEngine.ts`.

### Structural reconstruction

- `src/lib/transcript/structureEngine.ts`
  - Already classifies headers, parentheticals, speaker passages, Q/A, by-lines, and embedded objections.
  - Already contains utilities for split/merge/extraction/verification of structured blocks.
- `src/lib/transcript/preWorkspaceStructure.ts`
  - Already orchestrates `buildDisplayDocument`, `classifyBlocks`, extraction/merge passes, persisted `line_type`, and inclusion-page envelope construction.
  - Strongest current candidate for the permanent Transcript Intelligence entrypoint.
- `src/lib/transcript/qaFixer.ts`
  - Additional Q/A shaping logic, but currently attached to render-time paragraph repair.
- `src/lib/transcript/workspacePresentation.ts`
  - Still inserts `PROCEEDINGS`, `EXAMINATION`, by-lines, and Q/A labeling at workspace render time.

### Workspace and render consumers

- `src/lib/buildEditorContent.ts`
  - Builds TipTap JSON and line geometry.
  - Currently also consumes and partly depends on render-time structural inference.
- `src/context/DocumentContext.tsx`
  - Decides whether to apply structured view based on pipeline state / speaker-map confirmation.
- `src/components/TranscriptEditor/TranscriptEditor.tsx`
  - Consumer of built editor content and inclusion pages, not a transcript-intelligence owner.

### Export and Stage S consumers

- `src/lib/transcript/formattingEngine.ts`
- `src/lib/format/cfe.ts`
- `src/editor/stageS/colloquy.ts`
- `src/lib/transcriptDownloads.ts`

These are downstream formatting/render layers. They should consume structured transcript semantics, not generate them.

## Reuse Matrix

| File | Current Role | Reuse Decision | Why |
| --- | --- | --- | --- |
| `src/lib/transcript/normalize.ts` | Canonical normalization | REUSE | Correct owner for raw canonical layer; not a W22-2 replacement target. |
| `src/lib/transcript/boundaryEngine.ts` | Boundary/off-record detection + synthetic parentheticals | REUSE | Already the correct owner for boundary parentheticals and off-record structure. |
| `src/lib/transcript/speakerResolutionEngine.ts` | Metadata/AI-backed speaker resolution | REUSE | Best current owner for speaker identity and role resolution. |
| `src/lib/transcript/structureEngine.ts` | Deterministic structure classification and block transformations | REUSE | Strong existing core of proceedings/QA/by-line/parenthetical logic. |
| `src/lib/transcript/preWorkspaceStructure.ts` | Pre-workspace orchestration and `line_type` assignment | REUSE | Closest existing implementation of the desired W22-2 engine seam. |
| `src/lib/transcript/correctionEngines.ts` | Deterministic lexical correction | REUSE | Already separate from render; should run after structure. |
| `src/lib/transcript/aiReview.ts` | Late review/orchestration | REUSE | Correct as residual-review layer after deterministic structure/correction. |
| `src/lib/transcript/aiSuggestionEngine.ts` | AI fallback suggestions | REUSE | Keep as late-stage ambiguity resolver only. |
| `src/lib/ufm/buildUfmMetadata.ts` | Appearance/proceedings metadata source | REUSE | Correct metadata source for inclusion and appearance context. |
| `src/lib/transcript/inclusionPages.ts` | Inclusion-page formatter | REUSE | Correct downstream formatter; not the owner of transcript body structure. |

## Duplicate Matrix

| Responsibility | Duplicate Implementations | Canonical Recommendation |
| --- | --- | --- |
| Speaker role / label inference | `speakerResolutionEngine.ts`, `deterministicSpeakerMap.ts`, `workspacePresentation.ts` | `speakerResolutionEngine.ts` |
| Q./A. reconstruction | `structureEngine.ts`, `qaFixer.ts`, `workspacePresentation.ts` | `structureEngine.ts` with selected `qaFixer.ts` logic folded upstream |
| Proceedings / examination / by-line insertion | `structureEngine.ts`, `workspacePresentation.ts`, downstream export tests/formatters | `structureEngine.ts` + `preWorkspaceStructure.ts` |
| Parenthetical handling | `boundaryEngine.ts`, `structureEngine.ts`, `workspacePresentation.ts` | `boundaryEngine.ts` for synthetic boundaries; `structureEngine.ts` for transcript semantics |
| Speaker-label formatting | `deterministicSpeakerMap.ts`, `stageS/colloquy.ts`, `buildEditorContent.ts` | upstream resolution + downstream formatting only |

## Move Matrix

| Responsibility | Current Wrong Location | Recommended Permanent Location |
| --- | --- | --- |
| Generic speaker resolution | `workspacePresentation.ts`, `deterministicSpeakerMap.ts` | `speakerResolutionEngine.ts` |
| Proceedings/header insertion | `workspacePresentation.ts` | `structureEngine.ts` / `preWorkspaceStructure.ts` |
| Q./A. repair and split logic | `qaFixer.ts` during render | `structureEngine.ts` / `preWorkspaceStructure.ts` |
| By-line generation | `workspacePresentation.ts` | `structureEngine.ts` |
| Display-label generation | render-time workspace path | persisted structured transcript package before workspace load |
| Structure confirmation gating | partially implicit in workspace render | explicit output of pre-workspace structure pass |

## Retire Matrix

| File / Path | Retire Decision | Reason |
| --- | --- | --- |
| `src/lib/transcript/workspacePresentation.ts` | RETIRE transcript-semantic ownership | It should stop being the owner of speaker/QA/proceedings inference. Some formatting helpers may survive as presentation-only utilities. |
| `src/lib/transcript/deterministicSpeakerMap.ts` | RETIRE as primary speaker-resolution owner | It duplicates a stronger engine and keeps speaker intelligence in the wrong phase. |
| `src/lib/transcript/qaFixer.ts` | RETIRE as render-time semantic owner | Useful algorithms exist, but ownership should move upstream into pre-workspace structure. |
| Export-side structuring assumptions in formatting/download paths | RETIRE semantic reconstruction | Export should consume resolved structure, not invent it. |

## Missing Components

### Still genuinely missing

1. A single authoritative consolidation path that always runs:
   - boundary cleanup
   - speaker resolution
   - structural reconstruction
   - deterministic correction
   - late AI review
   before workspace consumption

2. Full replacement of render-time paragraph inference with persisted/resolved structure.

3. Stable persistence/transport of resolved display labels and structure semantics beyond the currently partial `line_type` path.

4. Clean separation between transcript intelligence and Stage S/export formatting consumers.

### Not actually missing

- Q/A logic
- speaker heuristics
- by-line logic
- parenthetical logic
- appearance metadata sources
- inclusion-page generation

Those already exist; they are just fragmented.

## Recommended Engine Boundaries

### Permanent W22-2 consolidation owners

- `normalize.ts`
  - canonical transcript only
- `boundaryEngine.ts`
  - off-record/pre-record/post-record boundaries and synthetic parentheticals
- `speakerResolutionEngine.ts`
  - participant identity, role, and display-label resolution
- `structureEngine.ts`
  - proceedings, headers, by-lines, Q/A, colloquy, parentheticals, split/merge logic
- `preWorkspaceStructure.ts`
  - orchestration, `line_type`, and workspace-ready structured transcript package
- `correctionEngines.ts`
  - deterministic lexical cleanup after structure
- `aiReview.ts` / `aiSuggestionEngine.ts`
  - residual unresolved review only

### Permanent consumers

- `workspaceService.ts`
- `DocumentContext.tsx`
- `buildEditorContent.ts`
- `TranscriptEditor.tsx`
- Stage S / formatting / export pipeline

These should consume structure, not create it.

## Implementation Order

1. Make `preWorkspaceStructure.ts` authoritative for workspace structure.
2. Route speaker identity/role ownership to `speakerResolutionEngine.ts` and stop relying on `deterministicSpeakerMap.ts` as the primary source.
3. Move surviving useful `qaFixer.ts` logic into upstream structure orchestration.
4. Replace workspace/export dependence on `workspacePresentation.ts` inference with persisted `line_type` and resolved labels.
5. Narrow `buildEditorContent.ts` to rendering/geometry and structured-doc assembly only.
6. Leave deterministic correction and AI review after structure, not before.

## Minimum Implementation Required For W22-2

The minimum safe W22-2 is not “build a new engine.” It is:

1. Use the existing pre-workspace path as the canonical owner.
2. Ensure resolved speaker roles/labels and `line_type` reach the workspace as first-class data.
3. Stop reconstructing Q/A, proceedings, and by-lines at render time except as legacy fallback for older rows.

That is enough to deliver the user-visible transcript-shape improvements without rewriting the callback pipeline or Stage S.

## Final Questions

### What percentage of the Transcript Intelligence Engine already exists?

Approximately **65-75%** already exists in reusable form. The missing work is consolidation, ownership cleanup, and end-to-end wiring, not invention of core algorithms.

### Which files should become the permanent implementation?

- `src/lib/transcript/speakerResolutionEngine.ts`
- `src/lib/transcript/structureEngine.ts`
- `src/lib/transcript/preWorkspaceStructure.ts`
- `src/lib/transcript/boundaryEngine.ts`
- `src/lib/transcript/correctionEngines.ts`
- `src/lib/transcript/aiReview.ts`
- `src/lib/transcript/aiSuggestionEngine.ts`
- `src/lib/ufm/buildUfmMetadata.ts`

### Which implementations should be retired?

- `src/lib/transcript/workspacePresentation.ts` as a transcript-semantic owner
- `src/lib/transcript/deterministicSpeakerMap.ts` as a primary speaker-resolution owner
- `src/lib/transcript/qaFixer.ts` as a render-time semantic owner
- Export/render paths that still reconstruct transcript semantics instead of consuming them

### Which responsibilities are misplaced?

- speaker resolution in render-time workspace code
- Q/A reconstruction in `qaFixer.ts` during display build
- proceedings/examination/by-line insertion in `workspacePresentation.ts`
- transcript-semantic reconstruction in export formatting consumers

### What is the minimum implementation required for W22-2?

Make `preWorkspaceStructure.ts` authoritative, feed it resolved speaker labels and roles from `speakerResolutionEngine.ts`, persist/transport that structure, and make workspace/export consume it directly with render-time inference retained only as a legacy fallback.

### Which user-visible improvements will result immediately after W22-2?

- transcripts open with stable Q./A. structure instead of raw diarized turns
- correct proceedings / examination / by-line structure appears without workspace-only heuristics
- speaker labels become materially closer to witness / attorney / reporter / videographer identities
- workspace and export structure align instead of diverging from separate inference paths
- fewer “Speaker N” and malformed colloquy artifacts surface to the operator

## Files Modified

- `W22-2_CHARACTERIZATION_REPORT.md`
- `W22-2_COMPONENT_MATRIX.md`

## Intentionally Deferred

- No implementation
- No refactor
- No callback changes
- No workspace code changes
- No export changes
- No tests

This phase is characterization only.

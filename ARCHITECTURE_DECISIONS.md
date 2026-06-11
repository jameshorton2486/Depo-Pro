# Architecture Decisions

## ADR-001: Native utterance rendering and playback-gated highlight loop

- Date: 2026-06-10
- Status: Accepted - implementation complete; pending manual perf trace and edit/cursor QA before release.
- Area: `Transcript_Editor_Bolt` Stage 3 workspace, TipTap transcript editor.

### Context

Loading a full-day deposition produced a long synchronous React commit (`'message' handler took 1038ms`) and recurring playback layout thrash (`Forced reflow while executing JavaScript`).

Root causes:

- Each utterance was rendered through `ReactNodeViewRenderer(UtteranceNodeView)`, so a single `editor.commands.setContent(...)` mounted thousands of React components in one commit.
- The audio-to-transcript highlight RAF loop ran continuously, queried the full document on word changes, and used smooth `scrollIntoView`, forcing layout work during playback.

### Decision

1. Render utterances through native ProseMirror `renderHTML` in `src/extensions/UtteranceNode.ts`, preserving the retired NodeView's DOM structure, CSS classes, decorative `contenteditable="false"` spans, content hole placement, and data attributes.
2. Extract shared utterance rendering helpers into `src/editor/utteranceRender.ts`.
3. Remove the React utterance NodeView wiring from `src/components/TranscriptEditor/TranscriptEditor.tsx` and delete `src/components/TranscriptEditor/UtteranceNodeView.tsx`.
4. Gate the highlight RAF loop on `audio.playing`, cache the currently highlighted elements, scope DOM queries to `editor.view.dom`, and scroll only when the active word is outside the visible editor viewport using `behavior: "auto"` with the existing 600 ms throttle.

`PageBreak` and `ExhibitRef` remain React NodeViews because their instance counts are low and they are not part of the observed bottleneck.

### Consequences

- The dominant transcript-load cost from thousands of React utterance mounts is removed without changing the utterance schema.
- The playback loop no longer runs while paused and no longer performs smooth-scroll layout work on each word boundary.
- The active-word highlight now clears on pause. If reporter workflow prefers the highlight to remain visible while paused, that behavior can be reverted without affecting the broader render-path decision.
- The live utterance DOM now also includes additive `data-speaker-label`, `data-line`, `data-page-line`, and `data-role` attributes from `renderHTML`.

### Invariants Preserved

- No node or mark attribute was added, removed, renamed, or retyped.
- No backend file was modified.
- No certified-record or `readOnly` path was changed.
- Click-to-seek and active-utterance selection still depend on the same `data-word-id`, `data-start`, and `data-utterance-id` hooks.

### Deferred

- Incremental confidence decorations in `ConfidencePlugin` were deferred because the `lowConfWords` queue and underline output must remain provably identical.
- Chunked initial `setContent` was deferred unless a real large-job performance trace shows native rendering alone is insufficient.

### Validation

- `npm run typecheck`: pass
- `npx vitest run`: pass (`45` files, `233` tests)
- Pending manual validation:
  - Chrome Performance trace on a large real job
  - Edit/cursor QA on the native utterance node

# Recommended Next Implementation

This roadmap is derived from the audited pre-stabilization worktree evidence, not historical Wave plans. Delivery status is governed by the Commit Assembly Plan and merged focused PRs.

1. **Freeze a persisted residual-review queue contract.**
   - Choose one owner, preferably an upstream/persisted form of `correctionOrchestrator.ts` or a deliberately named queue module.
   - Feed it deterministic evidence, low confidence, speaker issues, structure issues, and AI suggestions.
   - Keep the UI and AI review as consumers.

2. **Resolve the unused structure/correction/geometry modules.**
   - For each of `structureEngine.ts`, `formattingEngine.ts`, `correctionEngines.ts`, and `correctionValidator.ts`, decide: integrate into the active owner with output-parity tests, or mark deprecated and later remove.
   - Do not wire them in parallel with current production behavior.

3. **Publish and enforce a procedural-event taxonomy.**
   - Recording boundaries: `boundaryEngine.ts`.
   - Proceedings/examination events: `transcriptParagraphs.ts` or a submodule extracted from it.
   - Add tests proving no event can be emitted twice.

4. **Extend entity registry consumption to speaker resolution only where justified.**
   - The registry is implemented and already improves correction/AI context.
   - Add it to speaker resolution only after tests show aliases currently fail resolution.

5. **Extend canonical integrity in place.**
   - Add deterministic, read-only diagnostics to `canonicalIntegrity.ts` as needed.
   - Keep failures routed through the existing manual-review path.

6. **Keep the workspace presentation-only.**
   - Do not add semantic reconstruction to `buildEditorContent.ts`, `workspaceService.ts`, or UI components.
   - Reduce legacy fallback semantics only after persisted structured-state parity is demonstrated.

## Explicit non-work

Do not create a second speaker resolver, pre-workspace orchestrator, Q/A engine, correction registry, or geometry engine. The audit found current or candidate owners for all of those responsibilities.

# Architectural Drift Report

## What changed since the July 13 reconciliation

1. `entityRegistry.ts` now exists and is consumed by `correctionOrchestrator.ts` and `aiSuggestionEngine.ts`. The previous “missing entity registry” finding is obsolete.
2. The active paragraph path is more clearly `transcriptParagraphs.ts` → `qaStructureUtils.ts` → CFE, while `structureEngine.ts` and `formattingEngine.ts` remain unwired.
3. The old documents should not describe `qaFixer.ts` as an active filename. The active module is `qaStructureUtils.ts`.

## Drift against desired layered architecture

- **Render-time review recomputation:** `DocumentContext` rebuilds correction reports when documents load/change. This is useful today, but means review state is not solely an upstream persisted product.
- **Dynamic structured package reconstruction:** workspace and export can rebuild the structured package from loaded rows. The data is semantic-aware, but the workspace is not yet a strictly package-only consumer.
- **Dual correction models:** CFE is active for deterministic rendering behavior; correction engines/validator are tested but not pipeline-wired.
- **Dual structure models:** paragraph production is active; the richer structure engine is unwired.
- **Event-class ambiguity:** both boundary and paragraph production can introduce parenthetical/procedural output, with distinct intents but no published taxonomy.

## Reconciled conclusion

The core callback is layered and production-ready through persistence of speaker labels and line types. The remaining architectural risk is not missing modules; it is avoiding activation of parallel structure, correction, and geometry paths without an owner decision.
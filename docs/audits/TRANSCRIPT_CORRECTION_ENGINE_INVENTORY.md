> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# Transcript Correction Engine Inventory

## Count and classification

There are **nine independently implemented correction/structure families**, with multiple sub-engines inside several families. Five can affect the current Workspace or persisted transcript today; four are export, target, dormant, or legacy implementations.

| # | Engine family | Implementation | Current caller | Authority |
|---:|---|---|---|---|
| 1 | Canonical/boundary restructuring | `normalize.ts`, `multifileMerge.ts`, `boundaryEngine.ts` | transcription finalization | Authoritative only for lossless ingestion and explicit boundary metadata; not editorial correction |
| 2 | CFE deterministic correction + formatting | `format/cfe.ts`, `correctionRegistry.ts`, abbreviation/grouping/geometry helpers | initial Workspace content builder | Active but should not be a content authority |
| 3 | Live TS AI Review | `aiReview.ts`, `aiSuggestionEngine.ts`, `supabase/functions/ai-review` | finalizer and Re-review button | Transitional active AI path; must stay working until TIE reconciliation |
| 4 | Human editor/suggestion engine | TipTap, `DocumentContext`, editor API, AI/legacy suggestion panels | operator actions | Human-approved working transcript is authoritative |
| 5 | Workspace structure engine | `workspacePresentation.ts`, `qaFixer.ts`, paragraph improvements | structure confirmation/presentation | Active projection; overlaps structure engines |
| 6 | Standalone TS correction orchestration | `correctionEngines.ts`, `correctionValidator.ts`, `correctionOrchestrator.ts`, `formattingEngine.ts`, `structureEngine.ts` | primarily tests/types; no unified Workspace caller | Candidate deterministic modules, not runtime authority |
| 7 | Export editorial/semantic/geometry | `editorialEngine.ts`, `depositionRegionEngine.ts`, `geometryEngine.ts`, `structuredTranscript*.ts`, `unifiedRendering.ts` | export/Stage-S paths | Authoritative only for deterministic export projection after approval |
| 8 | TIE CorrectionObject engine | `transcript_formatter/services/tie`, `providers`, schema and correction tables | partially implemented target path | Intended authoritative AI/correction proposal architecture |
| 9 | Legacy Python spec engine / AI formatter | `transcript_formatter/spec_engine`, quarantined `ai_tools.py` | legacy/batch/migration characterization | Not future authority; retain until parity and migration gates pass |

## Correction concerns implemented more than once

| Concern | Implementations |
|---|---|
| Spelling / STT terms | CFE registry, AI Review, standalone TS engines, TIE, Python corrections, manual editor |
| Punctuation / capitalization | CFE, AI Review, TS formatting/correction engines, Python corrections, manual editor |
| Speaker identity | AI Review, Speaker Panel/editor API, Python speaker mapper |
| Q/A and examination structure | Workspace presentation/Q&A fixer, AI line-type proposals, TS structure engine, Python classifier/Q&A fixer |
| Objections | Workspace Q&A fixer, AI proposals, TS structure logic, Python objections module |
| Formatting / pagination | CFE geometry, TS geometry/unified rendering, Stage-S/export, Python renderers |
| Validation / QC | Corrections report, correction validator, integrity audit, Python validator, certification checks |

## Authoritative assignments

- Recognition facts: immutable canonical `raw_text`, provider timing/confidence, stable IDs.
- Proposed intelligence: CorrectionObject contract emitted through the TIE/provider abstraction.
- Decisions: reporter accept/reject/edit with append-only correction decision records.
- Working content: replay of accepted decisions and manual human edits over the baseline.
- Formatting: one deterministic renderer operating on the chosen approved projection.
- Certification: human-only Stage 6 authority.

## Retirement rule

Do not delete an engine merely because it overlaps. First characterize it with fixtures, move unique rules behind the canonical orchestrator, prove parity, stop its callers, archive documentation/reference behavior, and only then remove code in a separately approved implementation phase.

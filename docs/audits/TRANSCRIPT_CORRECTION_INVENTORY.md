> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# Transcript Correction Inventory

**Audit date:** 2026-08-03  
**Classification:** Read-only architecture audit  
**Audited commit:** `756a38edd0128fa0a50fcd8f3217604e34a924dd` on `feat/canonical-transcript-audit`

## Executive finding

Depo-Pro does not yet have one authoritative transcript-correction workflow. Transcript wording, structure, speaker identity, presentation, and review state can be affected by several independent paths. Some persist changes, some alter only the displayed projection, and some are committed engines not currently connected to the Workspace. The consolidation stop condition is therefore met.

## Inventory by mutation class

| Mechanism | Entry point / owner | Effect | Persistence | Status |
|---|---|---|---|---|
| Deepgram normalization | `src/lib/transcript/normalize.ts` | Converts provider responses to canonical speakers, utterances, and words | Canonical transcript tables | Active, automatic |
| Multi-file merge and boundary processing | `multifileMerge.ts`, `boundaryEngine.ts`, `transcribe-callback`, `_shared/transcriptFinalize.ts` | Orders sources, namespaces speakers, splits/excludes boundary material, may synthesize boundary utterances | Canonical rows and flags | Active, automatic |
| AI Review | `supabase/functions/ai-review/index.ts`, `aiReview.ts`, `aiSuggestionEngine.ts` | Proposes word, speaker, and line-type changes; optional high-confidence auto-apply writes working text | Suggestion fields, review metadata, optionally `working_text`, audit | Active, automatic and rerunnable |
| Direct transcript editing | `TranscriptEditor.tsx`, `DocumentContext.tsx` | Changes utterance working text | Working words/utterances and audit | Active, operator-driven |
| AI suggestion decisions | `AISuggestionsSection.tsx`, `editor-api/index.ts` | Accept, reject, edit, or accept all suggestions | Working text, status, audit | Active, operator-driven |
| Speaker mapping | `SpeakerPanel.tsx`, `UtteranceContextMenu.tsx`, `editor-api/index.ts` | Renames/maps speakers and reassigns utterances/words | Speakers, utterances, words, audit | Active, operator-driven |
| Confidence review | `ConfidencePanel.tsx` | Marks low-confidence words reviewed/unreviewed | Review state only; no wording change | Active review UI |
| Legacy suggestion resolution | `SuggestionsPanel.tsx`, editor suggestion RPC | Applies or rejects legacy suggestion rows | Working text/status/audit | Active when legacy records exist |
| Initial CFE projection | `buildEditorContent.ts`, `format/cfe.ts`, `correctionRegistry.ts` | Deterministic token/phrase rewrites, turn segmentation, flags, spacing, pagination | Display-derived; can leak into later manual saves | Active, automatic display transform |
| Structure Review / Review & Confirm | `StructureReviewBanner.tsx`, `workspacePresentation.ts`, `qaFixer.ts` | Inferred roles, Q/A, colloquy, objections, labels, paragraph merge/split | React presentation state; displayed text/structure | Active, operator-selected display transform |
| Corrections report | `CorrectionsPanel.tsx` and helpers | Computes defects, deterministic changes, speaker issues, confidence issues, and retranscription candidates | Mostly read-only reporting; embedded AI controls mutate | Active mixed-purpose panel |
| Transcript processing menu | `TranscriptProcessingMenu.tsx` | Selects recognition/working/structured/legal presentation layers | Session presentation state | Active projection control |
| Export/Stage-S processing | `editorialEngine.ts`, `depositionRegionEngine.ts`, `geometryEngine.ts`, `structuredTranscript*.ts`, `unifiedRendering.ts` | Editorial rules, semantic packaging, geometry, export projection | Export artifact; not current TipTap mutation | Active outside initial Workspace or partially wired |
| Standalone TS correction engines | `correctionEngines.ts`, `formattingEngine.ts`, `structureEngine.ts`, `correctionOrchestrator.ts` | Deterministic correction, validation, formatting, structure orchestration | No current Workspace execution | Committed, largely unwired |
| TIE / CorrectionObject path | `transcript_formatter/services/tie/`, `providers/`, correction schema and correction tables | Provider-neutral, reviewable correction proposals and decision history | `corrections`, `correction_runs`, `correction_decisions` | Target architecture, partially implemented |
| Legacy Python formatter | `transcript_formatter/spec_engine/`, quarantined `ai_tools.py` | Corrections, speaker mapping, classification, Q/A repair, objections, validation, legacy AI full-flow behavior | Batch/export artifacts | Legacy characterization and migration fallback |

## What can change each domain

- **Words:** manual edits, accepted/auto-applied AI suggestions, legacy suggestions, CFE display corrections, legacy formatter rules.
- **Utterances:** manual edits, boundary splitting/exclusion, speaker reassignment, structure/Q/A paragraph transformations.
- **Speakers:** AI proposals, Speaker Panel mapping/rename, utterance context reassignment, legacy speaker mapper.
- **Formatting:** CFE, workspace presentation, paragraph improvements, geometry/pagination engines, export renderers.
- **Suggestions/corrections:** AI Review word fields, legacy transcript suggestions, CorrectionObjects, deterministic correction report entries.
- **Audit history:** editor mutation audit records, suggestion decision audit, and the separate append-only `correction_decisions` model.

## Duplication hotspots

1. Word correction exists in the CFE registry, AI Review, standalone TS engines, TIE, legacy suggestions, and Python spec engine.
2. Structure inference exists in Workspace presentation/Q&A fixer, AI Review line-type proposals, standalone structure engine, and Python classifier/Q&A/objection modules.
3. Formatting exists in CFE, standalone formatting/geometry engines, unified rendering, Stage-S/export, and the Python renderer stack.
4. Speaker resolution exists in AI Review, Speaker Panel workflows, boundary/canonical processing, and the Python speaker mapper.
5. Auditing is split between editor audit rows, suggestion statuses, and CorrectionObject decisions.

## Authority conclusion

The immutable `raw_text` canonical layer is the recognition authority. Human-approved working text is the content authority. CorrectionObjects plus their append-only decisions are the intended intelligence/audit authority. CFE and export renderers should be deterministic consumers, not independent correction authorities. Legacy AI and suggestion paths must remain available during migration but must not remain parallel execution entry points.

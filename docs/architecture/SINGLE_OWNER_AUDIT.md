# Single-Owner Audit

**Audit date:** 2026-07-20
**Rule:** each semantic responsibility has one authoritative producer. Consumers may render, persist, validate, or report that output; they must not independently recreate it.

| Responsibility | Authoritative owner today | Other related modules | Finding |
|---|---|---|---|
| Raw Deepgram payload integrity | `integrityAudit.ts` | callback routes failures | Single owner |
| Canonical transcript integrity | `canonicalIntegrity.ts` | callback enforces result | Single owner |
| Merge order and cross-file timing | `multifileMerge.ts` | callback sequences | Single owner |
| Boundary exclusion and off-record synthetic rows | `boundaryEngine.ts` | callback persists results | Single owner for recording boundaries |
| Base speaker identity and role | `speakerResolutionEngine.ts` | pre-workspace/package consume | Single owner |
| Entity aliases | `entityRegistry.ts` | correction/AI consume | Single owner, but speaker engine is not yet a consumer |
| Persisted line type / paragraph semantics | `transcriptParagraphs.ts` | `qaStructureUtils.ts` is an internal repair stage | One active owner, but `structureEngine.ts` is a competing unused implementation |
| Region classification | `depositionRegionEngine.ts` | paragraph/package consume | Single owner |
| Proceedings and examination event insertion | `transcriptParagraphs.ts` | `boundaryEngine.ts` also creates synthetic parentheticals | Split ownership needs a written event boundary |
| Q/A classification | `transcriptParagraphs.ts` + `qaStructureUtils.ts` | unused `structureEngine.ts` also classifies | Active owner is clear; duplicate candidate remains |
| Objection classification | `transcriptParagraphs.ts` heuristic | unused `structureEngine.ts` has richer extraction | Not single-owner clean until unused module is integrated or retired |
| Speaker labels / by-lines | `speakerResolutionEngine.ts` owns base labels; `transcriptParagraphs.ts` owns paragraph/by-line rendering | CFE formats geometry | Layering is valid, but names should be documented as semantic vs rendered label |
| Deterministic correction rule definitions | `correctionRegistry.ts` | CFE, report, engines consume | Single rule-data owner |
| Deterministic correction application | CFE render path | unused `correctionEngines.ts`; report detects but does not mutate | Competing application models; only CFE is active |
| Review queue | `correctionOrchestrator.ts` for workspace UI | `aiReview.ts` independently builds AI input/report | Two current queue-like authorities |
| Geometry, wrapping, tabs, indentation | CFE + `geometryProfile.ts` | unused `formattingEngine.ts` | Current active owner is CFE; duplicate candidate exists |
| Export serialization | `transcriptDownloads.ts` | package renderer supplies text | Single owner |
| AI residual suggestions | `aiReview.ts` policy + `aiSuggestionEngine.ts` generation | callback triggers, edge persists | Layered single responsibility |

## Answers to validation questions

- **Speaker resolution:** Yes for active production: `speakerResolutionEngine.ts`.
- **Proceedings:** No clean single owner yet. `transcriptParagraphs.ts` produces proceedings/examination events while `boundaryEngine.ts` produces synthetic boundary parentheticals. They must be separated by event class.
- **Examination:** `transcriptParagraphs.ts` is active owner.
- **Dialogue / Q/A:** `transcriptParagraphs.ts` is active owner with `qaStructureUtils.ts` as its repair stage; `structureEngine.ts` is unused competing logic.
- **Parentheticals:** No clean single owner by event class; see above.
- **Geometry:** Active owner is CFE; `formattingEngine.ts` is not wired.
- **Entity resolution:** `entityRegistry.ts` owns alias construction; speaker resolution has not adopted it.
- **Deterministic corrections:** rules are centralized; active application is CFE, while a second unwired application engine exists.
- **AI review:** It is residual/pending by default; optional environment-controlled auto-apply can mutate `working_text`, so production configuration must keep that flag off unless explicitly approved.
- **Workspace:** It consumes persisted speaker/line semantics, but dynamically rebuilds package/paragraph presentation and retains a legacy fallback. It is not purely a package loader yet.
## Evidence baseline

This report is pinned to commit `9afb41c1f6dc40c240f22a04e624b30277d21f71` on `feature/stage3-workspace-core`. Reproducible search commands and the import-island diagram are in [AUDIT_METHOD_AND_EVIDENCE.md](AUDIT_METHOD_AND_EVIDENCE.md). The contested-owner decisions and deadlines are in [DECISION_RECORD.md](DECISION_RECORD.md).

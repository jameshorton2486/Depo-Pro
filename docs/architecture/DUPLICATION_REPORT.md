# Duplication Report

**Audit date:** 2026-07-20. “Duplicate” means competing ownership or an unused alternative implementation, not a legitimate producer/consumer relationship.

| Responsibility | Evidence | Authoritative owner now | Required decision |
|---|---|---|---|
| Q/A classification and repair | `transcriptParagraphs.ts` + `qaStructureUtils.ts`; `structureEngine.ts` independently classifies/splits/validates | `transcriptParagraphs.ts` | Do not wire `structureEngine.ts` beside it. Either migrate tested logic with parity tests or retire it. |
| Objection handling | `transcriptParagraphs.ts` detects/labels objection text; `structureEngine.ts` extracts/splits objections | `transcriptParagraphs.ts` in production | Decide whether richer extraction is needed; then move it into the active owner rather than enabling a parallel engine. |
| Proceedings / examination parentheticals | `boundaryEngine.ts` generates boundary synthetic rows; `transcriptParagraphs.ts` detects oath/commencement/recess events | Split today | Publish event taxonomy: recording-boundary events to boundary engine, deposition-procedure events to paragraph production. |
| Deterministic corrections | CFE applies rules in active rendering; `correctionEngines.ts` applies another rule subset; `correctionOrchestrator.ts` reports matches | CFE for active application; registry for rules | Select one upstream application point. Report-only logic must not be mistaken for mutation. |
| Geometry | CFE + `geometryProfile.ts` active; `formattingEngine.ts` implements another formatter/checker | CFE | Retire or integrate `formattingEngine.ts` only after output parity proof. |
| Residual review queue | `correctionOrchestrator.ts` creates curated workspace queue; `aiReview.ts` independently derives low-confidence/speaker/unstructured input | No single owner | Create one persisted queue contract; AI should consume queue evidence rather than recreate its own queue. |
| Entity aliases | `entityRegistry.ts` centralizes aliases; speaker engine still has local name/surname logic | `entityRegistry.ts` for registry data | Make speaker engine a consumer if shared aliases are required; avoid another alias registry. |
| Speaker labels | speaker engine gives semantic display names; paragraph layer creates Q/A/by-lines | Layered, not duplicate | Keep distinction explicit: semantic identity versus paragraph presentation. |

No evidence found that the deleted historical modules `workspacePresentation.ts`, `qaFixer.ts`, or planned `speakerResolution.ts` are active files. `qaStructureUtils.ts` is an active replacement and must not be confused with the deleted `qaFixer.ts` plan name.
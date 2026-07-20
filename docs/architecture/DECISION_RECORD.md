# Architecture Decision Record — Ownership Freeze

**Status:** Proposed ownership baseline from the 2026-07-20 audit.
**Purpose:** prevent a new parallel owner from being introduced while the listed decisions are implemented or reviewed.

| Responsibility | Proposed authoritative owner | Consumers / subordinate modules | Non-owner rule | Decision state |
|---|---|---|---|---|
| Speaker identity, role, and base label | `speakerResolutionEngine.ts` | pre-workspace, package, workspace | No second speaker resolver | Confirmed by active pipeline |
| Entity aliases | `entityRegistry.ts` | correction report and AI; speaker engine may consume | Do not add local metadata alias registries | Confirmed by active pipeline |
| Q/A classification and sequence repair | `transcriptParagraphs.ts` + `qaStructureUtils.ts` | package/editor/export | Do not wire `structureEngine.ts` in parallel | Proposed; review by 2026-08-03 |
| Objection semantics | `transcriptParagraphs.ts` | future richer extraction must move into this owner | `structureEngine.ts` remains unwired | Proposed; review by 2026-08-03 |
| Recording boundaries | `boundaryEngine.ts` | callback and paragraph/package consumers | Owns only pre/off/post-record and boundary synthetic rows | Confirmed by active pipeline |
| Proceedings/examination events | `transcriptParagraphs.ts` | package/editor/export | Must not emit recording-boundary events | Proposed taxonomy; review by 2026-08-03 |
| Deterministic correction rules | `correctionRegistry.ts` | CFE, reports, any future engine | Rules must not be duplicated | Confirmed by active pipeline |
| Deterministic correction application | CFE active path | report may detect; UI may display | Do not activate `correctionEngines.ts` alongside CFE | Proposed; review by 2026-08-03 |
| Geometry / wrapping / tabs | CFE + `geometryProfile.ts` | package/export | Do not activate `formattingEngine.ts` alongside CFE | Proposed; review by 2026-08-03 |
| Persisted residual review queue | One persisted queue contract, proposed owner `correctionOrchestrator.ts` | AI review contributes evidence; UI renders it | AI must not create a competing queue | Pending implementation decision |
| AI review policy and auto-apply | `aiReview.ts` | `aiSuggestionEngine.ts` generates model output | AI remains residual; auto-apply requires explicit configuration approval | Confirmed by active pipeline |

## Tested-but-unwired risk class

`structureEngine.ts`, `formattingEngine.ts`, `correctionEngines.ts`, and `correctionValidator.ts` are **tested-but-unwired**. Passing unit tests do not make them pipeline owners.

Before 2026-08-03, each must receive one explicit disposition:

1. integrate into the named owner through output-parity tests and remove the replaced path; or
2. mark deprecated/quarantined, prevent new production imports, and schedule future removal.

No module in this class may be wired directly into the callback, workspace, or export path until this record is updated.

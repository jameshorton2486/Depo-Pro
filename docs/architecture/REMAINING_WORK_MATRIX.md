# Remaining Work Matrix

**Audit date:** 2026-07-20. This supersedes the July 13 matrix where repository evidence differs.

| Planned subsystem | Current implementation | Status | Remaining work |
|---|---|---|---|
| Raw Deepgram integrity | `integrityAudit.ts`, enforced in callback | Already complete | Maintain tests; no second audit layer |
| Canonical integrity | `canonicalIntegrity.ts`, enforced before ingest | Implemented | Wave 23B now covers identity/reference, ordinal, timing, span, duplicate, and auto-chunk diagnostics; retain this owner for future read-only checks. |
| Multi-file merge | `multifileCallbackFlow.ts` + `multifileMerge.ts` | Already complete | Operational validation only |
| Boundary processing | `boundaryEngine.ts`, callback-owned | Already complete | Define boundary versus proceedings-event boundary explicitly |
| Speaker resolution | `speakerResolutionEngine.ts`, persisted through pre-workspace structure | Already complete | Consume `entityRegistry` there if case aliases need stronger matching |
| Entity registry | `entityRegistry.ts`, consumed by correction report and AI input | Partially complete | Thread to speaker resolution; avoid duplicate metadata aliases elsewhere |
| Q/A and dialogue production | `transcriptParagraphs.ts` + `qaStructureUtils.ts` | Implemented but broad | Freeze it as the active owner or migrate proven logic from unused `structureEngine.ts`; do not run both |
| Proceedings/examination production | `transcriptParagraphs.ts`; boundary synthetic rows in `boundaryEngine.ts` | Partial | Define a single event contract and assign each parenthetical/event to one owner |
| Objection classification | Active heuristic in `transcriptParagraphs.ts`; richer alternative in unused `structureEngine.ts` | Partial / duplicated | Choose active owner before enabling structure engine |
| Deterministic corrections | `correctionRegistry.ts` + active CFE render path; report path also detects rules | Partial | Separate rule definition, application, and reporting; decide whether correction application moves upstream |
| Correction validation | `correctionValidator.ts` exists, no production caller found | Unused | Either wire it as the sole validation gate or formally retire it |
| Residual review queue | `correctionOrchestrator.ts` and AI review independently create queues/signals | Partial / duplicated | Establish one persisted queue authority; other modules should contribute evidence only |
| Geometry | CFE is active; `formattingEngine.ts` is not production-wired | Partial / duplicated | Declare CFE the current owner or replace it deliberately after parity proof |
| Workspace presentation | `workspaceService.ts`, `buildEditorContent.ts`, structured package path | Partial | Keep legacy fallback read-only; persist/load package only if it removes a demonstrated gap |
| Export | `transcriptDownloads.ts` consumes structured package | Already complete | Maintain geometry/export parity tests |
| AI review | `aiReview.ts` + `aiSuggestionEngine.ts` + edge function | Already complete | Keep AI constrained to residual ambiguity and pending suggestions by default |

## Recommended order

1. Freeze the active owners in `SINGLE_OWNER_AUDIT.md`.
2. Resolve the review/correction ownership boundary.
3. Decide whether `structureEngine.ts`, `formattingEngine.ts`, and `correctionEngines.ts` are integration targets or retired experiments.
4. Add entity-registry consumption to speaker resolution only if tests demonstrate a current resolution gap.
5. Extend canonical integrity in place.
# Current Implementation Map

**Audit date:** 2026-07-20
**Scope:** active Deepgram-to-workspace, review, and export pipeline.
**Status:** `Implemented`, `Partial`, `Obsolete`, `Unused`, `Deprecated`, or `Planned`.

| Module | Purpose | Producer / invocation | Consumer | Status | Current owner / audit finding |
|---|---|---|---|---|---|
| `transcribe-start` | Authenticates a request, creates job state, builds and submits the Deepgram request | Intake/transcription service | Deepgram and `transcribe-callback` | Implemented | Transcription submission owner |
| `transcribe-callback` | Authenticates callback, stores raw response, sequences ingest, failure routing, snapshot capture, and async AI trigger | Deepgram | persisted transcript rows; workspace pipeline | Implemented | Pipeline orchestrator, not semantic owner |
| `integrityAudit.ts` | Audits raw Deepgram payload completeness and expected speakers | callback | manual-review route or merge flow | Implemented | Raw-response integrity owner |
| `normalize.ts` | Converts Deepgram response to canonical speaker, utterance, and word rows | merge flow | canonical merge/persistence | Implemented | Canonical normalization owner |
| `multifileCallbackFlow.ts` / `multifileMerge.ts` | Advance sequential source jobs and merge their normalized output | callback | canonical integrity and ingest | Implemented | Multi-file sequencing and merge owner |
| `canonicalIntegrity.ts` | Audits merged canonical timing, duplicate, and ordering conditions | callback | manual-review route or ingest | Partial | Canonical integrity owner; diagnostics can still expand |
| `boundaryEngine.ts` | Marks pre/off/post-record text and creates boundary synthetic rows | callback | persisted utterances and paragraph production | Implemented | Boundary inclusion/exclusion owner |
| `speakerResolutionEngine.ts` | Resolves speaker roles/display names and produces display document | pre-workspace, workspace load, package builder | persisted speaker labels and paragraphs | Implemented | Authoritative base speaker-semantic owner |
| `preWorkspaceStructure.ts` | Applies speaker/line-type semantics and prepares inclusion-page metadata before workspace | callback | transcript persistence | Implemented | Pre-workspace orchestration owner |
| `transcriptParagraphs.ts` | Builds active paragraph semantics, Q/A/SP/PN/HEADER labels, proceedings/examination text, and rendered paragraph text | pre-workspace and package builder | structured package, editor, exports | Partial | Active paragraph-production owner; presently broad |
| `qaStructureUtils.ts` | Repairs Q/A paragraph sequence after paragraph production | `transcriptParagraphs.ts` | paragraphs | Implemented | Q/A sequence repair sub-owner; not a separate pipeline entry |
| `depositionRegionEngine.ts` | Classifies caption/proceedings/testimony/certification regions | paragraph/package production | structured package | Implemented | Region-classification owner |
| `structuredTranscriptPackage.ts` | Builds versioned workspace/export package with provenance | editor content and exports | workspace rendering/export | Implemented | Contract assembly owner |
| `buildEditorContent.ts` | Adapts loaded document/package to editor content; retains legacy fallback | workspace UI | TipTap editor | Partial | Presentation adapter; fallback must not gain semantics |
| `workspaceService.ts` | Loads persisted rows, applies stored semantic fields, and saves working state | workspace UI | `DocumentContext` | Partial | Persistence/load owner; not an inference owner |
| `entityRegistry.ts` | Builds case-entity canonical/alias registry | correction report and AI suggestion input | correction/AI consumers | Implemented | Entity registry owner; speaker engine does not yet consume it |
| `correctionRegistry.ts` | Defines deterministic correction rules and flags | CFE, correction/report modules | correction consumers | Implemented | Rule-data owner |
| `cfe.ts` | Active formatted-line construction, deterministic display corrections, punctuation, and geometry profile use | paragraph production | structured package/export | Implemented | Active rendering/formatting owner |
| `correctionOrchestrator.ts` | Generates correction report, retranscription candidates, and curated review queue | `DocumentContext` | Corrections UI | Partial | Active report owner, but is recalculated at render/load time |
| `correctionEngines.ts` / `correctionValidator.ts` | Alternative correction application and validation model | tests only found in production search | no production caller found | Unused | Candidate future subsystem; not authoritative today |
| `structureEngine.ts` | Alternative Q/A/objection/split/flow classifier | tests only found in production search | no production caller found | Unused | Candidate subsystem; overlaps active paragraph production |
| `formattingEngine.ts` | Alternative validation-block geometry and formatting | tests only found in production search | no production caller found | Unused | Candidate subsystem; overlaps CFE geometry |
| `aiReview.ts` | Builds residual AI-review input, skip/auto-apply decisions | `ai-review` edge function | persisted AI suggestion fields | Implemented | AI review policy owner |
| `aiSuggestionEngine.ts` | Calls model and derives AI suggestion payload/context | `ai-review` edge function | AI review persistence | Implemented | AI suggestion generation owner |
| `transcriptDownloads.ts` | Produces printable, Word, and text exports from structured package | toolbar/export UI | browser download/print | Implemented | Export serialization owner |

## Actual active sequence

`transcribe-start` → Deepgram → `transcribe-callback` → raw integrity → sequential advance / merge → canonical integrity → atomic ingest → boundary processing → pre-workspace speaker + paragraph semantics → original snapshot → asynchronous AI review → workspace load → structured package → editor/export.

The callback does **not** invoke `structureEngine.ts`, `formattingEngine.ts`, `correctionEngines.ts`, or `correctionValidator.ts`.

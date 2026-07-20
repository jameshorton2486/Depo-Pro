# Split Commit Proposals

**Status:** Analysis only. Rebuilding these local-only commits would be a history rewrite, which is a stabilization stop condition. No rewrite is authorized.

## `28d2890` — canonical intake integrity

| Proposed replacement | Category | Files | Rationale |
|---|---|---|---|
| A — canonical intake behavior | Architecture | `canonicalIntegrity.ts`, `canonicalIntegrity.test.ts`, `multifileCallbackFlow.ts`, `multifileCallbackFlow.test.ts`, `transcribe-callback/index.ts` | One pipeline integrity change with its tests and callback integration. |
| B — Wave 22 audit prompts | Documentation | `docs/audits/W22-1_AUDIT_PROMPT.md`, `W22-1_IMPLEMENTATION_PROMPT_TIGHTENED.md`, `W22-1_INTAKE_AUDIT_2026-07-06.md` | Documentation must not share a commit with runtime behavior. |

## `6b6a6c8` — Deepgram/two-copy foundations

| Proposed replacement | Category | Files | Rationale |
|---|---|---|---|
| A — two-copy client model | Feature | `src/api/transcriptRepository.ts`, `OriginalTranscriptDialog.tsx`, `OriginalTranscriptDialog.test.tsx`, `docs/TWO_COPY_TRANSCRIPT_MODEL.md` | Original-copy viewer and its client contract. |
| B — transcription reliability infrastructure | Infrastructure | `src/lib/transcriptionJobs.ts`, `_shared/database.ts`, `_shared/deepgramFetch.ts`, `transcribe-watchdog/index.ts`, the three watchdog/original-snapshot migrations | Watchdog/retry infrastructure and schema. |
| C — Deepgram pipeline behavior | Architecture | `buildDeepgramRequest.*`, `multifileMerge.*`, `normalize.*` | Request/normalization behavior with its tests. |

## `24ba644` — Original viewer/retry wiring

| Proposed replacement | Category | Files | Rationale |
|---|---|---|---|
| A — Original viewer wiring | Feature | `workspaceService.ts`, `Toolbar.tsx`, `DocumentContext.tsx` | UI/data wiring for original transcript access. |
| B — server request/retry wiring | Infrastructure | `transcribe-start/index.ts`, `buildDeepgramRequest.ts`, `managedKeyterms.ts`, `preWorkspaceStructure.ts`, `buildUfmMetadata.ts` | Edge request construction and pipeline input. |
| C — shared formatting/editor imports | Refactor | `pagination.ts`, `stageS/colloquy.ts`, `abbreviationRegistry.ts`, `cfe.ts`, `honorificHelper.ts`, `legalText.ts`, `speakerResolutionEngine.ts`, `transcriptParagraphs.ts` | Deployment-driven module-resolution and shared formatting changes require independent verification. |

## Decision required before Phase 3

Choose one:

1. Preserve the three commits unchanged and commit only future working-tree groups.
2. Authorize rebuilding the local-only history using these replacement groups.

Option 2 is a history rewrite and requires an explicit, separate approval after a fresh backup verification.

## Preservation directive

These proposals are historical engineering documentation. Do not execute them unless a future repository-maintenance effort receives explicit authorization to rewrite local history after a fresh verified backup.

# Working Tree Analysis

The primary checkout is a mixed workstream, not a commit-ready change set.

## Observed groups

| Group | Examples | Handling recommendation |
|---|---|---|
| Transcription pipeline and Edge Functions | `transcribe-start`, `transcribe-callback`, two-copy/retry files, Deepgram/keyterm logic | Review and commit as a pipeline slice with focused tests and Deno checks. |
| Database migrations | replacement watchdog/original-snapshot/atomic-ingest migrations; deleted earlier migration names | Treat as one migration-history review. Confirm remote history and deployment state before any commit. |
| UFM/intake/formatting UI | legal-text formatting, extracted fields, participants, toolbar, intake context | Split from pipeline work; unit-test field projection and formatting. |
| Transcript architecture work | canonical integrity, boundary engine, correction/AI/speaker modules, additions/deletions | Preserve ownership boundaries; commit by independently testable subsystem. |
| Tests | broad changes/new tests across API, UI, transcript, formatting, keyterms | Keep tests with the behavior they establish. |
| Documentation and reports | architecture, audit, release, dashboard, prompt and sprint documents | Commit after source decisions; do not mix generated status reports with product behavior. |
| Generated/suspicious artifacts | `vite.config.ts.timestamp-1784417693802-fc4563c0a097c.mjs` | Verify provenance; normally ignore/remove only with approval. |

## Risks

- Multiple deleted modules and replacement migrations make a catch-all commit difficult to review and risky to deploy.
- Existing local WIP predates this audit. It must not be reformatted, discarded, or silently included in a new commit.
- Documentation includes historical and current reports; publication should distinguish dated evidence from living standards.

## Proposed commit partition (approval-gated)

1. Migration-history/reconciliation commit.
2. Deepgram and transcription pipeline behavior plus its tests.
3. UFM/intake/field-formatting behavior plus its tests.
4. Transcript integrity/boundary-engine behavior plus its tests.
5. Documentation and audit materials.
6. Generated artifact ignore/removal only after source verification.

No staging was performed by this audit.

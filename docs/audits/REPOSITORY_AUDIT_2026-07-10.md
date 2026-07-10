# Repository Audit and Remediation Report

**Date:** 2026-07-10  
**Baseline:** `feature/stage3-workspace-core` at `499ff1cd734b1a742b9146b6a7c8ab2955dadf51`  
**Remediation branch:** `agent/repository-integrity-remediation`

## Executive verdict

The repository contains substantial, functioning Stage 1–3 and transcript-pipeline work, but it is not ready to merge directly into `main` without a verified integration plan. The active workspace branch has diverged from `main` and carries a large body of work. Data-integrity protections are generally explicit, but one dangling word-reference defect was confirmed and repaired in this remediation.

## Architecture

The runtime is a Vite, React, and TypeScript application with Supabase-backed persistence and Edge Functions. Transcript processing is organized across:

- intake and workflow UI in `src/components`
- persistence adapters in `src/api`
- canonical transcript transforms in `src/lib/transcript`
- canonical formatting in `src/lib/format`
- Supabase Edge Functions and migrations in `supabase`

The governing documents require immutable raw transcript content, stable word identity, human-controlled AI review, synthetic fixtures, centralized state, and no silent transcript mutations.

### Architecture drift requiring an owner decision

- `docs/architecture/MASTER_ARCHITECTURE.md` describes the initial MVP as local-only JSON/filesystem storage, while the active application is materially Supabase-backed.
- `AGENTS.md` describes TipTap v2, while `package.json` resolves TipTap v3 packages.
- The active development branch and `main` have diverged. A normal fast-forward merge is not available.

These are documentation/governance conflicts, not safe targets for automatic code rewriting.

## Confirmed data-integrity defect

### Removed words remained referenced by utterances

`buildEditorDocumentFromSnapshot` constructed utterance `word_ids` from all words in a visible utterance, then separately excluded rows where `removed = true` from `document.words`.

Impact:

- dangling word references in the editor document
- possible reconstruction and rendering inconsistencies
- possible save/review failures where utterance membership references a missing word

Remediation:

- exclude removed words while constructing utterance `word_ids`
- add a regression test proving removed words are absent from both collections

The repair does not alter `raw_text`, timestamps, confidence, word IDs, certification state, or export locks.

## Security assessment

Recent baseline commits already address several material risks:

- JWT and signed-URL logging removed
- callback token validation invariant documented
- transcription-start CORS allowlist support added
- speaker-resolution ownership policies added
- real PII removed from tracked fixtures
- AI auto-apply gated and audited
- export operations gated and tracked

Remaining operational requirements:

- keep service-role, Deepgram, and Anthropic secrets out of browser-exposed `VITE_` variables
- do not run seed, migration, transcription, or destructive verification scripts against production
- preserve private storage policies for raw transcript and audio artifacts
- require explicit environment identification before database-changing smoke tests

No live Supabase data or external service was accessed during this remediation.

## Missing and incomplete functionality

The repository's existing tracker correctly keeps these items owner-gated:

- speaker add/remove/reassign structural persistence
- paragraph split/merge and Layer-2 overlay design
- controlled diarization comparison using real audio
- production DOCX/PDF SaaS export
- live transcript formatting verification against certified examples

These should not be represented as complete until persistence, auditability, and certification-lock behavior are designed and tested.

## Code quality and verification

The current `package.json` provides:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`, which includes application type-checking before Vite build

A repository-level GitHub Actions workflow was absent. This remediation adds a least-privilege PR gate that runs all four commands using Node 20.19.5, without production secrets.

The workflow is new in this pull request, so GitHub will not treat it as an established base-branch check until it is reviewed and merged. Full-suite results must therefore be recorded before the functional fix is merged.

## Documentation and usability

A root `README.md` was missing. This remediation adds:

- project purpose and architecture map
- immutable transcript-data rules
- safe mock-mode setup
- environment guidance
- required verification commands
- contribution and production-safety constraints

## Branch audit

Verified through GitHub commit comparison:

| Branch | Unique commits relative to comparison base | Disposition |
|---|---:|---|
| `main` | protected | Keep |
| `feature/stage3-workspace-core` | 144 ahead and 62 behind `main` | Keep; active integration baseline |
| `feature/stage3-provider-migration` | 0 ahead of workspace core; 346 behind | Safe cleanup candidate |
| `feature/stage3-adapter-layer` | 0 ahead of `main`; 265 behind | Safe cleanup candidate |
| `feature/stage3-mount-contract` | 0 ahead of `main`; 265 behind | Safe cleanup candidate |

Branch deletion should occur only after the draft PR is preserved and a maintainer confirms no external deployment points at those refs.

## Merge requirements

Before merging:

1. Run the new verification workflow or execute all four npm checks in a complete checkout.
2. Confirm no deployment uses a stale cleanup-candidate branch.
3. Review the `main` versus workspace-core divergence and choose merge, rebase, or replacement strategy.
4. Keep this PR targeted at `feature/stage3-workspace-core`; do not retarget it to `main` without a separate integration review.

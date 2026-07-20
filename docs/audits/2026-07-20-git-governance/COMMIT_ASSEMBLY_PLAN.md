# Commit Assembly Plan

**Status:** Planning only. No implementation, reconciliation, staging, or push is authorized by this document.

## Completed

| Commit / PR | Outcome |
|---|---|
| `docs(governance): add repository stabilization standard` | Merged as PR #5 through clean branch `docs/repository-stabilization`. |

## Proposed assembly queue

| Order | Proposed branch / PR | Purpose | Transcript impact | Scope | Gate before assembly |
|---:|---|---|---|---|---|
| 1 | `docs/architecture-audit` | Preserve current architecture-audit documents as permanent project documentation | Gives implementation a stable, auditable ownership map | Current implementation map, drift report, single-owner audit, remaining-work matrix, supporting architecture evidence | Validate links and distinguish historical snapshots from living documents. |
| 2 | `feat/w23b-canonical-integrity` | Expand canonical integrity validation | Invalid transcript states are blocked before the workspace | `canonicalIntegrity.ts`, its tests, and W23B-specific documentation only | Re-run focused canonical-integrity tests and typecheck. |
| 3 | `feat/w23c-proceedings` | Improve proceedings boundary handling | Duplicate proceedings are eliminated | `boundaryEngine.ts` and its tests only | Re-run focused boundary-engine tests and verify no unrelated transcript modules are included. |
| 4 | `feat/w22-structured-transcript-core` | Establish structured transcript core types, region classification, and Q/A utility | Supplies the production substrate for later paragraph work | `structuredTranscript`, paragraph types, region engine, Q/A utility, and focused tests only | Confirm package and paragraph production remain deferred. |
| 5 | `feat/w23d-examination-state-machine` | Extend paragraph production with examination and attorney/witness transition ownership | Correct examination transitions without parallel ownership | `transcriptParagraphs.ts`, focused tests, and implementation-driven documentation only | Confirm the owner is present and define transition fixtures before staging. |
| 6 | `feat/w23-structured-transcript-package` | Add the package consumer after paragraph production exists | Makes the established structured transcript consumable | `structuredTranscriptPackage.ts` and focused tests only | Verify it consumes, rather than recreates, paragraph production. |
| 7 | `feat/w23e-dialogue-production` | Produce stable dialogue blocks from resolved examination state | Cleaner, more stable reporter-visible dialogue blocks | Dialogue production implementation and focused tests only | Verify it consumes the W23D state boundary without duplicating ownership. |
| 8 | `feat/entity-registry` | Establish the entity-registry capability | Better deterministic name resolution for later corrections | `entityRegistry.ts` and its tests only | Confirm single owner and integration boundary before staging. |
| 7 | `fix/editor-*` | Separate editor/UI fixes into independently reviewable PRs | Reduces workspace repair friction without bundling unrelated behavior | Remount, presentation, toolbar, formatting, and intake UI changes; each becomes its own narrow branch | Produce per-feature file lists; do not create a catch-all editor PR. |
| 8 | `feat/transcription-infrastructure` | Complete transcription callback/start and migration history | More reliable transcript creation and recovery | Edge Functions, shared server code, and migrations, partitioned by deployed behavior | Reconcile migration names/history and run Deno checks before assembly. |
| 9 | `feat/ufm-intake-formatting` | Deliver UFM, extracted-field, and contact-formatting improvements | Better reporter-facing metadata consistency | UFM, field projection, intake and participant paths plus their tests | Verify field ownership and formatting fixtures. |
| 10 | `docs/operations-and-release` | Commit remaining release/checklist/sprint material | Keeps release operation reproducible without changing transcript behavior | Documentation-only, after duplicate/historical reports are classified | Link validation and historical-status review. |

## Historical local commits

The 16 pre-governance local-only commits remain preserved and unpublished. They are not to be pushed as a batch. The three mixed commits (`28d2890`, `6b6a6c8`, `24ba644`) remain historical documentation candidates only; their split proposals must not be executed without separate authorization.

## Assembly protocol for every item

1. Create a clean branch from the current remote `feature/stage3-workspace-core`.
2. Transfer only the approved file list into that branch.
3. Run the narrowest relevant verification, then the required project gate.
4. Inspect the branch diff to confirm one purpose and no unrelated files.
5. State the reporter-visible transcript impact in the PR description.
6. Push one branch and open one PR.
7. Merge only after review and green CI.
8. Record its destination and remaining local-history relationship in the recovery log.

After the architecture-audit PR merges, create no new planning/governance document unless implementation uncovers a genuine architectural gap. New PRs should implement functionality, fix a bug, add tests, or document an implementation change.

## Reconciliation gate

Do not begin `feature/stage3-workspace-core → release/2026.1 → main` until all of the following are true:

- The primary worktree is clean.
- No unstaged or untracked implementation files remain.
- Wave 23 PRs are reviewed and merged.
- CI is green on the authoritative branch and candidate release branch.
- The release branch has been reviewed.
- Every remaining local commit, stash, worktree, and branch has a completed disposition.

Until then, `main` is a preserved reconciliation target, not an implementation destination.

## Required implementation PR evidence

Every implementation PR must include the following sections.

### Transcript Impact

- **Before:** the observable transcript problem.
- **After:** the observable corrected behavior.
- **Reporter Repair Burden:** the manual repair avoided or reduced.

### Architectural Impact

- **Architectural Owner:** the authoritative module/domain.
- **New or changed owner:** the implementation file responsible after the PR.
- **Consumers:** affected workspace, export, validation, or pipeline consumers.
- **Ownership changes:** explicit statement of none or the approved change.
- **Duplicate logic removed:** explicit statement of none or the removed location.

### Fixture Validation

- **Approved synthetic fixture(s):** pass/fail.
- **Authorized secure validation fixture(s):** pass/fail recorded outside this repository; never commit client names, transcripts, or source artifacts.
- **Regression fixture(s):** pass/fail.
- **CI, typecheck, and tests:** pass/fail with run links where available.

## Measurable Wave 23 exit criteria

| PR | Transcript-visible success criteria |
|---|---|
| W23B — Canonical Integrity | No orphan words; no orphan utterances; no invalid/reversed timings; no invalid word-to-utterance bounds. |
| W23C — Proceedings | Duplicate procedural events removed; witness-swearing event appears once; on/off-record transitions remain stable. |
| W23D — Examination State Machine | Examination and `BY` transitions detected; attorney/witness ownership is stable; proceedings do not leak into testimony. |
| W23E — Dialogue Production | Q., A., objections, and colloquy are classified into stable dialogue blocks. |
| Entity Registry | Known approved entities resolve deterministically without duplicate ownership. |

The [Transcript Quality Scorecard](../../dashboard/TRANSCRIPT_QUALITY_SCORECARD.md) is updated after every implementation PR. It is a delivery metric, not a new planning process.

## Required implementation PR release note

```markdown
## Summary
What was implemented.

## Transcript Impact
Before:
After:
Reporter Repair Burden:

## Architectural Impact
Architectural Owner:
Consumers:
Ownership Changes:
Duplicate Logic Removed:

## Validation
Tests:
Typecheck:
CI:
Fixture validation:

## Transcript Quality Scorecard
Recognition:
Semantics:
Production:
Formatting:
Reporter Repair Burden:
```

## Frozen governance baseline

After the architecture-audit documentation PR merges, freeze the structure of the Repository Stabilization Standard, Project Operating Standard, Commit Assembly Plan, Transcript Quality Scorecard, Release Dashboard, single-owner documentation, and architecture hierarchy. Values, implementation-driven evidence, and additive decision records may change; wholesale governance rewrites require a genuine architectural gap and explicit approval.

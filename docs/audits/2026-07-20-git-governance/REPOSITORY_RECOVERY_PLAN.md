# Repository Recovery Plan

## Current recovery snapshot

| Item | Status |
|---|---|
| Authoritative development branch | `feature/stage3-workspace-core` (current GitHub default) |
| Default-branch reconciliation | **Pending** — `main` diverges from the current default |
| Unpushed commits | **16** on active branch; **5** on local `main` |
| Mixed working tree | **Yes** — source, tests, Edge Functions, migrations, scripts, and documentation are interleaved |
| Worktrees requiring review | **2 dirty auxiliary worktrees**; 1 additional detached clean worktree still needs a retention decision |
| Stashes requiring classification | **3** |
| Draft PRs | **#4** — certification mutation locks |
| Repository ready for further implementation? | **No** — stabilization Phase 1–4 must complete first |
| Repository ready for release candidate? | **No** |

## Recovery order

### To become Implementation Ready

- [ ] Classify the 16 active-branch commits and 5 local-only `main` commits.
- [ ] Classify every primary-worktree file into a single owner/group; preserve all unrelated WIP.
- [ ] Review the 3 stashes and two dirty auxiliary worktrees; create named preservation refs for unique work.
- [ ] Decide whether the clean detached worktree is still required.
- [ ] Partition the primary worktree into documentation, architecture, Wave 23B, Wave 23C, repository governance, migration/pipeline, and generated-artifact groups.
- [ ] Run scoped validation for each group and create focused commits locally.
- [ ] Confirm the branch model and resolve/record the relationship of `main`, the active default branch, and `release/2026.1`.
- [ ] Review PR #4 against the resulting trunk state; merge or close with a documented rationale.
- [ ] Push only reviewed logical commits and verify remote refs/PR state.

### To become Release Candidate Ready

- [ ] Start from a clean working tree at a pushed, reviewed SHA.
- [ ] Ensure the chosen release branch has verified branch-protection/ruleset controls in GitHub Settings.
- [ ] Require a green Verify run (typecheck, lint, tests, build) on the release candidate SHA.
- [ ] Verify database migrations and Edge Function deployment state separately from Git state.
- [ ] Produce release notes, rollback reference, and migration/deployment instructions.
- [ ] Create an annotated tag and GitHub release only after all preceding checks pass.

## Guardrails

- No deletion, reset, pruning, worktree removal, force-push, tag move, or history rewrite during stabilization without separate written approval.
- Do not resume Wave 23D until the “Implementation Ready” checklist is complete.
- Do not use a catch-all WIP commit; each commit must have one reviewable purpose and its associated tests.

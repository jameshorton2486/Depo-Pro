# Repository Cleanup Plan

## Approval boundary

**This plan is not authorization to delete, reset, prune, force-push, move, close, merge, or change GitHub settings.** Obtain explicit written approval for each execution phase after the affected refs and paths are rechecked.

## Phase 0 — Preserve and classify (highest priority)

1. Inventory the three stashes and the two dirty auxiliary worktrees.
2. Identify the provenance of the generated-looking Vite timestamp file and `mockServiceWorker.js` changes.
3. Inspect the unreachable commits against reflogs/worktree history; create named preservation refs where any content is unique.
4. Record the outcome in a short decision log.

**Exit criterion:** no unique work depends solely on a detached worktree, stash, or unreachable object.

## Phase 1 — Separate current WIP

1. Produce an ownership map for the primary working tree.
2. Split the changes into migrations, transcription pipeline, UFM/formatting, transcript engine, tests, and documentation.
3. Run scoped validation for each slice; run the full Verify-equivalent gate before publication.
4. Create small reviewed commits/PRs; do not use a catch-all WIP commit.

**Exit criterion:** clean or deliberately shelved primary worktree; each change has a test/verification story.

## Phase 2 — Resolve branch model

1. Analyze all `main`-only commits and the five local-only `main` commits.
2. Choose and document trunk or integration model.
3. Reconcile only through an approved PR/merge plan, preserving `archive/main-pre-wave23` as a recovery point.
4. Push the selected baseline and confirm the remote default is deliberate.

**Exit criterion:** one documented active development branch and one documented release branch.

## Phase 3 — PR and worktree hygiene

1. Resolve draft PR #4.
2. After Phase 0 preservation, remove only worktrees whose contents are recoverable and approved for removal.
3. Remove stale local tracking branches only after their worktrees are gone and merged/superseded content is verified.
4. Consider enabling automatic deletion of merged remote head branches.

## Phase 4 — GitHub/release controls

1. Verify branch-protection/ruleset configuration in GitHub UI (API access was unavailable).
2. Configure protection for the chosen release branch and require Verify.
3. Publish a release policy and create releases only from clean, verified, pushed SHAs.
4. Optionally organize labels/milestones and add contribution/ownership files.

## Explicit non-actions

- Do not run `git reset --hard`, `git clean`, `git gc --prune`, `git reflog expire`, branch deletion, worktree removal, migration deletion, or force-push as part of this plan without a separate approved command sequence.
- Do not rewrite public/shared history merely to make it look cleaner.

# Commit Audit

**Scope:** reachable history plus local recoverability references, sampled through 2026-07-20. No history rewrite is recommended.

## Strengths

- Recent commits are descriptive and generally use conventional prefixes/scopes.
- The core recent milestones are separately identifiable: transcript contract (`9a49f4a`), Deepgram reliability/two-copy foundations (`6b6a6c8`), callback atomic ingest (`2f55e06`), two-copy UI wiring (`24ba644`), and deployment documentation (`9afb41c`).
- Security/toolchain updates were processed through merged PRs #1–#3.

## Findings

| Finding | Evidence | Recommendation |
|---|---|---|
| Active branch has 16 unpublished commits | `origin/feature/stage3-workspace-core...feature/stage3-workspace-core = 0/16` | Review, test, and publish in coherent PR-sized groups. |
| `main` has 62 unique remote commits and 147 commits missing vs active default | `origin/feature/stage3-workspace-core...origin/main = 147/62` | Perform a dedicated reconciliation analysis; do not use reset/force-push as a shortcut. |
| One benign self-merge exists | `462c1e8` | Leave history intact; prefer PR/rebase workflow going forward. |
| Some squash subjects are sentence-form rather than conventional commits | PR #2/#3 merge commits | Cosmetic only; enforce a PR-title convention if desired. |
| Unreachable commits exist | `git fsck --no-reflogs --unreachable` reported multiple commits/objects | Do not run pruning or aggressive GC. First determine whether they are covered by stashes, tags, reflogs, or abandoned worktrees. |

## Commit policy recommendation

Use one concern per commit/PR: migrations, edge-function behavior, UI formatting, tests, documentation, and generated artifacts should not be bundled. Use `feat|fix|docs|test|chore(scope): summary`, require a green Verify run, and never commit a broad “pre-existing changes” bundle without an inventory.

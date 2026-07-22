# Branch Audit

**Mode:** Read-only. “Keep”, “reconcile”, and “review” are recommendations, not actions.

## Local branches

| Branch | Head | Tracking / state | Recommendation |
|---|---:|---|---|
| `feature/stage3-workspace-core` | `9afb41c` | `origin/feature/stage3-workspace-core`, 16 ahead | Keep as active integration line; publish only after the mixed worktree is separated and tests are rerun. |
| `main` | `3a8ec34` | `origin/main`, 5 ahead | Keep. Reconcile deliberately; do not force-push or replace it. |
| `release/2026.1` | `9a49f4a` | aligned with remote | Keep as historical/release marker pending a written release policy. |
| `archive/main-pre-wave23` | `3a8ec34` | remote counterpart exists | Keep; it is an explicit recoverability reference. |
| `dependency-security-audit-local` | `f1528e1` | tracks deleted `origin/agent/dependency-security-audit` | Preserve until its worktree is inspected and the already-merged PR #2 is confirmed as sufficient. |

## Remote branches

| Branch | Relationship / status | Recommendation |
|---|---|---|
| `feature/stage3-workspace-core` | GitHub default; local is 16 commits ahead | Keep; it is the active baseline. |
| `main` | 147 commits behind and 62 commits ahead of the default branch; local also has 5 unpushed commits | Critical reconciliation decision. Do not reset, merge, or rename without an approved plan. |
| `release/2026.1` | 12 commits behind active default; no unique commits relative to it | Keep as release branch/tag source. |
| `archive/main-pre-wave23` | archival reference | Keep. |
| `agent/certification-mutation-locks` | head of open draft PR #4 | Keep until PR #4 is merged or closed. |

## Default-branch observation

GitHub reports `feature/stage3-workspace-core` as default. `git remote show origin` agrees. This is operationally valid, but it conflicts with conventional expectations and leaves `main` ambiguous. Select one documented model before production release:

1. **Trunk model:** reconcile the active branch into `main`, make `main` the protected default, and use short-lived feature branches.
2. **Integration model:** retain `feature/stage3-workspace-core` temporarily as default, document it as the integration branch, and define when/where releases merge.

Neither model should be applied until unpushed work and `main`-only commits are classified.

# Worktree Classification

| Worktree | Ref | Classification | Evidence / recommendation |
|---|---|---|---|
| `C:\Users\james\Projects\Depo-Pro` | active default branch at `9afb41c` | Active | Primary mixed working tree. Preserve in place; no cleanup action. |
| `C:\tmp\depo-pro-vitest-count` | detached at `24d064c` | Preserve | Clean, but detached historical reference; retain until its purpose is formally dispositioned. |
| `C:\Users\james\Projects\depo-pro-deps` | `dependency-security-audit-local` at `f1528e1` | Preserve | Contains a `mockServiceWorker.js` modification and a security-audit branch whose remote tracking branch is gone. |
| `C:\Users\james\Projects\depo-pro-pr1` | detached at `93a1a04` | Preserve | Contains modified `mockServiceWorker.js` plus two untracked npm-audit JSON reports. |

No worktree is classified as removable in Phase 1. A removal recommendation requires a named preservation reference and a fresh recovery verification.

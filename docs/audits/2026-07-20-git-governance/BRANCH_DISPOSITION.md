# Branch Disposition

| Branch/ref | Purpose | Recommendation |
|---|---|---|
| `feature/stage3-workspace-core` | Current development/default integration line | Keep. |
| `main` | Historical release/mainline with 62 unique remote commits and 5 local-only commits | Merge only after approved reconciliation analysis; preserve meanwhile. |
| `release/2026.1` | Release reference at transcript-region production baseline | Keep. |
| `archive/main-pre-wave23` | Explicit recovery reference for `main` | Archive/keep. |
| `dependency-security-audit-local` | Local security-audit worktree branch; remote tracking branch removed | Close after approval, but only after its worktree is preserved and reconciled. |
| `origin/agent/certification-mutation-locks` | Head of draft PR #4 | Keep until PR is merged or closed. |
| `origin/HEAD` | Remote symbolic reference | No action. |

Every listed ref has exactly one stated purpose. No branch merge, archive, close, deletion, or default-branch change is authorized by this classification.

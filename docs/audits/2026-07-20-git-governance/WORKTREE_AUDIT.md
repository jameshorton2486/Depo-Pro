# Worktree Audit

**Rule:** no worktree removal is authorized by this audit.

| Path | Ref / branch | Status | Risk and recommendation |
|---|---|---|---|
| `C:\Users\james\Projects\Depo-Pro` | `feature/stage3-workspace-core` @ `9afb41c` | Large mixed dirty set | Active worktree. Preserve. Separate changes by ownership and concern before staging. |
| `C:\tmp\depo-pro-vitest-count` | detached @ `24d064c` | Clean at inspection | Recoverability worktree for a June two-copy/revert-era commit. Record why it exists before removal. |
| `C:\Users\james\Projects\depo-pro-deps` | `dependency-security-audit-local` @ `f1528e1` | modified `public/mockServiceWorker.js` | Do not remove. Compare the modification with current trunk and decide whether it is generated or intended. |
| `C:\Users\james\Projects\depo-pro-pr1` | detached @ `93a1a04` | modified `public/mockServiceWorker.js`; untracked `npm-audit-all.json`, `npm-audit-production.json` | Do not remove. Preserve/categorize audit artifacts first. |

## Additional recoverability references

- Stashes: `shelve-phase0-backup`, `step0-backup-20260707-121646`, and `temp-before-stage3-switch`.
- Tags: snapshot/archive tags and the transcript-production tag pair point to retained commits.
- `git fsck` reported unreachable objects. This makes destructive worktree cleanup and repository pruning explicitly out of scope.

## Safe future sequence

1. Create a read-only content inventory for each auxiliary worktree and each stash.
2. If a worktree contains unique work, create a named branch or an approved archival commit/tag.
3. Verify recovery from the named ref in a fresh clone/worktree.
4. Only then request approval to remove that single worktree.

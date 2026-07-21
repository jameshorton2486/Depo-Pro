# Branch Consolidation Plan

**Audit type:** READ-ONLY plan (Session 1). **No branch is merged, deleted, or
renamed by this document.** Execution is Session 2, only after approval.

**Guiding constraint:** never discard work. Every branch below is either merged
(recoverable from the trunk), already tagged, or will be tagged before deletion.

---

## Recommended end state

- **`main`** = default branch, protected, reflects the release line.
- **`feature/stage3-workspace-core`** = active development branch (until it is
  reconciled into `main`, at which point it can be retired or kept as the ongoing
  integration branch).
- All merged `feature/stage3-*` and `agent/*` branches deleted.
- WIP snapshots preserved as tags, then deleted as branches.

---

## Per-branch plan

| Branch | Action | Rationale | Pre-req before action |
|--------|--------|-----------|-----------------------|
| `feature/stage3-workspace-core` | **Keep** | Active trunk & GitHub default | Push 12 local commits |
| `main` | **Reconcile → restore as default** | Diverged (62/147); must become the protected release line | Investigate the 62 main-only commits; decide merge vs reset; **approval required** |
| `feature/stage3-adapter-layer` | **Delete (remote)** | 0 ahead of trunk — fully merged | Optional backup tag |
| `feature/stage3-mount-contract` | **Delete (remote)** | 0 ahead — fully merged | Optional backup tag |
| `feature/stage3-provider-migration` | **Delete (remote)** | 0 ahead — fully merged | Optional backup tag |
| `agent/repository-integrity-remediation` | **Delete (local+remote)** | PR #1 merged (squash) | Confirm PR merged into default |
| `agent/dependency-security-audit` (+ `-local` worktree) | **Delete** | PR #2 merged (squash) | Remove worktree `depo-pro-deps` first |
| `agent/dev-toolchain-security` (+ `-local` worktree) | **Delete** | PR #3 merged (squash) | Remove worktree `depo-pro-toolchain` first |
| `agent/certification-mutation-locks` | **Keep** | PR #4 open (draft), 1 commit ahead | Resolve/close PR #4 first |
| `wip/feature-bundle-snapshot` | **Archive as tag → delete** | Local-only WIP; not on remote | `git tag archive/wip-feature-bundle-snapshot <sha>` |
| `wip/pre-w22-features` | **Archive as tag → delete** | Local-only WIP; not on remote | `git tag archive/wip-pre-w22-features <sha>` |

---

## The `main` reconciliation (the one non-trivial decision)

`origin/main` is **62 commits ahead and 147 behind** the trunk. This is the only
item that is not a mechanical cleanup. Before touching it (Session 2, approval
required), determine what the 62 main-only commits are:

```
git log --oneline origin/feature/stage3-workspace-core..origin/main
```

Then choose one path and record it in `OPEN_DECISIONS`:

- **A — trunk is truth:** merge `feature/stage3-workspace-core` into `main` (or
  reset `main` to the trunk after tagging `main` as `archive/main-pre-reconcile`),
  then set `main` as default. Cleanest if the 62 commits are already represented
  or obsolete.
- **B — cherry-pick:** if the 62 commits contain unique, wanted history, graft
  them onto the trunk before promoting to `main`.

Do **not** force-push or reset `main` without an explicit decision and a backup
tag. `main` is public.

---

## Sequence (Session 2, post-approval)

1. Push trunk's 12 local commits.
2. Tag the two WIP branches, then delete them locally.
3. Remove the two merged worktrees; delete their branches (local + remote).
4. Delete the three fully-merged `feature/stage3-*` remote branches.
5. Delete the three squash-merged `agent/*` remote branches (leave #4's).
6. Resolve PR #4; delete its branch when merged/closed.
7. Reconcile `main` per the chosen path; set `main` as default; enable protection.
8. Enable "auto-delete head branches on merge" so this does not re-accumulate.

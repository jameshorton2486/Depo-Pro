# Repository Status

**Audit type:** READ-ONLY (Session 1). No branches merged, deleted, pushed, or rewritten.
**Generated:** 2026-07-13
**Repository:** https://github.com/jameshorton2486/Depo-Pro (PUBLIC)
**GitHub default branch:** `feature/stage3-workspace-core` ⚠️ (not `main`)
**Active development baseline (per README):** `feature/stage3-workspace-core`
**Total commits (HEAD):** 377 · **Working tree:** 79 uncommitted changes

---

## Headline findings

1. ⚠️ **The GitHub default branch is a feature branch** (`feature/stage3-workspace-core`), not `main`. `main` has diverged (62 ahead / 147 behind the trunk) and is stale since 2026-06-17.
2. ⚠️ **No branch protection** on `main` or the default branch.
3. Three `feature/stage3-*` branches are **fully merged** into the trunk (0 ahead) and are pure cleanup candidates.
4. Three `agent/*` branches were **merged via squash PRs (#1–#3)** but not auto-deleted.
5. One open **draft PR (#4)** — `agent/certification-mutation-locks`.
6. The working tree is **dirty (79 files)**, mixing this session's governance docs with pre-existing Stage-3 source changes.

---

## Local branches

| Branch | Tracking | Ahead/behind origin | Last commit | Notes | Recommendation |
|--------|----------|---------------------|-------------|-------|----------------|
| `feature/stage3-workspace-core` * | origin (same) | ahead 12 | 2026-07-12 | Active trunk / GitHub default | **Keep** — push the 12 local commits |
| `main` | origin/main | ahead 5 | 2026-06-17 | Diverged from trunk (62/147) | **Keep + reconcile** (approval-gated) |
| `agent/repository-integrity-remediation` | origin (same) | even | 2026-07-10 | PR #1 merged (squash) | **Delete** after confirm |
| `dependency-security-audit-local` | origin/agent/dependency-security-audit | — | 2026-07-10 | PR #2 merged; **in worktree** `depo-pro-deps` | **Delete** (remove worktree first) |
| `dev-toolchain-security-local` | origin/agent/dev-toolchain-security | — | 2026-07-10 | PR #3 merged; **in worktree** `depo-pro-toolchain` | **Delete** (remove worktree first) |
| `wip/feature-bundle-snapshot` | none | local-only | 2026-07-07 | WIP snapshot | **Archive as tag** then delete |
| `wip/pre-w22-features` | none | local-only | 2026-07-06 | WIP snapshot | **Archive as tag** then delete |

`*` current branch.

## Remote branches

| Branch | vs default (behind/ahead) | Merge status | Recommendation |
|--------|---------------------------|--------------|----------------|
| `origin/feature/stage3-workspace-core` | — | Default / trunk | **Keep** |
| `origin/main` | 147 / 62 | Diverged, stale | **Keep + reconcile**, then restore as default |
| `origin/feature/stage3-adapter-layer` | 350 / 0 | Fully merged | **Delete** (backup tag optional) |
| `origin/feature/stage3-mount-contract` | 350 / 0 | Fully merged | **Delete** |
| `origin/feature/stage3-provider-migration` | 349 / 0 | Fully merged | **Delete** |
| `origin/agent/repository-integrity-remediation` | 0 / 0 | PR #1 merged (squash) | **Delete** |
| `origin/agent/dependency-security-audit` | — | PR #2 merged (squash) | **Delete** |
| `origin/agent/dev-toolchain-security` | — | PR #3 merged (squash) | **Delete** |
| `origin/agent/certification-mutation-locks` | 0 / 1 | PR #4 open (draft) | **Keep** until PR resolved |

## Tags (backup / milestone anchors — all preserved)

`feature-caughtup-to-rc` · `remediation-snapshot` · `stage3-pre-merge-backup` ·
`tp-0-region-engine` · `tp-0.5a-caption-production`

These already provide safe restore points for the merged/stale branches, which is
why deletion (in Session 2, on approval) is low-risk.

## Local worktrees

Two extra worktrees exist for merged branches and can be removed in Session 2:

- `C:/Users/james/Projects/depo-pro-deps` → `dependency-security-audit-local`
- `C:/Users/james/Projects/depo-pro-toolchain` → `dev-toolchain-security-local`

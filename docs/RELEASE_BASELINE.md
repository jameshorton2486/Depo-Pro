# Release Baseline — RC track 2026.1

**Generated:** 2026-07-13
**Release branch:** `release/2026.1` (at `9a49f4a`, from `feature/stage3-workspace-core`)
**Status vocabulary:** `docs/architecture/W0_STATUS_VOCABULARY.md` (v1.0.0, frozen)

---

## Architectural baseline

| Layer | Status |
|-------|--------|
| Wave 0 — Engineering Operations | 🟣 Verified (frozen) |
| Wave 21 — Recognition Quality | 🟡 Active (benchmark pending) |
| Wave 22 — Semantic Runtime | 🟣 Verified |
| Wave 23 — Deposition Production | 🟡 Active (region model + caption/proceedings) |
| Wave 24–26 — Corrections / Punctuation / AI | 🔵 Planned |

**Current sprint:** TP-1 Proceedings Events (Wave 23).
**Product milestone:** SVB-1 (Semantic Validation Build) — tracked here, distinct
from the Git tag `RC-2026.1`.

## Branch model (established 2026-07-13)

```
main                         preserved release line (archive/main-pre-wave23 marks its pre-wave23 tip)
│
├── release/2026.1           RC track, cut from the trunk
│
└── feature/stage3-workspace-core   active development (GitHub default, for now)
```

- `archive/main-pre-wave23` (branch) + `archive/wip-*` (tags) preserve all prior state.
- `main` is **not** yet reconciled — that is Phase A, gated on RC validation.

## Session 2 migration — executed

- ✅ `release/2026.1` created from the trunk and pushed.
- ✅ `main` preserved; `archive/main-pre-wave23` created + pushed.
- ✅ WIP branches tagged (`archive/wip-feature-bundle-snapshot`, `archive/wip-pre-w22-features`) and deleted locally.
- ✅ Deleted 6 merged remote branches (3 `feature/stage3-*`, 3 `agent/*`); kept PR #4's branch.
- ✅ Removed the clean merged worktree (`depo-pro-toolchain`).
- ✅ Auto-delete-head-branches-on-merge enabled.
- ✅ Repository set **Private**.

## Session 2 migration — held / blocked

- ⛔ **Branch protection** — unavailable: GitHub Free does not allow branch
  protection or rulesets on private repos (needs GitHub Pro). CI `Verify` still
  runs on push/PR. **Open decision.**
- ⏸️ **Phase A** (`release/2026.1` → `main`) — held until the RC is validated.
- ⏸️ **`RC-2026.1` tag** — held until the release branch is validated.
- ⏸️ **Phase D doc reorg** — held: the frozen Wave 0 tooling scans repo root for
  `SPRINT_*_REPORT.md`; relocation must be paired with `update-dashboard.mjs` /
  `sprint-complete.mjs` path updates, not a blind move.
- ⚠️ **`05996ad` (case reuse)** — deferred to backlog, not merged (see
  `docs/backlog/BACKLOG_CASE_REUSE.md`).

## Manual cleanup left (dirty worktrees, not force-removed)

- `C:/Users/james/Projects/depo-pro-deps` — `dependency-security-audit-local`, 1
  uncommitted file. Review, then `git worktree remove` + delete the branch.
- `C:/Users/james/Projects/depo-pro-pr1` — detached (PR #1 tip), has changes.
- `C:/tmp/depo-pro-vitest-count` — temporary test worktree.

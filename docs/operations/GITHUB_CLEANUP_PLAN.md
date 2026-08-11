# GitHub Cleanup Plan

Date: 2026-06-08

## Current Sync Status

- Working tree clean: yes
- Current branch: `feature/stage3-workspace-core`
- Remote: `origin` -> `https://github.com/jameshorton2486/Depo-Pro.git`
- Local HEAD at audit time: `e4fa8ef27b9c227dfd748c2e8a5e629468a15c6c`
- Current branch push status: pushed successfully
  - remote branch advanced from `bb85a46` to `e4fa8ef`
- Local branch == remote branch after push: yes
  - verified with `git log origin/feature/stage3-workspace-core --oneline -5`
- Backup tag on origin: yes
  - `stage3-pre-merge-backup` -> `bb85a46c02bef305d550a7ecccebf56c44984fd3`
- Tags push status: `Everything up-to-date`

## Merged Branch Audit

Method:
- `git branch --merged feature/stage3-workspace-core`
- `git branch -r --merged feature/stage3-workspace-core`
- `git rev-list --left-right --count <branch>...feature/stage3-workspace-core`

Interpretation:
- left count = commits unique to the candidate branch
- right count = commits unique to `feature/stage3-workspace-core`
- a candidate is safe later only if left count is `0`

| Branch | Local merged? | Remote merged? | Unique commits on branch? | Evidence | Verdict |
| --- | --- | --- | --- | --- | --- |
| `feature/stage3-adapter-layer` | yes | yes | no | `git rev-list --left-right --count feature/stage3-adapter-layer...feature/stage3-workspace-core` -> `0 151` | SAFE-TO-DELETE-AFTER-RC |
| `feature/stage3-mount-contract` | yes | yes | no | `git rev-list --left-right --count feature/stage3-mount-contract...feature/stage3-workspace-core` -> `0 151` | SAFE-TO-DELETE-AFTER-RC |
| `feature/stage3-provider-migration` | yes | yes | no | `git rev-list --left-right --count feature/stage3-provider-migration...feature/stage3-workspace-core` -> `0 150` | SAFE-TO-DELETE-AFTER-RC |
| `main` | yes | yes | no relevant cleanup action | merged listing only; not a cleanup candidate | KEEP |

## Do Later, Manually

Precondition:
- only after `release/stage3-rc` exists or after a merge to `main`
- and **not during the active freeze**

Manual local deletes:

```powershell
git branch -d feature/stage3-adapter-layer
git branch -d feature/stage3-mount-contract
git branch -d feature/stage3-provider-migration
```

Manual remote deletes:

```powershell
git push origin --delete feature/stage3-adapter-layer
git push origin --delete feature/stage3-mount-contract
git push origin --delete feature/stage3-provider-migration
```

## Retention Note

Retain the `stage3-pre-merge-backup` tag until after a successful release merge and post-release verification.

## Safety Note

This run did **not**:
- delete any branch
- force-push
- rebase
- rewrite history
- change remotes

## Required PII Purge Before Any External Sharing

- `etminan_response.json` and `scripts/fixtures/garza-home-depot.txt` contained real deposition data and must be purged from git history before this repository is shared outside the current controlled environment.
- Working-tree deletion is not sufficient. Use `git filter-repo` or BFG Repo-Cleaner to remove those paths from all reachable history, then force-push the rewritten branch set only after explicit sign-off.
- Replacement fixtures must remain synthetic only.

---

## Branch classification audit — 2026-08-10 (main-normalization preparation)

Read-only ancestry + unique-commit audit toward the eventual **main-normalization** milestone (see the git-endstate directive). **Nothing merged, pushed, or deleted** — deletion/merge/push remain Human Gates under BETA_FREEZE. Authoritative dev branch: `feature/stage3-workspace-core` @ `7a34086`. Method: `git rev-list --left-right --count <branch>...feature/stage3-workspace-core` (UNIQ = commits only on the branch; BEHIND = commits only on the authoritative branch), then **verify whether each branch's unique work is already present differently in the authoritative branch** (unique commits ≠ required work).

**Headline:** most branches' "unique" work is **already in the authoritative branch via different commits** (verified below), so a mass-merge is unnecessary and would risk resurrecting superseded architecture. Exactly **one** branch holds genuinely-missing valuable work (`fix/edge-database-types`), and it is provenance-gated.

### Local branches

| Branch | UNIQ | Class | Evidence / disposition |
|---|---|---|---|
| `feature/stage3-workspace-core` | — | **KEEP / ACTIVE** | authoritative development branch |
| `main` (`3a8ec34`) | 67 | **KEEP** (normalization target) | diverged June-17 tip; its 67 unique commits must be **reconciled** (superseded-vs-required) before it becomes authoritative — do NOT blindly merge feature over them |
| `archive/main-pre-wave23` (`3a8ec34`) | 67 | **SUPERSEDED** | byte-identical to `main` (same SHA) — redundant snapshot |
| `claude/lucid-jepsen-8431bf` (`3a8ec34`) | 67 | **SUPERSEDED** | identical to `main` — stale session branch at old main tip |
| `claude/magical-mcnulty-0077a4` (`3a8ec34`) | 67 | **SUPERSEDED** | identical to `main` |
| `fix/edge-database-types` | 1 | **MERGE / INTEGRATE** (gated) | adds `_shared/database.types.ts` (1419 lines) — ABSENT from feature; would shrink the deno-check baseline. Commit says "generated from **prod**" → **provenance gate**: regenerate from migrations (A7) + diff before adopting, or it canonizes prod drift |
| `fix/disable-auto-chunk-ingestion` | 5 | **MOSTLY SUPERSEDED / INVESTIGATE** | core fix present in feature (`AUTO_CHUNKING_ENABLED=false`); but its 3 edge-bundling commits (`deno.json` sloppy-imports, `.ts` extensions) — **feature has no `deno.json`** → investigate whether needed for deploy bundling |
| `release/2026.1` | 12 | **HISTORICAL / RECOVERY** (review/archive) | release branch (region/caption contract); tag/archive candidate |
| `wip/stage3-worktree-2026-07-21` | 18 | **HISTORICAL / RECOVERY** | dated WIP snapshot |
| `backup/stage3-local-2026-07-21` | 17 | **HISTORICAL / RECOVERY** | dated backup snapshot |
| `audit/workspace-surface-unratified` | 2 | **SUPERSEDED / INVESTIGATE** | audit docs; confirm folded into governed docs |
| `codex/docs-build-phase3` | 2 | **SUPERSEDED / INVESTIGATE** | docs tooling |
| `dependency-security-audit-local` | 1 | **SUPERSEDED** | `ws` security floor — feature already has `ws ^8.18.2` (safe). ⚠ checked out in a worktree |
| `docs/adr-stutter-witness-recess` | 1 | **SUPERSEDED** | ADR-0011/0012/0013 already present in feature |
| `docs/workspace-ufm-first-render` | 0 | **SAFE TO DELETE AFTER AUTH** | 0 unique; ADR-0017 ratified + in feature |
| `codex/deepgram-workspace-boundary` | 0 | **SAFE TO DELETE AFTER AUTH** | 0 unique (merged PR #23). ⚠ checked out in a worktree — remove worktree first |
| `fix/utterance-pagination-1000-cap` | 1 | **SUPERSEDED** | feature's `loadUtterances` already paginates the PostgREST 1000-row cap (`editor-api` `.range()` loop) |

### Remote (origin/*) — notable
- `origin/main` (62 uniq) — same divergence class as local `main`; reconcile as the normalization target.
- `origin/feature/stage3-workspace-core` (1 uniq vs local) — carries `8fb9f3d docs(csr): Miah CSR format… (#50)` that **local feature lacks** → small two-track reconcile (cherry-pick or confirm superseded) **before any push**.
- `origin/cursor/secure-secrets-cli-setup-005e` (2 uniq) — INVESTIGATE (secrets-CLI setup; likely superseded).
- Other `origin/*` mirror their local counterparts.

### What this means for main-normalization
1. **Do not merge feature→main blind.** `main`'s 62–67 unique commits are the divergence risk; audit them commit-by-commit (superseded vs required) at the integration-PR gate.
2. **One integration candidate:** `fix/edge-database-types`, gated on regenerating its types from migrations (not prod).
3. **Three redundant copies of `main`** (`archive/main-pre-wave23`, both `claude/*`) — delete after auth.
4. **Worktree caveat:** `codex/deepgram-workspace-boundary` and `dependency-security-audit-local` are checked out in linked worktrees — `git worktree remove` before any branch delete (shared-worktree race).
5. Preserve `stage3-pre-merge-backup` and recovery bundles until after a validated release merge.

**Executed this audit:** nothing — no delete, merge, push, rebase, or history rewrite. All dispositions are proposals pending the branch-cleanup Human Gate.

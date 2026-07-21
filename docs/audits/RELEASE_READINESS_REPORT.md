# Release Readiness Report

**Audit type:** READ-ONLY. **Generated:** 2026-07-13

---

## Documentation audit (Phase 9)

| Aspect | Finding |
|--------|---------|
| Core docs | ✅ Present: `README.md`, `AGENTS.md`, `docs/architecture/MASTER_ARCHITECTURE.md`, `docs/ROADMAP.md`, `CANONICAL_STANDARDS_INDEX.md` |
| Dashboard | ✅ Generated & current (`docs/dashboard/`, 12 artifacts, one status vocabulary) |
| Architecture / Wave docs | ✅ Strong (`docs/architecture/W0/W21/W22-2A/W23`, prompt-compiler library) |
| Decision records | ✅ Present (DP-0xx, decision records under `docs/audits/`) |
| **Root-level sprawl** | ⚠️ **85 markdown files at repo root; 65 are `*_AUDIT`/`*_REPORT`/`*_FINDINGS`; 13 `SPRINT_*_REPORT`** |
| docs/ tree | 156 markdown files — large but organized into subfolders |

**Primary documentation issue: root clutter.** The content is good; the *placement*
hurts onboarding. 65 audit/report files at the root bury `README.md`. Recommend
(Session 2, non-destructive `git mv`): move `*_AUDIT.md`/`*_REPORT.md`/`*_FINDINGS.md`
into `docs/audits/` and `SPRINT_*_REPORT.md` into `docs/dashboard/history/sprints/`,
keeping only `README.md`, `AGENTS.md`, `CANONICAL_STANDARDS_INDEX.md` (and license,
once added) at the root. No content is deleted — only relocated.

## Release-readiness by target (Phase 10)

| Target | Ready? | Blockers |
|--------|--------|----------|
| **Open source** | ❌ No | No `LICENSE`; repo is PUBLIC with "all rights reserved" by default; no `CONTRIBUTING`/`CODEOWNERS`; confirm no client data in 156 docs |
| **Beta** | 🟡 Close | Default-branch + branch-protection fixes; confirm visibility; dirty working tree committed |
| **Release Candidate (RC)** | 🟡 Close | All "Beta" items + `main` reconciled & protected + Vercel production branch confirmed + Supabase drift check |
| **Production** | ❌ Not yet | RC items + `VITE_DEEPGRAM_API_KEY` server-side (W0.2A §5) + Wave 21 recognition still `Active` and Wave 23 production `Active` (product not feature-complete) |

## Consolidated blockers

### 🔴 Must fix before any release
1. **Default branch** is `feature/stage3-workspace-core`, not `main` (reconcile `main`).
2. **No branch protection** on the release branch.
3. **Visibility**: confirm PUBLIC is intended; if proprietary, go Private; if OSS, add `LICENSE`.
4. **Dirty working tree** (79 uncommitted files) — commit or stash before tagging anything.

### 🟡 Should fix for a clean RC
5. `VITE_DEEPGRAM_API_KEY` client exposure resolved (W0.2A §5 C2/C3).
6. `.env.example` reconciled with the 3 undocumented `VITE_*` names.
7. Merged/stale branches deleted; worktrees removed; PR #4 resolved.
8. Root documentation sprawl relocated under `docs/`.
9. Supabase remote migration-drift check (`supabase db diff`).
10. Node version pinned (`engines.node` / `.nvmrc`) to match CI's 20.19.5.

### 🟢 Strengths (already release-grade)
- Full CI (`Verify`: typecheck + lint + test + build) — **646 tests passing**.
- Conventional-commit history; backup tags exist.
- Frozen Wave 0 engineering operating system; one status vocabulary.
- No secrets tracked; privacy-aware fixtures.

## Decisions confirmed (2026-07-13)

| Decision | Resolution |
|----------|-----------|
| Canonical branch | `feature/stage3-workspace-core` (trunk) is the release line until RC; `main` reconciles **to** the trunk after feature triage; default branch revisited after RC |
| Repository visibility | **Private** (proprietary); **no** open-source license |
| RC tag naming | **`RC-2026.1`** (release-oriented). Keep `SVB-1` as the *product* Semantic Validation Build milestone inside the dashboard, not as a Git tag |

## Recommended release naming

Tag the RC **`RC-2026.1`** — **only after** the four 🔴 blockers are cleared,
`main` is reconciled (post bucket-B/C triage), and the release branch is
protected. Do not tag before the `main` classification triage
(`MAIN_RECONCILIATION_CLASSIFICATION.md`) is resolved.

## Verdict

**Engineering quality is high; repository *hygiene* is the gap.** None of the
blockers are about code — they are branch/config/placement issues, all fixable
non-destructively in an approved Session 2. The repository is **~1 cleanup sprint
away from RC**.

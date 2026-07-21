# Commit Audit

**Audit type:** READ-ONLY. **Generated:** 2026-07-13
**Scope:** trunk `feature/stage3-workspace-core` (377 commits at HEAD).

---

## Overall assessment: **Good.**

Commit hygiene is already strong. The history uses Conventional Commits
consistently and messages are descriptive and scoped. No history rewrite is
recommended; the few cleanups below are optional and only for a tagged release.

## What's working

- **Conventional Commits** in wide use: `feat:`, `fix:`, `chore:`, `docs:`,
  `perf:`, `test:`, with scopes (`feat(export)`, `fix(rls)`, `chore(models)`,
  `perf(keyterms)`). This is release-grade.
- **Descriptive subjects** that state intent (`fix: prevent forced-login redirect
  loop on editor mount (HTTP 431)`), not `wip`/`fixup`/`asdf` noise.
- **Logical grouping** by concern (rls, export, keyterms, ai-review, edge).

## Categories observed

| Category | Examples | Note |
|----------|----------|------|
| Feature | `feat: add transcript contract region and caption production` | Clean |
| Fix | `fix: harden canonical transcript intake integrity gate` | Clean |
| Docs | `docs: wave 22 runbook, prompts, and audits` | Clean |
| Chore | `chore(debt): required-fields SoT, deps, waivers` | Clean |
| Perf | `perf(keyterms): use targeted getLatestAutoSeedAudit query` | Clean |
| Test | `test(config): run .test.tsx suite under jsdom` | Clean |
| Security | `Update ws to patched security release` | Non-conventional subject (from PR #2) |

## Minor issues (optional, non-blocking)

1. **A merge commit on the trunk** — `462c1e8 Merge branch
   'feature/stage3-workspace-core' of …` (self-merge from a push race). Harmless;
   a rebase-merge policy going forward avoids these.
2. **A few PR-squash subjects are non-conventional** — e.g. `Upgrade development
   toolchain…`, `Update ws to patched security release` (sentence case, no type
   prefix). Cosmetic.
3. **One explicit "pre-existing worktree changes" commit** — `d89fc35 chore:
   pre-existing worktree changes (unrelated to remediation)`. Acceptable, but the
   kind of catch-all commit worth avoiding in future.

## Squash candidates

None required. If a curated release history is desired later, the security PRs
(#2/#3) and the merge commit could be squashed on a release branch — but only on
an approval-gated, backup-tagged branch. **Do not rewrite the public trunk.**

## Recommendation

- **Keep history as-is.** It is already professional.
- Going forward: enforce Conventional Commit subjects on squash-merge titles
  (PR title becomes the squash subject) and prefer squash- or rebase-merge to keep
  the trunk linear.

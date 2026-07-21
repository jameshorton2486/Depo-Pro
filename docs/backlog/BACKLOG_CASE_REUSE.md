# Backlog — Case Reuse / Dead-End Guard

**Status:** 🔵 Planned (backlog) — **not merged**
**Source commit:** `05996ad` — `feat(cases): reuse matching cases and prevent dead-end workflow`
**Origin branch:** `main` (unique; not present on the trunk)
**Preserved in:** `archive/main-pre-wave23`

---

## What it is

The one genuinely unique feature from `main`'s 62 divergent commits
(see `docs/audits/MAIN_RECONCILIATION_CLASSIFICATION.md`). It reuses an existing
matching case instead of creating a duplicate, and prevents a dead-end workflow
state during case creation.

## Why it is backlog, not merged

Per the reconciliation decision, `main`'s unique work is **not** merged into the
trunk during release preparation. This feature is small, self-contained, and
low-risk, but it post-dates the trunk's current intake architecture and needs a
conscious port rather than an automatic merge.

## How to act on it later

1. Inspect: `git show 05996ad`.
2. Decide: port onto the trunk (cherry-pick or reimplement against the current
   intake flow) or close as won't-do.
3. If porting, verify against the trunk's case-intake and multifile flow, add a
   test, and land it as a normal `feat(cases):` commit.

Nothing is lost: the commit is preserved in `archive/main-pre-wave23` and citable
by SHA `05996ad`.

# Branch-State Report (Prompt F)

**Date:** 2026-08-03
**Canonical / integration branch:** `feature/stage3-workspace-core` (`9f0750d`)
**Mode:** Report-only. No branch was merged, deleted, or force-moved. Recommended mutations are listed and **held for owner approval**.

## Already resolved by the earlier restructure (F steps 1–4)

- The non-documentation `perf(build)` work (`DepoEditor.tsx` lazy-loading + `vite.config.ts`) was split to `perf/lazy-load-stage-screens` and **merged (PR #48)**.
- `feat/canonical-transcript-audit` was reduced to documentation-only and **merged (PR #47)**.
- Intake-domain docs disposition (F step 4): **decided explicitly** — kept co-located with the transcript audit set in #47, merged with a merge commit so the two domain-separated commits survive in history.

## Step 6 — local vs origin

Local `feature/stage3-workspace-core` = `origin/feature/stage3-workspace-core` exactly (`9f0750d`, 0 behind / 0 ahead). ✔

## Step 5 — `fix/edge-database-types` @ `adfc87f` (A7 unblocks it)

- **Contents:** one commit adding `supabase/functions/_shared/database.types.ts` (1,419 lines of generated Supabase types) and wiring **4** edge clients (`ai-review`, `editor-api`, `export-adapter`, `transcribe-start`) to `createClient<Database>`. Correctly a **new** `_shared/` file — it does not touch the hand-written, ESLint-ignored `src/types/database.ts`.
- **Status:** local-only (never pushed), **35 behind / 1 ahead** of canon.
- **A7 impact:** the blocker was "which schema is authoritative — drifted production, or the migrations?" A7 ratifies **migration files** as the authority, so the path is now clear.
- **What remains before merge:**
  1. **Confirm/regenerate the types from the migration-built schema, not prod.** If those 1,419 lines were generated from drifted production, merging them canonizes the drift under an A7 banner. Regenerate from a migration-built database and diff against the committed file: if they match, the branch merges cleanly; if they don't, **the diff is the scope of the catch-up migration** A7 calls for. **(Generation provenance is currently UNVERIFIED — this is the whole question.)**
  2. **Rebase onto current canon** (35 behind); verify the 4 two-line client edits don't conflict.
  3. **The 4 "real" deno-check errors** (prior verification-gap analysis: ~40 errors = 36 Database-stub, now fixed by real types, + 4 genuine bugs) and the **~7 still-untyped** edge functions are separate follow-ups — this branch types 4 of ~11. *(needs a fresh `deno check` to confirm counts.)*
  4. A7's **CI parity gate** (migration ↔ generated types ↔ prod) does not exist yet — that is the durable guard (Phase-7), not a blocker for this branch.

## Branch census summary

19 local branches: **7 fully contained** in canon (Phase-6 deletion candidates), **12 not-contained** —

| Category | Branches |
|---|---|
| Preserve (archive/backup/release/wip) | `archive/main-pre-wave23`, `backup/stage3-local-2026-07-21`, `release/2026.1`, `wip/stage3-worktree-2026-07-21` |
| In-flight (open PRs / active work) | `audit/correction-recording` (#64), `docs/csr-format-confirmation` (#50), `audit/workspace-surface-unratified` (pushed, unmerged) |
| Pending regenerate-then-PR | `fix/edge-database-types` |
| Legacy | local `main` (348 behind) |
| UNKNOWN — patch-equivalence check needed before delete | `dependency-security-audit-local`, `docs/cts-v1`, `docs/transcript-pipeline-report` |

## Local `.git/info/exclude` cleanup (done this pass)

The unshared `.git/info/exclude` held three active patterns (`Audit/`, `tools/`, and a mangled temp path) that hid content from `git status` for every session and agent. Findings from the sweep:

- **`Audit/`** — an untracked audit harness plus `Audit/docs/` containing apparent real deposition material (deponent names, captions, dates). **Verified never committed** (`git log --all --full-history -- 'Audit/*'` = 0 commits across all refs) — no historical leak. Now protected by a **reviewed** `.gitignore` rule; the source documents should be relocated outside the repo entirely (owner action).
- **`tools/` and `transcript_formatter/tools/`** — untracked code, including `generate_golden_expected.py`, a golden-fixture generator directly relevant to Prompt E. Also never committed; now visible in `git status`.
- **Mangled temp dir** `UsersjamesAppDataLocalTempdepo_pytest/` — stray junk artifact (owner to delete).

`.git/info/exclude` was reset to a comment-only template; the one intended ignore (`Audit/`) moved to the tracked `.gitignore`.

## Recommended mutations — HELD for approval

1. **`Audit/docs/` disposition** — relocate the deposition material outside the code repo (owner).
2. **`fix/edge-database-types`** — regenerate types from migrations, diff, rebase, then open a PR.
3. **Phase-6 deletions** (7 contained branches) — only after a preservation bundle/tag.
4. **3 UNKNOWN branches** — patch-equivalence check before any delete.
5. **Suggested enforcement** — a CI job that fails when `.git/info/exclude` is non-empty. One unshared line hid client data, an audit harness, and a duplicate tool; this closes that class of gap.

# Depo-Pro Schema Status & Next Steps

**Last updated:** From architectural review and v1.3 delivery.

---

## Current State (Three Layers)

### Layer 1 — What’s deployed in Supabase (OLD schema)

- **Tables:** `profiles`, `firms`, `cases`, `jobs`, `transcripts`, `transcript_revisions`, `calendar_events`, `google_tokens`, `audit_logs`, `user_sessions`, `incidents`, `transcript_ai_scores`, `transcription_edits`
- **Roles:** `user`, `admin`, `AGENCY_ADMIN`, `FIRM_ADMIN`
- **Jobs:** uses `created_by_id` (not `reporter_id` / `scopist_id`)
- **Missing from v1.2/v1.3:** `flagged_words`, `silent_segments`, `transcription_chunks`, integrity chain, vocabulary, attorney sharing, etc.
- **Source:** Prisma-era migrations in `supabase/migrations-backup/` (e.g. `20260110_rls_optimization.sql`).

### Layer 2 — What was designed (v1.2)

- **File in repo:** `depo-pro-schema-v1.2.sql`
- **Content:** 14 new tables, 13 functions, 43 RLS policies, 4 views; roles `ADMIN`, `COURT_REPORTER`, `SCOPIST`, `ATTORNEY`; redesign with flagged words, integrity chain, chunking, locking.
- **Status:** Never executed in Supabase.

### Layer 3 — Codex fixes (RC-1 through RC-8) and critical fixes

- **In repo:**
  - `supabase/migrations/20260209_critical_fixes_rc1_to_rc5.sql`
  - `supabase/migrations/20260209_critical_fixes_rc6_to_rc8.sql`
  - `supabase/migrations/20260209_critical_fixes_C1_C2_C4.sql`
- **Target:** v1.2 schema (which was never deployed).
- **Note:** v1.3 is a **single consolidated schema** that folds in all critical fixes (C-1–C-4) and recommendations (S-4, S-7). Deploying v1.3 makes these incremental migrations obsolete.

---

## Target: v1.3 (Canonical Schema)

**v1.3** = one schema file that:

- Replaces v1.2 as the design baseline.
- Includes all four critical fixes:
  - **C-1:** Six admin RLS policies scoped by firm.
  - **C-2:** RESTRICTIVE attorney blocks on `transcript_integrity_chain`, `audit_log`, `processing_errors`.
  - **C-3:** `append_integrity_chain` race fix (`FOR UPDATE`).
  - **C-4:** `extract_flagged_words` rewritten as set-based SQL.
- Plus: S-4 (time range CHECK on `flagged_words`), S-7 (UNIQUE on `profiles.email`).

**If you have `depo-pro-schema-v1.3.sql`** (from the Codex/Claude delivery), treat it as the single source of truth. Add it to the repo (e.g. `supabase/depo-pro-schema-v1.3.sql` or root) when ready to deploy.

---

## What to Do Next

1. **Phase 0 (Prerequisites)** — See **PHASE_0_PREREQUISITES.md** in this repo.
2. After Phase 0 is done, run **Prompt 1A** (Core Types & Enums), then 1B, then Phase 2, etc., per the mega prompts document.

---

## Repo Migration Layout

| Location | Purpose |
|----------|--------|
| `depo-pro-schema-v1.2.sql` | Legacy v1.2 design (superseded by v1.3). |
| `supabase/migrations-backup/` | Old Prisma-era migrations (reference only). |
| `supabase/migrations/` | WKT + 20260209 critical-fix migrations (target v1.2; superseded by full v1.3 deploy). |
| **v1.3 schema file** | Add when available; use for clean deploy. |

---

## Summary

- **Deployed DB** = old Prisma-era schema (Layer 1).
- **v1.2** = designed but never deployed (Layer 2).
- **Codex migrations** = in repo but target v1.2; v1.3 replaces them with one file.
- **Next:** Complete Phase 0, then proceed with Prompt 1A and the rest of the implementation plan.

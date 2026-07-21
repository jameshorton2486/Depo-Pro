# Supabase Audit

**Audit type:** READ-ONLY. **Generated:** 2026-07-13
**No Supabase project, migration, schema, secret, or policy was modified.**

---

## Repository-side findings

| Aspect | Finding |
|--------|---------|
| Migrations | **27** SQL migrations in `supabase/migrations/`, dated 2026-06-02 → 2026-07-03 |
| Functions | `supabase/functions/` present (incl. `transcribe-callback`, `transcribe-start`) |
| Config | `supabase/config.toml` present but minimal — only `[functions.transcribe-callback] verify_jwt = false` |
| Project linkage | **Not in repo** — no `project_id`/`project_ref` in `config.toml`; linkage lives in local Supabase CLI state |
| RLS | Owner-scoped RLS actively developed (migrations `owner_scoped_rls_policies`, `owner_scoped_storage_policies`, `owner_scope_speaker_resolution_current`); repo has `AUTH_RLS_AUDIT.md` / `AUTH_RLS_REPORT.md` |
| Secrets | None tracked (`.env`/`.env.*` gitignored, `!.env.example`) |

## Migration timeline (coherent, forward-only)

Core schema and case files (early June) → transcript persistence, editor RPCs,
ownership + RLS (mid June) → reporter/firm/contact tables (early July) → boundary
fields, pipeline state, speaker resolution, AI review overlay, auto-seed audit,
audit-log expansion (late June–early July). Naming is timestamped and consistent.

## What requires the Supabase console / CLI (verify — not knowable from repo)

- Linked project ref and environment (which project these migrations target).
- **Remote migration status / drift** — whether all 27 migrations are applied on
  the remote, and whether remote schema matches the repo (`supabase db diff`).
- Pending migrations not yet pushed.
- RLS enforcement as deployed (repo shows policies authored; confirm enabled).
- Function deployment status and secrets set in the Supabase dashboard.

**Suggested read-only checks (Session 2 / operator):**
`supabase migration list` · `supabase db diff` · `supabase functions list`.

## Status

| Aspect | Status |
|--------|--------|
| Supabase integration (in-repo) | 🟢 Operational (migrations + functions + RLS present and used) |
| Remote drift / applied state | ⚪ Unknown (requires CLI/console) |

## Note

Per the frozen status vocabulary, Supabase is marked **Verified** on the
deployment-health dashboard because its integration is exercised in-environment
with in-repo RLS audits. The *remote migration drift* check above is a separate,
still-Unknown axis and does not change that integration verdict.

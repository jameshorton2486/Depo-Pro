# Depo-Pro Schema Version

**Current Version:** v1.3
**Canonical File:** `depo-pro-schema-v1.3.sql` (also at `supabase/depo-pro-schema-v1.3.sql`)
**Size:** ~1,685 lines / 59 KB
**Tables:** 14 tables, 13 functions, 43+ RLS policies

## CRITICAL: Do NOT use depo-pro-schema-v1.2.sql

The v1.2 file (archived in `archive/`) is missing 4 critical security fixes:
- C-1: Cross-tenant RLS policies (6 policies missing firm scope)
- C-2: RESTRICTIVE attorney block policies (3 tables exposed)
- C-3: Race condition in append_integrity_chain
- C-4: O(n) flagged word extraction replaced with set-based SQL

## Deployment Status

- [ ] v1.3 schema deployed to Supabase SQL Editor
- [ ] Storage buckets created (depo-audio, depo-exports, depo-chunks)
- [ ] pg_cron enabled with cleanup_expired_locks schedule
- [ ] TypeScript types regenerated from live schema
- [ ] Types committed to repo

## Files in This Repo

| File | Location | Purpose |
|------|----------|---------|
| `depo-pro-schema-v1.3.sql` | root + `supabase/` | Deploy this to Supabase |
| `depo-pro-mega-prompts-v1.3.docx` | root + `docs/` | 10 mega prompts for implementation |
| `depo-pro-implementation-plan.docx` | root + `docs/` | 7-phase, 42-task plan |
| `depo-pro-cursor-audit-prompt.md` | root + `docs/` | Codebase audit prompt |
| `archive/depo-pro-schema-v1.2-SUPERSEDED.sql` | `archive/` | OLD — do not deploy |

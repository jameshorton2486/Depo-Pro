# DEPO-PRO v2.2 MIGRATION REHEARSAL CHECKLIST
## Based on Actual Schema Audit (87 Tables, Mixed Naming)

---

## ⚠️ CRITICAL: DO NOT skip staging. DO NOT run on production first.

---

## PHASE 0 GATE (Must Pass Before Migration)

| # | Check | Status | Date |
|---|-------|--------|------|
| 1 | Phase 0 super-prompt completed successfully | ☐ | |
| 2 | `npx tsc --noEmit` returns 0 errors | ☐ | |
| 3 | `npm run build` succeeds | ☐ | |
| 4 | lib/enums/roles.ts exists with 13 roles | ☐ | |
| 5 | lib/permissions/api-guards.ts upgraded to v2 | ☐ | |
| 6 | middleware.ts handles all 13 roles | ☐ | |
| 7 | All frozen systems still work (transcription, review, export) | ☐ | |
| 8 | Git branch created: `crm-rebuild-phase0` | ☐ | |

**STOP HERE if any check fails.**

---

## PRE-MIGRATION SNAPSHOT

Run these queries in Supabase SQL Editor and save results:

```sql
-- Save this output to docs/pre-migration-snapshot.txt
SELECT 'firms' AS tbl, COUNT(*) FROM firms
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL SELECT 'transcriptions', COUNT(*) FROM transcriptions
UNION ALL SELECT 'flagged_words', COUNT(*) FROM flagged_words
UNION ALL SELECT 'Case', COUNT(*) FROM "Case"
UNION ALL SELECT 'Invoice', COUNT(*) FROM "Invoice"
UNION ALL SELECT 'Notification', COUNT(*) FROM "Notification"
UNION ALL SELECT 'calendar_events', COUNT(*) FROM calendar_events
UNION ALL SELECT 'JobAssignment', COUNT(*) FROM "JobAssignment";
```

| # | Check | Status | Date |
|---|-------|--------|------|
| 9 | Row counts saved to docs/pre-migration-snapshot.txt | ☐ | |
| 10 | Supabase backup created (Dashboard > Backups) | ☐ | |
| 11 | Identified profiles with NULL firm_id (count: ___) | ☐ | |
| 12 | Identified orphaned jobs (firm_id → nonexistent firm): ___ | ☐ | |
| 13 | Listed unique role values: __________________________ | ☐ | |

---

## STAGING REHEARSAL

| # | Step | Status | Notes |
|---|------|--------|-------|
| 14 | Create Supabase staging project or branch | ☐ | |
| 15 | Restore production backup to staging | ☐ | |
| 16 | **Run Part 1** (Extend enums) — verify no errors | ☐ | |
| 17 | **Run Part 2** (organizations table) — verify created | ☐ | |
| 18 | **Run Part 3** (organization_memberships) — verify created | ☐ | |
| 19 | **Run Part 4** (org_connections) — verify created | ☐ | |
| 20 | **Run Part 5** (tasks table) — verify created | ☐ | |
| 21 | **Run Part 6** (jobs extensions) — verify columns added | ☐ | |
| 22 | **Run Part 7** (triggers/functions) — verify registered | ☐ | |
| 23 | **Run Part 8** (indexes) — verify created | ☐ | |
| 24 | **Run Part 9** (RLS policies) — verify enabled | ☐ | |
| 25 | Run RLS audit query (Section A of rls-policy-pack.sql) | ☐ | |
| 26 | Verify: user_role enum now has 13 values | ☐ | |

### Staging Verification Queries

```sql
-- Verify new tables exist:
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_memberships', 'org_connections', 'tasks');

-- Verify new columns on jobs:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'jobs' AND column_name IN ('org_id', 'agency_id', 'connection_id');

-- Verify RLS enabled:
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_memberships', 'org_connections', 'tasks');

-- Verify user_role has new values:
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'user_role'
ORDER BY enumsortorder;

-- Verify triggers:
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('enforce_primary', 'validate_conn_types', 'enforce_task_dep');
```

| # | Staging Check | Status |
|---|--------------|--------|
| 27 | All 4 new tables created | ☐ |
| 28 | All 3 new columns on jobs added | ☐ |
| 29 | RLS enabled on all 4 new tables | ☐ |
| 30 | user_role enum has 13 values | ☐ |
| 31 | All 3 triggers registered | ☐ |

---

## DATA MIGRATION REHEARSAL (Staging)

| # | Step | Status | Notes |
|---|------|--------|-------|
| 32 | Uncomment Part 10A — Run pre-migration snapshot | ☐ | |
| 33 | Uncomment Part 10B — Migrate firms → organizations | ☐ | |
| 34 | Verify: organizations count = firms count (___) | ☐ | |
| 35 | Uncomment Part 10C — Create memberships from profiles | ☐ | |
| 36 | Verify: memberships count = active profiles with firm_id (___) | ☐ | |
| 37 | Uncomment Part 10D — Backfill jobs.org_id | ☐ | |
| 38 | Verify: jobs with org_id = jobs with firm_id (___) | ☐ | |
| 39 | Uncomment Part 10E — Run verification counts | ☐ | |
| 40 | All counts consistent | ☐ | |

### Staging Smoke Tests

| # | Test | Status |
|---|------|--------|
| 41 | Log in as existing user → dashboard loads | ☐ |
| 42 | Create a new job → works | ☐ |
| 43 | Upload audio → transcription pipeline works | ☐ |
| 44 | Review flagged words → works | ☐ |
| 45 | Export transcript → works | ☐ |
| 46 | Calendar page loads | ☐ |
| 47 | `npm run build` passes with new schema | ☐ |

**STOP HERE if any smoke test fails. Fix before production.**

---

## PRODUCTION EXECUTION

| # | Step | Status | Time |
|---|------|--------|------|
| 48 | Notify users of maintenance window | ☐ | |
| 49 | Create production backup | ☐ | |
| 50 | Save pre-migration snapshot | ☐ | |
| 51 | Run Parts 1-9 on production | ☐ | |
| 52 | Verify same checks as staging (#27-31) | ☐ | |
| 53 | Run Part 10B (firms → organizations) | ☐ | |
| 54 | Verify count | ☐ | |
| 55 | Run Part 10C (profiles → memberships) | ☐ | |
| 56 | Verify count | ☐ | |
| 57 | Run Part 10D (backfill jobs.org_id) | ☐ | |
| 58 | Verify count | ☐ | |
| 59 | Deploy updated app code (Vercel) | ☐ | |
| 60 | Smoke test: login, job, calendar, export | ☐ | |
| 61 | Monitor error logs for 24 hours | ☐ | |

---

## ROLLBACK PLAN

| Priority | Action |
|----------|--------|
| 1 | New tables can be dropped (no existing code depends on them yet) |
| 2 | New columns on jobs are NULLABLE (existing queries ignore them) |
| 3 | Old columns (firm_id, etc.) NOT dropped — backward compatible |
| 4 | Roll back Vercel deployment to previous version |
| 5 | Restore from backup as last resort |

```sql
-- EMERGENCY ROLLBACK (drops v2.2 additions only):
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS org_connections CASCADE;
-- DROP TABLE IF EXISTS organization_memberships CASCADE;
-- DROP TABLE IF EXISTS organizations CASCADE;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS connection_id;
```

---

## SAFETY RULES

- ❌ NEVER run migration on production without staging first
- ❌ NEVER drop columns during migration
- ❌ NEVER modify frozen system tables
- ✅ ALWAYS back up before running
- ✅ ALWAYS add new columns as NULLABLE
- ✅ ALWAYS verify row counts before and after
- ✅ ALWAYS preserve existing IDs
- ✅ ALWAYS test login + transcription + export after migration

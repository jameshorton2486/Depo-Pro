# Migration Audit Report

**Generated**: 2026-02-23
**Auditor**: Infrastructure Stabilization Pass

---

## Migration Folder State

### Active migrations (`supabase/migrations/`)

| File | Format | Valid? | Status |
|------|--------|--------|--------|
| `20260124_wkt_quiz_tables.sql` | `YYYYMMDD_name` (8-digit) | ⚠️ MALFORMED | See repair section |
| `20260208000000_base_schema.sql` | `YYYYMMDDHHMMSS_name` (14-digit) | ✅ VALID | Applied |
| `20260209000001_critical_fixes_C1_C2_C4.sql` | 14-digit | ✅ VALID | Applied |
| `20260209010000_placeholder.sql` | 14-digit | ✅ VALID | Applied |
| `20260209010100_critical_fixes_rc1_to_rc5.sql` | 14-digit | ✅ VALID | Applied |
| `20260209010200_critical_fixes_rc6_to_rc8.sql` | 14-digit | ✅ VALID | Applied |
| `20260211120000_fix_wkt_questions_admin_policy.sql` | 14-digit | ✅ VALID | Applied |
| `20260211140000_add_bates_prefix_to_jobs.sql` | 14-digit | ✅ VALID | Applied |
| `20260211150000_add_confidence_analytics.sql` | 14-digit | ✅ VALID | Applied |

### Backup folder (`supabase/migrations_backup/`)

Contains the previously deleted malformed migrations (8-digit format) that were cleaned from the active folder. These are retained for reference only and must not be re-applied.

---

## Malformed Migration: `20260124_wkt_quiz_tables.sql`

**Issue**: Uses `YYYYMMDD` (8-digit) format instead of required `YYYYMMDDHHMMSS` (14-digit) format. Supabase CLI requires the 14-digit timestamp format.

**Risk**: If this migration is already tracked in the remote `supabase_migrations.schema_migrations` table under version `20260124`, renaming the local file would cause drift (local and remote would be out of sync).

### Repair Decision Tree

```
Q: Has this migration been applied to the remote database?
├─ YES: supabase migration list shows "20260124"
│   → DO NOT rename locally. Instead, run:
│       supabase migration repair --status applied 20260124
│   → This registers it correctly in the migrations ledger.
│   → The file can then be renamed to 20260124000000_wkt_quiz_tables.sql
│     after running: supabase migration repair --status reverted 20260124
│     followed by: mv 20260124_wkt_quiz_tables.sql 20260124000000_wkt_quiz_tables.sql
│     followed by: supabase migration repair --status applied 20260124000000
│
└─ NO: supabase migration list does NOT show "20260124"
    → Safe to rename locally:
        mv supabase/migrations/20260124_wkt_quiz_tables.sql \
           supabase/migrations/20260124000000_wkt_quiz_tables.sql
    → Then push: supabase db push
```

### Commands to Audit Remote State

```bash
# Authenticate CLI
supabase login

# Link project
supabase link --project-ref $SUPABASE_PROJECT_ID

# List all migrations (local and remote)
supabase migration list

# Dry-run push (no changes, just drift check)
supabase db push --dry-run
```

---

## Previously Deleted Malformed Migrations

The following files existed in git history with 8-digit `YYYYMMDD` format and have been removed from `supabase/migrations/`. They are preserved in `supabase/migrations_backup/` for reference.

If any of these are tracked in the remote database, they must be repaired:

```bash
# For each malformed version that appears in `supabase migration list`:
supabase migration repair --status reverted 20260209
supabase migration repair --status reverted 20260211
supabase migration repair --status reverted 20260212
supabase migration repair --status reverted 20260213
```

The equivalent SQL was merged into the versioned 14-digit migrations during the cleanup.

---

## Recommended Next Steps

1. Run `supabase migration list` against production to confirm remote state.
2. Resolve the `20260124` malformed file using the decision tree above.
3. Run `supabase db push --dry-run` to confirm zero drift.
4. Add this audit to a CI step to prevent future malformed migration names.

---

## Migration Naming Convention (enforced going forward)

All migration files **must** use the `YYYYMMDDHHMMSS_description.sql` format (14-digit timestamp).

```bash
# Generate a correctly named file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
touch supabase/migrations/${TIMESTAMP}_my_description.sql
```

# Org Membership Cutoff Report

Date: 2026-02-21
Environment: Supabase production via `DIRECT_URL`
Scope: Membership backfill validation for org-only scoping transition

## Summary
Backfill was required and has been completed successfully.
All primary cutoff gates are now passing for this dataset.

## Backfill Actions Executed
1. Inserted `organizations` rows from `firms` using firm IDs as org IDs.
2. Backfilled `profiles.org_id` from `profiles.firm_id` where null.
3. Inserted `organization_memberships` rows from profiles (`ACTIVE`, `EMPLOYEE`, primary).
4. Backfilled `jobs.org_id` from `jobs.firm_id` where null.

## Backfill Results
- Organizations inserted: `1`
- Profiles updated with org_id: `2`
- Memberships inserted: `2`
- Jobs updated with org_id: `1`

## Validation Snapshot
- `profiles_total`: `2`
- `profiles_with_firm`: `2`
- `profiles_with_org`: `2`
- `organizations_total`: `1`
- `memberships_total`: `2`
- `memberships_active`: `2`
- `jobs_total`: `1`
- `jobs_with_org`: `1`
- `jobs_without_org`: `0`

Integrity checks:
- `profiles_without_org`: `none`
- `jobs_without_org`: `none`
- `dangling_memberships`: `0`
- `dangling_job_org`: `0`
- `dangling_profile_org`: `0`

## Cutoff Gates
- Gate A: Every job has `org_id` -> PASS
- Gate B: Every active user profile has `org_id` -> PASS
- Gate C: Every active profile has active membership -> PASS
- Gate D: No dangling org references -> PASS

## Decision
Cutoff prerequisites are met for this dataset.

You can proceed to Phase 2 tightening:
1. Remove fallback reads against `firm_id`/`profiles.org_id` in helper functions.
2. Require `organization_memberships` as sole org-access source.
3. Keep `SUPER_ADMIN` bypass explicitly documented and tested.

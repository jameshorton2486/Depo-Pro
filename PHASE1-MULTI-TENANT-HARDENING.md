# Phase 1: Multi-Tenant Hardening Protocol

**Branch:** `phase1-multi-tenant-hardening`
**Created:** 2026-02-20
**Status:** Design Complete — Ready for Implementation

---

## 1. Phase 1 Hardening Protocol

### 1.1 Objectives

| # | Objective | Success Criteria |
|---|-----------|-------------------|
| 1 | Enforce org membership in every DB query | No query returns rows outside user's org(s) |
| 2 | Verify all API routes require auth | 100% of data-modifying routes use `requireAuth` or equivalent |
| 3 | Remove fallback role defaults (`\|\| 'REPORTER'`) | Role always comes from DB; no silent elevation |
| 4 | Implement real case access logic | `canAccessCase`, `assertCaseAccess` query `case_memberships` |
| 5 | Verify no cross-tenant leakage | RLS + application-layer checks on all tenant-scoped tables |

### 1.2 Implementation Order

```
Step 1: Schema verification (org_memberships exists, RLS enabled)
Step 2: Remove role fallbacks (lib/auth.ts, lib/security.ts, lib/auth-compat.ts, lib/auth/session.ts)
Step 3: API route auth audit (requireAuth on every route that touches data)
Step 4: Query-layer org scoping (listJobs, getJobById, etc. filter by org_id)
Step 5: Case access implementation (case_memberships, case_attorneys)
Step 6: requireOrgMembership on org-scoped routes
Step 7: Integration tests for cross-tenant isolation
```

### 1.3 Files to Modify (by step)

**Step 2 — Role fallbacks (remove `|| 'REPORTER'`):**
- `lib/auth.ts` line 58
- `lib/security.ts` line 113
- `lib/auth-compat.ts` line 39
- `lib/auth/session.ts` line 46
- `app/api/jobs/route.ts` line 30
- `app/api/calendar/events/[id]/resize/route.ts` line 57
- `app/api/calendar/events/[id]/reschedule/route.ts` lines 59, 141
- `app/api/calendar/suggestions/route.ts` lines 62, 151
- `app/api/calendar/events/[id]/convert-to-job/route.ts` line 56
- `app/api/profile/route.ts` line 161

**Step 3 — API routes needing auth verification:**
- Audit all 136 API route files
- Exceptions: `/api/health/*`, `/api/auth/*`, `/api/webhooks/*` (use signature verification)
- `/api/cron/*` — require cron secret header

**Step 4 — Query-layer org scoping:**
- `lib/supabase/queries/jobs.ts` — add org filter to `listJobs`, `getJobById`
- `lib/supabase/queries/transcriptions.ts` — scope by job → org
- `lib/supabase/queries.ts` — `userHasFirmAccess` → `userHasOrgAccess` (organization_memberships)

**Step 5 — Case access:**
- `lib/permissions/case-access.ts` — implement `canAccessCase`, `assertCaseAccess`, `getCasePermissions`
- Requires: `case_memberships` table (or equivalent) — see schema design below

**Step 6 — requireOrgMembership:**
- Routes with `[orgId]` or `orgId` in path/params: call `requireOrgMembership(orgId)` before any data access
- Middleware already checks `org_id` in URL for page routes

---

## 2. Architectural Risk Analysis

### 2.1 Current State Summary

| Category | Score | Notes |
|----------|-------|-------|
| Type Safety | 9.5/10 | Strong enums, generated types |
| Build Stability | 10/10 | Phase 0 complete |
| Role Canonicalization | 9/10 | LEGACY_ROLE_MAP in place |
| Multi-Tenant Isolation | 6/10 | RLS on new tables; queries not org-scoped |
| API Hardening | 5.5/10 | Mixed auth patterns; role fallbacks |
| Production Readiness | 7/10 | Stubs in case-access; no cross-tenant tests |

### 2.2 Risk Matrix

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Cross-tenant data leak via unfiltered query | **Critical** | High | Step 4: org filter on every tenant-scoped query |
| Unauthenticated API access | **Critical** | Medium | Step 3: auth audit |
| Role elevation via fallback | **High** | Medium | Step 2: remove `\|\| 'REPORTER'` |
| Case access bypass (stub returns true) | **High** | High | Step 5: real case_memberships check |
| ADMIN bypass of org check | **Medium** | Low | Document: ADMIN sees all; consider SUPER_ADMIN only |
| organization_memberships not migrated | **High** | Medium | Run v2.2 migration Part 10 before Phase 1 |

### 2.3 Query-Layer Gaps (org scoping missing)

| Module | Function | Current Filter | Required Filter |
|--------|----------|----------------|-----------------|
| `lib/supabase/queries/jobs.ts` | `listJobs` | firm_id, reporter_id, scopist_id | + org_id from user's memberships |
| `lib/supabase/queries/jobs.ts` | `getJobById` | None (direct by id) | Verify job.org_id ∈ user's orgs |
| `lib/supabase/queries/transcriptions.ts` | various | job_id | job.org_id ∈ user's orgs |
| `lib/transcription/pipeline.ts` | multiple | job/transcription ids | Service account or org-scoped |
| `lib/transcription/scheduler.ts` | multiple | job ids | Same |
| `lib/supabase/queries.ts` | `userHasFirmAccess` | User.firm_id | organization_memberships |

### 2.4 API Route Auth Patterns (inconsistent)

| Pattern | Count (approx) | Risk |
|---------|----------------|------|
| `requireAuth` from `@/lib/security` | ~15 | OK — throws on fail |
| `requireAuth` from `@/lib/permissions/api-guards` | ~5 | OK — returns 401 response |
| `supabase.auth.getUser()` inline | ~80+ | Medium — manual 401, no org check |
| No auth (webhooks, health, cron) | ~10 | OK if intentional |

**Recommendation:** Standardize on `requireAuthV2()` from api-guards for all API routes. It returns `AuthResult` with `user` including `orgId`. Add `requireOrgMembership(orgId)` where route is org-scoped.

### 2.5 RLS Coverage

| Table | RLS | Policy Quality |
|-------|-----|----------------|
| organizations | ✅ | org_memberships join |
| organization_memberships | ✅ | user_id or same-org admin |
| org_connections | ✅ | firm/agency membership |
| tasks | ✅ | org_id membership |
| jobs | ✅ (v1.3) | firm_id — **needs org_id policy** when column exists |
| profiles | ✅ (v1.3) | firm_id |
| transcriptions | ✅ (v1.3) | via jobs |
| flagged_words | ✅ (v1.3) | via transcriptions |

**Gap:** When `jobs.org_id` is populated, add RLS policy that allows access if user has org membership for that org_id. During transition, keep firm_id policy as fallback.

---

## 3. organization_memberships Schema Design

### 3.1 Existing Schema (from depo-pro-v2.2-migration-CORRECTED)

The v2.2 migration already defines `organization_memberships`. This section documents it and any refinements.

```sql
CREATE TABLE IF NOT EXISTS organization_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role              user_role NOT NULL,
  is_primary        BOOLEAN DEFAULT false,
  relationship_type relationship_type DEFAULT 'EMPLOYEE',
  status            membership_status DEFAULT 'ACTIVE',
  rate_sheet        JSONB,
  joined_at         TIMESTAMPTZ DEFAULT now(),
  left_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Indexes (critical for performance)
CREATE INDEX idx_org_memberships_user_org ON organization_memberships(user_id, org_id);
CREATE INDEX idx_org_memberships_org_status ON organization_memberships(org_id, status);
CREATE INDEX idx_org_memberships_user_primary ON organization_memberships(user_id, is_primary) WHERE is_primary = true;
```

### 3.2 Design Decisions

| Decision | Rationale |
|----------|-----------|
| `UNIQUE(user_id, org_id)` | One membership per user per org; re-join creates new row or update |
| `is_primary` | User can belong to multiple orgs; primary used for default context |
| `status` enum | ACTIVE, INACTIVE, PENDING_APPROVAL, SUSPENDED — supports invite flow |
| `relationship_type` | EMPLOYEE vs CONTRACTOR — future billing/rate logic |
| `rate_sheet` JSONB | Org-specific rates for contractors |
| `left_at` | Soft history; don't delete for audit trail |

### 3.3 Helper: Get User's Org IDs

```sql
-- Use in RLS or application layer
SELECT org_id FROM organization_memberships
WHERE user_id = $1 AND status = 'ACTIVE';
```

### 3.4 Migration Dependency

**Before Phase 1 implementation:**

1. Run `depo-pro-v2.2-migration-CORRECTED` Parts 1–9 (tables, indexes, RLS)
2. Run Part 10 (data migration) — firms → organizations, profiles → memberships, jobs.org_id backfill
3. Verify: `SELECT COUNT(*) FROM organization_memberships` > 0

### 3.5 Application Usage

```typescript
// In requireAuth / api-guards — already implemented
const { data: membership } = await supabase
  .from('organization_memberships')
  .select('org_id, organizations!inner(type)')
  .eq('user_id', user.id)
  .eq('is_primary', true)
  .eq('status', 'ACTIVE')
  .single();

// For multi-org users (e.g., reporter in 2 agencies)
const { data: memberships } = await supabase
  .from('organization_memberships')
  .select('org_id')
  .eq('user_id', user.id)
  .eq('status', 'ACTIVE');
const orgIds = memberships?.map(m => m.org_id) ?? [];
```

### 3.6 case_memberships (for Step 5)

Phase 1 case access requires a way to map users to cases. Current schema has `CaseMembership` (PascalCase) in Supabase types. Verify actual table name:

- If `case_memberships` exists: use it for `canAccessCase`
- If `CaseMembership` exists: use that (Supabase/Postgres table names are case-sensitive with quotes)
- If neither: Phase 1 may need a migration to create `case_memberships (user_id, case_id, role)` or use existing `CaseAttorney` for attorney→case mapping

**Recommendation:** Audit `types/supabase-generated.ts` for CaseMembership/case_memberships. Implement case access using existing schema first; add new table only if missing.

---

## 4. Checklist Before Implementation

- [ ] v2.2 migration Parts 1–9 applied to target DB
- [ ] v2.2 migration Part 10 (data migration) applied and verified
- [ ] `organization_memberships` has rows
- [ ] `jobs.org_id` backfilled where `firm_id` exists
- [ ] Create `docs/PHASE1-IMPLEMENTATION-LOG.md` to track changes
- [ ] Run `npm run build` after each step to catch regressions

---

## 5. Estimated Effort

| Step | Effort | Dependencies |
|------|--------|--------------|
| 1. Schema verification | 0.5 day | DB access |
| 2. Remove role fallbacks | 0.5 day | None |
| 3. API auth audit | 1–2 days | None |
| 4. Query-layer org scoping | 1–2 days | Step 1 |
| 5. Case access implementation | 1–2 days | CaseMembership schema |
| 6. requireOrgMembership | 0.5 day | Step 3 |
| 7. Integration tests | 1 day | Steps 1–6 |

**Total:** ~6–9 days

---

*Document generated for Phase 1 multi-tenant hardening. Branch: phase1-multi-tenant-hardening.*

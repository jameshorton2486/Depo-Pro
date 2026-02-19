# PHASE 0 AUDIT REPORT — DEPO-PRO
**Date:** February 18, 2026
**Branch:** crm-rebuild-phase0
**Status:** READ-ONLY ANALYSIS COMPLETE

---

## SECTION 1 — ROLE DEFINITIONS

### Canonical Source
- `lib/enums/roles.ts` — defines UserRole enum (current: ADMIN, REPORTER, SCOPIST, ATTORNEY, PARALEGAL, AGENCY, AGENCY_ADMIN, FIRM_ADMIN, VIDEOGRAPHER, INTERPRETER, WKT_STUDENT)
- **PLAN:** Will be replaced with canonical 11-role set (AGENCY_OWNER, AGENCY_MANAGER, REPORTER, SCOPIST, VIDEOGRAPHER, INTERPRETER, FIRM_OWNER, FIRM_MANAGER, ATTORNEY, PARALEGAL, SUPER_ADMIN)

### Conflicting Role Definitions
| File | Roles Defined | Issue |
|------|--------------|-------|
| `lib/enums/roles.ts` | 11 roles (current set) | Not yet canonical Phase 0 set |
| `lib/constants.ts` (lines 33-43) | 'ADMIN' \| 'COURT_REPORTER' \| 'SCOPIST' \| 'ATTORNEY' | **CONFLICT:** deprecated COURT_REPORTER |
| `lib/auth/require-role.ts` (lines 16-39) | 6 roles — missing PARALEGAL, AGENCY_ADMIN, FIRM_ADMIN, VIDEOGRAPHER, INTERPRETER, WKT_STUDENT | **INCOMPLETE** |
| `lib/permissions/matrix.ts` (line 6) | 8 roles — missing VIDEOGRAPHER and INTERPRETER | **INCOMPLETE** |
| `lib/rbac.ts` (line 6) | Imports from constants (legacy) | **LEGACY** |
| `lib/permissions/transcript-permissions.ts` (lines 3-7) | 'ADMIN' \| 'COURT_REPORTER' \| 'SCOPIST' \| 'ATTORNEY' | **CONFLICT:** deprecated COURT_REPORTER |

### Conflicts Summary
- 8 different role type definitions in codebase
- Deprecated "COURT_REPORTER" still used in `transcript-permissions.ts` and `constants.ts`
- Middleware (lines 71-119) only handles 6 of 11 roles

---

## SECTION 2 — PERMISSION/GUARD FILES

| File | Purpose | Status | Issues |
|------|---------|--------|--------|
| `lib/permissions/route-access.ts` | Route/API registry | Real | **CRITICAL:** `hasApiAccess()` returns `true` for unmapped routes (line 201) |
| `lib/permissions/matrix.ts` | RBAC matrix | Real | Type conflicts, missing 2 roles |
| `lib/permissions/transcript-permissions.ts` | Transcript RBAC | Real | Uses deprecated COURT_REPORTER |
| `lib/permissions/case-access.ts` | Case membership checks | Real | Queries non-existent tables: `case_memberships`, `case_attorneys`, `transcript_access` |
| `lib/calendar/permissions.ts` | Calendar RBAC | Real | Comprehensive but duplicated logic |
| `lib/auth/require-role.ts` | Route/API guards | Real | Incomplete role set (6 of 11); `isRouteAllowedForRole()` returns `true` as default |
| `lib/auth/require-auth.ts` | API auth wrapper | Real | Calls `hasApiAccess()` which has default-allow bug |
| `lib/auth/permissions.ts` | Generic permission helpers | Stub | Minimal implementation |
| `lib/rbac.ts` | Legacy RBAC | Legacy | Uses `constants.ts`, not `enums/roles.ts` |

### CRITICAL SECURITY VULNERABILITIES
1. **`hasApiAccess()` DEFAULT-ALLOW** — `lib/permissions/route-access.ts` line 201: returns `true` for any unmapped route
2. **`hasRouteAccess()` DEFAULT-ALLOW** — same file line 187: same bug
3. **`isRouteAllowedForRole()` DEFAULT-ALLOW** — `lib/auth/require-role.ts` line ~200: returns `true` as default
4. **Case permissions query non-existent tables** — `lib/permissions/case-access.ts` lines 50-80

---

## SECTION 3 — DUPLICATE FILES

| PascalCase (DELETE) | kebab-case (KEEP) |
|--------------------|--------------------|
| `components/calendar/CalendarShell.tsx` | `components/calendar/calendar-shell.tsx` |
| `components/calendar/CalendarView.tsx` | `components/calendar/calendar-view.tsx` |
| `components/calendar/CalendarEventCard.tsx` | `components/calendar/calendar-event-card.tsx` |
| `components/calendar/CalendarTimeline.tsx` | `components/calendar/calendar-timeline.tsx` |

**Review client duplicates:**
- `app/(dashboard)/jobs/[id]/review/review-client.tsx` — DELETE (older, simpler)
- `app/(dashboard)/jobs/[id]/review/review-client-new.tsx` — KEEP (newer, full-featured)

---

## SECTION 4 — DEAD CODE

| File | Issue | Action |
|------|-------|--------|
| `app/api/cases/intake/route.ts` | Returns HTTP 501, all logic commented out | DELETE |
| `lib/scheduling/conflict-detection.ts` | Throws in production | DELETE |
| `lib/scheduling/scheduling-service.ts` | Throws in production | DELETE |
| `lib/webhooks.ts` | All stubs | DELETE |
| `types/schema-enums.ts` | 4 roles, conflicts with canonical | DELETE |
| `lib/supabase/queries/calendar.ts` | Stub queries | DELETE |
| `app/api/calendar/route.ts` | Uses stub layer | DELETE |
| `lib/rbac.ts` | Legacy, superseded | DELETE |

---

## SECTION 5 — API ROUTES

| Route | Auth | Role | Org Scoped | Status |
|-------|------|------|-----------|--------|
| `/api/jobs` | ✓ | ✓ | ✓ by firm_id | GOOD |
| `/api/jobs/[id]` | ✓ | ✓ | partial | GOOD |
| `/api/calendar` | ✓ | ✗ | partial | RISKY |
| `/api/transcripts/[id]` | ✓ | ✗ | ✓ RLS | PARTIAL |
| `/api/transcripts/[id]/ai-review` | ✓ | ✗ | ✓ RLS | PARTIAL |
| `/api/admin/health` | ✓ | ✓ ADMIN | N/A | GOOD |
| `/api/profile` | ✓ | ✓ ADMIN for role changes | N/A | GOOD |
| `/api/health` | N/A | N/A | N/A | PUBLIC (intentional) |
| `/api/cases/intake` | ✓ | partial | N/A | DELETE (501) |

---

## SECTION 6 — MIDDLEWARE

**File:** `middleware.ts`

**Roles Recognized in ROLE_PROTECTED_ROUTES:** ADMIN, REPORTER, SCOPIST, ATTORNEY, AGENCY, WKT_STUDENT (6 of 11)

**Missing from middleware:** PARALEGAL, AGENCY_ADMIN, FIRM_ADMIN, VIDEOGRAPHER, INTERPRETER

**Good patterns:**
- Organization scoping via `/org/:orgId` path match (lines 322-329)
- Case scoping via case_ids array (lines 331-339)

**Missing/weak patterns:**
- WKT routes: any authenticated user allowed (relies on layout for role check — anti-pattern)
- 5 roles have no route protection defined
- No API route protection (`/api/*`)

---

## DELETE LIST

### From Blueprint v2.2 Section 8.2
- `lib/supabase/queries/calendar.ts`
- `lib/scheduling/conflict-detection.ts`
- `lib/scheduling/scheduling-service.ts`
- `lib/webhooks.ts`
- `types/schema-enums.ts`
- `app/api/calendar/route.ts`

### Duplicate PascalCase Calendar Components
- `components/calendar/CalendarShell.tsx`
- `components/calendar/CalendarView.tsx`
- `components/calendar/CalendarEventCard.tsx`
- `components/calendar/CalendarTimeline.tsx`

### Stub/Dead API Routes
- `app/api/cases/intake/route.ts`

### Old Review Component
- `app/(dashboard)/jobs/[id]/review/review-client.tsx`

### Legacy RBAC
- `lib/rbac.ts`

---

## REWRITE LIST

1. `lib/permissions/route-access.ts` — Fix default-allow bugs (lines 187, 201)
2. `lib/auth/require-role.ts` — Fix default-allow, add missing roles
3. `lib/permissions/transcript-permissions.ts` — Replace COURT_REPORTER with REPORTER
4. `middleware.ts` — Add all 11 roles, secure WKT routes
5. `lib/auth/require-auth.ts` — Use fixed permission functions
6. `lib/permissions/case-access.ts` — Fix non-existent table references

---

## RLS Verification

*[TODO: Run in Supabase Dashboard — Step 7 of Phase 0 (manual step)]*

```sql
-- Check RLS status on all tables
SELECT schemaname, tablename, rowsecurity AS rls_enabled
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Tables requiring RLS verification: jobs, transcriptions, flagged_words, profiles, calendar_events

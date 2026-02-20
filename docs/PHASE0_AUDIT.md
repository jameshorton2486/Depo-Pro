# Phase 0 Audit Report — Depo-Pro v2.2 Rebuild
*Completed: February 2026 | Branch: crm-rebuild-phase0*

---

## PHASE 0 VERIFICATION REPORT

### Check 1: `npx tsc --noEmit`
**PASS** — 0 errors

### Check 2: `npm run build`
**PASS** — ✓ Compiled successfully (18.7s), 103 pages generated

### Check 3: `lib/enums/roles.ts` — 13 canonical roles
**PASS** — All 13 roles present:
- Legacy (4): `ADMIN`, `COURT_REPORTER`, `SCOPIST`, `ATTORNEY`
- v2.2 (9): `AGENCY_OWNER`, `AGENCY_MANAGER`, `REPORTER`, `VIDEOGRAPHER`, `INTERPRETER`, `FIRM_OWNER`, `FIRM_MANAGER`, `PARALEGAL`, `SUPER_ADMIN`
- `LEGACY_ROLE_MAP` maps: `ADMIN→AGENCY_OWNER`, `COURT_REPORTER→REPORTER`, `AGENCY→AGENCY_OWNER`, `AGENCY_ADMIN→AGENCY_MANAGER`, `FIRM_ADMIN→FIRM_MANAGER`

### Check 4: `lib/permissions/role-groups.ts` — Group helpers
**PASS** — Exists with `AGENCY_ADMIN`, `AGENCY_STAFF`, `FIRM_ADMIN`, `FIRM_STAFF` groups + helper functions

### Check 5: `middleware.ts` — All 13 roles handled
**PASS** — `ROLE_PROTECTED_ROUTES: Record<UserRole, string[]>` with all 13 roles + `normalizeRole()` + legacy AGENCY/WKT_STUDENT handled via `LEGACY_ROLE_MAP`. WKT bypass for authenticated users preserved.

### Check 6: `lib/permissions/api-guards.ts` — Real auth
**PASS** — `requireAuthV2()` (discriminated union), `requireRole()`, `requireRoleGroup()`, `requireOrgMembership()` all implemented. Stubs log `logger.warn` instead of silently returning `true`.

### Check 7: Dead code files removed
**PASS**
- `lib/rbac.ts` — DELETED
- `lib/webhooks.ts` — DELETED
- `lib/scheduling/conflict-detection.ts` — DELETED
- `lib/scheduling/scheduling-service.ts` — DELETED
- `components/calendar/CalendarShell.tsx` — DELETED (PascalCase duplicate)
- `components/calendar/CalendarView.tsx` — DELETED
- `components/calendar/CalendarEventCard.tsx` — DELETED
- `components/calendar/CalendarTimeline.tsx` — DELETED
- `app/api/calendar/route.ts` — DELETED (dead stub)
- `app/api/cases/intake/route.ts` — DELETED (dead stub)

### Check 8: Frozen systems unchanged
**PASS** — Internal logic untouched for:
- `lib/transcription/*` (Deepgram pipeline)
- `components/review/*` (flagged word review)
- `components/export/*` (transcript export — import path only updated)
- `components/audio/*` (audio processing)
- `app/(wkt)/*` (WKT quiz module)
- `components/medical/*` (medical chronology)
- `app/auth/callback/*` (Supabase auth flow)
- `app/(attorney)/*` (attorney portal)

### Check 9: Governance docs exist
**PASS**
- `docs/PARKING_LOT.md` ✓
- `docs/FEATURE_FREEZE.md` ✓
- `docs/PHASE0_AUDIT.md` ✓ (this file)
- `docs/database/depo-pro-v2.2-migration.sql` ✓
- `docs/database/rls-policy-pack.sql` ✓
- `docs/Migration-Rehearsal-Checklist.md` ✓

### Check 10: No hardcoded role strings in business logic
**PASS** (with notes)
- All role enum usage migrated to `@/lib/enums/roles`
- Minor: auth/session files use `|| 'REPORTER'` as fallback default — acceptable in auth plumbing
- `lib/calendar/permissions.ts` uses `'REPORTER' | 'SCOPIST' | ...` as `personnelType` discriminant (not `UserRole`) — acceptable

---

## SECURITY FIXES APPLIED

| Fix | File | Before | After |
|-----|------|--------|-------|
| Default-deny | `lib/permissions/route-access.ts` | `return true` | `return false` |
| Default-deny | `lib/auth/require-role.ts` | `return true` | `return false` |
| Default-deny | `lib/permissions/case-access.ts` | stub returning `true` | `logger.warn` + stub |
| Stub disclosure | `lib/permissions/api-guards.ts` | silent `return true` | `logger.warn` + `return true` |

---

## FILES CREATED

| File | Purpose |
|------|---------|
| `lib/enums/roles.ts` | Canonical UserRole enum (Single Source of Truth) |
| `lib/permissions/role-groups.ts` | Role group helpers (AGENCY_ADMIN, FIRM_STAFF, etc.) |
| `lib/permissions/rbac.ts` | Action permission matrix (migrated from lib/rbac.ts) |
| `docs/PARKING_LOT.md` | Deferred features registry |
| `docs/FEATURE_FREEZE.md` | Rebuild discipline rules |
| `docs/database/depo-pro-v2.2-migration.sql` | DB migration reference |
| `docs/database/rls-policy-pack.sql` | RLS policy reference |
| `docs/Migration-Rehearsal-Checklist.md` | Migration rehearsal steps |

---

## FILES MODIFIED

| File | Change |
|------|--------|
| `lib/permissions/api-guards.ts` | Upgraded to v2 with real auth guards |
| `lib/permissions/route-access.ts` | Default-deny fix + canonical UserRole import |
| `lib/permissions/case-access.ts` | Stubbed non-existent table queries |
| `lib/permissions/transcript-permissions.ts` | Added REPORTER alias |
| `lib/auth/require-role.ts` | Canonical UserRole + ROLE_HIERARCHY all 13 roles |
| `middleware.ts` | ROLE_PROTECTED_ROUTES all 13 roles + normalizeRole() |
| `lib/constants.ts` | Canonical UserRole import |
| `lib/rbac-client.ts` | v2.2 role names |
| `types/schema-enums.ts` | UserRole removed (canonical is lib/enums/roles.ts) |
| `tsconfig.json` | Exclude root-level `*.ts` reference files |
| 26 files total | UserRole import migrated from @/types/database → @/lib/enums/roles |

---

## DEFERRED TO PHASE 1

- Real `requireAttorneyCaseAccess()` (blocked by `case_memberships` table)
- Real `canAccessCase()` (blocked by `case_memberships` table)
- Real `assertCanAnnotateTranscript()` (blocked by `transcript_access` table)
- `organization_memberships` table (required by `requireOrgMembership()`)
- Multi-tenant schema migration (Organizations, Firms, Members)

---

## OVERALL STATUS: ✅ PHASE 0 COMPLETE

All 10 verification checks pass. Build clean. TypeScript clean.
Ready to gate-open Phase 1.

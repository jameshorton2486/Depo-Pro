# PHASE0_AUDIT.md

Date: 2026-02-20  
Branch: `crm-rebuild-phase0`

## SECTION 1 — ROLE DEFINITIONS

Files audited (requested set):
- `types/schema-enums.ts`
- `lib/constants.ts`
- `middleware.ts`
- `lib/rbac.ts`
- `lib/rbac-client.ts`
- `lib/permissions/matrix.ts`
- `lib/permissions/route-access.ts`

### Roles found by file
- `types/schema-enums.ts`: no `UserRole` enum defined (comment says canonical enum moved to `lib/enums/roles.ts`).
- `lib/constants.ts`: legacy `Role` includes `ADMIN`, `COURT_REPORTER`, `SCOPIST`, `ATTORNEY`; `USER_ROLE_LABELS` and `USER_ROLE_COLORS` also reference `AGENCY`, `AGENCY_ADMIN`, `FIRM_ADMIN`, `WKT_STUDENT`, plus v2 roles (`AGENCY_OWNER`, `AGENCY_MANAGER`, `REPORTER`, `VIDEOGRAPHER`, `INTERPRETER`, `FIRM_OWNER`, `FIRM_MANAGER`, `PARALEGAL`, `SUPER_ADMIN`).
- `middleware.ts`: role map keys include `ADMIN`, `COURT_REPORTER`, `AGENCY`, `AGENCY_ADMIN`, `FIRM_ADMIN`, `WKT_STUDENT`, `AGENCY_OWNER`, `AGENCY_MANAGER`, `REPORTER`, `SCOPIST`, `ATTORNEY`, `PARALEGAL`, `VIDEOGRAPHER`, `INTERPRETER`, `FIRM_OWNER`, `FIRM_MANAGER`, `SUPER_ADMIN`.
- `lib/rbac.ts`: file missing.
- `lib/rbac-client.ts`: permissions literals include `ADMIN`, `AGENCY`, `REPORTER`, `SCOPIST`, `ATTORNEY`.
- `lib/permissions/matrix.ts`: role type includes `ADMIN`, `REPORTER`, `SCOPIST`, `ATTORNEY`, `PARALEGAL`, `AGENCY_ADMIN`, `FIRM_ADMIN`, `WKT_STUDENT`.
- `lib/permissions/route-access.ts`: `VALID_ROLES` includes `ADMIN`, `REPORTER`, `SCOPIST`, `ATTORNEY`, `PARALEGAL`, `AGENCY`, `AGENCY_ADMIN`, `FIRM_ADMIN`, `WKT_STUDENT`.

### Mismatches
- Role model is inconsistent across files (mixed legacy + v2 + transitional aliases).
- `lib/rbac.ts` expected by spec is absent; equivalent logic appears in `lib/permissions/rbac.ts`.
- Several files still depend on transitional roles (`AGENCY`, `AGENCY_ADMIN`, `FIRM_ADMIN`, `WKT_STUDENT`) that are outside the target 13-role model.

## SECTION 2 — API GUARD AUDIT

File audited: `lib/permissions/api-guards.ts`

### Active non-stub guards
- `requireAuth()` (real auth query against `users`)
- `requireAuthV2()`
- `requireRole()`
- `requireRoleGroup()`
- `requireOrgMembership()`

### Stub guards (security gaps)
- `requireTranscriptAnnotation()`
- `requireAttorneyCaseAccess()`
- `requireExhibitUpload()`
- `requireReporterDepositionAccess()`
- `canAccessCase()`
- `canEditCase()`
- `getCasePermissions()`
- `assertCaseAccess()`
- `assertCanAnnotateTranscript()`

Note: stubs now log warnings, but still permit access in most paths.

## SECTION 3 — DUPLICATE / DEAD FILES

- `lib/auth.ts` vs `lib/auth/session.ts` vs `lib/auth/get-user-with-profile.ts`: all exist; overlapping helpers and return shapes; not dead, but duplicated auth abstraction.
- `lib/rbac.ts` vs `lib/rbac-client.ts`: server file missing; client file exists; current server equivalent is `lib/permissions/rbac.ts`.
- `lib/webhooks.ts` vs `lib/webhooks/`: `lib/webhooks.ts` is missing; `lib/webhooks/sign.ts` and `lib/webhooks/types.ts` remain.
- `lib/scheduling/`: directory absent (target stub files already removed previously).
- `components/calendar/`: mostly normalized filenames, but PascalCase remnants still exist (`CreateEventModal.tsx`, `EventDetailsDrawer.tsx`).
- `archive/`: no runtime imports detected from app/lib/components code.

## SECTION 4 — UNPROTECTED API ROUTES

Route inventory: 136 files under `app/api/**/route.ts`.

Heuristic scan result:
- 94 routes with no detected auth check pattern.
- 40 routes with auth check but no explicit role check pattern.
- 2 routes with both auth and role checks.

No-auth route list (pass/fail candidates):
- `app/api/admin/actions/route.ts`
- `app/api/admin/audit/route.ts`
- `app/api/admin/health/route.ts`
- `app/api/admin/incidents/route.ts`
- `app/api/admin/metrics/ai-quality/route.ts`
- `app/api/admin/metrics/cases/route.ts`
- `app/api/admin/metrics/route.ts`
- `app/api/admin/rate-limits/route.ts`
- `app/api/admin/users/[id]/role-history/route.ts`
- `app/api/assignments/[id]/route.ts`
- `app/api/attorney/cases/[id]/route.ts`
- `app/api/attorney/cases/route.ts`
- `app/api/attorney/dashboard/route.ts`
- `app/api/attorney/profile/route.ts`
- `app/api/audit/export/route.ts`
- `app/api/audit/route.ts`
- `app/api/auth/health/route.ts`
- `app/api/billing/invoices/[id]/pdf/route.ts`
- `app/api/billing/invoices/route.ts`
- `app/api/calendar/[id]/assign/route.ts`
- `app/api/calendar/[id]/convert-to-job/route.ts`
- `app/api/calendar/[id]/notes/route.ts`
- `app/api/calendar/[id]/reschedule/route.ts`
- `app/api/calendar/[id]/route.ts`
- `app/api/calendar/availability/[id]/route.ts`
- `app/api/calendar/availability/route.ts`
- `app/api/calendar/booking-requests/[id]/route.ts`
- `app/api/calendar/booking-requests/route.ts`
- `app/api/calendar/events/[id]/convert-to-job/route.ts`
- `app/api/calendar/events/[id]/reschedule/route.ts`
- `app/api/calendar/events/[id]/resize/route.ts`
- `app/api/calendar/events/[id]/undo-reschedule/route.ts`
- `app/api/calendar/events/[id]/validate-move/route.ts`
- `app/api/calendar/events/check-conflicts/route.ts`
- `app/api/calendar/suggestions/route.ts`
- `app/api/contact/route.ts`
- `app/api/cron/cleanup/route.ts`
- `app/api/cron/process-jobs/route.ts`
- `app/api/dashboard/stats/route.ts`
- `app/api/dictionary/[id]/route.ts`
- `app/api/entities/extract/route.ts`
- `app/api/external-calendar/google/callback/route.ts`
- `app/api/external-calendar/route.ts`
- `app/api/health/route.ts`
- `app/api/health/supabase/route.ts`
- `app/api/jobs/[id]/assign-reporter/route.ts`
- `app/api/jobs/[id]/assign/route.ts`
- `app/api/jobs/[id]/chronology/[entryId]/route.ts`
- `app/api/jobs/[id]/chronology/export/route.ts`
- `app/api/jobs/[id]/chronology/route.ts`
- `app/api/jobs/[id]/dictionary/route.ts`
- `app/api/jobs/[id]/exhibits/[exhibitId]/route.ts`
- `app/api/jobs/[id]/exhibits/route.ts`
- `app/api/jobs/[id]/export/route.ts`
- `app/api/jobs/[id]/flagged-words/route.ts`
- `app/api/jobs/[id]/medical-records/[recordId]/extract/route.ts`
- `app/api/jobs/[id]/medical-records/[recordId]/route.ts`
- `app/api/jobs/[id]/medical-records/route.ts`
- `app/api/jobs/[id]/proper-nouns/[nounId]/route.ts`
- `app/api/jobs/[id]/proper-nouns/route.ts`
- `app/api/jobs/[id]/review/route.ts`
- `app/api/jobs/[id]/status/route.ts`
- `app/api/jobs/[id]/transcribe/process-chunk/route.ts`
- `app/api/jobs/[id]/transcribe/resume/route.ts`
- `app/api/jobs/[id]/transcribe/route.ts`
- `app/api/jobs/queue/route.ts`
- `app/api/reporters/route.ts`
- `app/api/review-sessions/[id]/route.ts`
- `app/api/review-sessions/route.ts`
- `app/api/rx-queue/route.ts`
- `app/api/transcribe/start/route.ts`
- `app/api/transcribe/status/[id]/route.ts`
- `app/api/transcription-tool/start/route.ts`
- `app/api/transcriptions/[id]/status/route.ts`
- `app/api/transcripts/[id]/annotations/[annotationId]/route.ts`
- `app/api/transcripts/[id]/annotations/route.ts`
- `app/api/transcripts/[id]/bookmarks/route.ts`
- `app/api/transcripts/[id]/corrections/route.ts`
- `app/api/transcripts/[id]/export/route.ts`
- `app/api/transcripts/[id]/exports/route.ts`
- `app/api/transcripts/[id]/finalize/route.ts`
- `app/api/transcripts/[id]/highlights/route.ts`
- `app/api/transcripts/[id]/notes/route.ts`
- `app/api/transcripts/[id]/shares/route.ts`
- `app/api/transcripts/[id]/status/route.ts`
- `app/api/transcripts/[id]/unlock/route.ts`
- `app/api/transcripts/[id]/versions/[version]/restore/route.ts`
- `app/api/transcripts/[id]/versions/route.ts`
- `app/api/transcripts/[id]/words/route.ts`
- `app/api/usage/route.ts`
- `app/api/users/reporters/route.ts`
- `app/api/webhooks/[provider]/route.ts`
- `app/api/webhooks/deepgram/route.ts`
- `app/api/webhooks/stripe/route.ts`

## SECTION 5 — MIDDLEWARE GAPS

Current `middleware.ts` behavior:
- Has `ROLE_PROTECTED_ROUTES` and role enforcement for page routes.
- Role source is `session.user.user_metadata.role`.
- Does not verify role against DB at request time.
- Does not enforce API route role policy globally in middleware (API routes rely on route-level guards).

## SECTION 6 — DELETE LIST + REWRITE LIST

### DELETE LIST (safe removals based on current state)
- None pending from required targets: `lib/scheduling/conflict-detection.ts`, `lib/scheduling/scheduling-service.ts`, and `lib/webhooks.ts` are already absent.

### REWRITE LIST (required next)
- `lib/enums/roles.ts` (reduce to exact 13-role enum requested, keep legacy map)
- `lib/permissions/role-groups.ts` (align with canonical 13-role model + helpers)
- `types/schema-enums.ts` (re-export canonical `UserRole`)
- `lib/constants.ts` (Role type + labels aligned to canonical roles)
- `middleware.ts` (role map alignment to canonical roles)
- `lib/rbac-client.ts` (remove transitional role literals)
- `lib/permissions/matrix.ts` and `lib/permissions/route-access.ts` (legacy role cleanup)
- Any API route still relying on no auth or no role checks (large backlog)
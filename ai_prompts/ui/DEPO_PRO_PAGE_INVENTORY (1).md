# Depo-Pro Page Inventory
**Generated:** 2026-03-09  
**Source:** depo-pro-main (uploaded build)

---

## Route Map

| Route | Status | Auth Guard | Role Restriction | Notes |
|-------|--------|------------|-----------------|-------|
| **MARKETING / PUBLIC** | | | | |
| `/` | COMPLETE | None | Public | Marketing home page |
| `/about` | COMPLETE | None | Public | About page |
| `/contact` | COMPLETE | None | Public | Contact form |
| `/features` | COMPLETE | None | Public | Features listing |
| `/how-it-works` | COMPLETE | None | Public | Workflow explainer |
| `/pricing` | COMPLETE | None | Public | Pricing tiers |
| `/product` | COMPLETE | None | Public | Product detail |
| `/security` | COMPLETE | None | Public | Security info |
| **AUTH PAGES** | | | | |
| `/login` | COMPLETE | Redirect if authed | Public | Supabase SSR auth |
| `/register` | COMPLETE | Redirect if authed | Public | Supabase registration |
| `/forgot-password` | COMPLETE | None | Public | Password reset email |
| `/reset-password` | COMPLETE | None | Public | Password reset form |
| `/auth/invite/accept` | COMPLETE | None | Public | Invite acceptance |
| `/unauthorized` | COMPLETE | None | Public | Access denied page |
| `/maintenance` | COMPLETE | None | Public | Maintenance mode |
| **DASHBOARDS** | | | | |
| `/dashboard` | REDIRECT | ✅ | All roles | Routes to role dashboard |
| `/admin` | COMPLETE | ✅ ADMIN | ADMIN | Admin overview + stats |
| `/admin/actions` | COMPLETE | ✅ ADMIN | ADMIN | System action console |
| `/admin/features` | COMPLETE | ✅ ADMIN | ADMIN | Feature flag management |
| `/admin/permissions` | COMPLETE | ✅ ADMIN | ADMIN | Route permission audit |
| `/admin/rx-queue` | COMPLETE | ✅ ADMIN | ADMIN | RX queue manager |
| `/reporter` | COMPLETE | ✅ | REPORTER, ADMIN | Reporter dashboard |
| `/scopist` | COMPLETE | ✅ | SCOPIST, ADMIN | Scopist dashboard |
| `/attorney-dashboard` | COMPLETE | ✅ | ATTORNEY | Attorney dashboard |
| **JOBS** | | | | |
| `/jobs` | COMPLETE | ✅ | All roles | Jobs list with filters |
| `/jobs/new` | COMPLETE | ✅ | REPORTER, ADMIN | New job creation form |
| `/jobs/[id]` | COMPLETE | ✅ | All roles | Job detail + management |
| `/jobs/[id]/edit` | COMPLETE | ✅ | REPORTER, ADMIN | Job edit form |
| `/jobs/[id]/review` | COMPLETE | ✅ | REPORTER, SCOPIST, ADMIN | **CORE REVIEW TOOL** — waveform + synced transcript |
| `/jobs/[id]/medical` | COMPLETE | ✅ | REPORTER, SCOPIST, ADMIN | Medical chronology viewer |
| **TRANSCRIPTION** | | | | |
| `/transcription/upload` | COMPLETE | ✅ | REPORTER, ADMIN | Job creation + audio upload |
| `/transcription/status/[jobId]` | COMPLETE | ✅ | All roles | Real-time status polling |
| `/transcription/live/[jobId]` | STUB | ✅ | All roles | Live transcription (Phase 2) |
| `/transcription-tool` | COMPLETE | ✅ | REPORTER, SCOPIST, ADMIN | High-accuracy transcription uploader |
| **TRANSCRIPTS** | | | | |
| `/transcripts` | COMPLETE | ✅ | All roles | Transcript list with filters |
| `/transcripts/[jobId]` | COMPLETE | ✅ | All roles | Transcript detail view |
| `/transcripts/[jobId]/edit` | COMPLETE | ✅ | REPORTER, SCOPIST, ADMIN | Full transcript editor |
| `/transcripts/[jobId]/review` | REDIRECT | ✅ | All roles | Redirects → `/jobs/[id]/review` |
| `/transcripts/[jobId]/finalize` | PARTIAL | ✅ | REPORTER, ADMIN | Finalization + export trigger |
| `/transcripts/[jobId]/compare` | STUB | ✅ | All roles | Version compare (Phase 2) |
| **CALENDAR** | | | | |
| `/calendar` | REDIRECT | None | Public | Redirects → `/calendar/month` |
| `/calendar/month` | COMPLETE | ✅ | All roles | Month view calendar |
| `/calendar/week` | COMPLETE | ✅ | All roles | Week view calendar |
| `/calendar/availability` | COMPLETE | ✅ | REPORTER | Availability time-slot editor |
| `/calendar/deposition/create` | COMPLETE | ✅ | REPORTER, ADMIN | Create deposition event |
| `/calendar/deposition/[id]/edit` | COMPLETE | ✅ | REPORTER, ADMIN | Edit deposition event |
| `/calendar/deposition/[id]/confirm` | COMPLETE | ✅ | All roles | Confirm deposition |
| **SETTINGS** | | | | |
| `/settings/profile` | COMPLETE | ✅ | All roles | Profile editor |
| `/settings/users` | COMPLETE | ✅ ADMIN | ADMIN | User management |
| `/settings/roles` | **STUB** | ❌ MISSING | ADMIN | Role reference → Task 2A |
| `/settings/ai-models` | **STUB** | ❌ MISSING | ADMIN | AI config → Task 2B |
| `/settings/audio-processing` | **STUB** | ❌ MISSING | ADMIN | Audio pipeline → Task 2C |
| `/settings/billing-rates` | **STUB** | ❌ MISSING | ADMIN | Billing rates → Task 2D |
| `/settings/integrations` | **STUB** | ❌ MISSING | ADMIN | Integrations → Task 2E |
| **REPORTS** | | | | |
| `/reports` | COMPLETE | ✅ ADMIN | ADMIN | Reports hub |
| `/reports/audit-log` | COMPLETE | ✅ ADMIN | ADMIN | System audit log viewer |
| `/reports/usage` | **STUB** | ❌ MISSING | ADMIN | Usage stats → Task 9A |
| `/reports/accuracy` | **STUB** | ❌ MISSING | ADMIN | Accuracy metrics → Task 9B |
| `/reports/system` | **STUB** | ❌ MISSING | ADMIN | System health → Task 9C |
| **BILLING** | | | | |
| `/billing` | PARTIAL | None | All roles | Basic "coming soon" card |
| `/billing/usage` | **STUB** | None | All roles | Usage billing (Phase 2) |
| `/billing/invoices` | **STUB** | None | All roles | Invoice list (Phase 2) |
| `/billing/invoices/[id]` | **STUB** | None | All roles | Invoice detail (Phase 2) |
| `/billing/invoices/[id]/preview` | **STUB** | None | All roles | Invoice preview (Phase 2) |
| **EXPORTS** | | | | |
| `/exports` | COMPLETE | ✅ | All roles | Export list + DOCX triggers |
| **CASES** | | | | |
| `/cases` | REDIRECT | None | All roles | Redirects → `/jobs` |
| `/cases/new` | REDIRECT | None | All roles | Redirects → `/transcription/upload` |
| **WKT (Word Knowledge Training)** | | | | |
| `/wkt` | COMPLETE | ✅ | All roles | WKT home |
| `/flashcards` | COMPLETE | ✅ | All roles | Flashcard practice |
| `/mock-exam` | COMPLETE | ✅ | All roles | Mock exam |
| `/mock-exam/results` | COMPLETE | ✅ | All roles | Exam results |
| `/practice` | COMPLETE | ✅ | All roles | Practice mode |
| `/progress` | COMPLETE | ✅ | All roles | Progress tracking |
| **AI / INTERNAL** | | | | |
| `/ai` | COMPLETE | ✅ | Admin-level | AI documentation viewer |
| `/architecture` | COMPLETE | ✅ | Admin-level | Architecture diagram |
| **MISSING (need creation)** | | | | |
| `/notifications` | **MISSING** | N/A | All roles | Referenced in nav → Task 3A |
| `/help` | **MISSING** | N/A | All roles | Referenced in footer → Task 3B |

---

## Summary

| Category | Count |
|----------|-------|
| Complete (fully functional) | 42 |
| Stub (StubPage component) | 13 |
| Redirect-only | 5 |
| Partial (has content but incomplete) | 2 |
| Missing (referenced but no page.tsx) | 2 |
| **Total routes** | **64** |

---

## Stub Pages — Action Plan

| Route | Priority | Task | Reason |
|-------|----------|------|--------|
| `/settings/roles` | HIGH | Task 2A | Admin-visible, auth guard missing |
| `/settings/ai-models` | HIGH | Task 2B | Admin-visible, auth guard missing |
| `/settings/audio-processing` | HIGH | Task 2C | Admin-visible, auth guard missing |
| `/settings/billing-rates` | HIGH | Task 2D | Admin-visible, auth guard missing |
| `/settings/integrations` | MEDIUM | Task 2E | Admin-visible |
| `/reports/usage` | HIGH | Task 9A | Admin feature, easy DB query |
| `/reports/accuracy` | MEDIUM | Task 9B | Admin feature |
| `/reports/system` | MEDIUM | Task 9C | Admin feature |
| `/billing` | LOW | Phase 2 | Billing system not yet implemented |
| `/billing/usage` | LOW | Phase 2 | Billing system not yet implemented |
| `/billing/invoices` | LOW | Phase 2 | Billing system not yet implemented |
| `/transcription/live/[jobId]` | LOW | Phase 2 | Live transcription (future feature) |
| `/transcripts/[jobId]/compare` | LOW | Phase 2 | Version compare (future feature) |

---

## Critical Findings

### Auth Guard Gaps
The following stub pages exist but have NO auth guard — any unauthenticated user
who navigates directly to these URLs will see the stub content without being
challenged to log in:
- `/settings/billing-rates`
- `/settings/ai-models`
- `/settings/audio-processing`
- `/settings/roles`
- `/settings/integrations`

**Action:** Task 2A–2E will add auth guards when replacing stubs.

### Redirect Without Auth Guard
`/calendar` redirects to `/calendar/month` without checking auth.
An unauthenticated user will be redirected to `/calendar/month` which does have
an auth guard, so this is acceptable (will redirect to `/login`).

### Billing Pages
All billing pages are stubs. This is intentional — billing system is deferred
to Phase 2. The `/billing` page should have an auth guard even as a stub.

### Missing Calendar Migration
Check whether the calendar schema migration (`20260310_014_calendar_events.sql`)
has been applied to Supabase. If not, the calendar create/edit pages will fail
at runtime even though the UI renders.

---

*Generated by Claude Code page audit | Depo-Pro v1.0*

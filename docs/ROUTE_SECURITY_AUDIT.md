# Route Security Audit - 2026-02-22

## Legend
- **Auth**: Authentication method used
- **Role**: Role-based checks present
- **Tenant**: Firm/job tenant scoping present
- **Rate**: Rate limiting present
- **Audit**: Audit logging references present

## Summary Statistics
- Total route handlers: 244
- Route handlers with auth: 214/244
- Route handlers with role checks: 124/244
- Route handlers with tenant isolation: 87/244
- Route handlers with rate limiting: 42/244
- Unauthenticated handlers: 30

## Critical Write Endpoints
| Route | Method | Auth | Role | Tenant | Rate | Audit | Status |
|---|---|---|---|---|---|---|---|
| `/api/admin/incidents/route.ts` | PATCH | none | ❌ | ❌ | ❌ | ❌ | ⚠️ GAP |
| `/api/assignments/[id]/notify/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/assignments/[id]/route.ts` | PATCH | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/assignments/[id]/route.ts` | DELETE | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/attorney/annotations/[id]/exhibits/route.ts` | POST | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/attorney/annotations/[id]/exhibits/route.ts` | DELETE | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/attorney/annotations/[id]/route.ts` | DELETE | none | ✅ | ❌ | ❌ | ❌ | ⚠️ GAP |
| `/api/attorney/annotations/route.ts` | POST | none | ✅ | ❌ | ❌ | ❌ | ⚠️ GAP |
| `/api/attorney/exhibits/[id]/route.ts` | DELETE | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/attorney/exhibits/route.ts` | POST | none | ✅ | ✅ | ❌ | ✅ | ⚠️ GAP |
| `/api/attorney/profile/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/attorney/profile/route.ts` | PATCH | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/attorney/transcripts/route.ts` | POST | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/audit-logs/route.ts` | POST | requireAuthV2 | ❌ | ❌ | ❌ | ✅ | OK |
| `/api/audit-logs/route.ts` | PUT | requireAuthV2 | ❌ | ❌ | ❌ | ✅ | OK |
| `/api/audit-logs/route.ts` | DELETE | requireAuthV2 | ❌ | ❌ | ❌ | ✅ | OK |
| `/api/audit/export/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ✅ | OK |
| `/api/audit/route.ts` | POST | requireAuthV2 | ✅ | ✅ | ❌ | ✅ | OK |
| `/api/audit/route.ts` | DELETE | requireAuthV2 | ✅ | ✅ | ❌ | ✅ | OK |
| `/api/audit/route.ts` | PATCH | requireAuthV2 | ✅ | ✅ | ❌ | ✅ | OK |
| `/api/audit/route.ts` | PUT | requireAuthV2 | ✅ | ✅ | ❌ | ✅ | OK |
| `/api/calendar/[id]/assign/route.ts` | POST | getCurrentUser | ✅ | ❌ | ❌ | ✅ | OK |
| `/api/calendar/[id]/convert-to-job/route.ts` | POST | getCurrentUser | ❌ | ✅ | ❌ | ✅ | OK |
| `/api/calendar/[id]/notes/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ✅ | OK |
| `/api/calendar/[id]/reschedule/route.ts` | PATCH | getCurrentUser | ❌ | ✅ | ❌ | ✅ | OK |
| `/api/calendar/[id]/route.ts` | PATCH | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/calendar/[id]/route.ts` | DELETE | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/calendar/availability/[id]/route.ts` | DELETE | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/availability/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/availability/route.ts` | DELETE | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/booking-requests/[id]/route.ts` | PATCH | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/booking-requests/[id]/route.ts` | DELETE | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/booking-requests/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/events/[id]/convert-to-job/route.ts` | POST | getCurrentUser | ❌ | ✅ | ❌ | ✅ | OK |
| `/api/calendar/events/[id]/reschedule/route.ts` | POST | getCurrentUser | ❌ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/events/[id]/reschedule/route.ts` | PUT | getCurrentUser | ❌ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/events/[id]/resize/route.ts` | POST | getCurrentUser | ❌ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/events/[id]/route.ts` | PATCH | supabase.auth.getUser | ❌ | ❌ | ❌ | ✅ | OK |
| `/api/calendar/events/[id]/route.ts` | DELETE | supabase.auth.getUser | ❌ | ❌ | ❌ | ✅ | OK |
| `/api/calendar/events/[id]/undo-reschedule/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/calendar/events/[id]/validate-move/route.ts` | POST | getCurrentUser | ❌ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/events/check-conflicts/route.ts` | POST | getCurrentUser | ❌ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/events/route.ts` | POST | supabase.auth.getUser | ❌ | ✅ | ❌ | ✅ | OK |
| `/api/calendar/google/sync/route.ts` | POST | supabase.auth.getUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/calendar/suggestions/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/calendar/suggestions/route.ts` | PATCH | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/contact/route.ts` | POST | none | ❌ | ✅ | ✅ | ✅ | ⚠️ GAP |
| `/api/cron/process-jobs/route.ts` | POST | none | ❌ | ❌ | ❌ | ❌ | ⚠️ GAP |
| `/api/demands/route.ts` | POST | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/demands/route.ts` | PUT | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/demands/route.ts` | DELETE | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/depositions/route.ts` | POST | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/depositions/route.ts` | PUT | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/depositions/route.ts` | DELETE | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/dictionary/[id]/route.ts` | POST | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/dictionary/[id]/route.ts` | PUT | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/dictionary/[id]/route.ts` | DELETE | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/entities/extract/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/exhibits/route.ts` | POST | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/exhibits/route.ts` | PUT | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/exhibits/route.ts` | DELETE | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/external-calendar/route.ts` | POST | getCurrentUser | ❌ | ✅ | ❌ | ❌ | OK |
| `/api/external-calendar/route.ts` | PATCH | getCurrentUser | ❌ | ✅ | ❌ | ❌ | OK |
| `/api/external-calendar/route.ts` | DELETE | getCurrentUser | ❌ | ✅ | ❌ | ❌ | OK |
| `/api/files/[id]/route.ts` | DELETE | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/firms/route.ts` | POST | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/firms/route.ts` | PUT | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/firms/route.ts` | DELETE | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/assign-reporter/route.ts` | DELETE | withRouteProtection | ✅ | ✅ | ✅ | ✅ | OK |
| `/api/jobs/[id]/assign-reporter/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ✅ | OK |
| `/api/jobs/[id]/assign/route.ts` | DELETE | withRouteProtection | ✅ | ✅ | ✅ | ✅ | OK |
| `/api/jobs/[id]/assign/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ✅ | OK |
| `/api/jobs/[id]/chronology/[entryId]/route.ts` | PATCH | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/chronology/[entryId]/route.ts` | DELETE | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/chronology/route.ts` | POST | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/jobs/[id]/dictionary/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/exhibits/[exhibitId]/route.ts` | PATCH | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/exhibits/[exhibitId]/route.ts` | DELETE | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/exhibits/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/jobs/[id]/export/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/jobs/[id]/files/route.ts` | POST | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/flagged-words/route.ts` | DELETE | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/jobs/[id]/flagged-words/route.ts` | PATCH | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/jobs/[id]/invoice/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/jobs/[id]/medical-records/[recordId]/extract/route.ts` | POST | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/jobs/[id]/medical-records/[recordId]/route.ts` | DELETE | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/medical-records/route.ts` | POST | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/jobs/[id]/notes/[noteId]/route.ts` | PATCH | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/notes/[noteId]/route.ts` | DELETE | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/notes/route.ts` | POST | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/proper-nouns/[nounId]/route.ts` | PATCH | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/jobs/[id]/proper-nouns/[nounId]/route.ts` | DELETE | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/jobs/[id]/proper-nouns/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/jobs/[id]/proper-nouns/route.ts` | DELETE | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/jobs/[id]/review/route.ts` | PATCH | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/jobs/[id]/route.ts` | PUT | none | ✅ | ✅ | ✅ | ❌ | ⚠️ GAP |
| `/api/jobs/[id]/route.ts` | PATCH | none | ✅ | ✅ | ✅ | ❌ | ⚠️ GAP |
| `/api/jobs/[id]/route.ts` | DELETE | none | ✅ | ✅ | ✅ | ❌ | ⚠️ GAP |
| `/api/jobs/[id]/rx/route.ts` | POST | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/[id]/status/route.ts` | PATCH | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/jobs/[id]/transcribe/process-chunk/route.ts` | POST | none | ❌ | ❌ | ❌ | ❌ | ⚠️ GAP |
| `/api/jobs/[id]/transcribe/resume/route.ts` | POST | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/jobs/[id]/transcribe/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/jobs/queue/route.ts` | POST | getCurrentUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/jobs/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/matters/route.ts` | POST | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/matters/route.ts` | PUT | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/matters/route.ts` | DELETE | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/medical-records/route.ts` | POST | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/medical-records/route.ts` | PUT | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/medical-records/route.ts` | DELETE | requireAuthV2 | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/profile/route.ts` | POST | supabase.auth.getUser | ✅ | ❌ | ❌ | ❌ | OK |
| `/api/queue/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/review-sessions/[id]/route.ts` | PATCH | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/review-sessions/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/transcribe/start/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/transcription-tool/start/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ❌ | OK |
| `/api/transcripts/[id]/ai-review/route.ts` | POST | supabase.auth.getUser | ❌ | ❌ | ❌ | ✅ | OK |
| `/api/transcripts/[id]/annotations/[annotationId]/route.ts` | PATCH | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/transcripts/[id]/annotations/[annotationId]/route.ts` | DELETE | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/transcripts/[id]/annotations/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/transcripts/[id]/bookmarks/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/transcripts/[id]/corrections/route.ts` | POST | withRouteProtection | ✅ | ❌ | ✅ | ✅ | OK |
| `/api/transcripts/[id]/finalize/route.ts` | POST | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/transcripts/[id]/highlights/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/transcripts/[id]/notes/route.ts` | POST | getCurrentUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/transcripts/[id]/route.ts` | PATCH | none | ✅ | ✅ | ✅ | ✅ | ⚠️ GAP |
| `/api/transcripts/[id]/route.ts` | PUT | none | ✅ | ✅ | ✅ | ✅ | ⚠️ GAP |
| `/api/transcripts/[id]/score/route.ts` | POST | supabase.auth.getUser | ❌ | ❌ | ❌ | ✅ | OK |
| `/api/transcripts/[id]/shares/route.ts` | POST | getCurrentUser | ✅ | ✅ | ❌ | ✅ | OK |
| `/api/transcripts/[id]/status/route.ts` | PATCH | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/transcripts/[id]/unlock/route.ts` | POST | withRouteProtection | ✅ | ✅ | ✅ | ✅ | OK |
| `/api/transcripts/[id]/versions/[version]/restore/route.ts` | POST | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/transcripts/[id]/words/route.ts` | PATCH | withRouteProtection | ✅ | ❌ | ✅ | ❌ | OK |
| `/api/transcripts/route.ts` | POST | supabase.auth.getUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/transcripts/route.ts` | PUT | supabase.auth.getUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/transcripts/route.ts` | DELETE | supabase.auth.getUser | ✅ | ✅ | ❌ | ❌ | OK |
| `/api/webhooks/[provider]/route.ts` | POST | none | ❌ | ❌ | ❌ | ❌ | ⚠️ GAP |
| `/api/webhooks/deepgram/route.ts` | POST | none | ❌ | ❌ | ❌ | ❌ | ⚠️ GAP |
| `/api/webhooks/stripe/route.ts` | POST | none | ❌ | ❌ | ❌ | ❌ | ⚠️ GAP |
| `/api/wkt/bookmarks/route.ts` | POST | supabase.auth.getUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/wkt/bookmarks/route.ts` | DELETE | supabase.auth.getUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/wkt/exams/[examId]/route.ts` | PUT | supabase.auth.getUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/wkt/exams/route.ts` | POST | supabase.auth.getUser | ❌ | ❌ | ❌ | ❌ | OK |
| `/api/wkt/questions/[id]/route.ts` | POST | supabase.auth.getUser | ❌ | ❌ | ❌ | ❌ | OK |

## Read Endpoints
| Route | Auth | Role | Tenant | Status |
|---|---|---|---|---|
| `/api/admin/actions/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/admin/audit/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/admin/health/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/admin/incidents/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/admin/metrics/ai-quality/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/admin/metrics/cases/route.ts` | none | ❌ | ✅ | ⚠️ REVIEW |
| `/api/admin/metrics/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/admin/rate-limits/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/admin/users/[id]/role-history/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/attorney/annotations/route.ts` | none | ✅ | ❌ | ⚠️ REVIEW |
| `/api/attorney/cases/[id]/route.ts` | getCurrentUser | ❌ | ✅ | OK |
| `/api/attorney/cases/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/attorney/dashboard/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/attorney/exhibits/[id]/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/attorney/exhibits/route.ts` | none | ✅ | ✅ | ⚠️ REVIEW |
| `/api/attorney/profile/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/attorney/transcripts/[id]/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/attorney/transcripts/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/audit-logs/route.ts` | requireAuthV2 | ❌ | ❌ | OK |
| `/api/audit/route.ts` | requireAuthV2 | ✅ | ✅ | OK |
| `/api/auth/health/route.ts` | none | ✅ | ❌ | ⚠️ REVIEW |
| `/api/billing/invoice-preview/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/billing/invoices/[id]/pdf/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/billing/invoices/route.ts` | getCurrentUser | ❌ | ✅ | OK |
| `/api/calendar/[id]/notes/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/calendar/[id]/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/calendar/availability/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/calendar/booking-requests/[id]/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/calendar/booking-requests/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/calendar/events/[id]/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/calendar/events/route.ts` | supabase.auth.getUser | ❌ | ✅ | OK |
| `/api/calendar/suggestions/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/cron/cleanup/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/cron/process-jobs/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/dashboard/stats/route.ts` | getCurrentUser | ❌ | ✅ | OK |
| `/api/demands/route.ts` | requireAuthV2 | ❌ | ❌ | OK |
| `/api/depositions/route.ts` | requireAuthV2 | ❌ | ❌ | OK |
| `/api/dictionary/[id]/route.ts` | requireAuthV2 | ❌ | ❌ | OK |
| `/api/entities/extract/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/exhibits/route.ts` | requireAuthV2 | ❌ | ❌ | OK |
| `/api/external-calendar/google/callback/route.ts` | getCurrentUser | ❌ | ✅ | OK |
| `/api/external-calendar/route.ts` | getCurrentUser | ❌ | ✅ | OK |
| `/api/files/[id]/download/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/files/[id]/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/firms/route.ts` | requireAuthV2 | ❌ | ❌ | OK |
| `/api/health/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/health/supabase/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/jobs/[id]/chronology/export/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/jobs/[id]/chronology/route.ts` | withRouteProtection | ✅ | ❌ | OK |
| `/api/jobs/[id]/dictionary/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/jobs/[id]/exhibits/[exhibitId]/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/jobs/[id]/exhibits/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/jobs/[id]/export/route.ts` | withRouteProtection | ✅ | ✅ | OK |
| `/api/jobs/[id]/files/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/jobs/[id]/flagged-words/route.ts` | withRouteProtection | ✅ | ✅ | OK |
| `/api/jobs/[id]/medical-records/[recordId]/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/jobs/[id]/medical-records/route.ts` | withRouteProtection | ✅ | ❌ | OK |
| `/api/jobs/[id]/notes/[noteId]/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/jobs/[id]/notes/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/jobs/[id]/proper-nouns/[nounId]/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/jobs/[id]/proper-nouns/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/jobs/[id]/route.ts` | none | ✅ | ✅ | ⚠️ REVIEW |
| `/api/jobs/[id]/rx/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/jobs/[id]/status/route.ts` | withRouteProtection | ✅ | ❌ | OK |
| `/api/jobs/queue/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/jobs/route.ts` | withRouteProtection | ✅ | ✅ | OK |
| `/api/matters/route.ts` | requireAuthV2 | ❌ | ❌ | OK |
| `/api/medical-records/route.ts` | requireAuthV2 | ❌ | ❌ | OK |
| `/api/profile/route.ts` | supabase.auth.getUser | ✅ | ❌ | OK |
| `/api/queue/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/reporters/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/rx-queue/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/transcribe/status/[id]/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/transcriptions/[id]/status/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/transcripts/[id]/ai-review/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/transcripts/[id]/annotations/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/transcripts/[id]/bookmarks/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/transcripts/[id]/corrections/route.ts` | withRouteProtection | ✅ | ❌ | OK |
| `/api/transcripts/[id]/export/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/transcripts/[id]/exports/route.ts` | getCurrentUser | ✅ | ❌ | OK |
| `/api/transcripts/[id]/highlights/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/transcripts/[id]/notes/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/transcripts/[id]/route.ts` | none | ✅ | ✅ | ⚠️ REVIEW |
| `/api/transcripts/[id]/score/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/transcripts/[id]/shares/route.ts` | getCurrentUser | ✅ | ✅ | OK |
| `/api/transcripts/[id]/versions/route.ts` | getCurrentUser | ❌ | ❌ | OK |
| `/api/transcripts/[id]/words/route.ts` | withRouteProtection | ✅ | ❌ | OK |
| `/api/transcripts/route.ts` | supabase.auth.getUser | ✅ | ✅ | OK |
| `/api/usage/route.ts` | getCurrentUser | ❌ | ✅ | OK |
| `/api/users/reporters/route.ts` | getCurrentUser | ❌ | ✅ | OK |
| `/api/webhooks/stripe/route.ts` | none | ❌ | ❌ | ⚠️ REVIEW |
| `/api/wkt/bookmarks/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/wkt/exams/[examId]/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/wkt/exams/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/wkt/progress/review-queue/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/wkt/progress/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/wkt/questions/[id]/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/wkt/questions/random/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |
| `/api/wkt/questions/route.ts` | supabase.auth.getUser | ❌ | ❌ | OK |

## Intentionally Unauthenticated
| Route | Reason |
|---|---|
| `/api/health` | System monitoring |
| `/api/auth/health` | Auth system check |
| `/api/webhooks/*` | External service callbacks with signature validation |
| `/api/contact` | Public contact form |
| `/api/cron/*` | Cron endpoints should validate CRON_SECRET |

## Follow-ups
1. Review all write handlers marked `⚠️ GAP` and migrate to `withRouteProtection` or `requireAuthV2`.
2. Validate unauthenticated webhook and cron signature/secret checks.
3. Confirm audit logging coverage for billing/export/transcription mutation endpoints.

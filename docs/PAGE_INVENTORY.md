# Depo-Pro Page Inventory
Last updated: 2026-03-09

## Route Map

| Route | File | Status | Auth Guard | Notes |
|-------|------|--------|------------|-------|
| / | app\(wkt)\page.tsx | COMPLETE | Layout guard |  |
| / | app\page.tsx | COMPLETE | None (public) |  |
| /about | app\about\page.tsx | COMPLETE | None (public) |  |
| /admin | app\(dashboard)\admin\page.tsx | COMPLETE | Page guard | Admin area |
| /admin/actions | app\(dashboard)\admin\actions\page.tsx | COMPLETE | Page guard | Admin area |
| /admin/features | app\(dashboard)\admin\features\page.tsx | PARTIAL | Page guard | Admin area |
| /admin/jobs | app\(dashboard)\admin\jobs\page.tsx | REDIRECT | Layout guard | Alias or routing shim |
| /admin/organizations | app\(dashboard)\admin\organizations\page.tsx | COMPLETE | Page guard | Admin area |
| /admin/permissions | app\(dashboard)\admin\permissions\page.tsx | PARTIAL | Page guard | Admin area |
| /admin/rx-queue | app\(dashboard)\admin\rx-queue\page.tsx | COMPLETE | Page guard | Admin area |
| /admin/system | app\(dashboard)\admin\system\page.tsx | COMPLETE | Page guard | Admin area |
| /admin/users | app\(dashboard)\admin\users\page.tsx | COMPLETE | Page guard | Admin area |
| /ai | app\ai\page.tsx | COMPLETE | None (public) |  |
| /architecture | app\architecture\page.tsx | COMPLETE | None (public) |  |
| /attorney-dashboard | app\(attorney)\attorney-dashboard\page.tsx | COMPLETE | Layout guard |  |
| /auth/invite/accept | app\auth\invite\accept\page.tsx | COMPLETE | None (public) |  |
| /billing | app\billing\page.tsx | PARTIAL | None (public) |  |
| /billing/invoices | app\billing\invoices\page.tsx | STUB | None (public) | Stub placeholder component |
| /billing/invoices/[invoiceId] | app\billing\invoices\[invoiceId]\page.tsx | STUB | None (public) | Stub placeholder component |
| /billing/invoices/[invoiceId]/preview | app\billing\invoices\[invoiceId]\preview\page.tsx | STUB | None (public) | Stub placeholder component |
| /billing/usage | app\billing\usage\page.tsx | STUB | None (public) | Stub placeholder component |
| /calendar | app\calendar\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /calendar/availability | app\calendar\availability\page.tsx | COMPLETE | None (public) |  |
| /calendar/deposition/[id]/confirm | app\calendar\deposition\[id]\confirm\page.tsx | COMPLETE | Page guard |  |
| /calendar/deposition/[id]/edit | app\calendar\deposition\[id]\edit\page.tsx | COMPLETE | Page guard |  |
| /calendar/deposition/create | app\calendar\deposition\create\page.tsx | COMPLETE | Page guard |  |
| /calendar/month | app\calendar\month\page.tsx | COMPLETE | Page guard |  |
| /calendar/week | app\calendar\week\page.tsx | COMPLETE | Page guard |  |
| /cases | app\cases\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /cases/new | app\cases\new\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /contact | app\contact\page.tsx | COMPLETE | None (public) |  |
| /dashboard | app\dashboard\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /dashboard/jobs | app\dashboard\jobs\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /dashboard/jobs/[id] | app\dashboard\jobs\[id]\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /dashboard/jobs/[id]/review | app\dashboard\jobs\[id]\review\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /dashboard/jobs/new | app\dashboard\jobs\new\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /dashboard/settings | app\dashboard\settings\page.tsx | COMPLETE | Page guard |  |
| /exports | app\exports\page.tsx | COMPLETE | Page guard |  |
| /features | app\features\page.tsx | COMPLETE | None (public) |  |
| /flashcards | app\(wkt)\flashcards\page.tsx | PARTIAL | Layout guard |  |
| /forgot-password | app\(auth)\forgot-password\page.tsx | PARTIAL | None (public) |  |
| /help | app\help\page.tsx | COMPLETE | Page guard |  |
| /how-it-works | app\how-it-works\page.tsx | COMPLETE | None (public) |  |
| /jobs | app\(dashboard)\jobs\page.tsx | PARTIAL | Page guard | Core workflow |
| /jobs/[id] | app\(dashboard)\jobs\[id]\page.tsx | COMPLETE | Page guard | Core workflow |
| /jobs/[id]/edit | app\(dashboard)\jobs\[id]\edit\page.tsx | COMPLETE | Page guard | Core workflow |
| /jobs/[id]/medical | app\(dashboard)\jobs\[id]\medical\page.tsx | COMPLETE | Layout guard | Core workflow |
| /jobs/[id]/review | app\(dashboard)\jobs\[id]\review\page.tsx | COMPLETE | Page guard | Core workflow |
| /jobs/new | app\(dashboard)\jobs\new\page.tsx | COMPLETE | Page guard | Core workflow |
| /login | app\(auth)\login\page.tsx | PARTIAL | None (public) |  |
| /logout | app\logout\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /maintenance | app\maintenance\page.tsx | COMPLETE | None (public) |  |
| /mock-exam | app\(wkt)\mock-exam\page.tsx | PARTIAL | Layout guard |  |
| /mock-exam/results | app\(wkt)\mock-exam\results\page.tsx | PARTIAL | Layout guard |  |
| /practice | app\(wkt)\practice\page.tsx | COMPLETE | Layout guard |  |
| /pricing | app\pricing\page.tsx | PARTIAL | None (public) |  |
| /privacy | app\privacy\page.tsx | COMPLETE | None (public) |  |
| /product | app\product\page.tsx | COMPLETE | None (public) |  |
| /progress | app\(wkt)\progress\page.tsx | COMPLETE | Layout guard |  |
| /register | app\(auth)\register\page.tsx | PARTIAL | None (public) |  |
| /reporter | app\(dashboard)\reporter\page.tsx | COMPLETE | Page guard |  |
| /reset-password | app\(auth)\reset-password\page.tsx | PARTIAL | None (public) |  |
| /scopist | app\(dashboard)\scopist\page.tsx | COMPLETE | Page guard |  |
| /security | app\security\page.tsx | COMPLETE | None (public) |  |
| /settings/ai-models | app\settings\ai-models\page.tsx | COMPLETE | Page guard |  |
| /settings/audio-processing | app\settings\audio-processing\page.tsx | COMPLETE | Page guard |  |
| /settings/billing-rates | app\settings\billing-rates\page.tsx | PARTIAL | Page guard |  |
| /settings/integrations | app\settings\integrations\page.tsx | PARTIAL | Page guard |  |
| /settings/profile | app\(dashboard)\settings\profile\page.tsx | COMPLETE | Layout guard |  |
| /settings/roles | app\settings\roles\page.tsx | COMPLETE | Page guard |  |
| /settings/users | app\settings\users\page.tsx | COMPLETE | Page guard |  |
| /terms | app\terms\page.tsx | COMPLETE | None (public) |  |
| /transcription-tool | app\transcription-tool\page.tsx | PARTIAL | None (public) | Core workflow |
| /transcription/live/[jobId] | app\transcription\live\[jobId]\page.tsx | STUB | None (public) | Stub placeholder component |
| /transcription/status/[jobId] | app\transcription\status\[jobId]\page.tsx | COMPLETE | None (public) | Core workflow |
| /transcription/upload | app\transcription\upload\page.tsx | PARTIAL | None (public) | Core workflow |
| /transcripts | app\transcripts\page.tsx | PARTIAL | Page guard | Core workflow |
| /transcripts/[jobId] | app\transcripts\[jobId]\page.tsx | COMPLETE | Page guard | Core workflow |
| /transcripts/[jobId]/compare | app\transcripts\[jobId]\compare\page.tsx | PARTIAL | Page guard | Core workflow |
| /transcripts/[jobId]/edit | app\transcripts\[jobId]\edit\page.tsx | COMPLETE | Page guard | Core workflow |
| /transcripts/[jobId]/finalize | app\transcripts\[jobId]\finalize\page.tsx | REDIRECT | Page guard | Alias or routing shim |
| /transcripts/[jobId]/review | app\transcripts\[jobId]\review\page.tsx | REDIRECT | None (public) | Alias or routing shim |
| /unauthorized | app\unauthorized\page.tsx | COMPLETE | None (public) |  |

## Summary
- Total pages: 83
- Complete: 48
- Stub: 5
- Redirect: 12
- Broken: 0
- Partial: 18

## Stub Pages Requiring Attention
- /billing/invoices ($(@{Route=/billing/invoices; File=app\billing\invoices\page.tsx; Status=STUB; Auth=None (public); Notes=Stub placeholder component}.File))
- /billing/invoices/[invoiceId] ($(@{Route=/billing/invoices/[invoiceId]; File=app\billing\invoices\[invoiceId]\page.tsx; Status=STUB; Auth=None (public); Notes=Stub placeholder component}.File))
- /billing/invoices/[invoiceId]/preview ($(@{Route=/billing/invoices/[invoiceId]/preview; File=app\billing\invoices\[invoiceId]\preview\page.tsx; Status=STUB; Auth=None (public); Notes=Stub placeholder component}.File))
- /billing/usage ($(@{Route=/billing/usage; File=app\billing\usage\page.tsx; Status=STUB; Auth=None (public); Notes=Stub placeholder component}.File))
- /transcription/live/[jobId] ($(@{Route=/transcription/live/[jobId]; File=app\transcription\live\[jobId]\page.tsx; Status=STUB; Auth=None (public); Notes=Stub placeholder component}.File))

## Missing Pages (404s referenced in navigation)
- /attorney/cases
- /attorney/dashboard
- /attorney/transcripts
- /settings/billing
- /settings/firm
- /settings/organization
- /wkt
- /wkt/flashcards
- /wkt/mock-exam
- /wkt/practice
- /wkt/progress

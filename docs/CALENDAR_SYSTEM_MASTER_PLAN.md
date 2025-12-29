# Depo-Pro Calendar & CSR System — Master Implementation Plan

## Executive Summary

This document provides a complete, step-by-step implementation guide for the multi-tenant calendar, CSR paperwork, and scopist marketplace features in Depo-Pro.

**Version:** 2.0 (Enhanced with Insurance Defense & AI Document Ingestion)

**Total Estimated Time:** 6-8 weeks  
**Phases:** 6  
**Documents in Package:**
1. `CALENDAR_SYSTEM_MASTER_PLAN.md` (this file)
2. `CURSOR_AUTHORITATIVE_BUILD_PROMPT.md` (comprehensive Cursor AI prompt)
3. `prisma/schema-calendar-csr.prisma` (schema additions)
4. `API_SPECIFICATIONS.md` (endpoint definitions)
5. `IMPLEMENTATION_CHECKLIST.md` (day-by-day tracking)
6. `scripts/seed-calendar-test-data.ts` (test data)
7. `scripts/deploy-depo-pro-files.ps1` (Windows deployment script)

---

## Key Features (v2.0 Enhancements)

### 🆕 Insurance Defense Support
- Claim number, policy number, date of loss tracking
- Insurer and insured name fields
- EUO (Examination Under Oath) flag
- Adjustor contact information
- Full billing traceability

### 🆕 AI-Assisted Document Ingestion
- Upload Notice of Deposition PDFs
- Automatic field extraction with confidence scores
- Visual highlighting of AI-populated fields
- Manual override tracking
- Pattern-based + AI extraction (Claude API ready)

### 🆕 TranscriptOrder Model
- Per-attorney/firm fulfillment tracking
- Delivery type (E-Trans, Hard Copy, Original)
- File format preferences (Word, PDF, ASCII)
- Fulfillment status tracking
- Billing integration ready

### 🆕 Enhanced Delivery Priority
- STANDARD (14-21 days)
- EXPEDITE (7-10 days)  
- RUSH (3-5 days)
- DAILY (next business day)
- HOURLY (same day)
- REALTIME (during deposition)

---

## Phase Overview

| Phase | Name | Duration | Dependencies |
|-------|------|----------|--------------|
| 1 | Schema & Database | 3-4 days | None |
| 2 | Agency Multi-Tenancy | 3-4 days | Phase 1 |
| 3 | Calendar Core | 5-7 days | Phase 1, 2 |
| 4 | CSR Paperwork & AI Ingestion | 7-9 days | Phase 1, 2, 3 |
| 5 | Scopist Marketplace | 4-5 days | Phase 1, 2, 4 |
| 6 | Google Calendar Sync | 4-5 days | Phase 3 |

---

## Phase 1: Schema & Database (Days 1-4)

### Objectives
- Add Agency model for super-tenants
- Add CalendarEvent model
- Add CSRRecord and related models
- Add JobExhibit with timestamp markers
- Add Scopist marketplace models
- Update existing User model with Agency relation

### Tasks

#### Task 1.1: Backup Current Database
```bash
# Run in production
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Task 1.2: Add Schema Additions
1. Copy contents from `prisma/schema-calendar-csr.prisma`
2. Append to existing `prisma/schema.prisma`
3. Run `npx prisma validate`

#### Task 1.3: Generate Migration
```bash
npx prisma migrate dev --name add_calendar_csr_system
```

#### Task 1.4: Update Prisma Client
```bash
npx prisma generate
```

#### Task 1.5: Seed Test Data
```bash
npx tsx scripts/seed-calendar-test-data.ts
```

### Deliverables
- [ ] Schema validated
- [ ] Migration successful
- [ ] Prisma client updated
- [ ] Test data seeded

---

## Phase 2: Agency Multi-Tenancy (Days 5-8)

### Objectives
- Implement Agency CRUD operations
- Add RLS policies to Supabase
- Update user registration to support Agency association
- Create agency admin dashboard

### Tasks

#### Task 2.1: API Routes for Agency
Create the following API endpoints:
- `POST /api/agencies` - Create agency
- `GET /api/agencies` - List agencies (admin only)
- `GET /api/agencies/[id]` - Get agency details
- `PATCH /api/agencies/[id]` - Update agency
- `POST /api/agencies/[id]/invite` - Invite user to agency

#### Task 2.2: RLS Policies
Apply Row Level Security in Supabase:

```sql
-- Agency isolation for Jobs
CREATE POLICY "agency_job_isolation" ON "Job"
FOR ALL USING (
  -- User's agency matches job's agency
  "agencyId" = (SELECT "agencyId" FROM "User" WHERE id = auth.uid())
  OR
  -- Or user is admin
  (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN'
  OR
  -- Or user created the job
  "createdById" = auth.uid()
);

-- Agency isolation for CalendarEvents
CREATE POLICY "agency_calendar_isolation" ON "CalendarEvent"
FOR ALL USING (
  "agencyId" = (SELECT "agencyId" FROM "User" WHERE id = auth.uid())
  OR
  (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN'
);
```

#### Task 2.3: Agency Dashboard
Create `/app/(dashboard)/agency/page.tsx`:
- Agency overview stats
- Reporter list
- Job summary by reporter
- Firm relationships

### Deliverables
- [ ] Agency CRUD API working
- [ ] RLS policies applied
- [ ] Agency dashboard functional
- [ ] User-agency association working

---

## Phase 3: Calendar Core (Days 9-15)

### Objectives
- Implement CalendarEvent CRUD
- Build calendar UI with react-big-calendar
- Connect calendar events to jobs
- Implement availability system

### Tasks

#### Task 3.1: Install Dependencies
```bash
npm install react-big-calendar date-fns
npm install -D @types/react-big-calendar
```

#### Task 3.2: CalendarEvent API Routes
- `POST /api/calendar` - Create event
- `GET /api/calendar` - List events (with date range filter)
- `GET /api/calendar/[id]` - Get event details
- `PATCH /api/calendar/[id]` - Update event
- `DELETE /api/calendar/[id]` - Delete event
- `POST /api/calendar/[id]/convert-to-job` - Create job from event

#### Task 3.3: Calendar UI Component
Create `/components/calendar/depo-calendar.tsx`:
- Month/Week/Day/Agenda views
- Event color coding by status
- Click to view event details
- Click empty slot to create event
- Drag to reschedule (with permissions)

#### Task 3.4: Calendar Page
Create `/app/(dashboard)/calendar/page.tsx`:
- Full-page calendar view
- Sidebar with upcoming events
- Filter by reporter/status/location type
- Quick-add event button

#### Task 3.5: Reporter Availability
Create `/components/calendar/availability-editor.tsx`:
- Weekly recurring availability
- Exception dates (vacation, etc.)
- Timezone handling

### Deliverables
- [ ] CalendarEvent API complete
- [ ] Calendar UI rendering events
- [ ] Event creation/editing working
- [ ] Calendar ↔ Job connection working
- [ ] Availability system functional

---

## Phase 4: CSR Paperwork System (Days 16-22)

### Objectives
- Implement CSRRecord CRUD
- Build global Attorney registry
- Create CSR intake form
- Build proper noun management
- Implement PDF parsing for Notice of Deposition

### Tasks

#### Task 4.1: Attorney API Routes
- `POST /api/attorneys` - Create attorney
- `GET /api/attorneys` - List attorneys (with search)
- `GET /api/attorneys/[id]` - Get attorney details
- `PATCH /api/attorneys/[id]` - Update attorney
- `GET /api/attorneys/search` - Autocomplete search

#### Task 4.2: CSRRecord API Routes
- `POST /api/jobs/[id]/csr-record` - Create/update CSR record
- `GET /api/jobs/[id]/csr-record` - Get CSR record
- `POST /api/jobs/[id]/csr-record/proper-nouns` - Add proper nouns
- `DELETE /api/jobs/[id]/csr-record/proper-nouns/[nounId]` - Remove noun

#### Task 4.3: CSR Intake Form
Create `/components/csr/csr-intake-form.tsx`:
- Multi-step wizard
- Attorney autocomplete/create
- Party management
- Witness details
- Transcript options
- Logistics section

#### Task 4.4: Proper Noun Manager
Create `/components/csr/proper-noun-manager.tsx`:
- Add/edit/delete proper nouns
- Category selection
- Bulk import from text
- Preview Deepgram integration

#### Task 4.5: PDF Parsing Service
Create `/lib/parsers/notice-parser.ts`:
- Extract text from PDF
- Use Claude API to structure data
- Map to CSRRecord fields
- Handle multiple formats

### Deliverables
- [ ] Attorney registry working
- [ ] CSRRecord CRUD complete
- [ ] CSR intake form functional
- [ ] Proper noun system working
- [ ] PDF parsing operational

---

## Phase 5: Scopist Marketplace (Days 23-27)

### Objectives
- Build job marketplace for scopists
- Implement claim/accept workflow
- Create scopist dashboard
- Add "Bring Your Own Job" feature

### Tasks

#### Task 5.1: Marketplace API Routes
- `GET /api/marketplace` - List available jobs
- `POST /api/marketplace/claim/[jobId]` - Claim a job
- `POST /api/marketplace/accept/[claimId]` - Accept claim (reporter)
- `POST /api/marketplace/reject/[claimId]` - Reject claim
- `POST /api/marketplace/release/[jobId]` - Release job back

#### Task 5.2: Marketplace Page
Create `/app/(dashboard)/marketplace/page.tsx`:
- Job listings with filters
- Search by case type, deadline, page count
- Claim button with confirmation
- Job preview modal

#### Task 5.3: Scopist Dashboard
Update `/app/(dashboard)/scopist/page.tsx`:
- Active jobs section
- Available marketplace jobs
- Completed jobs history
- Earnings summary (future)

#### Task 5.4: "Bring Your Own Job" Feature
Create `/app/(dashboard)/my-jobs/page.tsx`:
- Upload audio/video
- Use Depo-Pro tools privately
- No marketplace listing
- Full editor access

#### Task 5.5: Claim Notifications
Implement notification system:
- Email to reporter when job claimed
- Email to scopist when accepted/rejected
- Dashboard notifications

### Deliverables
- [ ] Marketplace listing working
- [ ] Claim workflow complete
- [ ] Scopist dashboard updated
- [ ] BYOJ feature functional
- [ ] Notifications sending

---

## Phase 6: Google Calendar Sync (Days 28-32)

### Objectives
- OAuth integration with Google Calendar
- Two-way sync for events
- Availability import from Google
- Conflict detection

### Tasks

#### Task 6.1: Google OAuth Setup
1. Create Google Cloud project
2. Enable Calendar API
3. Configure OAuth consent screen
4. Add credentials to env

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Task 6.2: Extend NextAuth
Update `/lib/auth.ts`:
- Add Google provider
- Store refresh tokens
- Request calendar scopes

#### Task 6.3: Sync Service
Create `/lib/google-calendar/sync.ts`:
- `syncToGoogle(event)` - Push event to Google
- `syncFromGoogle(userId)` - Pull events from Google
- `handleWebhook(payload)` - Process Google changes
- `detectConflicts(event)` - Check for overlaps

#### Task 6.4: Sync UI
Create `/components/calendar/google-sync-settings.tsx`:
- Connect/disconnect Google account
- Select calendars to sync
- Sync direction (one-way/two-way)
- Manual sync button

#### Task 6.5: Webhook Handler
Create `/app/api/webhooks/google-calendar/route.ts`:
- Verify webhook signature
- Process event changes
- Update local CalendarEvent
- Handle deletions

### Deliverables
- [ ] Google OAuth working
- [ ] Events syncing to Google
- [ ] Events syncing from Google
- [ ] Conflict detection working
- [ ] Webhook handler operational

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review existing schema
- [ ] Backup production database
- [ ] Set up staging environment
- [ ] Review this document with team

### Phase 1: Schema
- [ ] Add Agency model
- [ ] Add CalendarEvent model
- [ ] Add CSRRecord models
- [ ] Add JobExhibit model
- [ ] Add marketplace models
- [ ] Run migrations
- [ ] Seed test data

### Phase 2: Agency
- [ ] Agency CRUD API
- [ ] RLS policies
- [ ] Agency dashboard
- [ ] User-agency linking

### Phase 3: Calendar
- [ ] Install dependencies
- [ ] CalendarEvent API
- [ ] Calendar UI
- [ ] Calendar page
- [ ] Availability system

### Phase 4: CSR
- [ ] Attorney registry
- [ ] CSRRecord API
- [ ] Intake form
- [ ] Proper noun system
- [ ] PDF parsing

### Phase 5: Marketplace
- [ ] Marketplace API
- [ ] Marketplace page
- [ ] Scopist dashboard
- [ ] BYOJ feature
- [ ] Notifications

### Phase 6: Google Sync
- [ ] Google OAuth
- [ ] NextAuth extension
- [ ] Sync service
- [ ] Sync UI
- [ ] Webhook handler

### Post-Implementation
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation update
- [ ] User training materials

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Schema migration fails | Backup before migration, test on staging first |
| RLS policies break existing features | Test all API routes after applying |
| Google API rate limits | Implement exponential backoff, cache responses |
| PDF parsing inaccuracy | Allow manual editing, flag low-confidence extractions |
| Scopist marketplace abuse | Implement claim cooldowns, reputation system |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Calendar event creation time | < 30 seconds |
| CSR intake form completion | < 5 minutes |
| PDF parsing accuracy | > 90% |
| Google sync latency | < 5 seconds |
| Marketplace job claim rate | > 80% within 24 hours |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up staging environment** for testing
3. **Run Phase 1** (Schema & Database)
4. **Proceed sequentially** through phases
5. **Test each phase** before moving to next

---

## Support Documents

- `prisma/schema-calendar-csr.prisma` - Schema additions
- `CURSOR_MEGA_PROMPTS.md` - Cursor AI prompts
- `API_SPECIFICATIONS.md` - API endpoint specs
- `scripts/migrate-calendar-system.ts` - Migration script
- `scripts/seed-calendar-test-data.ts` - Test data script

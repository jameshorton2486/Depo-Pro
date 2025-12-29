# Depo-Pro Calendar & CSR System — Quick Implementation Checklist

## Version 2.0 — Enhanced with Insurance Defense & AI Document Ingestion

## Pre-Flight Checklist

- [ ] Download all files from Claude
- [ ] Run `deploy-depo-pro-files.ps1` to copy files to project
- [ ] Read `CALENDAR_SYSTEM_MASTER_PLAN.md`
- [ ] Review `prisma/schema-calendar-csr.prisma`
- [ ] Backup production database
- [ ] Set up staging environment
- [ ] Have Cursor AI ready with `CURSOR_AUTHORITATIVE_BUILD_PROMPT.md`

---

## Windows Setup Commands

```powershell
# Navigate to Downloads
cd C:\Users\james\Downloads

# Run deployment script
.\deploy-depo-pro-files.ps1

# Or manually copy:
# Copy-Item *.md C:\Users\james\depo-pro\docs\
# Copy-Item *.prisma C:\Users\james\depo-pro\prisma\
# Copy-Item *.ts C:\Users\james\depo-pro\scripts\
```

---

## Phase 1: Schema & Database (Days 1-4)

### Day 1: Schema Setup
- [ ] Append `schema-calendar-csr.prisma` to main `schema.prisma`
- [ ] Add relations to existing models (User, Job, Firm, JobFile)
- [ ] Verify insurance defense fields in CSRRecord:
  - [ ] `insurerName`, `insuredName`
  - [ ] `adjustorName`, `adjustorEmail`, `adjustorPhone`
  - [ ] `parkingFees` (Decimal)
  - [ ] `deliveryPriority` enum
- [ ] Verify TranscriptOrder model added
- [ ] Run `npx prisma validate`
- [ ] Fix any validation errors

### Day 2: Migration
- [ ] Run `npx prisma migrate dev --name add_calendar_csr_system`
- [ ] Verify migration file created
- [ ] Run `npx prisma generate`
- [ ] Test that existing functionality still works

### Day 3-4: Seed Data
- [ ] Update `scripts/seed-calendar-test-data.ts` if needed
- [ ] Run seed script: `npx tsx scripts/seed-calendar-test-data.ts`
- [ ] Verify test data in Prisma Studio: `npx prisma studio`
- [ ] Test basic queries

**Phase 1 Complete:** [ ] Schema merged and migrated

---

## Phase 2: Agency Multi-Tenancy (Days 5-8)

### Day 5: Agency API
- [ ] Create `app/api/agencies/route.ts` (GET, POST)
- [ ] Create `app/api/agencies/[id]/route.ts` (GET, PATCH, DELETE)
- [ ] Create `app/api/agencies/[id]/members/route.ts`
- [ ] Test with Postman/Thunder Client

### Day 6: Agency Dashboard
- [ ] Create `app/(dashboard)/agency/page.tsx`
- [ ] Create stats cards component
- [ ] Create reporters list component
- [ ] Create recent jobs component

### Day 7-8: RLS Policies
- [ ] Create `supabase/migrations/rls_policies.sql`
- [ ] Apply to Job table
- [ ] Apply to CalendarEvent table
- [ ] Apply to CSRRecord table
- [ ] Add scopist visibility for READY_FOR_SCOPING jobs
- [ ] Test isolation between tenants

**Phase 2 Complete:** [ ] Agency system working with proper isolation

---

## Phase 3: Calendar Core (Days 9-15)

### Day 9: Setup
- [ ] Run `npm install react-big-calendar date-fns`
- [ ] Run `npm install -D @types/react-big-calendar`
- [ ] Create `types/calendar-csr.ts`
- [ ] Create `styles/calendar.css`

### Day 10-11: Calendar API
- [ ] Create `app/api/calendar/route.ts` (GET, POST)
- [ ] Create `app/api/calendar/[id]/route.ts` (GET, PATCH, DELETE)
- [ ] Create `app/api/calendar/[id]/convert-to-job/route.ts`
- [ ] Create `app/api/calendar/availability/route.ts`

### Day 12-13: Calendar UI
- [ ] Create `components/calendar/depo-calendar.tsx`
- [ ] Create `components/calendar/event-detail-modal.tsx`
- [ ] Create `components/calendar/new-event-form.tsx`
- [ ] Create `components/calendar/calendar-sidebar.tsx`

### Day 14-15: Calendar Page & Availability
- [ ] Create `app/(dashboard)/calendar/page.tsx`
- [ ] Create `components/calendar/availability-editor.tsx`
- [ ] Create `lib/calendar/check-availability.ts`
- [ ] Test full calendar flow

**Phase 3 Complete:** [ ] Calendar viewing and creating events

---

## Phase 4: CSR Paperwork & AI Ingestion (Days 16-24)

### Day 16-17: Attorney Registry
- [ ] Create `app/api/attorneys/route.ts`
- [ ] Create `app/api/attorneys/[id]/route.ts`
- [ ] Create `app/api/attorneys/search/route.ts`
- [ ] Create `lib/attorneys/normalize.ts`
- [ ] Create `lib/attorneys/validate-bar.ts`

### Day 18-19: CSR Record API
- [ ] Create `app/api/jobs/[id]/csr-record/route.ts`
- [ ] Create `app/api/jobs/[id]/csr-record/witnesses/route.ts`
- [ ] Create `app/api/jobs/[id]/csr-record/attorneys/route.ts`
- [ ] Create `app/api/jobs/[id]/csr-record/proper-nouns/route.ts`
- [ ] Create `app/api/jobs/[id]/csr-record/transcript-orders/route.ts` (NEW)

### Day 20-21: CSR Intake Form (Enhanced)
- [ ] Create `components/csr/job-intake-form.tsx` (multi-step)
- [ ] Step 1: General Case Info
- [ ] Step 2: Insurance Details (claim, policy, insurer, adjustor)
- [ ] Step 3: Witness & Certification
- [ ] Step 4: Logistics & Resources
- [ ] Step 5: Fulfillment & Delivery (TranscriptOrders)
- [ ] Step 6: Review & Submit
- [ ] Add Zod validation schema
- [ ] Add rush validation (rushDueDate required if not STANDARD)

### Day 22-23: AI Document Ingestion (NEW)
- [ ] Install `pdf-parse`: `npm install pdf-parse`
- [ ] Create `lib/parsers/document-ingestion.ts`
- [ ] Implement pattern-based extraction:
  - [ ] Case caption (X v. Y pattern)
  - [ ] Cause number
  - [ ] Claim/policy numbers
  - [ ] Deponent name
  - [ ] Date patterns
- [ ] Create AI extraction placeholder (Claude API ready)
- [ ] Create `components/csr/document-upload.tsx`
- [ ] Add confidence score display
- [ ] Add AI-filled field highlighting
- [ ] Add manual override tracking

### Day 24: Integration
- [ ] Connect document upload to intake form
- [ ] Auto-populate form from extraction
- [ ] Track which fields were AI-extracted vs manual
- [ ] Test with sample PDFs

**Phase 4 Complete:** [ ] CSR intake with AI document ingestion working

---

## Phase 5: Scopist Marketplace (Days 25-29)

### Day 25-26: Marketplace API
- [ ] Create `app/api/marketplace/route.ts`
- [ ] Create `app/api/marketplace/[jobId]/claim/route.ts`
- [ ] Create `app/api/marketplace/claims/route.ts`
- [ ] Create `app/api/marketplace/claims/[claimId]/route.ts`
- [ ] Create `app/api/marketplace/settings/route.ts`

### Day 27: Marketplace UI
- [ ] Create `app/(dashboard)/marketplace/page.tsx`
- [ ] Create `components/marketplace/job-card.tsx`
- [ ] Create `components/marketplace/job-filters.tsx`
- [ ] Create `components/marketplace/claim-modal.tsx`

### Day 28: Scopist Dashboard Updates
- [ ] Update `app/(dashboard)/scopist/page.tsx`
- [ ] Add "My Claims" section
- [ ] Add "Available Jobs" section
- [ ] Add statistics section

### Day 29: "Bring Your Own Job" Feature
- [ ] Create `app/(dashboard)/my-workspace/page.tsx`
- [ ] Create `components/workspace/byoj-upload.tsx`
- [ ] Add BYOJ_PRIVATE status to JobStatus enum
- [ ] Test private job workflow

**Phase 5 Complete:** [ ] Marketplace and claiming workflow

---

## Phase 6: Google Calendar Sync (Days 30-34)

### Day 30-31: Google OAuth
- [ ] Create Google Cloud project
- [ ] Enable Calendar API
- [ ] Configure OAuth consent screen
- [ ] Add environment variables
- [ ] Update `lib/auth.ts` with Google provider

### Day 32-33: Sync Service
- [ ] Create `lib/google-calendar/client.ts`
- [ ] Create `lib/google-calendar/sync.ts`
- [ ] Create `lib/google-calendar/conflicts.ts`
- [ ] Test pushing events to Google
- [ ] Test pulling events from Google

### Day 34: Webhook Handler
- [ ] Create `app/api/webhooks/google-calendar/route.ts`
- [ ] Create `lib/google-calendar/webhooks.ts`
- [ ] Set up webhook registration
- [ ] Test real-time updates

**Phase 6 Complete:** [ ] Two-way Google Calendar sync

---

## Post-Implementation

### Testing
- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] Perform manual testing
- [ ] Test on mobile devices
- [ ] Load testing for calendar
- [ ] Test AI extraction with various PDF formats

### Security
- [ ] Audit RLS policies
- [ ] Test permission boundaries
- [ ] Review API authorization
- [ ] Check for data leaks between tenants
- [ ] Verify CSR locking works correctly

### Documentation
- [ ] Update API documentation
- [ ] Create user guide for calendar
- [ ] Create user guide for CSR intake
- [ ] Create user guide for marketplace
- [ ] Document AI extraction capabilities

### Deployment
- [ ] Deploy to staging
- [ ] Run migrations on staging
- [ ] Full QA on staging
- [ ] Deploy to production
- [ ] Monitor for issues

---

## Quick Commands Reference

```bash
# Schema
npx prisma validate
npx prisma migrate dev --name your_migration_name
npx prisma generate
npx prisma studio

# Seed Data
npx tsx scripts/seed-calendar-test-data.ts

# Development
npm run dev
npm run typecheck
npm run lint

# Testing
npm run test
npm run test:watch

# Production
npm run build
npm run start
```

---

## New Models Added in v2.0

### TranscriptOrder
```
- Per-attorney/firm fulfillment tracking
- Delivery type, file format preferences
- Fulfillment status (PENDING → SENT → DELIVERED)
- Billing fields (pageCount, pricePerPage, totalPrice)
```

### Enhanced CSRRecord Fields
```
- insurerName, insuredName
- adjustorName, adjustorEmail, adjustorPhone
- parkingFees (Decimal)
- deliveryPriority (STANDARD → REALTIME)
- rushDueDate
- aiExtractedFields (Json)
- aiExtractionConfidence (Float)
- manualOverrides (Json)
```

### New Enums
```
- VideoRecordType: CR_ONLY, CR_VIDEO, CR_PIP, REMOTE, HYBRID
- DeliveryPriority: STANDARD, EXPEDITE, RUSH, DAILY, HOURLY, REALTIME
- TranscriptDeliveryType: E_TRANS, HARD_COPY, ORIGINAL, BOTH, FTP, PORTAL
- TranscriptFileFormat: WORD, PDF, ASCII, WORD_PERFECT, RTF, PTX
- OrderFulfillmentStatus: PENDING, READY, SENT, DELIVERED, RETURNED, CANCELLED
```

---

## Files Created by This Plan

```
docs/
├── CALENDAR_SYSTEM_MASTER_PLAN.md
├── CURSOR_MEGA_PROMPTS.md
├── API_SPECIFICATIONS.md
└── IMPLEMENTATION_CHECKLIST.md (this file)

prisma/
└── schema-calendar-csr.prisma

scripts/
└── seed-calendar-test-data.ts

(To be created during implementation)
app/
├── api/
│   ├── agencies/
│   ├── calendar/
│   ├── attorneys/
│   ├── marketplace/
│   └── webhooks/google-calendar/
└── (dashboard)/
    ├── agency/
    ├── calendar/
    ├── marketplace/
    └── my-workspace/

components/
├── calendar/
├── csr/
├── marketplace/
└── workspace/

lib/
├── calendar/
├── google-calendar/
├── attorneys/
├── parsers/
└── notifications/

types/
└── calendar-csr.ts
```

---

## Support

- Master Plan: `docs/CALENDAR_SYSTEM_MASTER_PLAN.md`
- Cursor Prompts: `docs/CURSOR_MEGA_PROMPTS.md`
- API Specs: `docs/API_SPECIFICATIONS.md`
- Schema: `prisma/schema-calendar-csr.prisma`

**Estimated Total Time:** 6-8 weeks
**Recommended Team Size:** 1-2 developers

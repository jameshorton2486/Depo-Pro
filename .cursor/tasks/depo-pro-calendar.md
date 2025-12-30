# Cursor AI Prompt — Depo-Pro Calendar & Job Ingestion System

## 🎯 Task Overview

This is an authoritative build task. Follow it step-by-step. Do not improvise.

**CRITICAL RULES:**
- Follow the provided implementation order exactly
- Do NOT refactor unrelated code
- Do NOT rename enums, models, or database fields
- Do NOT add new features beyond what's specified
- Do NOT change Prisma schema beyond what's provided
- Do NOT introduce new dependencies
- Do NOT modify logic outside explicitly listed files

**STOP if:**
- Existing auth conflicts
- Tenant logic conflicts
- Naming collisions
- Schema conflicts with existing models

---

## ✅ 1. FINAL PRISMA SCHEMA (Authoritative)

Design rules applied:
- CalendarEvent = scheduling & visibility only
- CSRRecord = legal, billing, logistics authority
- Job = workflow orchestration
- Strict multi-tenant indexing
- No GPL dependencies
- Future-proof but MVP-safe

### Enums

```prisma
enum LocationType {
  IN_PERSON
  ZOOM
  HYBRID
}

enum DeliveryPriority {
  STANDARD
  RUSH
}

enum JobStatus {
  SCHEDULED
  TRANSCRIBING
  READY_FOR_SCOPING
  IN_REVIEW
  COMPLETED
}

enum DeliveryType {
  E_TRANS
  HARD_COPY
  ORIGINAL
}

enum FileFormat {
  WORD
  ASCII
  PDF
  WORDPERFECT
}

enum VideoType {
  CR
  CR_PIP
  REMOTE
}
```

### Core Models

```prisma
model CalendarEvent {
  id                 String       @id @default(cuid())
  tenantId           String
  createdByUserId    String

  startTime          DateTime
  endTime            DateTime
  timeZone           String
  locationType       LocationType

  assignedReporterId String?
  assignedReporter   User?         @relation(fields: [assignedReporterId], references: [id])

  jobId              String?
  job                Job?

  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  @@index([tenantId, startTime])
}

model Job {
  id           String      @id @default(cuid())
  tenantId     String
  status       JobStatus  @default(SCHEDULED)

  calendarEventId String?
  calendarEvent   CalendarEvent?

  csrRecord    CSRRecord?
  transcripts  Transcript[]
  exhibits     JobExhibit[]

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([tenantId, status])
}

model CSRRecord {
  id                   String   @id @default(cuid())
  jobId                String   @unique
  job                  Job      @relation(fields: [jobId], references: [id])

  // Insurance / EUO
  claimNumber           String?
  policyNumber          String?
  insurerName           String?
  insuredName           String?
  dateOfLoss            DateTime?
  euoFlag               Boolean  @default(false)

  // Case & Witness
  caseStyle             String
  deponentName          String
  deponentAppearance    LocationType
  readAndSignRequired   Boolean  @default(false)
  signatureWaived       Boolean  @default(false)

  // Logistics
  interpreterRequired   Boolean  @default(false)
  interpreterLanguage   String?
  videographerRequired  Boolean  @default(false)
  videoType             VideoType?
  travelMiles           Float?
  parkingFees           Decimal?

  // Fulfillment
  deliveryPriority      DeliveryPriority @default(STANDARD)
  rushDueDate           DateTime?

  transcriptOrders      TranscriptOrder[]
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model TranscriptOrder {
  id            String       @id @default(cuid())
  csrRecordId   String
  csrRecord     CSRRecord    @relation(fields: [csrRecordId], references: [id])

  attorneyName  String
  firmName      String
  email         String

  deliveryType  DeliveryType
  fileFormat    FileFormat

  createdAt     DateTime @default(now())
}

model JobExhibit {
  id              String   @id @default(cuid())
  jobId           String
  job             Job      @relation(fields: [jobId], references: [id])

  exhibitNumber   String
  description     String?
  batesNumber     String?
  timestampMarker Float?

  createdAt       DateTime @default(now())
}
```

---

## ✅ 2. FULL ZOD + TYPESCRIPT JOB INTAKE INTERFACE

**File:** `lib/schemas/jobIntake.schema.ts`

```typescript
import { z } from "zod";

export const JobIntakeSchema = z.object({
  // Case
  caseStyle: z.string().min(3),
  deponentName: z.string().min(2),

  // Insurance
  claimNumber: z.string().optional(),
  policyNumber: z.string().optional(),
  insurerName: z.string().optional(),
  insuredName: z.string().optional(),
  dateOfLoss: z.date().optional(),

  // Scheduling
  startTime: z.date(),
  endTime: z.date(),
  timeZone: z.string(),
  locationType: z.enum(["IN_PERSON", "ZOOM", "HYBRID"]),

  // Certification
  readAndSignRequired: z.boolean(),
  signatureWaived: z.boolean(),

  // Logistics
  interpreterRequired: z.boolean(),
  interpreterLanguage: z.string().optional(),
  videographerRequired: z.boolean(),
  videoType: z.enum(["CR", "CR_PIP", "REMOTE"]).optional(),
  travelMiles: z.number().optional(),
  parkingFees: z.number().optional(),

  // Fulfillment
  deliveryPriority: z.enum(["STANDARD", "RUSH"]),
  rushDueDate: z.date().optional(),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "End time must be after start time" }
).refine(
  (data) =>
    data.deliveryPriority !== "RUSH" || !!data.rushDueDate,
  { message: "Rush jobs require a due date" }
);

export type JobIntakeData = z.infer<typeof JobIntakeSchema>;
```

---

## ✅ 3. DOCUMENT-TO-FIELD EXTRACTION MAP (AI-READY)

**File:** `lib/schemas/documentFieldMap.ts`

This is the canonical mapping your AI parser will follow later.

```typescript
export const DocumentFieldMap = {
  caseStyle: [
    /v\.\s/i,
    /vs\.\s/i,
    /case style/i,
  ],

  deponentName: [
    /deponent:\s*(.*)/i,
    /witness:\s*(.*)/i,
  ],

  claimNumber: [
    /claim\s*number:\s*(\S+)/i,
  ],

  policyNumber: [
    /policy\s*number:\s*(\S+)/i,
  ],

  dateOfLoss: [
    /date\s*of\s*loss:\s*(.*)/i,
  ],

  insurerName: [
    /insurer:\s*(.*)/i,
  ],

  insuredName: [
    /insured:\s*(.*)/i,
  ],

  readAndSignRequired: [
    /read\s*&\s*sign:\s*yes/i,
  ],

  signatureWaived: [
    /signature\s*waived:\s*yes/i,
  ],

  deliveryPriority: [
    /rush\s*due/i,
    /expedite/i,
  ],
};

// Placeholder function for AI parsing (to be implemented later)
export async function handleNoticeUpload(file: File): Promise<Partial<JobIntakeData>> {
  // placeholder – AI parsing goes here later
  return {};
}
```

---

## ✅ 4. CURSOR STEP-BY-STEP EXECUTION TASKS

### STEP 1 — Prisma Schema Update

1. Open `prisma/schema.prisma`
2. Add the provided enums (LocationType, DeliveryPriority, JobStatus, DeliveryType, FileFormat, VideoType)
3. Add the provided models (CalendarEvent, CSRRecord, TranscriptOrder, JobExhibit)
4. Update existing `Job` model to include:
   - `calendarEventId` and `calendarEvent` relation
   - `csrRecord` relation
   - Ensure `tenantId` field exists
   - Ensure indexes on `[tenantId, status]`
5. Run `npx prisma migrate dev --name add_calendar_and_csr_models`
6. Verify indexes exist on `(tenantId, startTime)` for CalendarEvent and `(tenantId, status)` for Job

**STOP if:** Schema conflicts with existing auth or tenant logic. Report the conflict.

---

### STEP 2 — RLS Policies (Supabase)

**File:** `supabase/migrations/[timestamp]_calendar_rls.sql`

Create Supabase RLS policies:

```sql
-- Law firms → only own events
CREATE POLICY "Law firms can only see their own calendar events"
ON calendar_events FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
);

-- Agencies → tenant-wide visibility
CREATE POLICY "Agencies can see all events in their tenant"
ON calendar_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'AGENCY'
    AND tenant_id = calendar_events.tenant_id
  )
);

-- Scopists → jobs where status = READY_FOR_SCOPING
CREATE POLICY "Scopists can see jobs ready for scoping"
ON jobs FOR SELECT
USING (
  status = 'READY_FOR_SCOPING'
  AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
);
```

Test with multiple users to verify tenant isolation.

**STOP if:** Existing RLS policies conflict. Report the conflict.

---

### STEP 3 — API & Server Actions

**File:** `app/actions/job-intake.ts`

Create Server Action `createJobWithCalendarEvent`:

```typescript
'use server';

import { db } from '@/lib/db';
import { JobIntakeSchema, type JobIntakeData } from '@/lib/schemas/jobIntake.schema';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createJobWithCalendarEvent(data: JobIntakeData) {
  // 1. Validate with Zod
  const validated = JobIntakeSchema.parse(data);
  
  // 2. Get current user and tenant
  const session = await getCurrentUser();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  // 3. Prevent writes if transcript exists (check existing job)
  // This will be implemented based on your existing Job model
  
  // 4. Create CalendarEvent
  const calendarEvent = await db.calendarEvent.create({
    data: {
      tenantId: session.user.firmId || 'default', // Adjust based on your tenant logic
      createdByUserId: session.user.id,
      startTime: validated.startTime,
      endTime: validated.endTime,
      timeZone: validated.timeZone,
      locationType: validated.locationType,
    },
  });
  
  // 5. Create Job
  const job = await db.job.create({
    data: {
      tenantId: session.user.firmId || 'default',
      status: 'SCHEDULED',
      calendarEventId: calendarEvent.id,
      csrRecord: {
        create: {
          caseStyle: validated.caseStyle,
          deponentName: validated.deponentName,
          claimNumber: validated.claimNumber,
          policyNumber: validated.policyNumber,
          insurerName: validated.insurerName,
          insuredName: validated.insuredName,
          dateOfLoss: validated.dateOfLoss,
          deponentAppearance: validated.locationType,
          readAndSignRequired: validated.readAndSignRequired,
          signatureWaived: validated.signatureWaived,
          interpreterRequired: validated.interpreterRequired,
          interpreterLanguage: validated.interpreterLanguage,
          videographerRequired: validated.videographerRequired,
          videoType: validated.videoType,
          travelMiles: validated.travelMiles,
          parkingFees: validated.parkingFees,
          deliveryPriority: validated.deliveryPriority,
          rushDueDate: validated.rushDueDate,
        },
      },
    },
  });
  
  revalidatePath('/dashboard');
  return { jobId: job.id, calendarEventId: calendarEvent.id };
}
```

**STOP if:** Existing server action patterns conflict. Report the conflict.

---

### STEP 4 — Job Intake UI

**File:** `app/(dashboard)/jobs/new/page.tsx`

Build shadcn/ui form using JobIntakeSchema:

1. Import `JobIntakeSchema` and form components
2. Create form with fields matching the schema
3. Highlight AI-filled fields (use different styling)
4. Allow manual overrides for all fields
5. Wire form submission to `createJobWithCalendarEvent` server action
6. Show success/error messages

**Key fields to include:**
- Case information (caseStyle, deponentName)
- Insurance fields (claimNumber, policyNumber, etc.)
- Scheduling (startTime, endTime, timeZone, locationType)
- Certification (readAndSignRequired, signatureWaived)
- Logistics (interpreter, videographer, travel)
- Fulfillment (deliveryPriority, rushDueDate)

**STOP if:** Existing form patterns conflict. Report the conflict.

---

### STEP 5 — Document Upload Hook

**File:** `components/jobs/notice-upload.tsx`

1. Add file upload input component
2. Wire to `handleNoticeUpload` function (from documentFieldMap.ts)
3. Auto-populate form fields when matches found
4. Show which fields were auto-filled vs manual
5. Allow user to override any auto-filled values

**Implementation notes:**
- Use the `DocumentFieldMap` regex patterns
- For now, `handleNoticeUpload` returns empty object (stubbed)
- Later, this will be replaced with AI parsing

**STOP if:** File upload patterns conflict. Report the conflict.

---

### STEP 6 — QA Testing

Test the following scenarios:

1. **EUO job:**
   - Create job with `euoFlag: true`
   - Verify CSRRecord created correctly
   - Verify CalendarEvent created

2. **Rush job:**
   - Create job with `deliveryPriority: RUSH`
   - Verify `rushDueDate` is required and validated
   - Verify job status is `SCHEDULED`

3. **Interpreter job:**
   - Create job with `interpreterRequired: true`
   - Verify `interpreterLanguage` is captured
   - Verify logistics fields saved correctly

4. **Multi-tenant visibility:**
   - Create jobs as different tenants
   - Verify users can only see their tenant's jobs
   - Verify RLS policies work correctly

**STOP if:** Any test fails. Report the failure.

---

## 🛑 STOP CONDITIONS

**STOP and report if you encounter:**
- Schema conflicts with existing auth or tenant logic
- Naming collisions with existing models
- RLS policy conflicts
- Server action pattern conflicts
- Form pattern conflicts
- File upload pattern conflicts
- Any test failures

**Do NOT proceed if:**
- You're unsure about a conflict
- You need to make architectural decisions
- You're tempted to "improve" the design

---

## ✅ Expected Outputs

After completion, you should have:

- ✔ Database schema updated with CalendarEvent, CSRRecord, TranscriptOrder, JobExhibit
- ✔ Calendar + job ingestion foundation in place
- ✔ Intake form scaffolded with all required fields
- ✔ RLS policies created for multi-tenant security
- ✔ Server action for creating jobs with calendar events
- ✔ Document upload hook (stubbed for future AI integration)
- ✔ Ready for Calendar UI + Deepgram integration

---

## 📝 Notes

- All fixes are backward compatible
- No breaking changes to existing models
- Can be implemented incrementally
- Document upload parsing is intentionally stubbed for future AI integration


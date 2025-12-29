# Depo-Pro Calendar & CSR System — AUTHORITATIVE Cursor AI Build Prompt

## 🎯 MISSION CRITICAL

Copy this entire prompt into Cursor AI to implement the complete Calendar, CSR Paperwork, and Job Ingestion system.

---

## CONTEXT

You are acting as a senior full-stack engineer working on **Depo-Pro**, a legal transcription SaaS platform.

### Tech Stack
- **Next.js 15** (App Router)
- **TypeScript** (strict mode)
- **Prisma ORM**
- **Supabase** (Postgres + Storage + Row Level Security)
- **shadcn/ui** components
- **Zod** validation
- **Server Actions** for mutations
- **react-big-calendar** for calendar UI
- **date-fns** for date handling

### Domain Requirements
Depo-Pro supports:
- Insurance defense litigation
- Court reporting agencies
- Freelance court reporters
- Scopists (transcript editors)

The system must meet:
- Court-grade legal accuracy
- Billing traceability
- Strict multi-tenant isolation
- HIPAA-adjacent data handling

---

## OBJECTIVE

Implement a robust **Calendar & Job Ingestion system** that:

1. ✅ Captures granular legal, insurance, and logistics metadata
2. ✅ Auto-populates fields from uploaded legal documents (AI-ready)
3. ✅ Enforces multi-tenant permissions via RLS
4. ✅ Supports rush vs standard workflows
5. ✅ Is safe for later AI transcription, scopist review, and billing

---

# TASK 1 — PRISMA SCHEMA UPDATE (Authoritative)

## Instructions

1. Read the existing `prisma/schema.prisma`
2. Read `prisma/schema-calendar-csr.prisma` (new models)
3. Merge the new models into the main schema
4. Add required relations to existing models (User, Job, Firm, JobFile)
5. Run `npx prisma validate`

## Models to Add/Merge

### 1. Agency (Super-Tenant)
```prisma
model Agency {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  email        String?
  phone        String?
  address      String?
  city         String?
  state        String?
  zipCode      String?
  planType     AgencyPlanType @default(BASIC)
  maxReporters Int      @default(10)
  maxFirms     Int      @default(5)
  settings     Json?
  
  // Relations
  firms        Firm[]   @relation("AgencyFirms")
  reporters    User[]   @relation("AgencyReporters")
  events       CalendarEvent[]
  jobs         Job[]    @relation("AgencyJobs")
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([slug])
}

enum AgencyPlanType {
  BASIC
  PROFESSIONAL
  ENTERPRISE
}
```

### 2. CalendarEvent (Scheduling Layer)
```prisma
model CalendarEvent {
  id                  String   @id @default(cuid())
  
  // Case Info
  caseStyle           String
  caseNumber          String?
  deponentName        String
  deponentRole        DeponentRole?
  
  // Scheduling
  scheduledStart      DateTime
  scheduledEnd        DateTime?
  timezone            String   @default("America/Chicago")
  
  // Location
  locationType        LocationType @default(IN_PERSON)
  locationAddress     String?
  zoomJoinUrl         String?
  
  // Participants
  assignedReporterId  String?
  assignedReporter    User?    @relation("AssignedReporterEvents", fields: [assignedReporterId], references: [id])
  orderingAttorneyId  String?
  orderingAttorney    Attorney? @relation("OrderingAttorneyEvents", fields: [orderingAttorneyId], references: [id])
  
  // Multi-Tenancy
  firmId              String?
  firm                Firm?    @relation("FirmEvents", fields: [firmId], references: [id])
  agencyId            String?
  agency              Agency?  @relation(fields: [agencyId], references: [id])
  createdById         String
  createdBy           User     @relation("CreatedEvents", fields: [createdById], references: [id])
  
  // Status & Job Link
  status              CalendarEventStatus @default(SCHEDULED)
  jobId               String?  @unique
  job                 Job?     @relation("CalendarEventJob", fields: [jobId], references: [id])
  
  // Google Sync
  googleEventId       String?
  lastSyncedAt        DateTime?
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@index([scheduledStart, agencyId])
  @@index([assignedReporterId])
  @@index([status])
}

enum CalendarEventStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum LocationType {
  IN_PERSON
  ZOOM
  TEAMS
  HYBRID
  PHONE
}

enum DeponentRole {
  PLAINTIFF
  DEFENDANT
  CORPORATE_REP
  EXPERT_WITNESS
  FACT_WITNESS
}
```

### 3. CSRRecord (Legal & Billing Authority — CRITICAL)

This is the backbone of the deposition record. Include ALL fields from `schema-calendar-csr.prisma`.

**Key Insurance Defense Fields:**
- `claimNumber`, `policyNumber`, `dateOfLoss`
- `insurerName`, `insuredName`
- `isEUO` (Examination Under Oath)
- `adjustorName`, `adjustorEmail`, `adjustorPhone`

**Key Billing Fields:**
- `travelMiles`, `parkingFees`
- `deliveryPriority` (STANDARD, RUSH, DAILY, HOURLY, REALTIME)
- `rushDueDate`

**AI Ingestion Tracking:**
- `aiExtractedFields` (Json)
- `aiExtractionConfidence` (Float)
- `manualOverrides` (Json)

⚠️ **CRITICAL**: CSRRecord MUST lock (`isLocked = true`) once transcription begins.

### 4. TranscriptOrder (Per-Party Fulfillment)
```prisma
model TranscriptOrder {
  id              String   @id @default(cuid())
  csrRecordId     String
  csrRecord       CSRRecord @relation(fields: [csrRecordId], references: [id], onDelete: Cascade)
  
  attorneyName    String
  firmName        String?
  email           String
  phone           String?
  
  deliveryType    TranscriptDeliveryType @default(E_TRANS)
  fileFormat      TranscriptFileFormat   @default(WORD)
  isOriginal      Boolean  @default(false)
  copyCount       Int      @default(1)
  
  status          OrderFulfillmentStatus @default(PENDING)
  sentAt          DateTime?
  
  pageCount       Int?
  pricePerPage    Decimal? @db.Decimal(10, 2)
  totalPrice      Decimal? @db.Decimal(10, 2)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([csrRecordId])
  @@index([status])
}

enum TranscriptDeliveryType {
  E_TRANS
  HARD_COPY
  ORIGINAL
  BOTH
}

enum TranscriptFileFormat {
  WORD
  PDF
  ASCII
  WORD_PERFECT
  RTF
}

enum OrderFulfillmentStatus {
  PENDING
  READY
  SENT
  DELIVERED
  CANCELLED
}
```

### 5. Attorney (Global Registry)
```prisma
model Attorney {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  normalizedName  String   // For deduplication
  firmName        String?
  email           String?  @unique
  phone           String?
  barNumber       String?
  barState        String?
  
  preferredFormat String?
  preferredDelivery String?
  
  orderedEvents   CalendarEvent[] @relation("OrderingAttorneyEvents")
  csrAttorneys    CSRAttorney[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([normalizedName])
  @@index([email])
}
```

## Required Relation Updates to Existing Models

### User Model - Add:
```prisma
agencyId              String?
agency                Agency?  @relation("AgencyReporters", fields: [agencyId], references: [id])

assignedEvents        CalendarEvent[]      @relation("AssignedReporterEvents")
createdEvents         CalendarEvent[]      @relation("CreatedEvents")
reporterAvailability  ReporterAvailability[] @relation("ReporterAvailability")
scopistClaims         JobClaim[]           @relation("ScopistClaims")
marketplaceSettings   MarketplaceSettings? @relation("MarketplaceSettings")
```

### Job Model - Add:
```prisma
agencyId              String?
agency                Agency?  @relation("AgencyJobs", fields: [agencyId], references: [id])

calendarEvent         CalendarEvent?       @relation("CalendarEventJob")
csrRecord             CSRRecord?           @relation("JobCSRRecord")
jobExhibits           JobExhibit[]         @relation("JobExhibits")
claims                JobClaim[]           @relation("JobClaims")
```

### Firm Model - Add:
```prisma
agencyId              String?
agency                Agency?  @relation("AgencyFirms", fields: [agencyId], references: [id])

calendarEvents        CalendarEvent[]      @relation("FirmEvents")
```

---

# TASK 2 — TYPE-SAFE JOB INTAKE FORM

## Create Form at `components/csr/job-intake-form.tsx`

### Form Sections (Multi-Step Wizard)

**Step 1: General Case Info**
- Case caption (required)
- Cause number
- Court name, type
- County, State
- Judge

**Step 2: Insurance Details**
- Claim number
- Policy number
- Date of loss (must be ≤ today)
- Insurer name
- Insured name
- EUO checkbox
- Adjustor info

**Step 3: Witness & Certification**
- Deponent name (required)
- Deponent role
- Appearance type
- Read & Sign required
- Signature waived

**Step 4: Logistics & Resources**
- Location type
- Address fields
- Interpreter required + language
- Videographer required + type
- Travel miles
- Parking fees

**Step 5: Fulfillment & Delivery**
- Delivery priority (STANDARD, RUSH, DAILY, HOURLY, REALTIME)
- Rush due date (required if priority != STANDARD)
- Transcript orders (add multiple attorneys)
- Format preferences per attorney

**Step 6: Review & Submit**
- Summary of all fields
- AI-extracted fields highlighted
- Manual overrides tracked

### Zod Validation Schema

```typescript
import { z } from 'zod';

export const JobIntakeSchema = z.object({
  // Case Info
  caseCaption: z.string().min(1, 'Case caption is required'),
  causeNumber: z.string().optional(),
  courtName: z.string().optional(),
  county: z.string().optional(),
  state: z.string().default('Texas'),
  judge: z.string().optional(),
  
  // Insurance
  claimNumber: z.string().optional(),
  policyNumber: z.string().optional(),
  dateOfLoss: z.date().optional().refine(
    (date) => !date || date <= new Date(),
    'Date of loss cannot be in the future'
  ),
  insurerName: z.string().optional(),
  insuredName: z.string().optional(),
  isEUO: z.boolean().default(false),
  
  // Witness
  deponentName: z.string().min(1, 'Deponent name is required'),
  deponentRole: z.enum(['PLAINTIFF', 'DEFENDANT', 'CORPORATE_REP', 'EXPERT_WITNESS', 'FACT_WITNESS']).optional(),
  readAndSignRequired: z.boolean().default(true),
  signatureWaived: z.boolean().default(false),
  
  // Scheduling
  scheduledStartTime: z.date(),
  scheduledEndTime: z.date().optional(),
  timezone: z.string().default('America/Chicago'),
  
  // Location
  locationType: z.enum(['IN_PERSON', 'ZOOM', 'TEAMS', 'HYBRID', 'PHONE']),
  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  
  // Resources
  interpreterRequired: z.boolean().default(false),
  interpreterLanguage: z.string().optional(),
  videographerRequired: z.boolean().default(false),
  videoType: z.enum(['CR_ONLY', 'CR_VIDEO', 'CR_PIP', 'REMOTE', 'HYBRID']).default('CR_ONLY'),
  
  // Logistics
  travelMiles: z.number().optional(),
  parkingFees: z.number().optional(),
  
  // Delivery
  deliveryPriority: z.enum(['STANDARD', 'EXPEDITE', 'RUSH', 'DAILY', 'HOURLY', 'REALTIME']).default('STANDARD'),
  rushDueDate: z.date().optional(),
  
  // Transcript Orders
  transcriptOrders: z.array(z.object({
    attorneyName: z.string().min(1),
    firmName: z.string().optional(),
    email: z.string().email(),
    deliveryType: z.enum(['E_TRANS', 'HARD_COPY', 'ORIGINAL', 'BOTH']),
    fileFormat: z.enum(['WORD', 'PDF', 'ASCII', 'WORD_PERFECT', 'RTF']),
    isOriginal: z.boolean().default(false),
    copyCount: z.number().default(1),
  })).optional(),
  
  // Proper Nouns
  properNouns: z.array(z.object({
    value: z.string(),
    category: z.enum(['PERSON_NAME', 'COMPANY_NAME', 'PLACE_NAME', 'LEGAL_TERM', 'MEDICAL_TERM', 'ACRONYM']),
  })).optional(),
}).refine(
  (data) => !data.scheduledEndTime || data.scheduledStartTime < data.scheduledEndTime,
  { message: 'End time must be after start time', path: ['scheduledEndTime'] }
).refine(
  (data) => data.deliveryPriority === 'STANDARD' || data.rushDueDate,
  { message: 'Rush due date is required for non-standard delivery', path: ['rushDueDate'] }
);

export type JobIntakeData = z.infer<typeof JobIntakeSchema>;
```

---

# TASK 3 — AI-ASSISTED DOCUMENT INGESTION (Critical)

## Create Document Parser at `lib/parsers/document-ingestion.ts`

```typescript
/**
 * AI-Assisted Document Ingestion
 * 
 * Extracts structured data from legal documents:
 * - Notice of Deposition PDFs
 * - CSR paperwork PDFs
 * - Depo Notes scans
 * 
 * Returns partial JobIntakeData with confidence scores.
 */

import { JobIntakeData } from '@/types/job-intake';

export interface ExtractionResult {
  data: Partial<JobIntakeData>;
  confidence: {
    overall: number;
    fields: Record<string, number>;
  };
  rawText: string;
  warnings: string[];
}

export interface ExtractedField {
  value: string | boolean | Date | number;
  confidence: number;
  source: 'AI' | 'REGEX' | 'OCR';
}

/**
 * Main extraction function
 * 
 * @param file - Uploaded PDF/image file
 * @returns Extracted fields with confidence scores
 */
export async function extractFromDocument(
  file: File
): Promise<ExtractionResult> {
  // Step 1: Extract raw text
  const rawText = await extractText(file);
  
  // Step 2: Run pattern matching for known formats
  const patternMatches = extractWithPatterns(rawText);
  
  // Step 3: Run AI extraction (placeholder - integrate Claude API later)
  const aiMatches = await extractWithAI(rawText);
  
  // Step 4: Merge results, preferring higher confidence
  const merged = mergeExtractions(patternMatches, aiMatches);
  
  // Step 5: Calculate overall confidence
  const confidence = calculateConfidence(merged);
  
  return {
    data: merged.data,
    confidence,
    rawText,
    warnings: merged.warnings,
  };
}

/**
 * Extract text from PDF
 * Uses pdf-parse for text-based PDFs
 * Falls back to OCR for scanned documents
 */
async function extractText(file: File): Promise<string> {
  // TODO: Implement with pdf-parse
  // Placeholder for now
  const buffer = await file.arrayBuffer();
  
  // Try text extraction first
  // If minimal text, use OCR
  
  return ''; // Placeholder
}

/**
 * Pattern-based extraction for common legal document formats
 */
function extractWithPatterns(text: string): Partial<ExtractionResult> {
  const fields: Record<string, ExtractedField> = {};
  
  // Case Caption Pattern: "X v. Y" or "X vs. Y"
  const casePattern = /([A-Z][a-zA-Z\s,\.]+)\s+(?:v\.|vs\.?)\s+([A-Z][a-zA-Z\s,\.]+(?:LLC|Inc\.|Corp\.)?)/i;
  const caseMatch = text.match(casePattern);
  if (caseMatch) {
    fields.caseCaption = {
      value: `${caseMatch[1].trim()} v. ${caseMatch[2].trim()}`,
      confidence: 0.9,
      source: 'REGEX',
    };
  }
  
  // Cause Number Pattern
  const causePattern = /(?:Cause\s*(?:No\.?|Number)|Case\s*(?:No\.?|Number))[:\s]*([A-Z0-9\-]+)/i;
  const causeMatch = text.match(causePattern);
  if (causeMatch) {
    fields.causeNumber = {
      value: causeMatch[1],
      confidence: 0.95,
      source: 'REGEX',
    };
  }
  
  // Claim Number Pattern (insurance)
  const claimPattern = /Claim\s*(?:No\.?|Number|#)[:\s]*([A-Z0-9\-]+)/i;
  const claimMatch = text.match(claimPattern);
  if (claimMatch) {
    fields.claimNumber = {
      value: claimMatch[1],
      confidence: 0.9,
      source: 'REGEX',
    };
  }
  
  // Policy Number Pattern
  const policyPattern = /Policy\s*(?:No\.?|Number|#)[:\s]*([A-Z0-9\-]+)/i;
  const policyMatch = text.match(policyPattern);
  if (policyMatch) {
    fields.policyNumber = {
      value: policyMatch[1],
      confidence: 0.9,
      source: 'REGEX',
    };
  }
  
  // Date Patterns
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/g;
  // Parse and categorize dates...
  
  // Deponent Name (after "Deposition of" or "Deponent:")
  const deponentPattern = /(?:Deposition\s+of|Deponent)[:\s]+([A-Z][a-zA-Z\s]+?)(?:,|\n|$)/i;
  const deponentMatch = text.match(deponentPattern);
  if (deponentMatch) {
    fields.deponentName = {
      value: deponentMatch[1].trim(),
      confidence: 0.85,
      source: 'REGEX',
    };
  }
  
  // Attorney patterns
  // Court patterns
  // Location patterns
  // ... (continue for all fields)
  
  return {
    data: mapFieldsToData(fields),
    confidence: { overall: 0, fields: {} },
    rawText: text,
    warnings: [],
  };
}

/**
 * AI-based extraction using Claude API
 * 
 * ⚠️ PLACEHOLDER - Do not implement AI calls yet
 * This stub allows the form to work without AI
 */
async function extractWithAI(text: string): Promise<Partial<ExtractionResult>> {
  // TODO: Implement with Claude API
  // 
  // Prompt template:
  // "Extract the following fields from this legal document:
  // - Case caption
  // - Cause number
  // - Deponent name
  // - Ordering attorney
  // - Firm name
  // - Claim number
  // - Policy number
  // - Date of loss
  // - Deposition date and time
  // - Location
  // - Read and sign required (yes/no)
  // 
  // Return as JSON with confidence scores."
  
  console.log('AI extraction placeholder - not implemented');
  
  return {
    data: {},
    confidence: { overall: 0, fields: {} },
    rawText: text,
    warnings: ['AI extraction not yet implemented'],
  };
}

function mergeExtractions(
  pattern: Partial<ExtractionResult>,
  ai: Partial<ExtractionResult>
): ExtractionResult {
  // Prefer higher confidence values
  // Track which source was used for each field
  return {
    data: { ...pattern.data, ...ai.data },
    confidence: { overall: 0, fields: {} },
    rawText: pattern.rawText || '',
    warnings: [...(pattern.warnings || []), ...(ai.warnings || [])],
  };
}

function calculateConfidence(result: ExtractionResult): { overall: number; fields: Record<string, number> } {
  // Calculate per-field and overall confidence
  const fields: Record<string, number> = {};
  let total = 0;
  let count = 0;
  
  // ... calculation logic
  
  return {
    overall: count > 0 ? total / count : 0,
    fields,
  };
}

function mapFieldsToData(fields: Record<string, ExtractedField>): Partial<JobIntakeData> {
  const data: Partial<JobIntakeData> = {};
  
  for (const [key, field] of Object.entries(fields)) {
    (data as any)[key] = field.value;
  }
  
  return data;
}
```

## Create Upload Component at `components/csr/document-upload.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { extractFromDocument, ExtractionResult } from '@/lib/parsers/document-ingestion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentUploadProps {
  onExtracted: (result: ExtractionResult) => void;
  onApplyFields: (data: Partial<any>) => void;
}

export function DocumentUpload({ onExtracted, onApplyFields }: DocumentUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setError(null);

    try {
      setProgress(30);
      const extractionResult = await extractFromDocument(file);
      setProgress(90);
      
      setResult(extractionResult);
      onExtracted(extractionResult);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsProcessing(false);
    }
  }, [onExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleApply = () => {
    if (result?.data) {
      onApplyFields(result.data);
    }
  };

  return (
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium">
          {isDragActive ? 'Drop the document here' : 'Upload Notice of Deposition'}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          PDF or image files up to 10MB
        </p>
      </div>

      {isProcessing && (
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">Extracting fields...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-destructive/10 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-destructive">{error}</span>
        </div>
      )}

      {result && !isProcessing && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="font-medium">Extraction Complete</span>
            </div>
            <Badge variant={result.confidence.overall > 0.8 ? 'default' : 'secondary'}>
              {Math.round(result.confidence.overall * 100)}% confidence
            </Badge>
          </div>

          {/* Show extracted fields */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(result.data).map(([key, value]) => (
              <div key={key} className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">{formatFieldName(key)}</span>
                <span className="font-medium flex items-center gap-1">
                  {String(value)}
                  {result.confidence.fields[key] > 0.8 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </span>
              </div>
            ))}
          </div>

          {result.warnings.length > 0 && (
            <div className="text-sm text-amber-600">
              {result.warnings.map((w, i) => (
                <p key={i}>⚠️ {w}</p>
              ))}
            </div>
          )}

          <Button onClick={handleApply} className="w-full">
            Apply Extracted Fields to Form
          </Button>
        </div>
      )}
    </Card>
  );
}

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
```

---

# TASK 4 — MULTI-TENANT RLS & ACCESS LOGIC

## Create Supabase RLS Policies

Create file: `supabase/migrations/20250101_rls_policies.sql`

```sql
-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all relevant tables
ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CSRRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attorney" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobClaim" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper Functions
-- ============================================

-- Get current user's agency ID
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS TEXT AS $$
  SELECT "agencyId" FROM "User" WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get current user's firm ID
CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS TEXT AS $$
  SELECT "firmId" FROM "User" WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM "User" WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- CalendarEvent Policies
-- ============================================

-- Law Firms see only events they created or are assigned to their firm
CREATE POLICY "firm_calendar_access" ON "CalendarEvent"
FOR ALL USING (
  -- User created the event
  "createdById" = auth.uid()
  OR
  -- Event belongs to user's firm
  "firmId" = get_user_firm_id()
  OR
  -- User is assigned reporter
  "assignedReporterId" = auth.uid()
  OR
  -- User is admin
  get_user_role() = 'ADMIN'
);

-- Agencies see all events under their agency
CREATE POLICY "agency_calendar_access" ON "CalendarEvent"
FOR ALL USING (
  "agencyId" = get_user_agency_id()
  OR get_user_role() = 'ADMIN'
  OR get_user_role() = 'AGENCY_ADMIN'
);

-- ============================================
-- Job Policies
-- ============================================

-- Similar to CalendarEvent
CREATE POLICY "job_tenant_isolation" ON "Job"
FOR ALL USING (
  "createdById" = auth.uid()
  OR "firmId" = get_user_firm_id()
  OR "agencyId" = get_user_agency_id()
  OR get_user_role() = 'ADMIN'
);

-- Scopists can see jobs with READY_FOR_SCOPING status
CREATE POLICY "scopist_job_access" ON "Job"
FOR SELECT USING (
  get_user_role() = 'SCOPIST' 
  AND status = 'READY_FOR_EDIT'
);

-- ============================================
-- CSRRecord Policies
-- ============================================

-- CSRRecord inherits access from parent Job
CREATE POLICY "csr_follows_job" ON "CSRRecord"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "Job" j
    WHERE j.id = "CSRRecord"."jobId"
    AND (
      j."createdById" = auth.uid()
      OR j."firmId" = get_user_firm_id()
      OR j."agencyId" = get_user_agency_id()
      OR get_user_role() = 'ADMIN'
    )
  )
);

-- ============================================
-- Attorney Policies (Global Registry)
-- ============================================

-- All authenticated users can read attorneys
CREATE POLICY "attorney_read_all" ON "Attorney"
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can delete attorneys
CREATE POLICY "attorney_delete_admin" ON "Attorney"
FOR DELETE USING (get_user_role() = 'ADMIN');

-- Any authenticated user can create/update
CREATE POLICY "attorney_write" ON "Attorney"
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "attorney_update" ON "Attorney"
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================
-- JobClaim Policies (Marketplace)
-- ============================================

-- Scopists see their own claims
CREATE POLICY "scopist_own_claims" ON "JobClaim"
FOR ALL USING (
  "scopistId" = auth.uid()
);

-- Reporters see claims on their jobs
CREATE POLICY "reporter_job_claims" ON "JobClaim"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "Job" j
    WHERE j.id = "JobClaim"."jobId"
    AND j."createdById" = auth.uid()
  )
);

-- Admins see all
CREATE POLICY "admin_all_claims" ON "JobClaim"
FOR ALL USING (get_user_role() = 'ADMIN');
```

---

# TASK 5 — SERVER ACTIONS & API ROUTES

## Create Server Actions at `app/actions/job-intake.ts`

```typescript
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { JobIntakeSchema, JobIntakeData } from '@/types/job-intake';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function createJobFromIntake(data: JobIntakeData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Validate
  const validated = JobIntakeSchema.parse(data);

  // Create in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create CalendarEvent
    const event = await tx.calendarEvent.create({
      data: {
        caseStyle: validated.caseCaption,
        deponentName: validated.deponentName,
        deponentRole: validated.deponentRole,
        scheduledStart: validated.scheduledStartTime,
        scheduledEnd: validated.scheduledEndTime,
        timezone: validated.timezone,
        locationType: validated.locationType,
        locationAddress: validated.locationAddress,
        createdById: session.user.id,
        agencyId: session.user.agencyId,
        firmId: session.user.firmId,
        status: 'SCHEDULED',
      },
    });

    // 2. Create Job
    const job = await tx.job.create({
      data: {
        title: `${validated.deponentName} Deposition`,
        caseName: validated.caseCaption,
        caseNumber: validated.causeNumber,
        depositionDate: validated.scheduledStartTime,
        location: validated.locationAddress,
        status: 'CREATED',
        createdById: session.user.id,
        agencyId: session.user.agencyId,
        firmId: session.user.firmId,
      },
    });

    // 3. Link Event to Job
    await tx.calendarEvent.update({
      where: { id: event.id },
      data: { jobId: job.id },
    });

    // 4. Create CSRRecord
    const csrRecord = await tx.cSRRecord.create({
      data: {
        jobId: job.id,
        depositionDate: validated.scheduledStartTime,
        scheduledStartTime: validated.scheduledStartTime,
        caseCaption: validated.caseCaption,
        causeNumber: validated.causeNumber,
        courtName: validated.courtName,
        county: validated.county,
        state: validated.state,
        judge: validated.judge,
        
        // Insurance fields
        claimNumber: validated.claimNumber,
        policyNumber: validated.policyNumber,
        dateOfLoss: validated.dateOfLoss,
        insurerName: validated.insurerName,
        insuredName: validated.insuredName,
        isEUO: validated.isEUO,
        
        // Witness
        readAndSignRequired: validated.readAndSignRequired,
        signatureWaived: validated.signatureWaived,
        
        // Location
        locationType: validated.locationType,
        locationAddress: validated.locationAddress,
        locationCity: validated.locationCity,
        locationState: validated.locationState,
        
        // Resources
        interpreterRequired: validated.interpreterRequired,
        interpreterLanguage: validated.interpreterLanguage,
        videographerRequired: validated.videographerRequired,
        videoType: validated.videoType,
        
        // Logistics
        travelMiles: validated.travelMiles,
        parkingFees: validated.parkingFees,
        
        // Delivery
        deliveryPriority: validated.deliveryPriority,
        rushDueDate: validated.rushDueDate,
      },
    });

    // 5. Create Witnesses
    await tx.cSRWitness.create({
      data: {
        csrRecordId: csrRecord.id,
        fullLegalName: validated.deponentName,
        role: validated.deponentRole || 'FACT_WITNESS',
        isPrimary: true,
        readAndSignRequired: validated.readAndSignRequired,
        signatureWaived: validated.signatureWaived,
      },
    });

    // 6. Create Transcript Orders
    if (validated.transcriptOrders) {
      for (const order of validated.transcriptOrders) {
        await tx.transcriptOrder.create({
          data: {
            csrRecordId: csrRecord.id,
            attorneyName: order.attorneyName,
            firmName: order.firmName,
            email: order.email,
            deliveryType: order.deliveryType,
            fileFormat: order.fileFormat,
            isOriginal: order.isOriginal,
            copyCount: order.copyCount,
          },
        });
      }
    }

    // 7. Create Proper Nouns
    if (validated.properNouns) {
      for (const noun of validated.properNouns) {
        await tx.cSRProperNoun.create({
          data: {
            csrRecordId: csrRecord.id,
            value: noun.value,
            category: noun.category,
            useInTranscription: true,
          },
        });
      }
    }

    return { event, job, csrRecord };
  });

  revalidatePath('/calendar');
  revalidatePath('/jobs');

  return result;
}

export async function lockCSRRecord(jobId: string, reason: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await prisma.cSRRecord.update({
    where: { jobId },
    data: {
      isLocked: true,
      lockedAt: new Date(),
      lockedReason: reason,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
}
```

---

# CODING STANDARDS (MANDATORY)

✅ **TypeScript strict mode** - No `any` types without explicit justification  
✅ **Zod validation** - All inputs validated  
✅ **Server Actions** - No client-side Prisma  
✅ **MIT/Apache-2.0 only** - No GPL/AGPL dependencies  
✅ **Comments** - Add comments where legal semantics matter  
✅ **Indexes** - Add on `(tenantId, startTime)`, `(jobId)`, `(status)`  
✅ **No breaking changes** - Don't rename existing models unless required  

---

# WHAT THIS ENABLES

✔️ Court-grade legal accuracy  
✔️ Insurance defense indexing  
✔️ Automated billing later (mileage, rush, delivery)  
✔️ AI-ready transcription & scopist workflows  
✔️ Strict tenant isolation  
✔️ Zero schema rework later  

---

# STOP CONDITION

**If any decision requires business clarification, STOP and ASK.**

Do not assume:
- Pricing structures
- Specific court formatting rules
- State-specific legal requirements
- Integration credentials

---

# ✅ FINAL CONFIRMATION

**Proceed with all tasks in order:**

1. Schema update and migration
2. Job Intake Form with Zod validation
3. Document ingestion with AI placeholder
4. RLS policies
5. Server Actions

**Do NOT generate sample data unless requested.**

---

# EXECUTION CHECKLIST

After running this prompt, verify:

- [ ] `npx prisma validate` passes
- [ ] `npx prisma migrate dev` succeeds
- [ ] `npm run typecheck` has no errors
- [ ] Form renders without errors
- [ ] Document upload works (extraction is placeholder)
- [ ] RLS policies applied to Supabase
- [ ] Server actions create records correctly

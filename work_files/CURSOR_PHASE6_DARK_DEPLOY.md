# Phase 6 Dark Deploy: Migration + Feature Flag Isolation

## 🎯 MISSION
Apply Phase 6 billing schema to database while keeping all billing features **disabled** in production. This creates a safe baseline for incremental development.

## ⚠️ CRITICAL CONSTRAINTS
- **DO NOT** enable any billing UI routes
- **DO NOT** call Stripe APIs
- **DO NOT** modify existing job/transcription flows
- **ALL** billing code paths must check feature flag first

---

## STEP 1: Create Feature Flag System

### 1.1 Create `/lib/feature-flags.ts`

```typescript
// lib/feature-flags.ts
// Centralized feature flag management for controlled rollouts

export const FeatureFlags = {
  BILLING_PHASE_6: 'ENABLE_BILLING_PHASE_6',
  STRIPE_LIVE_MODE: 'STRIPE_LIVE_MODE',
  BILLING_UI: 'ENABLE_BILLING_UI',
} as const;

/**
 * Check if a feature flag is enabled
 * Defaults to FALSE for safety - features must be explicitly enabled
 */
export function isFeatureEnabled(flag: keyof typeof FeatureFlags): boolean {
  const envVar = FeatureFlags[flag];
  const value = process.env[envVar];
  
  // Explicit true required - anything else is false
  return value === 'true' || value === '1';
}

/**
 * Guard function - throws if feature is disabled
 * Use in API routes to block access to unfinished features
 */
export function requireFeature(flag: keyof typeof FeatureFlags): void {
  if (!isFeatureEnabled(flag)) {
    throw new Error(`Feature ${flag} is not enabled`);
  }
}

/**
 * HOC for API routes - returns 404 if feature disabled
 */
export function withFeatureFlag(
  flag: keyof typeof FeatureFlags,
  handler: Function
) {
  return async (...args: any[]) => {
    if (!isFeatureEnabled(flag)) {
      return new Response(
        JSON.stringify({ error: 'Feature not available' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return handler(...args);
  };
}

// Re-export for convenience
export const isBillingEnabled = () => isFeatureEnabled('BILLING_PHASE_6');
export const isStripeEnabled = () => isFeatureEnabled('STRIPE_LIVE_MODE');
export const isBillingUIEnabled = () => isFeatureEnabled('BILLING_UI');
```

### 1.2 Add to `.env.example`

Add these lines to `.env.example`:

```env
# ═══════════════════════════════════════════════════════════════
# PHASE 6: BILLING FEATURE FLAGS (all default to false)
# ═══════════════════════════════════════════════════════════════
ENABLE_BILLING_PHASE_6=false
ENABLE_BILLING_UI=false
STRIPE_LIVE_MODE=false

# Stripe Keys (test mode for now)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## STEP 2: Apply Prisma Schema (Billing Models Only)

### 2.1 Create new migration file

Create file: `prisma/migrations/[timestamp]_add_phase6_billing/migration.sql`

The migration adds billing tables but does NOT modify existing tables.

### 2.2 Add to `prisma/schema.prisma`

Add these models at the END of the schema file (after line 1724):

```prisma
// ============================================
// PHASE 6: BILLING SYSTEM
// Added: [DATE]
// Feature Flag: ENABLE_BILLING_PHASE_6
// ============================================

// --- BILLING ENUMS ---

enum BillingServiceType {
  TRANSCRIPTION_BASE
  TRANSCRIPTION_DIARIZATION
  MODEL_UPGRADE_NOVA2
  MODEL_UPGRADE_NOVA3
  MODEL_UPGRADE_MEDICAL
  HUMAN_REVIEW_CONFIDENCE
  HUMAN_REVIEW_FULL
  HUMAN_REVIEW_PROOFREAD
  AUDIO_ENHANCE_DOLBY
  AUDIO_ENHANCE_FORENSIC
  EXPORT_DOCX
  EXPORT_PDF
  EXPORT_ASCII
  STORAGE_AUDIO
  STORAGE_TRANSCRIPT
  RUSH_FEE
}

enum BillingUnit {
  PER_MINUTE
  PER_WORD
  PER_PAGE
  PER_FILE
  PER_HOUR
  PER_GB
  FLAT_RATE
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PAID
  PARTIALLY_PAID
  PAST_DUE
  VOID
  UNCOLLECTIBLE
}

enum InvoiceAdjustmentType {
  DISCOUNT
  CREDIT
  REFUND
  WRITE_OFF
  CORRECTION
}

// --- BILLING MODELS ---

model BillingAccount {
  id              String   @id @default(cuid())
  
  // Tenant isolation
  tenantId        String   @unique
  
  // Stripe integration
  stripeCustomerId String? @unique
  
  // Billing contact
  billingEmail    String
  billingName     String?
  billingAddress  Json?
  
  // Settings
  currency        String   @default("usd")
  paymentTermDays Int      @default(30)
  taxExempt       Boolean  @default(false)
  taxId           String?
  
  // Relations
  invoices        Invoice[]
  rates           BillingRate[]
  usageRecords    UsageRecord[]
  billingPeriods  BillingPeriod[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([stripeCustomerId])
  @@index([createdAt])
  @@map("billing_accounts")
}

model BillingRate {
  id              String   @id @default(cuid())
  
  // Tenant isolation
  tenantId        String
  
  // Rate definition
  serviceType     BillingServiceType
  unit            BillingUnit
  amountCents     Int
  
  // Versioning (rates are NEVER updated, only new versions created)
  version         Int      @default(1)
  isActive        Boolean  @default(true)
  effectiveFrom   DateTime @default(now())
  effectiveUntil  DateTime?
  
  // Audit
  createdById     String?
  
  // Relations
  billingAccount  BillingAccount @relation(fields: [tenantId], references: [tenantId], onDelete: Cascade)
  lineItems       InvoiceLineItem[]
  
  createdAt       DateTime @default(now())
  
  @@unique([tenantId, serviceType, version])
  @@index([tenantId, isActive])
  @@index([serviceType])
  @@map("billing_rates")
}

model BillingPeriod {
  id              String   @id @default(cuid())
  
  // Tenant isolation
  tenantId        String
  
  // Period bounds
  startAt         DateTime
  endAt           DateTime
  
  // Lock status (prevents double-billing)
  lockedAt        DateTime?
  lockedById      String?
  
  // Relations
  billingAccount  BillingAccount @relation(fields: [tenantId], references: [tenantId], onDelete: Cascade)
  invoices        Invoice[]
  
  createdAt       DateTime @default(now())
  
  @@unique([tenantId, startAt, endAt])
  @@index([tenantId])
  @@map("billing_periods")
}

model Invoice {
  id              String   @id @default(cuid())
  
  // Tenant isolation
  tenantId        String
  
  // Invoice identification
  invoiceNumber   String   @unique
  
  // Billing period
  billingPeriodId String?
  billingPeriod   BillingPeriod? @relation(fields: [billingPeriodId], references: [id])
  
  // Status
  status          InvoiceStatus @default(DRAFT)
  
  // Stripe integration
  stripeInvoiceId String?  @unique
  stripeInvoiceUrl String?
  stripePaymentIntentId String?
  
  // Amounts (all in cents, USD)
  subtotalCents   Int      @default(0)
  discountCents   Int      @default(0)
  taxCents        Int      @default(0)
  totalCents      Int      @default(0)
  amountPaidCents Int      @default(0)
  amountDueCents  Int      @default(0)
  
  // Dates
  issuedAt        DateTime?
  dueAt           DateTime?
  paidAt          DateTime?
  voidedAt        DateTime?
  
  // Metadata
  notes           String?  @db.Text
  internalNotes   String?  @db.Text
  
  // Relations
  billingAccount  BillingAccount @relation(fields: [tenantId], references: [tenantId], onDelete: Cascade)
  lineItems       InvoiceLineItem[]
  adjustments     InvoiceAdjustment[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([tenantId, status])
  @@index([stripeInvoiceId])
  @@index([invoiceNumber])
  @@index([issuedAt])
  @@index([dueAt])
  @@map("invoices")
}

model InvoiceLineItem {
  id              String   @id @default(cuid())
  
  // Parent invoice
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  // Service details
  serviceType     BillingServiceType
  description     String
  
  // Job attribution (optional)
  jobId           String?
  jobName         String?
  
  // Quantity and pricing (IMMUTABLE after invoice finalization)
  quantity        Decimal  @db.Decimal(10, 4)
  unit            BillingUnit
  unitPriceCents  Int
  totalCents      Int
  
  // Rate audit trail
  rateId          String?
  rate            BillingRate? @relation(fields: [rateId], references: [id])
  rateVersion     Int?
  
  // Linked usage
  usageRecords    UsageRecord[]
  
  createdAt       DateTime @default(now())
  
  @@index([invoiceId])
  @@index([jobId])
  @@index([serviceType])
  @@map("invoice_line_items")
}

model InvoiceAdjustment {
  id              String   @id @default(cuid())
  
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  
  type            InvoiceAdjustmentType
  amountCents     Int
  reason          String
  
  createdById     String
  createdAt       DateTime @default(now())
  
  @@index([invoiceId])
  @@map("invoice_adjustments")
}

model UsageRecord {
  id              String   @id @default(cuid())
  
  // Tenant isolation
  tenantId        String
  
  // Attribution
  jobId           String?
  userId          String?
  
  // Usage details
  serviceType     BillingServiceType
  quantity        Decimal  @db.Decimal(10, 4)
  unit            BillingUnit
  
  // Metadata (flexible JSON for service-specific data)
  metadata        Json?
  
  // Billing link (set when billed)
  invoiceLineItemId String?
  invoiceLineItem   InvoiceLineItem? @relation(fields: [invoiceLineItemId], references: [id])
  billedAt        DateTime?
  
  // Timestamps
  occurredAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  
  @@index([tenantId, billedAt])
  @@index([jobId])
  @@index([serviceType])
  @@index([occurredAt])
  @@map("usage_records")
}

model HumanReviewSession {
  id              String   @id @default(cuid())
  
  // Job context
  jobId           String
  transcriptionId String
  reviewerId      String
  
  // Session metrics
  startedAt       DateTime @default(now())
  endedAt         DateTime?
  durationMinutes Int?
  
  // Work metrics
  wordsReviewed   Int      @default(0)
  segmentsReviewed Int     @default(0)
  editsApplied    Int      @default(0)
  
  // Quality context
  confidenceThreshold Float @default(0.85)
  initialConfidenceAvg Float?
  finalConfidenceAvg Float?
  
  // Billing link
  usageRecordId   String?
  
  createdAt       DateTime @default(now())
  
  @@index([jobId])
  @@index([reviewerId])
  @@index([startedAt])
  @@map("human_review_sessions")
}

model AudioProcessingSession {
  id              String   @id @default(cuid())
  
  // Job context
  jobId           String
  
  // Processing details
  enhancementType String
  provider        String
  providerJobId   String?
  
  // Input/output metrics
  inputDurationSeconds Float
  outputDurationSeconds Float?
  inputFileSizeBytes Int
  outputFileSizeBytes Int?
  
  // Quality
  inputQualityScore Float?
  outputQualityScore Float?
  
  // Status
  status          String   @default("PENDING")
  errorMessage    String?
  
  // Billing link
  usageRecordId   String?
  
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  
  @@index([jobId])
  @@index([provider])
  @@index([status])
  @@map("audio_processing_sessions")
}
```

---

## STEP 3: Run Migration

Execute these commands in order:

```bash
# 1. Validate schema syntax
npx prisma validate

# 2. Format schema
npx prisma format

# 3. Generate migration (DO NOT apply yet)
npx prisma migrate dev --name add_phase6_billing --create-only

# 4. Review the generated SQL in prisma/migrations/

# 5. Apply migration
npx prisma migrate dev

# 6. Regenerate client
npx prisma generate
```

---

## STEP 4: Create Billing Route Stubs (Disabled by Default)

### 4.1 Create `/app/api/billing/route.ts`

```typescript
// app/api/billing/route.ts
import { NextResponse } from 'next/server';
import { withFeatureFlag } from '@/lib/feature-flags';

// GET /api/billing - List invoices (disabled)
export const GET = withFeatureFlag('BILLING_PHASE_6', async () => {
  return NextResponse.json({ 
    message: 'Billing API ready but not enabled',
    enabledWith: 'ENABLE_BILLING_PHASE_6=true'
  });
});

// POST /api/billing - Create invoice (disabled)  
export const POST = withFeatureFlag('BILLING_PHASE_6', async () => {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
});
```

### 4.2 Create `/app/(dashboard)/billing/page.tsx`

```typescript
// app/(dashboard)/billing/page.tsx
import { redirect } from 'next/navigation';
import { isBillingUIEnabled } from '@/lib/feature-flags';

export default function BillingPage() {
  // Redirect to dashboard if billing UI is not enabled
  if (!isBillingUIEnabled()) {
    redirect('/dashboard');
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-muted-foreground mt-2">
        Billing features are coming soon.
      </p>
    </div>
  );
}
```

---

## STEP 5: Verification Checklist

Run these commands and verify each passes:

```bash
# 1. TypeScript compiles
npm run typecheck
# Expected: 0 errors

# 2. ESLint passes
npm run lint
# Expected: 0 errors

# 3. Build succeeds
npm run build
# Expected: Build successful

# 4. Dev server starts
npm run dev
# Expected: Server starts on localhost:3000

# 5. Database has new tables
npx prisma studio
# Expected: See billing_accounts, invoices, etc. tables
```

### Manual Verification:

1. **Visit `/dashboard`** → Should work normally
2. **Visit `/billing`** → Should redirect to `/dashboard`
3. **Call `GET /api/billing`** → Should return 404
4. **Check Prisma Studio** → Billing tables exist but are empty

---

## STEP 6: Commit Safely

```bash
git add .
git commit -m "feat(billing): add Phase 6 schema behind feature flag

- Add billing models: BillingAccount, Invoice, UsageRecord, etc.
- Add feature flag system (lib/feature-flags.ts)
- All billing routes return 404 until ENABLE_BILLING_PHASE_6=true
- No changes to existing job/transcription flows
- Migration applied, tables created but empty"

git push
```

---

## ✅ SUCCESS CRITERIA

| Check | Expected |
|-------|----------|
| `npm run typecheck` | 0 errors |
| `npm run build` | Success |
| `/dashboard` loads | ✅ Normal |
| `/billing` | Redirects to /dashboard |
| `/api/billing` | Returns 404 |
| Prisma Studio | Billing tables visible |
| Existing features | Unchanged |

---

## 🚫 DO NOT PROCEED UNTIL

- [ ] All verification checks pass
- [ ] Production deploy succeeds with billing disabled
- [ ] No console errors related to billing
- [ ] Existing test users can still login and use app

---

## NEXT STEP

Once this dark deploy is verified, run:

> "Create billing dry-run simulation (no Stripe)"

This will test the invoice generation logic without touching real payment systems.

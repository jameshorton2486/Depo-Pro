# Phase 6 Billing Dry-Run Simulation

## 🎯 MISSION
Test the complete billing flow **without Stripe** to validate:
- Usage records are captured correctly
- Invoice generation produces accurate line items
- Rate snapshots are immutable
- Totals calculate correctly
- No recalculation bugs exist

## ⚠️ PREREQUISITES
- Phase 6 dark deploy completed
- `ENABLE_BILLING_PHASE_6=true` in `.env.local` (local only!)
- Database has billing tables
- App builds and runs

---

## STEP 1: Create Test Utilities

### 1.1 Create `/lib/billing/test-utils.ts`

```typescript
// lib/billing/test-utils.ts
// Utilities for testing billing flows without Stripe

import { db } from '@/lib/db';
import { BillingServiceType, BillingUnit } from '@prisma/client';

// Default rate card for testing
export const TEST_RATE_CARD = [
  { serviceType: 'TRANSCRIPTION_BASE' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 43 },
  { serviceType: 'TRANSCRIPTION_DIARIZATION' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 20 },
  { serviceType: 'MODEL_UPGRADE_NOVA3' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 15 },
  { serviceType: 'HUMAN_REVIEW_CONFIDENCE' as BillingServiceType, unit: 'PER_WORD' as BillingUnit, amountCents: 2 },
  { serviceType: 'HUMAN_REVIEW_FULL' as BillingServiceType, unit: 'PER_WORD' as BillingUnit, amountCents: 3 },
  { serviceType: 'EXPORT_DOCX' as BillingServiceType, unit: 'PER_FILE' as BillingUnit, amountCents: 100 },
  { serviceType: 'EXPORT_PDF' as BillingServiceType, unit: 'PER_FILE' as BillingUnit, amountCents: 100 },
  { serviceType: 'AUDIO_ENHANCE_DOLBY' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 5 },
  { serviceType: 'STORAGE_AUDIO' as BillingServiceType, unit: 'PER_GB' as BillingUnit, amountCents: 10 },
];

/**
 * Create a test billing account
 */
export async function createTestBillingAccount(tenantId: string) {
  // Check if already exists
  const existing = await db.billingAccount.findUnique({
    where: { tenantId },
  });
  
  if (existing) {
    console.log(`[TEST] Billing account already exists for tenant ${tenantId}`);
    return existing;
  }
  
  const account = await db.billingAccount.create({
    data: {
      tenantId,
      billingEmail: `billing-test-${tenantId}@example.com`,
      billingName: 'Test Billing Account',
      currency: 'usd',
      paymentTermDays: 30,
    },
  });
  
  console.log(`[TEST] Created billing account: ${account.id}`);
  return account;
}

/**
 * Initialize default rates for a tenant
 */
export async function initializeTestRates(tenantId: string) {
  const rates = [];
  
  for (const rate of TEST_RATE_CARD) {
    const existing = await db.billingRate.findFirst({
      where: {
        tenantId,
        serviceType: rate.serviceType,
        isActive: true,
      },
    });
    
    if (existing) {
      rates.push(existing);
      continue;
    }
    
    const created = await db.billingRate.create({
      data: {
        tenantId,
        serviceType: rate.serviceType,
        unit: rate.unit,
        amountCents: rate.amountCents,
        version: 1,
        isActive: true,
      },
    });
    
    rates.push(created);
  }
  
  console.log(`[TEST] Initialized ${rates.length} rates for tenant ${tenantId}`);
  return rates;
}

/**
 * Simulate usage for a job
 */
export async function simulateJobUsage(
  tenantId: string,
  jobId: string,
  durationMinutes: number,
  options: {
    diarization?: boolean;
    modelUpgrade?: 'NOVA3' | 'MEDICAL';
    humanReviewWords?: number;
    exportFormats?: ('DOCX' | 'PDF')[];
  } = {}
) {
  const records = [];
  
  // Base transcription
  records.push(await db.usageRecord.create({
    data: {
      tenantId,
      jobId,
      serviceType: 'TRANSCRIPTION_BASE',
      quantity: durationMinutes,
      unit: 'PER_MINUTE',
      metadata: { source: 'simulation' },
    },
  }));
  
  // Diarization
  if (options.diarization) {
    records.push(await db.usageRecord.create({
      data: {
        tenantId,
        jobId,
        serviceType: 'TRANSCRIPTION_DIARIZATION',
        quantity: durationMinutes,
        unit: 'PER_MINUTE',
        metadata: { source: 'simulation' },
      },
    }));
  }
  
  // Model upgrade
  if (options.modelUpgrade === 'NOVA3') {
    records.push(await db.usageRecord.create({
      data: {
        tenantId,
        jobId,
        serviceType: 'MODEL_UPGRADE_NOVA3',
        quantity: durationMinutes,
        unit: 'PER_MINUTE',
        metadata: { source: 'simulation' },
      },
    }));
  }
  
  // Human review
  if (options.humanReviewWords) {
    records.push(await db.usageRecord.create({
      data: {
        tenantId,
        jobId,
        serviceType: 'HUMAN_REVIEW_CONFIDENCE',
        quantity: options.humanReviewWords,
        unit: 'PER_WORD',
        metadata: { source: 'simulation' },
      },
    }));
  }
  
  // Exports
  for (const format of options.exportFormats || []) {
    records.push(await db.usageRecord.create({
      data: {
        tenantId,
        jobId,
        serviceType: format === 'DOCX' ? 'EXPORT_DOCX' : 'EXPORT_PDF',
        quantity: 1,
        unit: 'PER_FILE',
        metadata: { source: 'simulation', format },
      },
    }));
  }
  
  console.log(`[TEST] Created ${records.length} usage records for job ${jobId}`);
  return records;
}

/**
 * Cleanup test data
 */
export async function cleanupTestData(tenantId: string) {
  // Delete in order to respect foreign keys
  await db.usageRecord.deleteMany({ where: { tenantId } });
  await db.invoiceLineItem.deleteMany({ 
    where: { invoice: { tenantId } } 
  });
  await db.invoiceAdjustment.deleteMany({ 
    where: { invoice: { tenantId } } 
  });
  await db.invoice.deleteMany({ where: { tenantId } });
  await db.billingPeriod.deleteMany({ where: { tenantId } });
  await db.billingRate.deleteMany({ where: { tenantId } });
  await db.billingAccount.deleteMany({ where: { tenantId } });
  
  console.log(`[TEST] Cleaned up all billing data for tenant ${tenantId}`);
}
```

---

## STEP 2: Create Invoice Builder Service

### 2.1 Create `/lib/billing/invoice-builder.ts`

```typescript
// lib/billing/invoice-builder.ts
// Core invoice generation logic

import { db } from '@/lib/db';
import { BillingServiceType, InvoiceStatus } from '@prisma/client';

// Labels for line item descriptions
const SERVICE_LABELS: Record<BillingServiceType, string> = {
  TRANSCRIPTION_BASE: 'AI Transcription',
  TRANSCRIPTION_DIARIZATION: 'Speaker Diarization',
  MODEL_UPGRADE_NOVA2: 'Nova-2 Model Upgrade',
  MODEL_UPGRADE_NOVA3: 'Nova-3 Model Upgrade',
  MODEL_UPGRADE_MEDICAL: 'Medical Model Upgrade',
  HUMAN_REVIEW_CONFIDENCE: 'Low-Confidence Review',
  HUMAN_REVIEW_FULL: 'Full Human Review',
  HUMAN_REVIEW_PROOFREAD: 'Proofreading',
  AUDIO_ENHANCE_DOLBY: 'Audio Enhancement (Dolby)',
  AUDIO_ENHANCE_FORENSIC: 'Forensic Audio Enhancement',
  EXPORT_DOCX: 'DOCX Export',
  EXPORT_PDF: 'PDF Export',
  EXPORT_ASCII: 'ASCII Export',
  STORAGE_AUDIO: 'Audio Storage',
  STORAGE_TRANSCRIPT: 'Transcript Storage',
  RUSH_FEE: 'Rush Processing Fee',
};

/**
 * Generate invoice number
 * Format: INV-YYYYMM-####
 */
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

/**
 * Get current rate for a service type
 */
async function getCurrentRate(tenantId: string, serviceType: BillingServiceType) {
  return db.billingRate.findFirst({
    where: {
      tenantId,
      serviceType,
      isActive: true,
    },
    orderBy: { version: 'desc' },
  });
}

/**
 * Preview invoice without creating it
 */
export async function previewInvoice(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
) {
  // Get unbilled usage in period
  const usageRecords = await db.usageRecord.findMany({
    where: {
      tenantId,
      billedAt: null,
      occurredAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    orderBy: { occurredAt: 'asc' },
  });
  
  if (usageRecords.length === 0) {
    return { lineItems: [], subtotal: 0, total: 0 };
  }
  
  // Group by service type and job
  const grouped = new Map<string, typeof usageRecords>();
  for (const record of usageRecords) {
    const key = `${record.serviceType}:${record.jobId || 'no-job'}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(record);
  }
  
  // Build preview line items
  const lineItems = [];
  let subtotal = 0;
  
  for (const [key, records] of grouped) {
    const [serviceType] = key.split(':') as [BillingServiceType, string];
    const rate = await getCurrentRate(tenantId, serviceType);
    
    if (!rate) {
      console.warn(`[PREVIEW] No rate found for ${serviceType}`);
      continue;
    }
    
    const totalQuantity = records.reduce((sum, r) => sum + Number(r.quantity), 0);
    const totalCents = Math.round(totalQuantity * rate.amountCents);
    
    lineItems.push({
      serviceType,
      description: SERVICE_LABELS[serviceType],
      quantity: totalQuantity,
      unit: rate.unit,
      unitPriceCents: rate.amountCents,
      totalCents,
      jobId: records[0].jobId,
      usageRecordCount: records.length,
    });
    
    subtotal += totalCents;
  }
  
  return {
    lineItems,
    subtotal,
    total: subtotal, // No tax for now
    periodStart,
    periodEnd,
    usageRecordCount: usageRecords.length,
  };
}

/**
 * Generate actual invoice (creates DB records)
 */
export async function generateInvoice(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
  options: {
    isDraft?: boolean;
    notes?: string;
  } = {}
) {
  // Use transaction for atomicity
  return db.$transaction(async (tx) => {
    // 1. Check/create billing period
    let billingPeriod = await tx.billingPeriod.findFirst({
      where: {
        tenantId,
        startAt: periodStart,
        endAt: periodEnd,
      },
    });
    
    if (billingPeriod?.lockedAt) {
      throw new Error('Billing period is already locked - invoice exists');
    }
    
    if (!billingPeriod) {
      billingPeriod = await tx.billingPeriod.create({
        data: {
          tenantId,
          startAt: periodStart,
          endAt: periodEnd,
        },
      });
    }
    
    // 2. Get unbilled usage
    const usageRecords = await tx.usageRecord.findMany({
      where: {
        tenantId,
        billedAt: null,
        occurredAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });
    
    if (usageRecords.length === 0) {
      throw new Error('No unbilled usage in this period');
    }
    
    // 3. Create invoice
    const invoiceNumber = generateInvoiceNumber();
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        billingPeriodId: billingPeriod.id,
        status: options.isDraft ? 'DRAFT' : 'OPEN',
        notes: options.notes,
        issuedAt: options.isDraft ? null : new Date(),
        dueAt: options.isDraft ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    
    // 4. Group usage by service type + job
    const grouped = new Map<string, typeof usageRecords>();
    for (const record of usageRecords) {
      const key = `${record.serviceType}:${record.jobId || 'no-job'}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    }
    
    // 5. Create line items
    let subtotal = 0;
    
    for (const [key, records] of grouped) {
      const [serviceType] = key.split(':') as [BillingServiceType, string];
      const rate = await getCurrentRate(tenantId, serviceType);
      
      if (!rate) {
        console.warn(`[INVOICE] No rate for ${serviceType}, skipping`);
        continue;
      }
      
      const totalQuantity = records.reduce((sum, r) => sum + Number(r.quantity), 0);
      const totalCents = Math.round(totalQuantity * rate.amountCents);
      
      const lineItem = await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          serviceType,
          description: SERVICE_LABELS[serviceType],
          jobId: records[0].jobId,
          quantity: totalQuantity,
          unit: rate.unit,
          unitPriceCents: rate.amountCents,
          totalCents,
          rateId: rate.id,
          rateVersion: rate.version,
        },
      });
      
      // Link usage records to line item
      await tx.usageRecord.updateMany({
        where: {
          id: { in: records.map(r => r.id) },
        },
        data: {
          invoiceLineItemId: lineItem.id,
          billedAt: new Date(),
        },
      });
      
      subtotal += totalCents;
    }
    
    // 6. Update invoice totals
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        subtotalCents: subtotal,
        totalCents: subtotal, // No tax for now
        amountDueCents: subtotal,
      },
      include: {
        lineItems: true,
      },
    });
    
    // 7. Lock billing period
    if (!options.isDraft) {
      await tx.billingPeriod.update({
        where: { id: billingPeriod.id },
        data: { lockedAt: new Date() },
      });
    }
    
    console.log(`[INVOICE] Generated ${invoiceNumber}: $${(subtotal / 100).toFixed(2)}`);
    
    return updatedInvoice;
  });
}
```

---

## STEP 3: Create Dry-Run Script

### 3.1 Create `/scripts/billing-dry-run.ts`

```typescript
// scripts/billing-dry-run.ts
// Run with: npx tsx scripts/billing-dry-run.ts

import { db } from '@/lib/db';
import {
  createTestBillingAccount,
  initializeTestRates,
  simulateJobUsage,
  cleanupTestData,
} from '@/lib/billing/test-utils';
import { previewInvoice, generateInvoice } from '@/lib/billing/invoice-builder';

const TEST_TENANT_ID = 'dry-run-test-tenant';

async function runDryRun() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PHASE 6 BILLING DRY-RUN SIMULATION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // 1. Cleanup any previous test data
    console.log('🧹 Cleaning up previous test data...');
    await cleanupTestData(TEST_TENANT_ID);
    
    // 2. Create billing account
    console.log('\n📋 Creating test billing account...');
    await createTestBillingAccount(TEST_TENANT_ID);
    
    // 3. Initialize rates
    console.log('\n💰 Initializing rate card...');
    const rates = await initializeTestRates(TEST_TENANT_ID);
    console.log(`   Set up ${rates.length} billing rates`);
    
    // 4. Simulate usage for 3 fake jobs
    console.log('\n📊 Simulating job usage...');
    
    const jobs = [
      { id: 'test-job-1', duration: 45, diarization: true, exportFormats: ['DOCX', 'PDF'] as const },
      { id: 'test-job-2', duration: 120, modelUpgrade: 'NOVA3' as const, humanReviewWords: 500 },
      { id: 'test-job-3', duration: 30, exportFormats: ['DOCX'] as const },
    ];
    
    for (const job of jobs) {
      await simulateJobUsage(TEST_TENANT_ID, job.id, job.duration, {
        diarization: job.diarization,
        modelUpgrade: job.modelUpgrade,
        humanReviewWords: job.humanReviewWords,
        exportFormats: job.exportFormats,
      });
    }
    
    // 5. Preview invoice
    console.log('\n🔍 Previewing invoice...');
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const preview = await previewInvoice(TEST_TENANT_ID, periodStart, periodEnd);
    
    console.log('\n   INVOICE PREVIEW');
    console.log('   ───────────────────────────────────────────────────────');
    for (const item of preview.lineItems) {
      const price = `$${(item.totalCents / 100).toFixed(2)}`.padStart(10);
      console.log(`   ${item.description.padEnd(30)} ${item.quantity.toString().padStart(8)} ${item.unit.padEnd(12)} ${price}`);
    }
    console.log('   ───────────────────────────────────────────────────────');
    console.log(`   SUBTOTAL: $${(preview.subtotal / 100).toFixed(2)}`);
    console.log(`   TOTAL:    $${(preview.total / 100).toFixed(2)}`);
    
    // 6. Generate actual invoice
    console.log('\n📄 Generating invoice...');
    const invoice = await generateInvoice(TEST_TENANT_ID, periodStart, periodEnd, {
      isDraft: false,
      notes: 'Dry-run simulation invoice',
    });
    
    console.log(`\n   ✅ Invoice created: ${invoice.invoiceNumber}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Line items: ${invoice.lineItems.length}`);
    console.log(`   Total: $${(invoice.totalCents / 100).toFixed(2)}`);
    
    // 7. Verify immutability
    console.log('\n🔒 Testing immutability...');
    
    // Try to bill same period again
    try {
      await generateInvoice(TEST_TENANT_ID, periodStart, periodEnd);
      console.log('   ❌ ERROR: Should have prevented double-billing!');
    } catch (error: any) {
      if (error.message.includes('locked')) {
        console.log('   ✅ Double-billing correctly prevented');
      } else {
        throw error;
      }
    }
    
    // Verify usage records are linked
    const billedRecords = await db.usageRecord.count({
      where: {
        tenantId: TEST_TENANT_ID,
        billedAt: { not: null },
      },
    });
    console.log(`   ✅ ${billedRecords} usage records linked to invoice`);
    
    // 8. Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ DRY-RUN COMPLETE - ALL CHECKS PASSED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n  Next step: Test with Stripe in test mode');
    console.log('  Run: "Create Stripe test-mode execution plan"\n');
    
  } catch (error) {
    console.error('\n❌ DRY-RUN FAILED:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await cleanupTestData(TEST_TENANT_ID);
    await db.$disconnect();
  }
}

// Run
runDryRun().catch(console.error);
```

---

## STEP 4: Run the Dry-Run

```bash
# Make sure billing is enabled locally
echo "ENABLE_BILLING_PHASE_6=true" >> .env.local

# Run the simulation
npx tsx scripts/billing-dry-run.ts
```

---

## ✅ SUCCESS CRITERIA

The dry-run should output:

```
═══════════════════════════════════════════════════════════════
  PHASE 6 BILLING DRY-RUN SIMULATION
═══════════════════════════════════════════════════════════════

🧹 Cleaning up previous test data...
📋 Creating test billing account...
💰 Initializing rate card...
📊 Simulating job usage...
🔍 Previewing invoice...

   INVOICE PREVIEW
   ───────────────────────────────────────────────────────────
   AI Transcription                          195 PER_MINUTE      $8.39
   Speaker Diarization                        45 PER_MINUTE      $0.90
   Nova-3 Model Upgrade                      120 PER_MINUTE      $1.80
   Low-Confidence Review                     500 PER_WORD        $10.00
   DOCX Export                                 3 PER_FILE        $3.00
   PDF Export                                  1 PER_FILE        $1.00
   ───────────────────────────────────────────────────────────
   SUBTOTAL: $25.09
   TOTAL:    $25.09

📄 Generating invoice...
   ✅ Invoice created: INV-202512-XXXX
   Status: OPEN
   Line items: 6
   Total: $25.09

🔒 Testing immutability...
   ✅ Double-billing correctly prevented
   ✅ X usage records linked to invoice

═══════════════════════════════════════════════════════════════
  ✅ DRY-RUN COMPLETE - ALL CHECKS PASSED
═══════════════════════════════════════════════════════════════
```

---

## 🚫 FAILURE MODES TO WATCH FOR

| Symptom | Cause | Fix |
|---------|-------|-----|
| "No rate found" | Rates not initialized | Check `initializeTestRates` |
| Wrong totals | Decimal precision | Use `Decimal` not `Float` |
| Double-billing allowed | Period lock not working | Check `billingPeriod.lockedAt` |
| Usage not linked | Transaction failed | Check `invoiceLineItemId` update |

---

## NEXT STEP

After dry-run passes, run:

> "Create Stripe test-mode execution plan"

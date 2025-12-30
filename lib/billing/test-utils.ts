// =============================================================================
// BILLING TEST UTILITIES
// =============================================================================
// Utilities for testing billing flows without Stripe
// Adapted to use firmId instead of tenantId (matches existing schema)
// =============================================================================

import { db } from '@/lib/db';
import { BillingServiceType, BillingUnit } from '@prisma/client';

// Default rate card for testing (adapted for current enum values)
export const TEST_RATE_CARD = [
  { serviceType: 'TRANSCRIPTION_AUTOMATED' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 43 },
  { serviceType: 'MODEL_UPGRADE' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 15 },
  { serviceType: 'HUMAN_REVIEW_CONFIDENCE' as BillingServiceType, unit: 'PER_WORD' as BillingUnit, amountCents: 2 },
  { serviceType: 'HUMAN_REVIEW_FULL' as BillingServiceType, unit: 'PER_WORD' as BillingUnit, amountCents: 3 },
  { serviceType: 'FORENSIC_AUDIO_RX' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 5 },
];

/**
 * Create a test billing account (uses firmId)
 */
export async function createTestBillingAccount(firmId: string) {
  // Check if already exists
  const existing = await db.billingAccount.findUnique({
    where: { firmId },
  });
  
  if (existing) {
    console.log(`[TEST] Billing account already exists for firm ${firmId}`);
    return existing;
  }
  
  const account = await db.billingAccount.create({
    data: {
      firmId,
      billingEmail: `billing-test-${firmId}@example.com`,
      currency: 'USD',
    },
  });
  
  console.log(`[TEST] Created billing account: ${account.id}`);
  return account;
}

/**
 * Initialize default rates for a firm
 */
export async function initializeTestRates(firmId: string) {
  const rates = [];
  
  for (const rate of TEST_RATE_CARD) {
    const existing = await db.billingRate.findFirst({
      where: {
        firmId,
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
        firmId,
        serviceType: rate.serviceType,
        unit: rate.unit,
        amountCents: rate.amountCents,
        version: 1,
        isActive: true,
      },
    });
    
    rates.push(created);
  }
  
  console.log(`[TEST] Initialized ${rates.length} rates for firm ${firmId}`);
  return rates;
}

/**
 * Simulate usage for a job
 */
export async function simulateJobUsage(
  firmId: string,
  jobId: string,
  durationMinutes: number,
  options: {
    modelUpgrade?: boolean;
    humanReviewWords?: number;
  } = {}
) {
  const records = [];
  
  // Base transcription
  records.push(await db.billingUsageRecord.create({
    data: {
      firmId,
      jobId,
      serviceType: 'TRANSCRIPTION_AUTOMATED',
      quantity: durationMinutes,
      unit: 'PER_MINUTE',
    },
  }));
  
  // Model upgrade
  if (options.modelUpgrade) {
    records.push(await db.billingUsageRecord.create({
      data: {
        firmId,
        jobId,
        serviceType: 'MODEL_UPGRADE',
        quantity: durationMinutes,
        unit: 'PER_MINUTE',
      },
    }));
  }
  
  // Human review
  if (options.humanReviewWords) {
    records.push(await db.billingUsageRecord.create({
      data: {
        firmId,
        jobId,
        serviceType: 'HUMAN_REVIEW_CONFIDENCE',
        quantity: options.humanReviewWords,
        unit: 'PER_WORD',
      },
    }));
  }
  
  console.log(`[TEST] Created ${records.length} usage records for job ${jobId}`);
  return records;
}

/**
 * Cleanup test data
 */
export async function cleanupTestData(firmId: string) {
  // Delete in order to respect foreign keys
  await db.billingUsageRecord.deleteMany({ where: { firmId } });
  await db.invoiceLineItem.deleteMany({ 
    where: { invoice: { billingAccount: { firmId } } } 
  });
  await db.invoice.deleteMany({ where: { billingAccount: { firmId } } });
  await db.billingPeriod.deleteMany({ where: { firmId } });
  await db.billingRate.deleteMany({ where: { firmId } });
  await db.billingAccount.deleteMany({ where: { firmId } });
  
  console.log(`[TEST] Cleaned up all billing data for firm ${firmId}`);
}


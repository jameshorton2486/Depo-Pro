// =============================================================================
// BILLING TEST UTILITIES
// =============================================================================
// Utilities for testing billing flows without Stripe
// Adapted to use firmId instead of tenantId (matches existing schema)
// =============================================================================

import { BillingServiceType, BillingUnit } from '@/types/database';

// =============================================================================
// LOCKED PRICING (matches Authoritative Build Specification)
// =============================================================================
// 
// PRICING STRUCTURE:
// - Automated Transcription: $1.60 per audio minute (15-min minimum)
// - ASR Enhanced Tier: 1.25× multiplier on base rate
// - Confidence-Based Human Review: $0.35 per 1,000 words (<90% confidence only)
// - Manual RX Forensic Enhancement: $150 flat fee per file
// - Full Human Scopist Review: $1.25 per audio minute (optional add-on)
// =============================================================================

export const TEST_RATE_CARD = [
  // Base automated transcription: $1.60/min
  { serviceType: 'TRANSCRIPTION_AUTOMATED' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 160 },
  // Model upgrade multiplier: +$0.40/min (1.25× = base + 25%)
  { serviceType: 'MODEL_UPGRADE' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 40 },
  // Confidence-based human review: $0.35 per 1000 words = $0.00035/word
  // Stored as cents per word × 1000 for precision: 35 cents per 1000 words
  { serviceType: 'HUMAN_REVIEW_CONFIDENCE' as BillingServiceType, unit: 'PER_WORD' as BillingUnit, amountCents: 0.035 },
  // Full scopist review: $1.25/min
  { serviceType: 'HUMAN_REVIEW_FULL' as BillingServiceType, unit: 'PER_MINUTE' as BillingUnit, amountCents: 125 },
  // RX Forensic Enhancement: $150 flat fee per file
  { serviceType: 'FORENSIC_AUDIO_RX' as BillingServiceType, unit: 'PER_FILE' as BillingUnit, amountCents: 15000 },
];

// Minimum billing thresholds
export const BILLING_MINIMUMS = {
  TRANSCRIPTION_MIN_MINUTES: 15,  // 15-minute minimum for transcription
  HUMAN_REVIEW_MIN_WORDS: 100,    // Minimum words for human review billing
};

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


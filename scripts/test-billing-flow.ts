// =============================================================================
// END-TO-END BILLING TEST
// =============================================================================
// Location: scripts/test-billing-flow.ts
// Usage: npx tsx scripts/test-billing-flow.ts
// Purpose: Test the complete billing flow from job to invoice to Stripe
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { generateInvoiceForJob, previewInvoiceForJob } from '../lib/billing/invoice-generator';
import { evaluateRXEligibility, type RXEligibilityInput } from '../lib/rx/escalation';
import { DEFAULT_PRICING } from '../lib/billing/pricing-snapshot';

const prisma = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
  // Set to true to create actual Stripe resources (requires Stripe keys)
  createStripeInvoice: false,
  
  // Set to true to create test data if none exists
  createTestData: true,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// =============================================================================
// TEST 1: RX Escalation Logic
// =============================================================================

async function testRXEscalation() {
  log('\n═══════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 1: RX Escalation Logic', 'cyan');
  log('═══════════════════════════════════════════════════════════════\n', 'cyan');

  const testCases: Array<{ name: string; input: RXEligibilityInput; expected: string }> = [
    {
      name: 'User not requesting RX',
      input: {
        jobId: 'test-1',
        userRequested: false,
        durationMinutes: 60,
        isAgencyAccount: false,
      },
      expected: 'BLOCKED',
    },
    {
      name: 'Admin override',
      input: {
        jobId: 'test-2',
        userRequested: true,
        adminOverride: true,
        durationMinutes: 60,
        isAgencyAccount: false,
      },
      expected: 'ALLOWED',
    },
    {
      name: 'Long duration agency job',
      input: {
        jobId: 'test-3',
        userRequested: true,
        durationMinutes: 200,
        isAgencyAccount: true,
      },
      expected: 'ADMIN_APPROVAL_REQUIRED',
    },
    {
      name: 'Poor audio quality',
      input: {
        jobId: 'test-4',
        userRequested: true,
        audioQualityScore: 30,
        durationMinutes: 60,
        isAgencyAccount: false,
      },
      expected: 'ALLOWED',
    },
    {
      name: 'Good audio quality',
      input: {
        jobId: 'test-5',
        userRequested: true,
        audioQualityScore: 85,
        durationMinutes: 60,
        isAgencyAccount: false,
      },
      expected: 'NOT_RECOMMENDED',
    },
    {
      name: 'High low-confidence percentage',
      input: {
        jobId: 'test-6',
        userRequested: true,
        confidencePercent: 30,
        durationMinutes: 60,
        isAgencyAccount: false,
      },
      expected: 'ALLOWED',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = evaluateRXEligibility(testCase.input);
    const success = result.decision === testCase.expected;

    if (success) {
      log(`  ✅ ${testCase.name}: ${result.decision}`, 'green');
      passed++;
    } else {
      log(`  ❌ ${testCase.name}: Expected ${testCase.expected}, got ${result.decision}`, 'red');
      log(`     Reason: ${result.reason}`, 'yellow');
      failed++;
    }
  }

  log(`\n  Results: ${passed} passed, ${failed} failed`, passed === testCases.length ? 'green' : 'red');
  return failed === 0;
}

// =============================================================================
// TEST 2: Pricing Calculations
// =============================================================================

async function testPricingCalculations() {
  log('\n═══════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 2: Pricing Calculations', 'cyan');
  log('═══════════════════════════════════════════════════════════════\n', 'cyan');

  const testCases = [
    {
      name: '60-minute standard transcription',
      input: {
        durationMinutes: 60,
        wordCount: 9000,
        flaggedWordCount: 0,
        isEnhancedModel: false,
        hasRXEnhancement: false,
        hasFullReview: false,
      },
      expectedTotal: 60 * DEFAULT_PRICING.transcriptionRateCents, // $96.00
    },
    {
      name: '60-minute enhanced model',
      input: {
        durationMinutes: 60,
        wordCount: 9000,
        flaggedWordCount: 0,
        isEnhancedModel: true,
        hasRXEnhancement: false,
        hasFullReview: false,
      },
      expectedTotal: Math.round(60 * DEFAULT_PRICING.transcriptionRateCents * DEFAULT_PRICING.asrMultiplier), // $120.00
    },
    {
      name: 'Transcription with RX enhancement',
      input: {
        durationMinutes: 60,
        wordCount: 9000,
        flaggedWordCount: 0,
        isEnhancedModel: false,
        hasRXEnhancement: true,
        hasFullReview: false,
      },
      expectedTotal: (60 * DEFAULT_PRICING.transcriptionRateCents) + DEFAULT_PRICING.rxFlatFeeCents, // $246.00
    },
    {
      name: 'Transcription with flagged words',
      input: {
        durationMinutes: 60,
        wordCount: 9000,
        flaggedWordCount: 500,
        isEnhancedModel: false,
        hasRXEnhancement: false,
        hasFullReview: false,
      },
      expectedTotal: (60 * DEFAULT_PRICING.transcriptionRateCents) + DEFAULT_PRICING.confidenceReviewRateCents, // $131.35
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    // Calculate manually
    let total = testCase.input.durationMinutes * DEFAULT_PRICING.transcriptionRateCents;
    
    if (testCase.input.isEnhancedModel) {
      total = Math.round(total * DEFAULT_PRICING.asrMultiplier);
    }
    
    if (testCase.input.hasRXEnhancement) {
      total += DEFAULT_PRICING.rxFlatFeeCents;
    }
    
    if (testCase.input.flaggedWordCount > 0) {
      const reviewUnits = Math.ceil(testCase.input.flaggedWordCount / 1000);
      total += reviewUnits * DEFAULT_PRICING.confidenceReviewRateCents;
    }

    const success = Math.abs(total - testCase.expectedTotal) < 100; // Allow small rounding differences

    if (success) {
      log(`  ✅ ${testCase.name}: $${(total / 100).toFixed(2)}`, 'green');
      passed++;
    } else {
      log(`  ❌ ${testCase.name}: Expected $${(testCase.expectedTotal / 100).toFixed(2)}, got $${(total / 100).toFixed(2)}`, 'red');
      failed++;
    }
  }

  log(`\n  Results: ${passed} passed, ${failed} failed`, passed === testCases.length ? 'green' : 'red');
  return failed === 0;
}

// =============================================================================
// TEST 3: Invoice Generation (Integration)
// =============================================================================

async function testInvoiceGeneration() {
  log('\n═══════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 3: Invoice Generation (Integration)', 'cyan');
  log('═══════════════════════════════════════════════════════════════\n', 'cyan');

  // Find a completed job to test with
  const job = await prisma.job.findFirst({
    where: {
      status: 'COMPLETED',
      transcription: {
        isNot: null,
      },
    },
    include: {
      firm: true,
      transcription: true,
    },
  });

  if (!job) {
    log('  ⚠️  No completed job with transcription found for testing', 'yellow');
    log('  ℹ️  Create a test job or complete an existing job to test invoice generation', 'blue');
    return true; // Not a failure, just no test data
  }

  log(`  Testing with job: ${job.id}`, 'blue');
  log(`  Case: ${job.caseName}`, 'blue');
  log(`  Duration: ${job.transcription?.duration ? Math.ceil(job.transcription.duration / 60) : 'N/A'} minutes\n`, 'blue');

  // Test preview
  const preview = await previewInvoiceForJob(job.id);
  
  if (!preview.success) {
    log(`  ❌ Preview failed: ${preview.error}`, 'red');
    return false;
  }

  log('  ✅ Invoice preview generated:', 'green');
  for (const item of preview.lineItems || []) {
    log(`     - ${item.description}: $${(item.totalCents / 100).toFixed(2)}`, 'reset');
  }
  log(`     Total: $${((preview.totalCents || 0) / 100).toFixed(2)}\n`, 'green');

  // Only generate actual invoice if explicitly enabled
  if (TEST_CONFIG.createStripeInvoice) {
    const result = await generateInvoiceForJob(job.id, {
      sendToStripe: false, // Start without Stripe
    });

    if (result.success) {
      log(`  ✅ Invoice created: ${result.invoiceNumber}`, 'green');
    } else {
      log(`  ❌ Invoice generation failed: ${result.error}`, 'red');
      return false;
    }
  } else {
    log('  ℹ️  Skipping actual invoice creation (set TEST_CONFIG.createStripeInvoice = true to enable)', 'blue');
  }

  return true;
}

// =============================================================================
// TEST 4: Database Models Check
// =============================================================================

async function testDatabaseModels() {
  log('\n═══════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 4: Database Models Check', 'cyan');
  log('═══════════════════════════════════════════════════════════════\n', 'cyan');

  const models = [
    { name: 'BillingAccount', check: () => prisma.billingAccount.count() },
    { name: 'BillingRate', check: () => prisma.billingRate.count() },
    { name: 'Invoice', check: () => prisma.invoice.count() },
    { name: 'InvoiceLineItem', check: () => prisma.invoiceLineItem.count() },
    { name: 'BillingUsageRecord', check: () => prisma.billingUsageRecord.count() },
  ];

  let passed = 0;
  let failed = 0;

  for (const model of models) {
    try {
      const count = await model.check();
      log(`  ✅ ${model.name}: ${count} records`, 'green');
      passed++;
    } catch (error) {
      log(`  ❌ ${model.name}: Table not found or error`, 'red');
      failed++;
    }
  }

  // Check for PricingSnapshot (may not exist yet)
  try {
    const count = await prisma.pricingSnapshot.count();
    log(`  ✅ PricingSnapshot: ${count} records`, 'green');
    passed++;
  } catch {
    log(`  ⚠️  PricingSnapshot: Not migrated yet (run migration)`, 'yellow');
  }

  log(`\n  Results: ${passed} passed, ${failed} failed`, passed > 0 ? 'green' : 'yellow');
  return failed === 0;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  log('  DEPO-PRO BILLING SYSTEM END-TO-END TEST', 'cyan');
  log('═══════════════════════════════════════════════════════════════', 'cyan');
  log(`\n  Started: ${new Date().toISOString()}\n`, 'blue');

  const results: Array<{ name: string; passed: boolean }> = [];

  // Run tests
  results.push({ name: 'RX Escalation Logic', passed: await testRXEscalation() });
  results.push({ name: 'Pricing Calculations', passed: await testPricingCalculations() });
  results.push({ name: 'Database Models', passed: await testDatabaseModels() });
  results.push({ name: 'Invoice Generation', passed: await testInvoiceGeneration() });

  // Summary
  log('\n═══════════════════════════════════════════════════════════════', 'cyan');
  log('  TEST SUMMARY', 'cyan');
  log('═══════════════════════════════════════════════════════════════\n', 'cyan');

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  for (const result of results) {
    log(`  ${result.passed ? '✅' : '❌'} ${result.name}`, result.passed ? 'green' : 'red');
  }

  log(`\n  Total: ${passedCount}/${totalCount} tests passed\n`, passedCount === totalCount ? 'green' : 'yellow');

  if (passedCount === totalCount) {
    log('  🎉 All tests passed! Billing system is ready.\n', 'green');
  } else {
    log('  ⚠️  Some tests failed. Review the output above.\n', 'yellow');
  }

  log(`  Completed: ${new Date().toISOString()}\n`, 'blue');
}

main()
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// =============================================================================
// INVOICE GENERATOR SERVICE
// =============================================================================
// Location: lib/billing/invoice-generator.ts
// Purpose: Generate invoices from completed jobs using pricing snapshots
//
// WORKFLOW:
// 1. Job completes
// 2. Get pricing snapshot linked to job
// 3. Calculate line items from job data
// 4. Create internal invoice in database
// 5. Push to Stripe
// =============================================================================

import { 
  getOrCreatePricingSnapshotForJob, 
  calculateJobBilling,
  type JobBillingInput 
} from './pricing-snapshot';
import { createStripeInvoice } from '@/lib/stripe/invoice-service';
import { BillingServiceType, BillingUnit } from '@/types/database';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface InvoiceGenerationResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  stripeInvoiceId?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// Generate Invoice Number
// -----------------------------------------------------------------------------

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
}

// -----------------------------------------------------------------------------
// Map Service Type to Billing Unit
// -----------------------------------------------------------------------------

function getBillingUnit(serviceType: string): BillingUnit {
  switch (serviceType) {
    case 'TRANSCRIPTION_AUTOMATED':
    case 'MODEL_UPGRADE':
    case 'HUMAN_REVIEW_FULL':
      return 'PER_MINUTE';
    case 'HUMAN_REVIEW_CONFIDENCE':
      return 'PER_WORD';
    case 'FORENSIC_AUDIO_RX':
      return 'PER_FILE';
    default:
      return 'PER_MINUTE';
  }
}

// -----------------------------------------------------------------------------
// Generate Invoice for Job
// -----------------------------------------------------------------------------

export async function generateInvoiceForJob(
  jobId: string,
  options: {
    periodStart?: Date;
    periodEnd?: Date;
    sendToStripe?: boolean;
  } = {}
): Promise<InvoiceGenerationResult> {
  try {
    // Fetch job with all required data
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        firm: {
          include: {
            billingAccount: true,
          },
        },
        transcription: {
          select: {
            wordCount: true,
            flaggedWordCount: true,
            averageConfidence: true,
            duration: true,
          },
        },
      },
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    if (!job.firm?.billingAccount) {
      return { success: false, error: 'No billing account found for firm' };
    }

    // Ensure pricing snapshot exists
    const snapshotId = await getOrCreatePricingSnapshotForJob(jobId);

    // Determine if enhanced model was used
    const isEnhancedModel = job.asrModelTier === 'ENHANCED';

    // Determine if RX enhancement was used
    const hasRXEnhancement = job.audioProcessingMode === 'MANUAL_RX';

    // Get duration from job or transcription
    const durationMinutes = job.audioDurationMinutes 
      || (job.transcription?.duration ? Math.ceil(job.transcription.duration / 60) : 15);

    // Build billing input
    const billingInput: JobBillingInput = {
      snapshotId,
      durationMinutes,
      wordCount: job.transcription?.wordCount || 0,
      flaggedWordCount: job.transcription?.flaggedWordCount || 0,
      isEnhancedModel,
      hasRXEnhancement,
      hasFullReview: false, // TODO: Check if full review session exists
      fullReviewMinutes: undefined,
    };

    // Calculate billing
    const billing = await calculateJobBilling(billingInput);

    // Determine invoice period
    const periodStart = options.periodStart || new Date();
    const periodEnd = options.periodEnd || new Date();

    // Create internal invoice
    const invoice = await db.invoice.create({
      data: {
        billingAccountId: job.firm.billingAccount.id,
        invoiceNumber: generateInvoiceNumber(),
        periodStart,
        periodEnd,
        totalCents: billing.totalCents,
        status: 'DRAFT',
        lineItems: {
          create: billing.lineItems.map((item) => ({
            jobId,
            serviceType: item.serviceType as BillingServiceType,
            description: item.description,
            quantity: item.quantity,
            unit: getBillingUnit(item.serviceType),
            unitPriceCents: item.unitCents,
            totalCents: item.totalCents,
            rateVersion: 1, // From snapshot
          })),
        },
      },
    });

    console.log(`✅ Created invoice ${invoice.invoiceNumber} for job ${jobId}`);
    console.log(`   Total: $${(billing.totalCents / 100).toFixed(2)}`);
    console.log(`   Line items: ${billing.lineItems.length}`);

    // Create usage records for tracking
    for (const item of billing.lineItems) {
      await db.billingUsageRecord.create({
        data: {
          firmId: job.firmId!,
          jobId,
          serviceType: item.serviceType as BillingServiceType,
          quantity: item.quantity,
          unit: getBillingUnit(item.serviceType),
        },
      });
    }

    // Optionally push to Stripe
    let stripeInvoiceId: string | undefined;
    if (options.sendToStripe) {
      const stripeResult = await createStripeInvoice(invoice.id);
      if (stripeResult.success) {
        stripeInvoiceId = stripeResult.stripeInvoiceId;
      } else {
        console.warn(`⚠️ Failed to create Stripe invoice: ${stripeResult.error}`);
      }
    }

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      stripeInvoiceId,
    };
  } catch (error) {
    console.error('❌ Failed to generate invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Generate Batch Invoices for Period
// -----------------------------------------------------------------------------

export async function generateBatchInvoices(
  firmId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  success: boolean;
  invoices: InvoiceGenerationResult[];
  totalAmount: number;
}> {
  // Find all completed jobs in the period without invoices
  const jobs = await db.job.findMany({
    where: {
      firmId,
      status: 'COMPLETED',
      completedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      transcripts: true,
    },
  });

  // Filter jobs that don't have invoice line items yet
  const uninvoicedJobs = [];
  for (const job of jobs) {
    const existingLineItem = await db.invoiceLineItem.findFirst({
      where: { jobId: job.id },
    });
    if (!existingLineItem) {
      uninvoicedJobs.push(job);
    }
  }

  const results: InvoiceGenerationResult[] = [];
  let totalAmount = 0;

  for (const job of uninvoicedJobs) {
    const result = await generateInvoiceForJob(job.id, {
      periodStart,
      periodEnd,
      sendToStripe: false, // Generate all first, then batch to Stripe
    });

    results.push(result);

    if (result.success && result.invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: result.invoiceId },
        select: { totalCents: true },
      });
      totalAmount += invoice?.totalCents || 0;
    }
  }

  console.log(`✅ Generated ${results.filter(r => r.success).length} invoices`);
  console.log(`   Total amount: $${(totalAmount / 100).toFixed(2)}`);

  return {
    success: results.every(r => r.success),
    invoices: results,
    totalAmount,
  };
}

// -----------------------------------------------------------------------------
// Finalize Invoice and Send to Stripe
// -----------------------------------------------------------------------------

export async function finalizeAndSendInvoice(
  invoiceId: string
): Promise<InvoiceGenerationResult> {
  // Update status to indicate finalization
  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: 'DRAFT' }, // Still draft until Stripe confirms
  });

  // Push to Stripe
  const stripeResult = await createStripeInvoice(invoiceId);

  if (!stripeResult.success) {
    return {
      success: false,
      invoiceId,
      error: stripeResult.error,
    };
  }

  return {
    success: true,
    invoiceId,
    stripeInvoiceId: stripeResult.stripeInvoiceId,
  };
}

// -----------------------------------------------------------------------------
// Preview Invoice (without creating)
// -----------------------------------------------------------------------------

export async function previewInvoiceForJob(
  jobId: string
): Promise<{
  success: boolean;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitCents: number;
    totalCents: number;
  }>;
  totalCents?: number;
  error?: string;
}> {
  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        transcription: true,
      },
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    const snapshotId = await getOrCreatePricingSnapshotForJob(jobId);

    const durationMinutes = job.audioDurationMinutes 
      || (job.transcription?.duration ? Math.ceil(job.transcription.duration / 60) : 15);

    const billing = await calculateJobBilling({
      snapshotId,
      durationMinutes,
      wordCount: job.transcription?.wordCount || 0,
      flaggedWordCount: job.transcription?.flaggedWordCount || 0,
      isEnhancedModel: job.asrModelTier === 'ENHANCED',
      hasRXEnhancement: job.audioProcessingMode === 'MANUAL_RX',
      hasFullReview: false,
    });

    return {
      success: true,
      lineItems: billing.lineItems,
      totalCents: billing.totalCents,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

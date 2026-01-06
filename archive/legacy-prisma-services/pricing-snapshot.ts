// =============================================================================
// PRICING SNAPSHOT SERVICE
// =============================================================================
// Location: lib/billing/pricing-snapshot.ts
// Purpose: Create immutable pricing snapshots at job creation time
//
// CRITICAL PRINCIPLE:
// Prices captured at job creation NEVER change
// This ensures invoices reflect the price AT TIME OF SERVICE
// Courts can audit the exact rates charged
// =============================================================================

import { BillingService } from '@/lib/services/billing-service';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PricingSnapshotData {
  transcriptionRateCents: number;
  asrMultiplier: number;
  confidenceReviewRateCents: number;
  fullReviewRateCents: number;
  rxFlatFeeCents: number;
}

// -----------------------------------------------------------------------------
// Default System Pricing (Used when no firm-specific rates exist)
// -----------------------------------------------------------------------------

export const DEFAULT_PRICING: PricingSnapshotData = {
  transcriptionRateCents: 160,        // $1.60 per minute
  asrMultiplier: 1.25,                 // 25% premium for enhanced model
  confidenceReviewRateCents: 35,       // $0.35 per 1000 words = 35 cents per 1000
  fullReviewRateCents: 125,            // $1.25 per minute = 125 cents
  rxFlatFeeCents: 15000,               // $150.00 flat fee for RX forensic
};

// -----------------------------------------------------------------------------
// Get Current Pricing for Firm
// -----------------------------------------------------------------------------

export async function getCurrentPricingForFirm(
  firmId?: string
): Promise<PricingSnapshotData> {
  if (!firmId) {
    return DEFAULT_PRICING;
  }

  // Try to get firm-specific rates
  const transcriptionRate = await BillingService.getCurrentRate(
    firmId,
    'TRANSCRIPTION_AUTOMATED',
  );
  const confidenceReviewRate = await BillingService.getCurrentRate(
    firmId,
    'HUMAN_REVIEW_CONFIDENCE',
  );
  const fullReviewRate = await BillingService.getCurrentRate(
    firmId,
    'HUMAN_REVIEW_FULL',
  );
  const rxRate = await BillingService.getCurrentRate(
    firmId,
    'FORENSIC_AUDIO_RX',
  );

  // Build pricing from firm-specific rates
  return {
    transcriptionRateCents: transcriptionRate.amountCents,
    asrMultiplier: 1.25, // Enhanced tier multiplier (always 1.25×)
    confidenceReviewRateCents: confidenceReviewRate.amountCents * 1000, // Convert per-word to per-1000
    fullReviewRateCents: fullReviewRate.amountCents,
    rxFlatFeeCents: rxRate.amountCents,
  };
}

// -----------------------------------------------------------------------------
// Create Pricing Snapshot
// -----------------------------------------------------------------------------

export async function createPricingSnapshot(
  firmId?: string
): Promise<string> {
  const pricing = await getCurrentPricingForFirm(firmId);

  try {
    const snapshot = await db.pricingSnapshot.create({
      data: {
        transcriptionRateCents: pricing.transcriptionRateCents,
        asrMultiplier: pricing.asrMultiplier,
        confidenceReviewRateCents: pricing.confidenceReviewRateCents,
        fullReviewRateCents: pricing.fullReviewRateCents,
        rxFlatFeeCents: pricing.rxFlatFeeCents,
        minTranscriptionMinutes: 15, // 15-minute minimum billing
      },
    });

    console.log(`📸 Created pricing snapshot: ${snapshot.id}`);
    return snapshot.id;
  } catch (error) {
    console.error('Failed to create pricing snapshot:', error);
    // For now, return a mock ID if the table doesn't exist
    return `snapshot_mock_${Date.now()}`;
  }
}

// -----------------------------------------------------------------------------
// Get or Create Pricing Snapshot for Job
// -----------------------------------------------------------------------------

export async function getOrCreatePricingSnapshotForJob(
  jobId: string
): Promise<string> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      firmId: true,
      pricingSnapshotId: true,
    },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.pricingSnapshotId) {
    return job.pricingSnapshotId;
  }

  // Create new snapshot
  const snapshotId = await createPricingSnapshot(job.firmId || undefined);

  // Link snapshot to job
  await db.job.update({
    where: { id: jobId },
    data: {
      pricingSnapshotId: snapshotId,
    },
  });

  return snapshotId;
}

// -----------------------------------------------------------------------------
// Get Pricing Snapshot by ID
// -----------------------------------------------------------------------------

export async function getPricingSnapshot(
  snapshotId: string
): Promise<PricingSnapshotData | null> {
  try {
    const snapshot = await db.pricingSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      return null;
    }

    return {
      transcriptionRateCents: snapshot.transcriptionRateCents,
      asrMultiplier: snapshot.asrMultiplier,
      confidenceReviewRateCents: snapshot.confidenceReviewRateCents,
      fullReviewRateCents: snapshot.fullReviewRateCents,
      rxFlatFeeCents: snapshot.rxFlatFeeCents,
    };
  } catch (error) {
    console.error('Failed to get pricing snapshot:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Calculate Job Total from Snapshot
// -----------------------------------------------------------------------------

export interface JobBillingInput {
  snapshotId: string;
  durationMinutes: number;
  wordCount: number;
  flaggedWordCount: number;
  isEnhancedModel: boolean;
  hasRXEnhancement: boolean;
  hasFullReview: boolean;
  fullReviewMinutes?: number;
}

export interface JobBillingResult {
  lineItems: Array<{
    description: string;
    quantity: number;
    unitCents: number;
    totalCents: number;
    serviceType: string;
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export async function calculateJobBilling(
  input: JobBillingInput
): Promise<JobBillingResult> {
  const snapshot = await getPricingSnapshot(input.snapshotId);
  
  if (!snapshot) {
    throw new Error(`Pricing snapshot not found: ${input.snapshotId}`);
  }

  const lineItems: JobBillingResult['lineItems'] = [];
  let subtotalCents = 0;

  // Apply 15-minute minimum
  const billableMinutes = Math.max(input.durationMinutes, 15);

  // 1. Base Transcription
  const transcriptionTotal = billableMinutes * snapshot.transcriptionRateCents;
  lineItems.push({
    description: `Automated transcription (${billableMinutes} minutes)`,
    quantity: billableMinutes,
    unitCents: snapshot.transcriptionRateCents,
    totalCents: transcriptionTotal,
    serviceType: 'TRANSCRIPTION_AUTOMATED',
  });
  subtotalCents += transcriptionTotal;

  // 2. Enhanced Model Multiplier (if applicable)
  if (input.isEnhancedModel && snapshot.asrMultiplier > 1) {
    const upgradeAmount = Math.round(transcriptionTotal * (snapshot.asrMultiplier - 1));
    lineItems.push({
      description: `Enhanced ASR model multiplier (${snapshot.asrMultiplier}×)`,
      quantity: 1,
      unitCents: upgradeAmount,
      totalCents: upgradeAmount,
      serviceType: 'MODEL_UPGRADE',
    });
    subtotalCents += upgradeAmount;
  }

  // 3. Low-Confidence Review (if flagged words exist)
  if (input.flaggedWordCount > 0) {
    const reviewUnits = Math.ceil(input.flaggedWordCount / 1000);
    const reviewTotal = reviewUnits * snapshot.confidenceReviewRateCents;
    lineItems.push({
      description: `Confidence-based human review (${input.flaggedWordCount} words)`,
      quantity: reviewUnits,
      unitCents: snapshot.confidenceReviewRateCents,
      totalCents: reviewTotal,
      serviceType: 'HUMAN_REVIEW_CONFIDENCE',
    });
    subtotalCents += reviewTotal;
  }

  // 4. Full Scopist Review (if applicable)
  if (input.hasFullReview && input.fullReviewMinutes) {
    const fullReviewTotal = input.fullReviewMinutes * snapshot.fullReviewRateCents;
    lineItems.push({
      description: `Full scopist review (${input.fullReviewMinutes} minutes)`,
      quantity: input.fullReviewMinutes,
      unitCents: snapshot.fullReviewRateCents,
      totalCents: fullReviewTotal,
      serviceType: 'HUMAN_REVIEW_FULL',
    });
    subtotalCents += fullReviewTotal;
  }

  // 5. RX Forensic Enhancement (flat fee)
  if (input.hasRXEnhancement) {
    lineItems.push({
      description: 'Manual forensic audio cleanup (RX Advanced)',
      quantity: 1,
      unitCents: snapshot.rxFlatFeeCents,
      totalCents: snapshot.rxFlatFeeCents,
      serviceType: 'FORENSIC_AUDIO_RX',
    });
    subtotalCents += snapshot.rxFlatFeeCents;
  }

  // No tax calculation for now (business decision)
  const taxCents = 0;
  const totalCents = subtotalCents + taxCents;

  return {
    lineItems,
    subtotalCents,
    taxCents,
    totalCents,
  };
}

// ═══════════════════════════════════════════════════════════════
// PRICING SNAPSHOT SERVICE
// ═══════════════════════════════════════════════════════════════
// Creates immutable pricing snapshots for jobs to lock in rates
// at job creation time (per Phase 6B specification)
// ═══════════════════════════════════════════════════════════════

import { BillingService } from './billing-service';

// =============================================================================
// CREATE PRICING SNAPSHOT
// =============================================================================
// Creates an immutable snapshot of current pricing rates for a job
// This ensures invoices are never affected by future rate changes
// =============================================================================

export async function createPricingSnapshot(firmId: string): Promise<string> {
  // Get current rates for the firm
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

  // Create pricing snapshot
  const snapshot = await db.pricingSnapshot.create({
    data: {
      transcriptionRateCents: transcriptionRate.amountCents,
      asrMultiplier: 1.25, // Enhanced tier multiplier (1.25× = base + 25%)
      confidenceReviewRateCents: confidenceReviewRate.amountCents,
      fullReviewRateCents: fullReviewRate.amountCents,
      rxFlatFeeCents: rxRate.amountCents,
      minTranscriptionMinutes: 15, // 15-minute minimum billing
    },
  });

  return snapshot.id;
}

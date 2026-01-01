// =============================================================================
// INVOICE PREVIEW SERVICE
// =============================================================================
// Location: lib/services/invoice-preview-service.ts
// Phase: 5 - UI Completion
//
// PURPOSE:
// Pre-charge cost estimate that:
// - Uses same math as final invoice
// - Does NOT create anything in DB
// - Does NOT touch Stripe
// - Safe to expose to users
//
// This ensures:
// - No billing surprises
// - Reporters see exact costs before approval
// - RX fees are explicit
// - Legal defensibility
// =============================================================================

import { db } from '@/lib/db';
import { calculateJobBilling } from '@/lib/billing/pricing-snapshot';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PreviewLineItem {
  label: string;
  description?: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  serviceType: string;
}

export interface InvoicePreview {
  jobId: string;
  jobTitle: string;
  caseName: string;
  currency: string;
  items: PreviewLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  warnings: string[];
  canFinalize: boolean;
  blockedReason?: string;
}

// -----------------------------------------------------------------------------
// Generate Invoice Preview
// -----------------------------------------------------------------------------

export async function generateInvoicePreview(
  jobId: string,
  options: {
    estimatedDurationMinutes?: number;
    estimatedWordCount?: number;
    estimatedFlaggedWords?: number;
  } = {}
): Promise<InvoicePreview | null> {
  try {
    // Fetch job with all required data
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        firm: true,
        transcription: {
          select: {
            wordCount: true,
            flaggedWordCount: true,
            duration: true,
          },
        },
        pricingSnapshot: true,
      },
    });

    if (!job) {
      return null;
    }

    // Use pricing snapshot if available (needed for calculateJobBilling)
    if (!job.pricingSnapshot) {
      // Should not happen - pricing snapshot should exist at this point
      return null;
    }

    // Determine actual or estimated values
    const durationMinutes = 
      job.audioDurationMinutes || 
      options.estimatedDurationMinutes ||
      (job.transcription?.duration ? Math.ceil(job.transcription.duration / 60) : 15);

    const wordCount = 
      job.transcription?.wordCount || 
      options.estimatedWordCount || 
      0;

    const flaggedWordCount = 
      job.transcription?.flaggedWordCount || 
      options.estimatedFlaggedWords || 
      0;

    const isEnhancedModel = job.asrModelTier === 'ENHANCED';
    const hasRXEnhancement = job.audioProcessingMode === 'MANUAL_RX';

    // Calculate billing using same logic as final invoice
    const billing = await calculateJobBilling({
      snapshotId: job.pricingSnapshotId || '',
      durationMinutes,
      wordCount,
      flaggedWordCount,
      isEnhancedModel,
      hasRXEnhancement,
      hasFullReview: false,
      fullReviewMinutes: undefined,
    });

    // Build preview items
    const items: PreviewLineItem[] = billing.lineItems.map(item => ({
      label: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitCents,
      totalCents: item.totalCents,
      serviceType: item.serviceType,
    }));

    // Warnings
    const warnings: string[] = [];
    if (!job.audioDurationMinutes && !options.estimatedDurationMinutes) {
      warnings.push('Duration estimate based on default 15-minute minimum');
    }
    if (hasRXEnhancement) {
      warnings.push('RX forensic enhancement fee ($150) will be applied');
    }

    // Can finalize check
    let canFinalize = true;
    let blockedReason: string | undefined;

    if (!job.firmId) {
      canFinalize = false;
      blockedReason = 'Job must be associated with a firm';
    }

    if (durationMinutes <= 0) {
      canFinalize = false;
      blockedReason = 'Valid duration is required';
    }

    return {
      jobId,
      jobTitle: job.title,
      caseName: job.caseName,
      currency: 'USD',
      items,
      subtotalCents: billing.subtotalCents,
      taxCents: billing.taxCents,
      totalCents: billing.totalCents,
      warnings,
      canFinalize,
      blockedReason,
    };
  } catch (error) {
    console.error('Error generating invoice preview:', error);
    return null;
  }
}

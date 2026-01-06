// =============================================================================
// INVOICE PREVIEW API
// =============================================================================
// Location: app/api/billing/invoice-preview/route.ts
// Phase: 5 - UI Completion
//
// GET /api/billing/invoice-preview?jobId=xxx
// Returns cost estimate without creating anything in DB
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateInvoicePreview } from '@/lib/services/invoice-preview-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required' },
        { status: 400 }
      );
    }

    // Optional query parameters for estimates
    const __estimatedDurationMinutes = searchParams.get('estimatedDurationMinutes')
      ? parseFloat(searchParams.get('estimatedDurationMinutes')!)
      : undefined;

    const __estimatedWordCount = searchParams.get('estimatedWordCount')
      ? parseInt(searchParams.get('estimatedWordCount')!, 10)
      : undefined;

    const __estimatedFlaggedWords = searchParams.get('estimatedFlaggedWords')
      ? parseInt(searchParams.get('estimatedFlaggedWords')!, 10)
      : undefined;

    const preview = await generateInvoicePreview(jobId);

    if (!preview) {
      return NextResponse.json(
        { error: 'Job not found or preview generation failed' },
        { status: 404 }
      );
    }

    return NextResponse.json(preview);
  } catch (error) {
    console.error('Error generating invoice preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice preview' },
      { status: 500 }
    );
  }
}

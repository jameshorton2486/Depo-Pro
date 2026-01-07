// =============================================================================
// USAGE API ROUTE
// =============================================================================
// Get usage statistics and limits for a firm
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUsageSummary,
  getFirmUsage as _getFirmUsage,
  PricingTier,
} from '@/lib/cost-control-service';

// =============================================================================
// GET - Get Usage Summary
// =============================================================================

export async function GET(_request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const firmId = (session.user as any).firmId;

  if (!firmId) {
    return NextResponse.json(
      { error: 'Firm context required' },
      { status: 403 }
    );
  }

  try {
    // Get firm's pricing tier (default to FREE for now)
    // In production, this would come from a subscription/billing system
    const tier = 'free' as const;

    const summary = await getUsageSummary(firmId);

    return NextResponse.json({
      success: true,
      data: {
        tier,
        period: (summary as any).period,
        usage: (summary as any).usage,
        limits: summary.limits,
        percentages: (summary as any).percentages,
        estimatedCost: (summary as any).estimatedCost,
        warnings: (summary as any).warnings,
      },
    });

  } catch (error) {
    console.error('Usage query error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage data' },
      { status: 500 }
    );
  }
}

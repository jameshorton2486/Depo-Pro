// =============================================================================
// USAGE API ROUTE
// =============================================================================
// Get usage statistics and limits for a firm
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';
import {
  getUsageSummary,
  getFirmUsage as _getFirmUsage,
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
        currentPeriod: summary.currentPeriod,
        usage: summary.currentPeriod,
        limits: summary.limits,
        percentages: summary.percentUsed,
        estimatedCost: 0, // TODO: Calculate from usage
        warnings: [], // TODO: Generate warnings from usage
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

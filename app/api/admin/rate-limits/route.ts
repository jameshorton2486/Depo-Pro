// =============================================================================
// RATE LIMIT STATUS API ROUTE
// =============================================================================
// Get current rate limit status for debugging and monitoring
// Admin only endpoint
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { UserRole } from '@/lib/enums/roles';
import {
  getRateLimitStats,
  getAbusePatterns,
} from '@/lib/rate-limit-service';

// =============================================================================
// GET - Get Rate Limit Stats (Admin Only)
// =============================================================================

export async function GET(_request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const stats = getRateLimitStats();
    const abusePatterns = getAbusePatterns();
    
    // Filter abuse patterns to only show significant ones
    const significantAbuse = abusePatterns.filter(p => p.count >= 5);
    
    return NextResponse.json({
      success: true,
      data: {
        rateLimits: stats,
        abusePatterns: significantAbuse.map(p => ({
          userId: p.userId,
          pattern: p.pattern,
          count: p.count,
          firstSeen: p.firstSeen,
          lastSeen: p.lastSeen,
        })),
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Rate limit stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get rate limit stats' },
      { status: 500 }
    );
  }
}

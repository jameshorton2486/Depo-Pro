// =============================================================================
// ADMIN ACTIONS API
// app/api/admin/actions/route.ts
//
// Phase 4D-1: Get admin action history
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { subDays } from 'date-fns';

// RouteContext interface removed - not used

const SENSITIVE_ACTIONS = [
  'TRANSCRIPT_UNLOCKED',
  'USER_ROLE_CHANGED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'TRANSCRIPT_EXPORTED',
  'SYSTEM_CONFIG_CHANGED',
  'PERMISSION_MODIFIED',
];

/**
 * GET /api/admin/actions
 * Get admin action history (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all';
    const range = searchParams.get('range') || '7d';

    // Calculate date range
    const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const since = subDays(new Date(), days);

    // Build where clause
    const where: any = {
      action: {
        in: SENSITIVE_ACTIONS,
      },
      createdAt: {
        gte: since,
      },
    };

    if (filter !== 'all') {
      where.action = filter;
    }

    // Get actions
    const actions = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    // Transform to ActionLogEntry format
    const transformed = actions.map((log) => {
      const metadata = (log.metadata as any) || {};
      
      return {
        id: log.id,
        action: log.action,
        performedBy: log.user
          ? {
              id: log.user.id,
              firstName: log.user.firstName,
              lastName: log.user.lastName,
              email: log.user.email,
            }
          : {
              id: 'system',
              firstName: 'System',
              lastName: '',
              email: '',
            },
        target: {
          type: log.targetType,
          id: log.targetId,
          name: metadata.name || log.targetId,
        },
        timestamp: log.createdAt.toISOString(),
        metadata,
        reason: metadata.reason,
      };
    });

    return NextResponse.json({
      actions: transformed,
    });
  } catch (error) {
    console.error('Error fetching admin actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin actions' },
      { status: 500 }
    );
  }
}

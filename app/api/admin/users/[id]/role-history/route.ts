// =============================================================================
// USER ROLE HISTORY API
// app/api/admin/users/[id]/role-history/route.ts
//
// Phase 3D-2: Get role change history for a user
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/users/[id]/role-history
 * Get role change history (Admin only)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id: userId } = await context.params;

    // Get role change audit logs
    const changes = await db.auditLog.findMany({
      where: {
        targetType: 'User',
        targetId: userId,
        action: 'USER_ROLE_CHANGED',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      changes: changes.map((log) => ({
        id: log.id,
        action: log.action,
        actorUserId: log.actorUserId,
        actor: log.user
          ? {
              firstName: log.user.firstName,
              lastName: log.user.lastName,
            }
          : { firstName: 'System', lastName: '' },
        metadata: (log.metadata as any) || {},
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching role history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role history' },
      { status: 500 }
    );
  }
}

import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// =============================================================================
// USER ROLE HISTORY API
// app/api/admin/users/[id]/role-history/route.ts
//
// Phase 3D-2: Get role change history for a user
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { listAuditLogs } from '@/lib/supabase/queries/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/users/[id]/role-history
 * Get role change history (Admin only)
 */
async function GETHandler(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const { id: userId } = await context.params;

    const supabase = await createSupabaseServerClient();

    // Get role change audit logs
    const { logs } = await listAuditLogs(supabase, {
      target_type: 'User',
      target_id: userId,
      action: 'USER_ROLE_CHANGED',
    }, {
      limit: 50,
    });

    // Enrich with actor info
    const enrichedChanges = await Promise.all(
      logs.map(async (log: any) => {
        let actor = { firstName: 'System', lastName: '' };
        if (log.actor_user_id && log.actor_user_id !== 'system') {
          const userData = await getUserById(supabase, log.actor_user_id);
          if (userData) {
            actor = {
              firstName: userData.user_metadata?.firstName || '',
              lastName: userData.user_metadata?.lastName || '',
            };
          }
        }
        
        return {
          id: log.id,
          action: log.action,
          actorUserId: log.actor_user_id,
          actor,
          metadata: log.metadata || {},
          createdAt: log.created_at,
        };
      })
    );

    return NextResponse.json({
      changes: enrichedChanges,
    });
  } catch (error) {
    console.error('Error fetching role history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role history' },
      { status: 500 }
    );
  }
}

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN] },
  GETHandler as any
);


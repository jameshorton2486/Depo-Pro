// =============================================================================
// ADMIN ACTIONS API
// app/api/admin/actions/route.ts
//
// Phase 4D-1: Get admin action history
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listAuditLogs } from '@/lib/supabase/queries/audit';
import { subDays } from 'date-fns';
import { z } from 'zod';

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

const querySchema = z.object({
  filter: z.string().trim().max(100).default('all'),
  range: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
});

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
    const { filter, range } = querySchema.parse({
      filter: searchParams.get('filter') ?? undefined,
      range: searchParams.get('range') ?? undefined,
    });

    // Calculate date range
    const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const since = subDays(new Date(), days);

    const supabase = await createSupabaseServerClient();

    // Query all logs in date range (we'll filter by action after)
    // Since listAuditLogs only supports single action, we'll query without action filter
    // and filter in memory
    const { logs } = await listAuditLogs(supabase, {
      startDate: since,
    }, {
      limit: 1000, // Get more to filter down
    });

    // Filter by action
    let filteredLogs = logs;
    if (filter !== 'all') {
      filteredLogs = filteredLogs.filter((log: any) => log.action === filter);
    } else {
      filteredLogs = filteredLogs.filter((log: any) => SENSITIVE_ACTIONS.includes(log.action));
    }

    // Limit to 100 after filtering
    filteredLogs = filteredLogs.slice(0, 100);

    // Batch load actor users to avoid N+1 auth/admin calls.
    const actorIds = Array.from(
      new Set(
        filteredLogs
          .map((log: any) => log.actor_user_id)
          .filter((id: string | null | undefined) => id && id !== 'system')
      )
    ) as string[];

    const userMap = new Map<string, { id: string; firstName: string; lastName: string; email: string }>();
    if (actorIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', actorIds);

      for (const u of users || []) {
        userMap.set(u.id, {
          id: u.id,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          email: u.email || '',
        });
      }
    }

    // Enrich with user info
    const transformed = await Promise.all(
      filteredLogs.map(async (log: any) => {
        const metadata = log.metadata || {};
        
        let performedBy = {
          id: 'system',
          firstName: 'System',
          lastName: '',
          email: '',
        };
        
        if (log.actor_user_id && userMap.has(log.actor_user_id)) {
          performedBy = userMap.get(log.actor_user_id)!;
        }
        
        return {
          id: log.id,
          action: log.action,
          performedBy,
          target: {
            type: log.target_type,
            id: log.target_id,
            name: metadata.name || log.target_id,
          },
          timestamp: log.created_at,
          metadata,
          reason: metadata.reason,
        };
      })
    );

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



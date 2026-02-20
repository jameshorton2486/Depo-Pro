// =============================================================================
// ADMIN AUDIT DASHBOARD API
// app/api/admin/audit/route.ts
//
// Admin-only audit log viewing
// RLS ensures only admins can access audit logs
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { parseOptionalIsoDate, parsePagination } from '@/lib/api/validation';

/**
 * GET /api/admin/audit
 * Fetch audit logs (admin-only)
 * 
 * Query params:
 * - limit: Number of records to return (default: 100)
 * - offset: Offset for pagination (default: 0)
 * - action: Filter by action type
 * - entity: Filter by entity type
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Require admin access
    await requireAdmin();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const { limit, offset } = parsePagination(searchParams);
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const startDate = parseOptionalIsoDate(searchParams, 'startDate');
    const endDate = parseOptionalIsoDate(searchParams, 'endDate');

    // Build query (RLS ensures only admins can read all logs)
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }
    if (entity) {
      query = query.eq('entity', entity);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      logger.error('[admin/audit] Query failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('[admin/audit] Logs fetched', {
      count: logs?.length || 0,
      total: count || 0,
      filters: { action, entity, startDate, endDate },
    });

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      logger.warn('[admin/audit] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      logger.warn('[admin/audit] Forbidden access attempt');
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    logger.error('[admin/audit] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// ADMIN CASE METRICS API
// app/api/admin/metrics/cases/route.ts
//
// Admin-only, read-only case metrics
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { parseOptionalIsoDate, parsePagination } from '@/lib/api/validation';

/**
 * GET /api/admin/metrics/cases
 * Fetch case metrics (admin-only)
 * 
 * Query params:
 * - limit: Number of records to return (default: 100)
 * - offset: Offset for pagination (default: 0)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - firmId: Filter by firm ID
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Require admin access
    await requireAdmin();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const { limit, offset } = parsePagination(searchParams);
    const startDate = parseOptionalIsoDate(searchParams, 'startDate');
    const endDate = parseOptionalIsoDate(searchParams, 'endDate');
    const firmId = searchParams.get('firmId');

    // Build query for case metrics view
    let query = supabase
      .from('admin_case_metrics')
      .select('*', { count: 'exact' })
      .order('day', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (startDate) {
      query = query.gte('day', startDate);
    }
    if (endDate) {
      query = query.lte('day', endDate);
    }
    if (firmId) {
      query = query.eq('firm_id', firmId);
    }

    const { data: metrics, error, count } = await query;

    if (error) {
      logger.error('[admin/metrics/cases] Query failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('[admin/metrics/cases] Metrics fetched', {
      count: metrics?.length || 0,
      total: count || 0,
      filters: { startDate, endDate, firmId },
    });

    return NextResponse.json({
      metrics: metrics || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      logger.warn('[admin/metrics/cases] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      logger.warn('[admin/metrics/cases] Forbidden access attempt');
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    logger.error('[admin/metrics/cases] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

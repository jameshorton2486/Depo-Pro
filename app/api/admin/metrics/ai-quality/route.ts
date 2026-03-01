import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// =============================================================================
// ADMIN AI QUALITY METRICS API
// app/api/admin/metrics/ai-quality/route.ts
//
// Admin-only AI quality metrics
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { parseOptionalIsoDate, parsePagination } from '@/lib/api/validation';

/**
 * GET /api/admin/metrics/ai-quality
 * Fetch AI quality metrics (admin-only)
 * 
 * Query params:
 * - limit: Number of records to return (default: 100)
 * - offset: Offset for pagination (default: 0)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 */
async function GETHandler(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Require admin access
    await requireAdmin();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const { limit, offset } = parsePagination(searchParams);
    const startDate = parseOptionalIsoDate(searchParams, 'startDate');
    const endDate = parseOptionalIsoDate(searchParams, 'endDate');

    // Build query for AI quality metrics view
    let query = supabase
      .from('admin_ai_quality_metrics')
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

    const { data: metrics, error, count } = await query;

    if (error) {
      logger.error('[admin/metrics/ai-quality] Query failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('[admin/metrics/ai-quality] Metrics fetched', {
      count: metrics?.length || 0,
      total: count || 0,
      filters: { startDate, endDate },
    });

    return NextResponse.json({
      metrics: metrics || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      logger.warn('[admin/metrics/ai-quality] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      logger.warn('[admin/metrics/ai-quality] Forbidden access attempt');
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    logger.error('[admin/metrics/ai-quality] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN] },
  GETHandler as any
);


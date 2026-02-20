// =============================================================================
// ADMIN INCIDENTS API
// app/api/admin/incidents/route.ts
//
// Admin-only incident management
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdmin, requireAdminUserId } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { parseOptionalIsoDate, parsePagination } from '@/lib/api/validation';

/**
 * GET /api/admin/incidents
 * Fetch incidents (admin-only)
 * 
 * Query params:
 * - limit: Number of records to return (default: 100)
 * - offset: Offset for pagination (default: 0)
 * - severity: Filter by severity (low, medium, high, critical)
 * - category: Filter by category (auth, rls, ai, api, system, other)
 * - resolved: Filter by resolved status (true/false)
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
    const severity = searchParams.get('severity');
    const category = searchParams.get('category');
    const resolved = searchParams.get('resolved');
    const startDate = parseOptionalIsoDate(searchParams, 'startDate');
    const endDate = parseOptionalIsoDate(searchParams, 'endDate');

    // Build query (RLS ensures only admins can read)
    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true');
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: incidents, error, count } = await query;

    if (error) {
      logger.error('[admin/incidents] Query failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('[admin/incidents] Incidents fetched', {
      count: incidents?.length || 0,
      total: count || 0,
      filters: { severity, category, resolved, startDate, endDate },
    });

    return NextResponse.json({
      incidents: incidents || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      logger.warn('[admin/incidents] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      logger.warn('[admin/incidents] Forbidden access attempt');
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    logger.error('[admin/incidents] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/incidents/[id]
 * Resolve an incident (admin-only)
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Require admin access
    const adminUserId = await requireAdminUserId();
    
    const { id: incidentId } = await context.params;
    const body = await req.json();
    const { resolved, resolutionNotes } = body;

    if (resolved === undefined) {
      return NextResponse.json({ error: 'resolved field is required' }, { status: 400 });
    }

    // Update incident (RLS ensures only admins can update)
    const { data: incident, error: updateError } = await supabase
      .from('incidents')
      .update({
        resolved: resolved === true,
        resolved_at: resolved === true ? new Date().toISOString() : null,
        resolved_by: resolved === true ? adminUserId : null,
        resolution_notes: resolutionNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId)
      .select()
      .single();

    if (updateError) {
      logger.error('[admin/incidents] Failed to update incident', updateError, { incidentId, adminUserId });
      return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
    }

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    logger.info('[admin/incidents] Incident updated', {
      incidentId,
      resolved: incident.resolved,
      adminUserId,
    });

    return NextResponse.json({
      success: true,
      incident,
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      logger.warn('[admin/incidents] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      logger.warn('[admin/incidents] Forbidden access attempt');
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    logger.error('[admin/incidents] Unexpected error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

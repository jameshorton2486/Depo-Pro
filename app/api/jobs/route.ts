// =============================================================================
// JOBS API
// app/api/jobs/route.ts
//
// Create and list jobs
// =============================================================================

import type { NextRequest} from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { listJobs, createJob } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/jobs
 * List jobs (filtered by user role)
 */
const GETHandler = async (request: NextRequest, context?: ProtectedContext) => {
  const startTime = performance.now();
  try {
    const supabase = (context as any)?.supabase ?? await createSupabaseServerClient();
    let user: any = (context as any)?.user;
    if (!user) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { data: profile } = await supabase.from('profiles').select('role, firm_id').eq('id', authUser.id).single();
      if (!profile?.role) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = { id: authUser.id, role: profile.role, firm_id: profile.firm_id ?? null };
    }
    const userRole = user.role as string;
    const userId = user.id;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);
    const offset = (page - 1) * limit;

    // List jobs using query function
    const { jobs, count, totalCount, pageCount } = await listJobs(supabase, userId, userRole, {
      limit,
      offset,
    });

    // Map snake_case to camelCase for response
    const transformedJobs = jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      caseName: job.case_name,
      caseNumber: job.case_number,
      depositionDate: job.deposition_date,
      location: job.location,
      status: job.status,
      createdById: job.created_by_id,
      firmId: job.firm_id,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      createdBy: job.createdBy || null,
      assignments: job.assignments || [],
    }));

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json({
      jobs: transformedJobs,
      count,
      pageCount,
      pagination: {
        page,
        limit,
        totalCount: totalCount || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] jobs list failure', error);
    }
    logger.error('Error fetching jobs', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  } finally {
    const duration = Math.round(performance.now() - startTime);
    console.log(`[perf] ${request.method} ${request.nextUrl.pathname} ${duration}ms`);
  }
};

/**
 * POST /api/jobs
 * Create a new job
 */
const POSTHandler = async (request: NextRequest, context?: ProtectedContext) => {
  const startTime = performance.now();
  try {
    const supabase = (context as any)?.supabase ?? await createSupabaseServerClient();
    let user: any = (context as any)?.user;
    if (!user) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { data: profile } = await supabase.from('profiles').select('role, firm_id').eq('id', authUser.id).single();
      if (!profile?.role) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = { id: authUser.id, role: profile.role, firm_id: profile.firm_id ?? authUser.user_metadata?.firmId ?? null };
    }
    const userRole = user.role as string;
    const userId = user.id;

    // Only reporters and admins can create jobs
    if (userRole !== 'REPORTER' && userRole !== 'COURT_REPORTER' && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { caseName, title, depositionDate, caseNumber, deponentName, location, notes } = body;

    // Validate required fields
    if (!caseName && !title) {
      return NextResponse.json(
        { error: 'caseName or title is required' },
        { status: 400 }
      );
    }

    // Get user's firm ID from user_metadata (can be null)
    const firmId = user.firm_id || null;

    // Create job using query function
    const job = await createJob(supabase, {
      title: title || caseName,
      caseName: caseName || title,
      caseNumber: caseNumber || null,
      depositionDate: depositionDate ? new Date(depositionDate).toISOString() : new Date().toISOString(),
      firmId,
      createdById: userId,
      deponentName: deponentName || null,
      location: location || null,
      notes: notes || null,
    });

    return NextResponse.json({
      id: job.id,
      success: true,
      message: 'Job created successfully',
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] job create failure', error);
    }
    logger.error('Error creating job', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  } finally {
    const duration = Math.round(performance.now() - startTime);
    console.log(`[perf] ${request.method} ${request.nextUrl.pathname} ${duration}ms`);
  }
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  GETHandler
);

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER],
    rateLimit: { limit: 20, windowMs: 60_000 },
  },
  POSTHandler
);

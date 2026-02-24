// =============================================================================
// JOBS API
// app/api/jobs/route.ts
//
// Create and list jobs
// =============================================================================

import type { NextRequest} from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listJobs, createJob } from '@/lib/supabase/queries/jobs';
import { logger } from '@/lib/logger';

/**
 * GET /api/jobs
 * List jobs (filtered by user role)
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth using getUser() (not getSession())
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile?.role) {
      return NextResponse.json({ error: 'User profile incomplete: no role assigned' }, { status: 401 });
    }
    const userRole = profile.role as string;
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
}

/**
 * POST /api/jobs
 * Create a new job
 */
const POSTHandler = async (request: NextRequest) => {
  const startTime = performance.now();
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth using getUser() (not getSession())
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile?.role) {
      return NextResponse.json({ error: 'User profile incomplete: no role assigned' }, { status: 401 });
    }
    const userRole = profile.role as string;
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
    const firmId = (user.user_metadata?.firmId as string) || null;

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
}






export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [GuardRole.ADMIN, GuardRole.REPORTER, GuardRole.COURT_REPORTER],
    rateLimit: { limit: 20, windowMs: 60_000 },
  },
  async (request, { params }) => ((POSTHandler) as any)(request, { params: Promise.resolve(params as any) })
);

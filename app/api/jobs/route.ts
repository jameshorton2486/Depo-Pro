// =============================================================================
// JOBS API
// app/api/jobs/route.ts
//
// Create and list jobs
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listJobs, createJob } from '@/lib/supabase/queries/jobs';

/**
 * GET /api/jobs
 * List jobs (filtered by user role)
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Validate auth using getUser() (not getSession())
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from metadata
    const userRole = (user.user_metadata?.role as string) || 'REPORTER';
    const userId = user.id;

    // List jobs using query function
    const { jobs, count } = await listJobs(supabase, userId, userRole, { limit: 50 });

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

    return NextResponse.json({ jobs: transformedJobs, count });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs
 * Create a new job
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Validate auth using getUser() (not getSession())
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from metadata
    const userRole = (user.user_metadata?.role as string) || 'REPORTER';
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
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}






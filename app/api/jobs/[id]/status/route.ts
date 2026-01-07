// app/api/jobs/[id]/status/route.ts
// API route for getting and updating job status

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { JobStatus } from '@/types/database';
import { getJobById, updateJobStatus, updateJob } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/[id]/status
 * Get job status and transcription progress
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const user = session.user as { id: string; role: string };

    // Get job using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check access
    if (
      user.role !== 'ADMIN' &&
      (job as any).created_by_id !== user.id &&
      (job as any).scopist_id !== user.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get transcription if exists using query module
    const transcription = await getTranscriptByJobId(supabase, jobId);

    // Determine status and progress
    let status: string = (job as any).status;
    let progress: number | undefined;
    let transcriptId: string | undefined;

    if (transcription) {
      status = (transcription as any).status as string;
      transcriptId = (transcription as any).id;
      
      // Estimate progress based on status
      const statusProgress: Record<string, number> = {
        'DRAFT': 10,
        'TRANSCRIBING': 30,
        'AI_REVIEWING': 50,
        'READY_FOR_EDIT': 70,
        'IN_EDIT': 85,
        'SCOPIST_COMPLETE': 95,
        'FINALIZED': 100,
        'DELIVERED': 100,
        'COMPLETED': 100,
      };
      progress = statusProgress[status] || 0;
    } else {
      // No transcription yet
      progress = 0;
    }

    return NextResponse.json({
      status,
      progress,
      transcriptId,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jobs/[id]/status
 * Update job status
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status is a valid JobStatus enum value
    const validStatuses: JobStatus[] = [
      'CREATED',
      'FILES_UPLOADED',
      'ENHANCING_AUDIO',
      'TRANSCRIBING',
      'AI_REVIEWING',
      'READY_FOR_EDIT',
      'ASSIGNED',
      'IN_EDIT',
      'SUBMITTED_FOR_REVIEW',
      'IN_REVIEW',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status as JobStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    // Get job to check permissions using query module
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check for assignments (job_assignments query could be moved to jobs.ts later)
    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('scopist_id')
      .eq('job_id', jobId)
      .eq('scopist_id', session.user.id);

    // Check permissions
    const isOwner = (job as any).created_by_id === session.user.id;
    const isAssignedScopist = (assignments?.length || 0) > 0;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAssignedScopist && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update job status using query module
    // Note: updateJobStatus doesn't handle completed_at, so we use updateJob for this case
    let updatedJob;
    if (status === 'COMPLETED') {
      updatedJob = await updateJob(supabase, jobId, {
        status: status as JobStatus,
        completed_at: new Date().toISOString(),
      });
    } else {
      updatedJob = await updateJobStatus(supabase, jobId, status);
    }
    
    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error) {
    console.error('Job status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 },
    );
  }
}


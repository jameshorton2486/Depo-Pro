// app/api/jobs/[id]/status/route.ts
// API route for getting and updating job status

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { JobStatus } from '@/types/database';
import { getJobById, updateJobStatus, updateJob, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import { logger } from '@/lib/logger';

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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const user = currentUser as { id: string; role: string };

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
    const { id: jobId } = await context.params;
    logger.error('Error fetching job status', error instanceof Error ? error : new Error(String(error)), { jobId });
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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
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

    // Check permissions via query layer
    const isOwner = (job as any).created_by_id === currentUser.id;
    const isAssignedScopist = await isUserAssignedToJob(jobId, currentUser.id);
    const isAdmin = currentUser.role === 'ADMIN';

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
    const { id: jobId } = await context.params;
    logger.error('Job status update error', error instanceof Error ? error : new Error(String(error)), { jobId });
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 },
    );
  }
}




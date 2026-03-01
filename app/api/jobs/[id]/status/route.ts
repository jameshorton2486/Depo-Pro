// app/api/jobs/[id]/status/route.ts
// API route for getting and updating job status

import type { NextRequest} from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import type { JobStatus } from '@/types/database';
import { getJobById, updateJobStatus, updateJob, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import { logger } from '@/lib/logger';
import { jobStatusSchema } from '@/lib/api/schemas';

/**
 * GET /api/jobs/[id]/status
 * Get job status and transcription progress
 */
const GETHandler = async (
  request: NextRequest,
  context: ProtectedContext,
) => {
  try {
    const { id: jobId } = context.params;
    const user = context.user as { id: string; role: string };

    // Get job using query module
    const supabase = context.supabase;
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
    const { id: jobId } = context.params;
    logger.error('Error fetching job status', error instanceof Error ? error : new Error(String(error)), { jobId });
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
};

/**
 * PATCH /api/jobs/[id]/status
 * Update job status
 */
const PATCHHandler = async (
  request: NextRequest,
  context: ProtectedContext,
) => {
  try {
    const currentUser = context.user;
    const { id: jobId } = context.params;
    const body = await request.json();
    const parsed = jobStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid status' }, { status: 400 });
    }
    const { status } = parsed.data;

    // Get job to check permissions using query module
    const supabase = context.supabase;
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





export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  PATCHHandler
);

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    rateLimit: { limit: 60, windowMs: 60_000 },
  },
  GETHandler
);

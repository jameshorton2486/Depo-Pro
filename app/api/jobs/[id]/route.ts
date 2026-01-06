// ═══════════════════════════════════════════════════════════════
// JOB API ROUTES - /api/jobs/[id]
// ═══════════════════════════════════════════════════════════════
// GET    /api/jobs/[id] - Get single job (🔒 firmId filtered)
// PUT    /api/jobs/[id] - Update job (🔒 firmId filtered)
// DELETE /api/jobs/[id] - Delete job (🔒 firmId filtered)

import { NextRequest, NextResponse } from 'next/server';
import type { JobStatus } from '@/types/database';
import { logger } from '@/lib/logger';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getJobById,
  getJobForAccessCheck,
  getJobWithAssignments,
  updateJob,
  updateJobStatus,
  deleteJob,
} from '@/lib/supabase/queries/jobs';

// Simple request logging wrapper (replaces withRequestLogging)
const withRequestLogging = <T extends (...args: any[]) => any>(fn: T): T => {
  return ((...args: any[]) => {
    logger.info('Request started', { path: args[0]?.url });
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.then(
          (res) => {
            logger.info('Request completed', { path: args[0]?.url });
            return res;
          },
          (err) => {
            logger.error('Request failed', { path: args[0]?.url, error: err });
            throw err;
          }
        );
      }
      logger.info('Request completed', { path: args[0]?.url });
      return result;
    } catch (err) {
      logger.error('Request failed', { path: args[0]?.url, error: err });
      throw err;
    }
  }) as T;
};
import { checkRateLimit, requireAuth } from '@/lib/security';
import { invalidateDashboardCache, invalidateEntityCache } from '@/lib/cache';
import { lockNotesForJob } from '@/lib/phase6a/note-locking';

// ───────────────────────────────────────────────────────────────
// GET /api/jobs/[id] - Get single job
// ───────────────────────────────────────────────────────────────

export const GET = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check for include query parameter
    const searchParams = request.nextUrl.searchParams;
    const includeParam = searchParams.get('include');
    const includes = includeParam ? includeParam.split(',') : [];

    const supabase = await createSupabaseServerClient();
    
    // Get job with requested includes
    const job = await getJobById(supabase, id, {
      includeCreatedBy: true,
      includeAssignments: true,
      includeFiles: includes.includes('files'),
      includeTranscripts: true,
      includeTranscription: includes.includes('transcription'),
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights
    const hasAccess =
      session.user.role === 'ADMIN' ||
      job.created_by_id === session.user.id ||
      (job.assignments && job.assignments.some((a: any) => a.scopist_id === session.user.id));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Map snake_case to camelCase for response
    const response = {
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
      createdBy: job.createdBy,
      assignments: job.assignments?.map((a: any) => ({
        id: a.id,
        jobId: a.job_id,
        scopistId: a.scopist_id,
        status: a.status,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        scopist: a.scopist,
      })) || [],
      files: job.files || [],
      transcripts: job.transcripts || [],
      ...(job.transcription && { transcription: job.transcription }),
    };

    return NextResponse.json(response);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});

// ───────────────────────────────────────────────────────────────
// PUT /api/jobs/[id] - Update job
// ───────────────────────────────────────────────────────────────

export const PUT = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Check if job exists and user has access
    const existingJob = await getJobForAccessCheck(supabase, id);

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can update
    const canUpdate =
      session.user.role === 'ADMIN' ||
      existingJob.created_by_id === session.user.id;

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Use safe update service (Phase 1: Domain Enforcement)
    const { safeUpdateJob } = await import('@/lib/services/job-field-lock-service');
    
    const result = await safeUpdateJob(id, body, session.user.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    // Map camelCase to snake_case for update
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.caseName !== undefined) updateData.case_name = body.caseName;
    if (body.caseNumber !== undefined) updateData.case_number = body.caseNumber;
    if (body.depositionDate !== undefined) updateData.deposition_date = body.depositionDate;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.status !== undefined) updateData.status = body.status;
    // Add other fields as needed

    // Update job
    await updateJob(supabase, id, updateData);

    // Fetch updated job with createdBy
    const job = await getJobById(supabase, id, {
      includeCreatedBy: true,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Map to camelCase for response
    const response = {
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
      createdBy: job.createdBy,
    };

    // Invalidate caches
    invalidateDashboardCache();
    invalidateEntityCache('job', id);

    return NextResponse.json(response);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 },
      );
    }
    throw error;
  }
});

// ───────────────────────────────────────────────────────────────
// PATCH /api/jobs/[id] - Update job status only
// ───────────────────────────────────────────────────────────────

export const PATCH = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { status } = body as { status?: JobStatus };

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status enum
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
      'SCOPIST_COMPLETE',
      'REVIEW_COMPLETE',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    
    const job = await getJobWithAssignments(supabase, id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const isOwner = job.created_by_id === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isAssignedScopist =
      session.user.role === 'SCOPIST' &&
      job.assignments.some((assignment: any) => assignment.scopist_id === session.user.id);

    if (!isOwner && !isAdmin && !isAssignedScopist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use status transition service (Phase 1: Domain Enforcement)
    const { transitionJobStatus } = await import('@/lib/services/job-field-lock-service');
    
    const transitionResult = await transitionJobStatus(id, status, session.user.id);
    
    if (!transitionResult.success) {
      return NextResponse.json(
        { error: transitionResult.error },
        { status: 400 },
      );
    }

    const updatedJob = await updateJobStatus(supabase, id, status);

    // Phase 6A: Auto-lock notes when transcript is finalized
    if (status === 'COMPLETED' || status === 'REVIEW_COMPLETE') {
      try {
        await lockNotesForJob(id, session.user.id);
      } catch (error) {
        // Log error but don't fail the status update
        console.error('Failed to lock notes for job:', error);
      }
    }

    // Invalidate caches
    invalidateDashboardCache();
    invalidateEntityCache('job', id);

    return NextResponse.json({
      id: updatedJob.id,
      status: updatedJob.status,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});

// ───────────────────────────────────────────────────────────────
// DELETE /api/jobs/[id] - Delete job
// ───────────────────────────────────────────────────────────────

export const DELETE = withRequestLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Check if job exists and user has access
    const existingJob = await getJobForAccessCheck(supabase, id);

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can delete
    const canDelete =
      session.user.role === 'ADMIN' ||
      existingJob.created_by_id === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteJob(supabase, id);

    // Invalidate caches
    invalidateDashboardCache();
    invalidateEntityCache('job', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════════
// JOB API ROUTES - /api/jobs/[id]
// ═══════════════════════════════════════════════════════════════
// GET    /api/jobs/[id] - Get single job (🔒 firmId filtered)
// PUT    /api/jobs/[id] - Update job (🔒 firmId filtered)
// DELETE /api/jobs/[id] - Delete job (🔒 firmId filtered)

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import type { JobStatus } from '@/types/database';
import { logger } from '@/lib/logger';
import {
  getJobById,
  getJobForAccessCheck,
  getJobWithAssignments,
  updateJob,
  updateJobStatus,
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
            logger.error('Request failed', err instanceof Error ? err : new Error(String(err)), { path: args[0]?.url });
            throw err;
          }
        );
      }
      logger.info('Request completed', { path: args[0]?.url });
      return result;
    } catch (err) {
      logger.error('Request failed', err instanceof Error ? err : new Error(String(err)), { path: args[0]?.url });
      throw err;
    }
  }) as T;
};
import { isAdminRole } from '@/lib/admin';
import { checkRateLimit } from '@/lib/security';
import { invalidateDashboardCache, invalidateEntityCache } from '@/lib/cache';
// TODO: Re-implement note locking - lib/phase6a/note-locking was deleted
// import { lockNotesForJob } from '@/lib/phase6a/note-locking';

// ───────────────────────────────────────────────────────────────
// GET /api/jobs/[id] - Get single job
// ───────────────────────────────────────────────────────────────

const GETHandler = withRequestLogging(async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  const startTime = performance.now();
  try {
    const { id } = params;

    // Rate limiting
    const rateLimit = checkRateLimit(user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check for include query parameter
    const searchParams = request.nextUrl.searchParams;
    const includeParam = searchParams.get('include');
    const includes = includeParam ? includeParam.split(',') : [];

    // Get job with requested includes
    const job = await getJobById(supabase, id, {
      includeCreatedBy: true,
      includeAssignments: true,
      includeFiles: includes.includes('files'),
      includeTranscripts: true,
      includeTranscription: includes.includes('transcription'),
      verifyAccessForUserId: user.id,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
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

  } finally {
    const duration = Math.round(performance.now() - startTime);
    console.warn(`[perf] ${request.method} ${request.nextUrl.pathname} ${duration}ms`);
  }
});

// ───────────────────────────────────────────────────────────────
// PUT /api/jobs/[id] - Update job
// ───────────────────────────────────────────────────────────────

const PUTHandler = withRequestLogging(async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  try {
    const { id } = params;

    // Rate limiting
    const rateLimit = checkRateLimit(user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if job exists and user has access
    const existingJob = await getJobForAccessCheck(supabase, id, {
      verifyAccessForUserId: user.id,
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can update
    const canUpdate =
      isAdminRole(user.role) ||
      existingJob.created_by_id === user.id;

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // TODO: Re-implement job field locking - lib/services/job-field-lock-service was deleted
    // const { safeUpdateJob } = await import('@/lib/services/job-field-lock-service');
    // const result = await safeUpdateJob(id, body, session.user.id);
    // ... (validation temporarily disabled)

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
      verifyAccessForUserId: user.id,
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

const PATCHHandler = withRequestLogging(async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  const { id } = params;

    // Rate limiting
    const rateLimit = checkRateLimit(user.id, 'API_GLOBAL');
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
      'DRAFT',
      'CREATED',
      'PENDING',
      'FILES_UPLOADED',
      'ENHANCING_AUDIO',
      'TRANSCRIBING',
      'AI_REVIEWING',
      'AI_COMPLETE',
      'READY_FOR_EDIT',
      'ASSIGNED',
      'IN_EDIT',
      'SUBMITTED_FOR_REVIEW',
      'IN_REVIEW',
      'SCOPIST_COMPLETE',
      'REVIEW_COMPLETE',
      'COMPLETED',
      'CANCELLED',
      'FAILED',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const job = await getJobWithAssignments(supabase, id, {
      verifyAccessForUserId: user.id,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const isOwner = job.created_by_id === user.id;
    const isAdmin = isAdminRole(user.role);
    const isAssignedScopist =
      user.role === 'SCOPIST' &&
      job.assignments.some((assignment: any) => assignment.scopist_id === user.id);

    if (!isOwner && !isAdmin && !isAssignedScopist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // TODO: Re-implement job status transition - lib/services/job-field-lock-service was deleted
    // const { transitionJobStatus } = await import('@/lib/services/job-field-lock-service');
    // const transitionResult = await transitionJobStatus(id, status, session.user.id);
    // ... (validation temporarily disabled)

    const updatedJob = await updateJobStatus(supabase, id, status);

    // TODO: Re-implement note locking - lib/phase6a/note-locking was deleted
    // Phase 6A: Auto-lock notes when transcript is finalized
    // if (status === 'COMPLETED' || status === 'REVIEW_COMPLETE') {
    //   try {
    //     await lockNotesForJob(id, session.user.id);
    //   } catch (error) {
    //     console.error('Failed to lock notes for job:', error);
    //   }
    // }

    // Invalidate caches
    invalidateDashboardCache();
    invalidateEntityCache('job', id);

  return NextResponse.json({
    id: updatedJob.id,
    status: updatedJob.status,
  });
});

// ───────────────────────────────────────────────────────────────
// DELETE /api/jobs/[id] - Delete job
// ───────────────────────────────────────────────────────────────

const DELETEHandler = withRequestLogging(async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
) => {
  const { id } = params;

    // Rate limiting
    const rateLimit = checkRateLimit(user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if job exists and user has access
    const existingJob = await getJobForAccessCheck(supabase, id, {
      verifyAccessForUserId: user.id,
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can delete
    const canDelete =
      isAdminRole(user.role) ||
      existingJob.created_by_id === user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

  // Soft delete — set deleted_at, never hard delete
  const { error } = await supabase
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error('[jobs/delete] soft-delete failed', new Error(error.message), { jobId: id });
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }

    // Invalidate caches
    invalidateDashboardCache();
    invalidateEntityCache('job', id);

  logger.info('[jobs/delete] soft-deleted', { jobId: id, deletedBy: user.id });
  return NextResponse.json({ success: true });
});

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY],
    requireFirm: true,
    rateLimit: { limit: 60, windowMs: 60_000 },
    auditAction: 'JOB_VIEWED',
  },
  GETHandler as any
);

export const PUT = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER],
    requireFirm: true,
    rateLimit: { limit: 30, windowMs: 60_000 },
    auditAction: 'JOB_UPDATED',
  },
  PUTHandler as any
);

export const PATCH = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    requireFirm: true,
    rateLimit: { limit: 30, windowMs: 60_000 },
    auditAction: 'JOB_STATUS_UPDATED',
  },
  PATCHHandler as any
);

export const DELETE = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER],
    requireFirm: true,
    rateLimit: { limit: 20, windowMs: 60_000 },
    auditAction: 'JOB_DELETED',
  },
  DELETEHandler as any
);

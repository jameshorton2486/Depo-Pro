// app/api/jobs/[id]/lock/route.ts
// Job lock REST endpoint — acquire, release, and inspect exclusive edit locks

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import {
  acquireJobLock,
  releaseJobLock,
  getJobLockStatus,
  isJobLockedByUser,
} from '@/lib/supabase/queries/locks';
import { captureError } from '@/lib/error-capture';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = [
  UserRole.ADMIN,
  UserRole.SCOPIST,
  UserRole.REPORTER,
  UserRole.COURT_REPORTER,
];

/**
 * GET /api/jobs/[id]/lock
 * Return current lock status for the job.
 */
export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ALLOWED_ROLES,
  },
  async (_req: NextRequest, { params }: ProtectedContext): Promise<NextResponse> => {
    const startTime = performance.now();
    const jobId = params.id;
    try {
      const { data: lockData, error } = await getJobLockStatus(jobId);

      if (error) {
        captureError(error, { route: 'GET /api/jobs/[id]/lock', jobId });
        return NextResponse.json({ error: 'Failed to get lock status' }, { status: 500 });
      }

      if (!lockData) {
        return NextResponse.json({ isLocked: false });
      }

      return NextResponse.json({
        isLocked: true,
        lockedBy: lockData.user_id,
        lockedAt: lockData.locked_at,
        expiresAt: lockData.lock_expires_at,
      });
    } catch (error) {
      captureError(error, { route: 'GET /api/jobs/[id]/lock', jobId });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
      const duration = Math.round(performance.now() - startTime);
      if (duration > 500) {
        console.warn(`[perf:slow] GET /api/jobs/[id]/lock ${duration}ms`);
      }
    }
  }
);

/**
 * POST /api/jobs/[id]/lock
 * Acquire an exclusive edit lock on the job.
 * Returns 409 if the job is in a terminal state.
 * Returns 423 if the job is already locked by another user.
 */
export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ALLOWED_ROLES,
    rateLimit: { limit: 30, windowMs: 60_000 },
  },
  async (_req: NextRequest, { user, supabase, params }: ProtectedContext): Promise<NextResponse> => {
    const startTime = performance.now();
    const jobId = params.id;
    try {
      // Verify job exists and is not in a terminal state
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      if (job.status === 'SCOPIST_COMPLETE' || job.status === 'ARCHIVED') {
        return NextResponse.json(
          { error: 'Cannot lock a completed or archived job', code: 'JOB_FINAL' },
          { status: 409 }
        );
      }

      // Attempt lock acquisition
      const { error: acquireError } = await acquireJobLock(jobId, user.id);

      // Get current lock state (whether we acquired it or not)
      const { data: lockStatus } = await getJobLockStatus(jobId);

      if (acquireError) {
        return NextResponse.json(
          {
            error: 'Job is locked',
            lockedBy: lockStatus?.user_id ?? null,
            expiresAt: lockStatus?.lock_expires_at ?? null,
          },
          { status: 423 }
        );
      }

      return NextResponse.json({
        locked: true,
        expiresAt: lockStatus?.lock_expires_at ?? null,
      });
    } catch (error) {
      captureError(error, { route: 'POST /api/jobs/[id]/lock', jobId });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
      const duration = Math.round(performance.now() - startTime);
      if (duration > 500) {
        console.warn(`[perf:slow] POST /api/jobs/[id]/lock ${duration}ms`);
      }
    }
  }
);

/**
 * DELETE /api/jobs/[id]/lock
 * Release the lock on the job.
 * Returns 403 if the caller does not hold the lock.
 */
export const DELETE = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ALLOWED_ROLES,
  },
  async (_req: NextRequest, { user, params }: ProtectedContext): Promise<NextResponse> => {
    const startTime = performance.now();
    const jobId = params.id;
    try {
      // Verify caller holds the lock before releasing
      const holdsLock = await isJobLockedByUser(jobId, user.id);
      if (!holdsLock) {
        return NextResponse.json(
          { error: 'You do not hold the lock for this job' },
          { status: 403 }
        );
      }

      const { error } = await releaseJobLock(jobId, user.id);

      if (error) {
        captureError(error, { route: 'DELETE /api/jobs/[id]/lock', jobId, userId: user.id });
        return NextResponse.json({ error: 'Failed to release lock' }, { status: 500 });
      }

      return NextResponse.json({ released: true });
    } catch (error) {
      captureError(error, { route: 'DELETE /api/jobs/[id]/lock', jobId });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    } finally {
      const duration = Math.round(performance.now() - startTime);
      if (duration > 500) {
        console.warn(`[perf:slow] DELETE /api/jobs/[id]/lock ${duration}ms`);
      }
    }
  }
);

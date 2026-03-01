// =============================================================================
// JOB QUEUE API ROUTE
// =============================================================================
// API endpoints for job queue management
// POST: Enqueue a new job
// GET: Get queue statistics or job status
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import {
  enqueueJob,
  getJobStatus,
  getQueueStats,
} from '@/lib/jobs/queue';
import { JobType } from '@/lib/jobs/types';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const enqueueJobSchema = z.object({
  type: z.nativeEnum(JobType),
  payload: z.record(z.string(), z.unknown()),
  options: z.object({
    priority: z.number().optional(),
    maxAttempts: z.number().optional(),
    delay: z.number().optional(),
    idempotencyKey: z.string().optional(),
  }).optional(),
});

// =============================================================================
// POST - Enqueue Job
// =============================================================================

const postQueueHandler = async (request: NextRequest, { user }: ProtectedContext) => {
  // Only admins and certain roles can enqueue jobs directly
  if (!['ADMIN', 'REPORTER', 'COURT_REPORTER'].includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { type, payload } = enqueueJobSchema.parse(body);

    const job = await enqueueJob(type, payload);

    return NextResponse.json({
      success: true,
      job: {
        id: job,
        type: type,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Failed to enqueue job:', error);
    return NextResponse.json(
      { error: 'Failed to enqueue job' },
      { status: 500 }
    );
  }
};

// =============================================================================
// GET - Queue Stats or Job Status
// =============================================================================

const getQueueHandler = async (request: NextRequest, { user }: ProtectedContext) => {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  try {
    // If jobId provided, get specific job status
    if (jobId) {
      const job = await getJobStatus(jobId);

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ job });
    }

    // Otherwise, return queue statistics (admin only)
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const stats = await getQueueStats();

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Failed to get queue info:', error);
    return NextResponse.json(
      { error: 'Failed to get queue info' },
      { status: 500 }
    );
  }
};

export const POST = withRouteProtection(
  { requireAuth: true, enforceTenant: true },
  postQueueHandler
);

export const GET = withRouteProtection(
  { requireAuth: true, enforceTenant: true },
  getQueueHandler
);


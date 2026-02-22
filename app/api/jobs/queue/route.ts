// =============================================================================
// JOB QUEUE API ROUTE
// =============================================================================
// API endpoints for job queue management
// POST: Enqueue a new job
// GET: Get queue statistics or job status
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { UserRole } from '@/lib/enums/roles';
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

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Only admins and certain roles can enqueue jobs directly
  if (!['ADMIN', 'REPORTER', 'COURT_REPORTER'].includes(currentUser.role as string)) {
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
}

// =============================================================================
// GET - Queue Stats or Job Status
// =============================================================================

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

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
    if (currentUser.role !== UserRole.ADMIN) {
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
}


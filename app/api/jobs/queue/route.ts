// =============================================================================
// JOB QUEUE API ROUTE
// =============================================================================
// API endpoints for job queue management
// POST: Enqueue a new job
// GET: Get queue statistics or job status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/enums';
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
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Only admins and certain roles can enqueue jobs directly
  if (![UserRole.ADMIN, UserRole.REPORTER].includes(session.user.role as UserRole)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json();
    const { type, payload, options } = enqueueJobSchema.parse(body);
    
    const job = await enqueueJob(type, payload, options);
    
    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
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
  const session = await auth();
  
  if (!session?.user) {
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
    if (session.user.role !== UserRole.ADMIN) {
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

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { enqueueJob, getJobStatus, type JobData } from '@/lib/jobs';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// POST /api/queue - Enqueue a background job
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: JobData = await request.json();

    // Validate job data
    if (!body.type || !body.payload) {
      return NextResponse.json(
        { error: 'Invalid job data: type and payload required' },
        { status: 400 },
      );
    }

    // Enqueue the job
    const job = await enqueueJob({
      ...body,
      userId: session.user.id,
    });

    logger.info(`Job enqueued - jobId: ${job.id}, type: ${body.type}, userId: ${session.user.id}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
    });

  } catch (error) {
    logger.error(`Failed to enqueue job - error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to enqueue job' },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/queue?jobId=xxx - Get job status
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter required' },
        { status: 400 },
      );
    }

    const job = await getJobStatus(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error) {
    logger.error(`Failed to get job status - error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 },
    );
  }
}

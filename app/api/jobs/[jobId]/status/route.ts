// =============================================================================
// JOB STATUS API
// app/api/jobs/[jobId]/status/route.ts
//
// Get transcription job status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/jobs/[jobId]/status
 * Get job status and transcription progress
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;
    const user = session.user as { id: string; role: string };

    // Get job with transcription
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        transcription: {
          select: {
            id: true,
            status: true,
            wordCount: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check access
    if (
      user.role !== 'ADMIN' &&
      job.createdById !== user.id &&
      job.scopistId !== user.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Determine status and progress
    let status = job.status;
    let progress: number | undefined;
    let transcriptId: string | undefined;

    if (job.transcription) {
      status = job.transcription.status;
      transcriptId = job.transcription.id;
      
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

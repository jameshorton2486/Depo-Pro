// =============================================================================
// FINALIZE TRANSCRIPT API
// app/api/transcripts/[id]/finalize/route.ts
//
// Finalize a transcript (lock it)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/transcripts/[id]/finalize
 * Finalize a transcript
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const user = session.user as { id: string; role: string };

    // Get job with transcription
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        transcription: true,
      },
    });

    if (!job || !job.transcription) {
      return NextResponse.json(
        { error: 'Transcript not found' },
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

    // Check if already finalized
    if (job.transcription.status === 'FINALIZED' || job.transcription.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'Transcript already finalized' },
        { status: 400 }
      );
    }

    // Finalize the transcript
    // Update transcription status to COMPLETED (which represents finalized)
    await db.transcription.update({
      where: { id: job.transcription.id },
      data: {
        status: 'COMPLETED',
        lockedAt: new Date(),
        lockedBy: user.id,
        lockReason: 'Finalized by user',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Transcript finalized successfully',
    });
  } catch (error) {
    console.error('Error finalizing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to finalize transcript' },
      { status: 500 }
    );
  }
}

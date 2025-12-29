// app/api/jobs/[id]/transcribe/route.ts
// Trigger transcription for a job

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/jobs/queue';
import { JobType, TranscriptionJobPayload } from '@/lib/jobs/types';
import { checkCombinedRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; firmId?: string };
    const { id: jobId } = await context.params;

    // Rate limit check
    if (user.firmId) {
      const rateLimit = checkCombinedRateLimit(
        user.id,
        user.firmId,
        'TRANSCRIPTION',
        'TRANSCRIPTION'
      );

      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.userResult);
      }
    }

    // Get request body for model selection (optional)
    const body = await request.json().catch(() => ({}));
    const modelPreference = body.modelPreference || 'nova-3';

    // Fetch job with files
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        files: {
          where: {
            OR: [
              { type: 'AUDIO' },
              { mimeType: { startsWith: 'audio/' } },
              { mimeType: { startsWith: 'video/' } },
            ],
          },
        },
        case: {
          select: {
            id: true,
            firmId: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = job.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSameFirm = (job.firmId && job.firmId === user.firmId) || (job.case?.firmId && job.case?.firmId === user.firmId);

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for audio file
    const audioFile = job.files.find(
      (f) => f.type === 'AUDIO' || f.mimeType?.startsWith('audio/') || f.mimeType?.startsWith('video/'),
    );

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file found for this job' },
        { status: 400 },
      );
    }

    // Check if already processing
    if (job.status === 'TRANSCRIBING' || job.status === 'AI_REVIEWING') {
      return NextResponse.json(
        { error: 'Transcription already in progress' },
        { status: 409 },
      );
    }

    // Update job status to TRANSCRIBING
    await db.job.update({
      where: { id: jobId },
      data: {
        status: 'TRANSCRIBING',
      },
    });

    // Enqueue transcription job
    await enqueueJob<TranscriptionJobPayload>(
      JobType.TRANSCRIPTION_PROCESS,
      {
        jobId,
        audioFileUrl: audioFile.storageUrl || audioFile.storagePath,
        firmId: job.firmId || job.case?.firmId || '',
        userId: user.id,
        options: {
          language: 'en',
          diarize: true,
          punctuate: true,
          modelPreference,
        },
      },
      {
        priority: 1,
        maxAttempts: 3,
        idempotencyKey: `transcription:${jobId}`,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Transcription queued successfully',
      jobId,
      modelPreference,
    });

  } catch (error) {
    console.error('Error triggering transcription:', error);
    return NextResponse.json(
      { error: 'Failed to trigger transcription' },
      { status: 500 },
    );
  }
}

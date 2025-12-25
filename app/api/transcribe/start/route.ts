import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';
import { transcriptionQueue } from '@/lib/queue/transcription-queue';
import { logger, withRequestLogging } from '@/lib/observability';
import { checkRateLimit } from '@/lib/security';

const startSchema = z.object({
  audioFileUrl: z.string().url(),
  jobId: z.string(),
  options: z.object({
    language: z.string().optional(),
    model: z.string().optional(),
    smartFormat: z.boolean().optional(),
  }).optional(),
});

async function postTranscribeStartHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_TRANSCRIPTION');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many transcription requests' }, { status: 429 });
    }

    const body = await request.json();
    const validated = startSchema.parse(body);

    logger.info('Starting transcription', {
      jobId: validated.jobId,
      userId: session.user.id,
      options: validated.options,
    });

    // Verify job exists and user has access
    const job = await prisma.job.findUnique({
      where: { id: validated.jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.createdById !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update job status
    await prisma.job.update({
      where: { id: validated.jobId },
      data: {
        status: JobStatus.FILES_UPLOADED,
      },
    });

    // Add to queue
    await transcriptionQueue.add('transcribe', {
      jobId: validated.jobId,
      audioFileId: validated.jobId, // Use jobId as fileId for now
      audioFileUrl: validated.audioFileUrl,
      audioFileName: 'audio', // We might want to get this from the file URL or metadata
      firmId: (session.user as any).firmId || '',
      userId: session.user.id,
      modelType: (validated.options?.model as 'STANDARD' | 'MEDICAL' | 'BILINGUAL') || 'MEDICAL',
    });

    logger.info('Transcription added to queue', { jobId: validated.jobId });

    return NextResponse.json({
      message: 'Transcription started',
      jobId: validated.jobId,
    }, { status: 200 });
  } catch (error) {
    logger.error('Transcription start error', error as Error, {
      userId: (await auth())?.user?.id,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to start transcription' },
      { status: 500 },
    );
  }
}

export const POST = withRequestLogging(postTranscribeStartHandler);

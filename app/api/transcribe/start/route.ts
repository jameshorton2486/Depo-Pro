import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';
import { transcriptionQueue } from '@/lib/queue/transcription-queue';

const startSchema = z.object({
  audioFileUrl: z.string().url(),
  jobId: z.string(),
  options: z.object({
    language: z.string().optional(),
    model: z.string().optional(),
    smartFormat: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = startSchema.parse(body);

    // Verify job exists and user has access
    const job = await prisma.job.findUnique({
      where: { id: validated.jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.createdById !== session.user.id) {
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
      firmId: '', // Not used in MVP
      userId: session.user.id,
      modelType: (validated.options?.model as 'STANDARD' | 'MEDICAL' | 'BILINGUAL') || 'MEDICAL',
    });

    return NextResponse.json({
      message: 'Transcription started',
      jobId: validated.jobId,
    }, { status: 200 });
  } catch (error) {
    console.error('Transcription start error:', error);

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

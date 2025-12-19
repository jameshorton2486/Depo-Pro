// app/api/jobs/[id]/transcribe/route.ts
// Trigger transcription for a job

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { processTranscriptionJob } from '@/lib/workers/transcription-worker';
import type { TranscriptionJobData } from '@/types/deepgram';
import { DeepgramModelType } from '@/lib/transcription/config';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; firmId?: string };
    const { id: jobId } = await context.params;

    // Get request body for model selection
    const body = await request.json().catch(() => ({}));
    const modelType: DeepgramModelType = body.modelType || 'MEDICAL';

    // Fetch job with files
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        files: {
          where: {
            type: 'AUDIO',
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
    const isSameFirm = job.firmId === user.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for audio file
    const audioFile = job.files[0];
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file found for this job' },
        { status: 400 }
      );
    }

    // Check if already processing
    if (job.status === 'TRANSCRIBING') {
      return NextResponse.json(
        { error: 'Transcription already in progress' },
        { status: 409 }
      );
    }

    // Update job status to TRANSCRIBING
    await prisma.job.update({
      where: { id: jobId },
      data: { 
        status: 'TRANSCRIBING',
        transcriptionModelType: modelType,
      },
    });

    // Prepare job data
    const jobData: TranscriptionJobData = {
      jobId,
      audioFileId: audioFile.id,
      audioFileUrl: audioFile.storageUrl || audioFile.storagePath,
      audioFileName: audioFile.fileName,
      firmId: job.firmId || '',
      userId: user.id,
      modelType,
    };

    // Start transcription in background
    processTranscriptionJob(jobData).catch((error) => {
      console.error('Background transcription failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Transcription queued successfully',
      jobId,
      modelType,
    });

  } catch (error) {
    console.error('Error triggering transcription:', error);
    return NextResponse.json(
      { error: 'Failed to trigger transcription' },
      { status: 500 }
    );
  }
}

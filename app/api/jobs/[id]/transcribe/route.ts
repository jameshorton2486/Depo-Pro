// app/api/jobs/[id]/transcribe/route.ts
// Trigger transcription for a job

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/jobs/queue';
import { JobType, TranscriptionJobPayload as _TranscriptionJobPayload } from '@/lib/jobs/types';
import { checkCombinedRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';
import { AudioEnhancementService } from '@/lib/services/audio-enhancement-service';
import type { AudioProcessingMode } from '@/lib/services/audio-enhancement-service';

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
      (f: { type?: string; mimeType?: string }) => f.type === 'AUDIO' || f.mimeType?.startsWith('audio/') || f.mimeType?.startsWith('video/'),
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

    // Get processing mode from job's internalNotes
    let processingMode: AudioProcessingMode = 'AUTOMATED';
    let modelTier: 'STANDARD' | 'ENHANCED' = 'STANDARD';
    
    if (job.internalNotes) {
      try {
        const notes = JSON.parse(job.internalNotes);
        if (notes.processingMode) {
          processingMode = notes.processingMode.mode || 'AUTOMATED';
          modelTier = notes.processingMode.modelTier || 'STANDARD';
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }

    // Check processing mode and route accordingly
    if (processingMode === 'MANUAL_RX') {
      // Add job to RX queue instead of starting transcription
      const queueResult = await AudioEnhancementService.addToRxQueue({
        jobId,
        audioUrl: audioFile.storageUrl || audioFile.storagePath,
        priority: 'NORMAL',
      });

      if (!queueResult.success) {
        return NextResponse.json(
          { error: queueResult.error || 'Failed to add to RX queue' },
          { status: 500 },
        );
      }

      // Update job status
      await db.job.update({
        where: { id: jobId },
        data: {
          status: 'ENHANCING_AUDIO',
          internalNotes: JSON.stringify({
            ...(job.internalNotes ? JSON.parse(job.internalNotes) : {}),
            rxQueueAdded: true,
            rxQueuePosition: queueResult.queuePosition,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Job added to RX queue for manual processing',
        jobId,
        queuePosition: queueResult.queuePosition,
      });
    }

    // Automated mode: proceed with Dolby enhancement and transcription
    // Update job status to ENHANCING_AUDIO (will be updated to TRANSCRIBING after enhancement)
    await db.job.update({
      where: { id: jobId },
      data: {
        status: 'ENHANCING_AUDIO',
      },
    });

    // Start automated enhancement
    const enhancementResult = await AudioEnhancementService.enhanceWithDolby(
      audioFile.storageUrl || audioFile.storagePath,
      {},
    );

    if (!enhancementResult.success) {
      // Enhancement failed, but we can still try transcription
      console.error('Enhancement failed, proceeding with original audio:', enhancementResult.error);
    }

    // Determine model preference based on tier
    const modelPreference = modelTier === 'ENHANCED' 
      ? 'nova-2-medical' 
      : body.modelPreference || 'nova-3';

    // Update job status to TRANSCRIBING
    await db.job.update({
      where: { id: jobId },
      data: {
        status: 'TRANSCRIBING',
      },
    });

    // Enqueue transcription job with enhanced audio URL (or original if enhancement failed)
    const audioUrlForTranscription = enhancementResult.success && enhancementResult.enhancedFileUrl
      ? enhancementResult.enhancedFileUrl
      : audioFile.storageUrl || audioFile.storagePath;

    await enqueueJob(
      JobType.TRANSCRIPTION_PROCESS,
      {
        jobId,
        audioFileUrl: audioUrlForTranscription,
        firmId: job.firmId || job.case?.firmId || '',
        userId: user.id,
        options: {
          language: 'en',
          diarize: true,
          punctuate: true,
          modelPreference,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Transcription queued successfully',
      jobId,
      modelPreference,
      processingMode,
      enhancementApplied: enhancementResult.success,
    });

  } catch (error) {
    console.error('Error triggering transcription:', error);
    return NextResponse.json(
      { error: 'Failed to trigger transcription' },
      { status: 500 },
    );
  }
}

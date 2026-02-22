// app/api/jobs/[id]/transcribe/route.ts
// Trigger transcription for a job

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById, updateJobStatus, updateJob } from '@/lib/supabase/queries/jobs';
import { listFilesForJob } from '@/lib/supabase/queries/files';
import { checkCombinedRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';
import { AudioEnhancementService } from '@/lib/services/audio-enhancement-service';
import type { AudioProcessingMode } from '@/lib/services/audio-enhancement-service';
import { processTranscriptionJob } from '@/lib/transcription/pipeline';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = currentUser as { id: string; role: string; firmId?: string };
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

    const supabase = await createSupabaseServerClient();

    // Fetch job
    const job = await getJobById(supabase, jobId, {
      includeFiles: true,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = (job as any).created_by_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    const jobFirmId = (job as any).firm_id || (job as any).firmId;
    const isSameFirm = jobFirmId && jobFirmId === user.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get files for job
    const files = await listFilesForJob(supabase, jobId);

    // Check for audio file
    const audioFile = files.find(
      (f: any) => f.type === 'AUDIO' || f.mime_type?.startsWith('audio/') || f.mime_type?.startsWith('video/'),
    );

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file found for this job' },
        { status: 400 },
      );
    }

    const jobStatus = (job as any).status;
    // Check if already processing
    if (jobStatus === 'TRANSCRIBING' || jobStatus === 'AI_REVIEWING') {
      return NextResponse.json(
        { error: 'Transcription already in progress' },
        { status: 409 },
      );
    }

    // Get processing mode from job's internalNotes
    let processingMode: AudioProcessingMode = 'AUTOMATED';
    let modelTier: 'STANDARD' | 'ENHANCED' = 'STANDARD';

    const internalNotes = (job as any).internal_notes || (job as any).internalNotes;
    if (internalNotes) {
      try {
        const notes = typeof internalNotes === 'string' ? JSON.parse(internalNotes) : internalNotes;
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
        audioUrl: audioFile.storage_url || audioFile.storage_path || audioFile.storageUrl || audioFile.storagePath,
        priority: 'NORMAL',
      });

      if (!queueResult.success) {
        return NextResponse.json(
          { error: queueResult.error || 'Failed to add to RX queue' },
          { status: 500 },
        );
      }

      // Update job status
      await updateJob(supabase, jobId, {
        status: 'ENHANCING_AUDIO',
        internal_notes: JSON.stringify({
          ...(internalNotes ? (typeof internalNotes === 'string' ? JSON.parse(internalNotes) : internalNotes) : {}),
          rxQueueAdded: true,
          rxQueuePosition: queueResult.queuePosition,
        }),
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
    await updateJobStatus(supabase, jobId, 'ENHANCING_AUDIO');

    // Start automated enhancement
    const enhancementResult = await AudioEnhancementService.enhanceWithDolby(
      audioFile.storage_url || audioFile.storage_path || audioFile.storageUrl || audioFile.storagePath,
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
    await updateJobStatus(supabase, jobId, 'TRANSCRIBING');

    // Determine audio URL for transcription (enhanced or original)
    const audioUrlForTranscription = enhancementResult.success && enhancementResult.enhancedFileUrl
      ? enhancementResult.enhancedFileUrl
      : audioFile.storage_url || audioFile.storage_path || audioFile.storageUrl || audioFile.storagePath;

    // Start transcription pipeline (async, fire and forget)
    setImmediate(() => {
      processTranscriptionJob(jobId, audioUrlForTranscription).catch((error) => {
        console.error(`Pipeline error for job ${jobId}:`, error);
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Transcription started successfully',
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



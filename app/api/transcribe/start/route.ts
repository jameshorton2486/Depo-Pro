import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { z } from 'zod';
import { getTranscriptionQueue } from '@/lib/queue/transcription-queue';
import { logger } from '@/lib/logger';
import { getJobForTranscription, markJobFilesUploaded } from '@/lib/supabase/queries/transcription';

// Simple request logging wrapper (replaces withRequestLogging)
const withRequestLogging = <T extends (...args: any[]) => any>(fn: T): T => {
  return ((...args: any[]) => {
    logger.info('Request started', { path: args[0]?.url });
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.then(
          (res) => {
            logger.info('Request completed', { path: args[0]?.url });
            return res;
          },
          (err) => {
            logger.error('Request failed', err as Error);
            throw err;
          }
        );
      }
      logger.info('Request completed', { path: args[0]?.url });
      return result;
    } catch (err) {
      logger.error('Request failed', err as Error);
      throw err;
    }
  }) as T;
};
import { checkRateLimit } from '@/lib/security';

// Build-time guard
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

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
  // Guard against build-time execution
  if (isBuildPhase) {
    return NextResponse.json({ error: 'Service unavailable during build' }, { status: 503 });
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(currentUser.id, 'API_TRANSCRIPTION');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many transcription requests' }, { status: 429 });
    }

    const body = await request.json();
    const validated = startSchema.parse(body);

    logger.info('Starting transcription', {
      jobId: validated.jobId,
      userId: currentUser.id,
      options: validated.options,
    });

    // Verify job exists and user has access via query layer
    const job = await getJobForTranscription(validated.jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.created_by_id !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get queue (may be null if Redis unavailable)
    const queue = getTranscriptionQueue();
    if (!queue) {
      logger.warn('Transcription queue not available');
      return NextResponse.json(
        { error: 'Transcription service temporarily unavailable' },
        { status: 503 },
      );
    }

    // Update job status via query layer (behavior preserved: errors are not surfaced)
    await markJobFilesUploaded(validated.jobId);

    // Add to queue
    await queue.add('transcribe', {
      jobId: validated.jobId,
      audioFileId: validated.jobId, // Use jobId as fileId for now
      audioFileUrl: validated.audioFileUrl,
      audioFileName: 'audio', // We might want to get this from the file URL or metadata
      firmId: (currentUser as { firmId?: string }).firmId || '',
      userId: currentUser.id,
      modelType: (validated.options?.model as 'STANDARD' | 'MEDICAL' | 'BILINGUAL') || 'MEDICAL',
    });

    logger.info('Transcription added to queue', { jobId: validated.jobId });

    return NextResponse.json({
      message: 'Transcription started',
      jobId: validated.jobId,
    }, { status: 200 });
  } catch (error) {
    logger.error('Transcription start error', error as Error, {
      userId: (await getCurrentUser())?.id,
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






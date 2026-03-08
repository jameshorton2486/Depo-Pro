// =============================================================================
// WEBHOOK RECEIVER API ROUTE
// =============================================================================
// Receives incoming webhooks from external services
// Example: Deepgram transcription callbacks
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateJobStatus } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId, createTranscript, updateTranscript } from '@/lib/supabase/queries/transcripts';
import { logger } from '@/lib/logger';
import { verifyWebhookRequest } from '@/lib/webhooks/sign';
import { JobStatus } from '@/lib/enums';
import { invalidateDashboardCache } from '@/lib/cache';

// =============================================================================
// DEEPGRAM WEBHOOK
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  logger.info('Webhook received', { provider });

  try {
    const body = await request.text();

    // Route to appropriate handler
    switch (provider) {
      case 'deepgram':
        return handleDeepgramWebhook(body, request.headers);

      case 'stripe':
        return handleStripeWebhook(body, request.headers);

      default:
        return NextResponse.json(
          { error: 'Unknown webhook provider' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Webhook processing failed', error as Error, { provider });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DEEPGRAM WEBHOOK HANDLER
// =============================================================================

async function handleDeepgramWebhook(
  body: string,
  headers: Headers
): Promise<NextResponse> {
  // FAIL-CLOSED: Verify signature — reject ALL requests if secret is missing
  const deepgramSecret = process.env.DEEPGRAM_WEBHOOK_SECRET;

  if (!deepgramSecret) {
    logger.error('DEEPGRAM_WEBHOOK_SECRET not configured — rejecting all webhook requests');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const result = verifyWebhookRequest(body, headers, deepgramSecret);
  if (!result.valid) {
    logger.warn('Invalid Deepgram webhook signature', { error: result.error });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // Extract job ID from metadata
  const jobId = payload.metadata?.jobId;

  if (!jobId) {
    logger.warn('Deepgram webhook missing jobId');
    return NextResponse.json(
      { error: 'Missing jobId in metadata' },
      { status: 400 }
    );
  }

  // Handle different event types
  const eventType = payload.type || 'transcription.completed';

  switch (eventType) {
    case 'transcription.completed': {
      const results = payload.results;

      if (!results?.channels?.[0]?.alternatives?.[0]) {
        logger.error('Invalid Deepgram response structure', undefined, { jobId });
        return NextResponse.json(
          { error: 'Invalid response structure' },
          { status: 400 }
        );
      }

      const transcript = results.channels[0].alternatives[0];
      const words = transcript.words || [];

      const supabase = await createSupabaseServerClient();

      // Check if transcript exists for this job
      const existingTranscript = await getTranscriptByJobId(supabase, jobId);

      const transcriptData = {
        job_id: jobId,
        full_transcript: transcript.transcript,
        word_count: words.length,
        average_confidence: transcript.confidence,
        words: words as any,
        utterances: (results.utterances || []) as any,
        status: 'COMPLETED',
      };

      // Upsert transcription
      if (existingTranscript) {
        await updateTranscript(supabase, existingTranscript.id, transcriptData);
      } else {
        await createTranscript(supabase, {
          ...transcriptData,
          created_by_id: existingTranscript?.created_by_id || '', // Would need job creator
        });
      }

      // Update job status
      await updateJobStatus(supabase, jobId, JobStatus.READY_FOR_EDIT);

      // Invalidate caches
      invalidateDashboardCache();

      logger.info('Deepgram transcription completed', {
        jobId,
        wordCount: words.length,
        confidence: transcript.confidence,
      });

      break;
    }

    case 'transcription.failed': {
      const supabase = await createSupabaseServerClient();

      await updateJobStatus(supabase, jobId, JobStatus.CANCELLED);

      // Update transcript status if exists
      const existingTranscript = await getTranscriptByJobId(supabase, jobId);
      if (existingTranscript) {
        await updateTranscript(supabase, existingTranscript.id, {
          status: 'ERROR',
        }).catch((error: any) => {
          logger.warn('Failed to mark transcript as error', {
            jobId,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }

      logger.error('Deepgram transcription failed', new Error(String(payload.error)), { jobId });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// =============================================================================
// STRIPE WEBHOOK HANDLER
// =============================================================================
// Stripe webhooks should use /api/webhooks/stripe directly.
// This handler rejects to prevent unverified processing via the [provider] route.

async function handleStripeWebhook(
  _body: string,
  _headers: Headers
): Promise<NextResponse> {
  logger.warn('Stripe webhook hit [provider] route — should use /api/webhooks/stripe');
  return NextResponse.json(
    { error: 'Use /api/webhooks/stripe endpoint' },
    { status: 400 }
  );
}

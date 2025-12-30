// =============================================================================
// TRANSCRIPTION JOB HANDLER
// =============================================================================
// Handles async transcription processing
// =============================================================================

import { db as prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { JobStatus } from '@/lib/enums';
import { invalidateDashboardCache } from '@/lib/cache';
import { dispatchWebhook } from '@/lib/webhooks';
import { incrementUsage } from '@/lib/cost-control-service';
import { lockTranscript } from '@/lib/transcript-locking';
import {
  JobType,
  JobHandler,
  QueueJob,
  TranscriptionJobPayload,
} from '../types';
import { registerHandler } from '../queue';

// =============================================================================
// HANDLER IMPLEMENTATION
// =============================================================================

const transcriptionHandler: JobHandler<TranscriptionJobPayload> = {
  type: JobType.TRANSCRIPTION_PROCESS,
  
  async handle(job: QueueJob<TranscriptionJobPayload>) {
    const { jobId, audioFileUrl, firmId, userId, options } = job.payload;
    
    logger.info('Processing transcription job', { jobId, audioFileUrl });
    
    // Update job status to TRANSCRIBING
    await prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.TRANSCRIBING },
    });
    
    try {
      // Import transcription service dynamically to avoid circular deps
      const { transcribeFromUrl } = await import('@/lib/transcription');
      
      // Perform transcription
      const result = await transcribeFromUrl(audioFileUrl, {
        modelPreference: (options?.modelPreference as any) || 'nova-3',
      });
      
      // Create or update core transcription data
      const transcription = await prisma.transcription.upsert({
        where: { jobId },
        create: {
          jobId,
          fullTranscript: result.transcript,
          wordCount: result.words?.length || 0,
          averageConfidence: result.confidence,
          words: (result.words || []) as any,
          utterances: (result.utterances || []) as any,
          status: 'COMPLETED',
        },
        update: {
          fullTranscript: result.transcript,
          wordCount: result.words?.length || 0,
          averageConfidence: result.confidence,
          words: (result.words || []) as any,
          utterances: (result.utterances || []) as any,
          status: 'COMPLETED',
        },
      });
      
      // Auto-lock transcript after AI completion (Phase 9)
      await lockTranscript(transcription.id, 'system', 'ai_complete').catch((err) => {
        logger.error('Failed to lock transcript after AI completion', err as Error, { 
          transcriptionId: transcription.id
        });
      });
      
      // Update job status
      await prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.READY_FOR_EDIT },
      });
      
      // Track usage (estimate duration from word count)
      if (firmId) {
        // Estimate: average speaking rate is ~150 words/min, so duration ≈ wordCount / 150
        // Use the last word's end time if available, otherwise estimate
        const wordCount = result.words?.length || 0;
        let durationSeconds = 0;
        
        if (wordCount > 0 && result.words) {
          // Get duration from last word's end time
          const lastWord = result.words[result.words.length - 1];
          durationSeconds = lastWord.end || 0;
        }
        
        // Fallback to estimation if no duration available
        const durationMinutes = durationSeconds > 0 
          ? Math.ceil(durationSeconds / 60)
          : Math.ceil(wordCount / 150);
        
        if (durationMinutes > 0) {
          await incrementUsage(firmId, 'transcriptionMinutes', durationMinutes).catch((err) => {
            logger.error('Failed to track transcription usage', err as Error, { firmId, durationMinutes });
          });
        }
      }
      
      // Invalidate caches
      invalidateDashboardCache();
      
      // Dispatch webhook
      await dispatchWebhook('job.transcription.completed', {
        jobId,
        firmId,
        userId,
        wordCount: result.words?.length || 0,
        confidence: result.confidence,
      });
      
      logger.info('Transcription completed', {
        jobId,
        wordCount: result.words?.length,
        confidence: result.confidence,
      });
      
    } catch (error) {
      // Update job status to CANCELLED (or another failure state)
      await prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.CANCELLED },
      });
      
      // Update transcription status
      await prisma.transcription.update({
        where: { jobId },
        data: { status: 'ERROR' },
      }).catch(() => {}); // Ignore error if not exists
      
      // Dispatch failure webhook
      await dispatchWebhook('job.transcription.failed', {
        jobId,
        firmId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  },
  
  onError: async (job, error) => {
    logger.error('Transcription job error', error, {
      jobId: job.payload.jobId,
      attempts: job.attempts,
    });
  },
  
  shouldRetry: (job, error) => {
    // Don't retry if it's a validation error
    if (error.message.includes('Invalid audio') || 
        error.message.includes('File not found')) {
      return false;
    }
    
    // Retry for transient errors
    return job.attempts < job.maxAttempts;
  },
};

// =============================================================================
// REGISTER HANDLER
// =============================================================================

registerHandler(transcriptionHandler);

export { transcriptionHandler };

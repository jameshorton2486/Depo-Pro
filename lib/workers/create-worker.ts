// ═══════════════════════════════════════════════════════════════════════════
// TRANSCRIPTION WORKER CREATOR
// Creates BullMQ Worker instance for processing transcription jobs
// ═══════════════════════════════════════════════════════════════════════════

import { Worker } from 'bullmq';
import { processTranscriptionJob } from './transcription-worker';
import type { TranscriptionJobData } from '@/types/deepgram';
import { logger } from '@/lib/logger';

/**
 * Create and start transcription worker
 * This should be called from a separate worker process (e.g., npm run worker)
 */
export function createTranscriptionWorker(redisUrl?: string): Worker<TranscriptionJobData> | null {
  // Get Redis URL
  const connectionUrl = redisUrl || process.env.REDIS_URL;

  if (!connectionUrl) {
    logger.warn('[Worker] Redis not available - worker cannot start');
    return null;
  }

  try {
    const worker = new Worker<TranscriptionJobData>(
      'transcription',
      async (job) => {
        return await processTranscriptionJob(job);
      },
      {
        connection: {
          url: connectionUrl,
        },
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
        limiter: {
          max: parseInt(process.env.WORKER_MAX_JOBS_PER_MINUTE || '10', 10),
          duration: 60000, // 1 minute
        },
      }
    );

    worker.on('completed', (job) => {
      logger.info(`[Worker] Job ${job.id} completed`, { jobId: job.id, data: job.data.jobId });
    });

    worker.on('failed', (job, error) => {
      logger.error(
        `[Worker] Job ${job?.id} failed`,
        error instanceof Error ? error : new Error(String(error)),
        {
          jobId: job?.id,
          dataJobId: job?.data?.jobId,
          attemptsMade: job?.attemptsMade,
        }
      );
    });

    worker.on('error', (error) => {
      logger.error(
        '[Worker] Worker error',
        error instanceof Error ? error : new Error(String(error))
      );
    });

    worker.on('active', (job) => {
      logger.info(`[Worker] Job ${job.id} started processing`, { jobId: job.id, data: job.data.jobId });
    });

    logger.info('[Worker] Transcription worker started', {
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
      queue: 'transcription',
    });

    return worker;
  } catch (error) {
    logger.error('[Worker] Failed to create worker', error as Error);
    return null;
  }
}

/**
 * Helper to extract flagged words from words array
 * Extracts words with confidence below threshold
 */
export function extractFlaggedWords(
  words: Array<{ confidence?: number; word?: string; start?: number; end?: number; speaker?: number }>,
  threshold: number = 0.85
): Array<{ word: string; confidence: number; start: number; end: number; speaker: number; wordIndex: number }> {
  return words
    .map((word, index) => ({
      word: word.word || '',
      confidence: word.confidence || 0,
      start: word.start || 0,
      end: word.end || 0,
      speaker: word.speaker || 0,
      wordIndex: index,
    }))
    .filter((word) => word.confidence < threshold);
}

// =============================================================================
// TRANSCRIPTION QUEUE
// =============================================================================

import { Queue } from 'bullmq';
import type { JobsOptions } from 'bullmq';
import { getQueueConnection } from './connection';
import type { TranscriptionJobData } from '@/types/deepgram';

let queueInstance: Queue<TranscriptionJobData> | null = null;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
  },
};

/**
 * Get transcription queue (lazy initialization)
 * Returns null if REDIS_URL is not configured
 */
export function getTranscriptionQueue(): Queue<TranscriptionJobData> | null {
  if (queueInstance) {
    return queueInstance;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL not configured - transcription queue disabled');
    return null;
  }

  try {
    queueInstance = new Queue<TranscriptionJobData>(
      'transcription',
      {
        connection: getQueueConnection(),
        defaultJobOptions,
      }
    );

    return queueInstance;
  } catch (error) {
    console.error('❌ Failed to create transcription queue:', error);
    return null;
  }
}

/**
 * Direct export for convenience (lazy initialized via getter)
 */
export const transcriptionQueue = new Proxy({} as Queue<TranscriptionJobData>, {
  get(_, prop) {
    const q = getTranscriptionQueue();
    if (!q) {
      throw new Error('Transcription queue not available - REDIS_URL not configured');
    }
    return (q as unknown as Record<string | symbol, unknown>)[prop];
  },
});

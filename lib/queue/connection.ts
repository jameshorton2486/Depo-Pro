// ═══════════════════════════════════════════════════════════════════════════
// REDIS QUEUE CONNECTION
// Manages Redis connection for BullMQ
// ═══════════════════════════════════════════════════════════════════════════

import { Queue } from 'bullmq';
import type { TranscriptionJobData } from '@/types/deepgram';

let transcriptionQueue: Queue<TranscriptionJobData> | null = null;

export function getTranscriptionQueue(): Queue<TranscriptionJobData> | null {
  if (transcriptionQueue) return transcriptionQueue;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL not configured - queue features disabled');
    return null;
  }

  try {
    transcriptionQueue = new Queue<TranscriptionJobData>('transcription', {
      connection: {
        url: redisUrl,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // 7 days
        },
      },
    });

    console.log('[Queue] Transcription queue initialized');
    return transcriptionQueue;
  } catch (error) {
    console.error('[Queue] Failed to create transcription queue:', error);
    return null;
  }
}

export async function addTranscriptionJob(data: {
  jobId: string;
  audioFileUrl: string;
  audioFileName: string;
  firmId: string;
  userId: string;
  modelType?: string;
  language?: string;
  customVocabulary?: string[];
  priority?: number;
}): Promise<string | null> {
  const queue = getTranscriptionQueue();
  if (!queue) {
    console.warn('[Queue] Cannot add job - queue not available');
    return null;
  }

  try {
    const job = await queue.add('transcribe', {
      ...data,
      modelType: data.modelType || 'nova-3',
      language: data.language || 'en-US',
      priority: data.priority || 0,
    } as TranscriptionJobData, {
      priority: data.priority || 0,
      jobId: data.jobId, // Use job ID to prevent duplicates
    });

    console.log(`[Queue] Added transcription job: ${job.id}`);
    return job.id || null;
  } catch (error) {
    console.error('[Queue] Failed to add job:', error);
    return null;
  }
}

export async function getQueueMetrics() {
  const queue = getTranscriptionQueue();
  if (!queue) return null;

  try {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  } catch (error) {
    console.error('[Queue] Failed to get metrics:', error);
    return null;
  }
}

export async function closeConnections() {
  if (transcriptionQueue) {
    await transcriptionQueue.close();
    transcriptionQueue = null;
  }
}

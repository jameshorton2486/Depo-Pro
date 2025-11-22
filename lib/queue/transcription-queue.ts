import { Queue } from 'bullmq';
import { redisConnection } from '@/lib/redis';
import type { TranscriptionJobData } from '@/types/deepgram';

export const transcriptionQueue = new Queue<TranscriptionJobData>('transcription', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

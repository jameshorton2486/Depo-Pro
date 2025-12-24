import { Queue } from 'bullmq';
import { redisConnection } from '@/lib/redis';
import { _config } from './config';

// Re-export Deepgram client utilities
export { getDeepgramClient, LEGAL_TRANSCRIPTION_OPTIONS, LEGAL_VOCABULARY } from './client';

// Transcription job queue
export const transcriptionQueue = new Queue('transcription', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue event listeners
transcriptionQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

console.log('✅ Transcription queue initialized');

export default transcriptionQueue;

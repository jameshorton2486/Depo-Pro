// =============================================================================
// TRANSCRIPTION QUEUE
// lib/queue/transcription-queue.ts
//
// Build-safe BullMQ queue for transcription jobs
// Uses lazy initialization to prevent connection during build
// =============================================================================

import { Queue } from 'bullmq';
import { getRedis } from '@/lib/redis';
import type { TranscriptionJobData } from '@/types/deepgram';

// Singleton queue instance
let queue: Queue<TranscriptionJobData> | null = null;

/**
 * Check if we're in build phase
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Get transcription queue (lazy initialization)
 * Returns null during build phase or if Redis is unavailable
 */
export function getTranscriptionQueue(): Queue<TranscriptionJobData> | null {
  // Never initialize during build
  if (isBuildPhase()) {
    return null;
  }

  // Return existing queue
  if (queue) {
    return queue;
  }

  // Get Redis connection
  const redis = getRedis();
  if (!redis) {
    console.warn('⚠️ Redis not available - transcription queue disabled');
    return null;
  }

  // Create queue
  try {
    queue = new Queue<TranscriptionJobData>('transcription', {
      connection: redis,
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

    console.log('✅ Transcription queue initialized');
    return queue;
  } catch (error) {
    console.error('❌ Failed to create transcription queue:', error);
    return null;
  }
}

/**
 * Legacy export for backward compatibility
 * Creates a proxy that lazily initializes the queue
 */
export const transcriptionQueue = new Proxy({} as Queue<TranscriptionJobData>, {
  get(_, prop) {
    const q = getTranscriptionQueue();
    if (!q) {
      // Return no-op functions for common methods during build
      if (prop === 'add') {
        return async () => {
          console.warn('⚠️ Queue not available - job not added');
          return null;
        };
      }
      if (prop === 'on') {
        return () => {};
      }
      throw new Error('Transcription queue not available');
    }
    return (q as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default transcriptionQueue;

// =============================================================================
// DEEPGRAM MODULE
// lib/deepgram/index.ts
//
// Build-safe Deepgram integration with lazy queue initialization
// =============================================================================

import { Queue } from 'bullmq';
import { getRedis } from '@/lib/redis';

// Re-export Deepgram client utilities
export { getDeepgramClient, LEGAL_TRANSCRIPTION_OPTIONS, LEGAL_VOCABULARY } from './client';

// Singleton queue instance
let queue: Queue | null = null;

/**
 * Check if we're in build phase
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Get transcription queue (lazy initialization)
 */
function getQueue(): Queue | null {
  if (isBuildPhase()) {
    return null;
  }

  if (queue) {
    return queue;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    queue = new Queue('transcription', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    });

    queue.on('error', (error) => {
      console.error('❌ Queue error:', error);
    });

    console.log('✅ Transcription queue initialized');
    return queue;
  } catch (error) {
    console.error('❌ Failed to create queue:', error);
    return null;
  }
}

/**
 * Transcription queue proxy for lazy initialization
 */
export const transcriptionQueue = new Proxy({} as Queue, {
  get(_, prop) {
    const q = getQueue();
    if (!q) {
      if (prop === 'add') {
        return async () => {
          console.warn('⚠️ Queue not available');
          return null;
        };
      }
      if (prop === 'on') {
        return () => {};
      }
      return undefined;
    }
    return (q as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default transcriptionQueue;

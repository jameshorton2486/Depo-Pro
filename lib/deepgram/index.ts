// =============================================================================
// DEEPGRAM MODULE
// lib/deepgram/index.ts
//
// Build-safe Deepgram integration with lazy BullMQ queue initialization
// =============================================================================

import { Queue } from 'bullmq';

// Re-export Deepgram client utilities
export {
  getDeepgramClient,
  LEGAL_TRANSCRIPTION_OPTIONS,
  LEGAL_VOCABULARY,
} from './client';

// -----------------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------------

let queue: Queue | null = null;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Detect Next.js build phase to prevent runtime side effects
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Lazily initialize and return the transcription queue
 */
function getQueue(): Queue | null {
  // Never initialize queues during build
  if (isBuildPhase()) {
    return null;
  }

  // Return existing instance if already created
  if (queue) {
    return queue;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL not set — transcription queue disabled');
    return null;
  }

  try {
    queue = new Queue('transcription', {
      connection: {
        url: redisUrl,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60, // 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60, // 7 days
        },
      },
    });

    queue.on('error', (error) => {
      console.error('❌ Transcription queue error:', error);
    });

    console.log('✅ Transcription queue initialized');
    return queue;
  } catch (error) {
    console.error('❌ Failed to initialize transcription queue:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Lazy queue proxy
// -----------------------------------------------------------------------------

/**
 * Proxy wrapper that safely defers queue access until runtime
 */
export const transcriptionQueue = new Proxy({} as Queue, {
  get(_, prop) {
    const q = getQueue();

    if (!q) {
      // Safe no-op behavior during build or when Redis is unavailable
      if (prop === 'add') {
        return async () => {
          console.warn('⚠️ Transcription queue not available');
          return null;
        };
      }

      if (prop === 'on') {
        return () => undefined;
      }

      return undefined;
    }

    return (q as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default transcriptionQueue;

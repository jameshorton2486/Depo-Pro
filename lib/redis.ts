// =============================================================================
// REDIS CONNECTION
// lib/redis.ts
//
// Build-safe Redis connection for BullMQ
// CRITICAL: Never initializes during Next.js build phase
// =============================================================================

import { Redis } from 'ioredis';

// Singleton instance
let redis: Redis | null = null;

/**
 * Check if we're in build phase
 * During `next build`, NEXT_PHASE is set to 'phase-production-build'
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Get Redis connection (lazy initialization)
 * Returns null during build phase to prevent connection attempts
 */
export function getRedis(): Redis | null {
  // Never connect during build
  if (isBuildPhase()) {
    return null;
  }

  // Check for required config
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('⚠️ REDIS_URL not configured - queue features disabled');
    return null;
  }

  // Return existing connection if available
  if (redis) {
    return redis;
  }

  // Create new connection
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      lazyConnect: true,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Handle connection events
    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
    });

    redis.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });

    return redis;
  } catch (error) {
    console.error('❌ Failed to create Redis client:', error);
    return null;
  }
}

/**
 * Get Redis connection for BullMQ
 * Returns the Redis instance or null
 */
export function getRedisConnection(): Redis | null {
  return getRedis();
}

// Default export for compatibility
export default {
  getRedis,
  getRedisConnection,
};

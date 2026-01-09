// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK SERVICE
// Monitors system health and dependencies
// ═══════════════════════════════════════════════════════════════════════════

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    supabase: ComponentHealth;
    deepgram: ComponentHealth;
    redis: ComponentHealth;
  };
  environment: string;
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency_ms?: number;
  message?: string;
  last_check: string;
}

const startTime = Date.now();

export async function checkSupabaseHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) throw error;

    return {
      status: 'up',
      latency_ms: Date.now() - start,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }
}

export async function checkDeepgramHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      return {
        status: 'down',
        message: 'DEEPGRAM_API_KEY not configured',
        last_check: new Date().toISOString(),
      };
    }

    // Just verify the key format - don't make actual API call
    if (apiKey.length < 20) {
      return {
        status: 'degraded',
        message: 'DEEPGRAM_API_KEY appears invalid',
        last_check: new Date().toISOString(),
      };
    }

    return {
      status: 'up',
      latency_ms: Date.now() - start,
      last_check: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }
}

export async function checkRedisHealth(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return {
        status: 'degraded',
        message: 'REDIS_URL not configured - queue features disabled',
        last_check: new Date().toISOString(),
      };
    }

    // Check if queue can be initialized (tests connection config)
    try {
      const { getTranscriptionQueue } = await import('@/lib/queue/transcription-queue');
      const queue = getTranscriptionQueue();

      if (queue) {
        // Queue successfully initialized - connection config is valid
        return {
          status: 'up',
          latency_ms: Date.now() - start,
          last_check: new Date().toISOString(),
        };
      } else {
        // Connection config exists but queue couldn't be created
        return {
          status: 'degraded',
          latency_ms: Date.now() - start,
          message: 'REDIS_URL configured but queue initialization failed',
          last_check: new Date().toISOString(),
        };
      }
    } catch (redisError) {
      return {
        status: 'down',
        latency_ms: Date.now() - start,
        message: redisError instanceof Error ? redisError.message : 'Redis connection failed',
        last_check: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      last_check: new Date().toISOString(),
    };
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const [supabase, deepgram, redis] = await Promise.all([
    checkSupabaseHealth(),
    checkDeepgramHealth(),
    checkRedisHealth(),
  ]);

  const checks = { supabase, deepgram, redis };

  // Determine overall status
  const statuses = Object.values(checks).map(c => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

  if (statuses.every(s => s === 'up')) {
    overallStatus = 'healthy';
  } else if (statuses.some(s => s === 'down')) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
    environment: process.env.NODE_ENV || 'development',
  };
}

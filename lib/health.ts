// lib/health.ts
// Beta Hardening Plan - Phase 5.3: Health Check Service

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    storage: {
      status: 'ok' | 'error';
      buckets?: string[];
      error?: string;
    };
    env: {
      status: 'ok' | 'error';
      missing?: string[];
    };
    apis: {
      deepgram: { status: 'ok' | 'error'; configured: boolean };
      anthropic: { status: 'ok' | 'error'; configured: boolean };
    };
  };
}

export async function getHealthStatus(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'ok' },
      storage: { status: 'ok' },
      env: { status: 'ok' },
      apis: {
        deepgram: { status: 'ok', configured: false },
        anthropic: { status: 'ok', configured: false },
      },
    },
  };

  // Check 1: Database connectivity
  try {
    const supabase = getSupabaseAdmin();
    const dbStart = Date.now();
    const { error } = await supabase.from('firms').select('id').limit(1);
    const dbLatency = Date.now() - dbStart;

    if (error) {
      result.checks.database = {
        status: 'error',
        error: error.message,
      };
      result.status = 'unhealthy';
    } else {
      result.checks.database = {
        status: 'ok',
        latency: dbLatency,
      };
    }
  } catch (error) {
    result.checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    result.status = 'unhealthy';
  }

  // Check 2: Storage buckets
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      result.checks.storage = {
        status: 'error',
        error: error.message,
      };
      result.status = 'degraded';
    } else {
      const requiredBuckets = ['depo-audio', 'depo-files', 'depo-exports'];
      const existingBuckets = data?.map(b => b.name) || [];
      const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));

      if (missingBuckets.length > 0) {
        result.checks.storage = {
          status: 'error',
          error: `Missing buckets: ${missingBuckets.join(', ')}`,
          buckets: existingBuckets,
        };
        result.status = 'degraded';
      } else {
        result.checks.storage = {
          status: 'ok',
          buckets: existingBuckets,
        };
      }
    }
  } catch (error) {
    result.checks.storage = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    result.status = 'degraded';
  }

  // Check 3: Environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEEPGRAM_API_KEY',
    'ANTHROPIC_API_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

  if (missingEnvVars.length > 0) {
    result.checks.env = {
      status: 'error',
      missing: missingEnvVars,
    };
    result.status = 'unhealthy';
  } else {
    result.checks.env = { status: 'ok' };
  }

  // Check 4: API keys configured (not testing actual API calls to avoid costs)
  result.checks.apis.deepgram = {
    status: process.env.DEEPGRAM_API_KEY ? 'ok' : 'error',
    configured: !!process.env.DEEPGRAM_API_KEY,
  };

  result.checks.apis.anthropic = {
    status: process.env.ANTHROPIC_API_KEY ? 'ok' : 'error',
    configured: !!process.env.ANTHROPIC_API_KEY,
  };

  // Determine overall status
  if (result.checks.database.status === 'error' || result.checks.env.status === 'error') {
    result.status = 'unhealthy';
  } else if (
    result.checks.storage.status === 'error' ||
    result.checks.apis.deepgram.status === 'error' ||
    result.checks.apis.anthropic.status === 'error'
  ) {
    result.status = 'degraded';
  }

  const totalLatency = Date.now() - startTime;

  logger.info('[health] Health check completed', {
    status: result.status,
    latency: totalLatency,
  });

  return result;
}

/**
 * Simple check for database connectivity only
 */
export async function checkDatabase(): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('firms').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Check if all required environment variables are set
 */
export function checkEnvironment(): { valid: boolean; missing: string[] } {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEEPGRAM_API_KEY',
    'ANTHROPIC_API_KEY',
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);
  return {
    valid: missing.length === 0,
    missing,
  };
}

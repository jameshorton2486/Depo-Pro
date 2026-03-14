import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

type ServiceState = 'healthy' | 'unhealthy';

interface TimedServiceResult {
  status: ServiceState;
  latencyMs?: number;
  error?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  services: {
    database: TimedServiceResult;
    deepgram: TimedServiceResult;
    anthropic: TimedServiceResult;
    storage: TimedServiceResult;
  };
}

const HEALTH_TIMEOUT_MS = 3500;
const APP_VERSION = '0.1.0';

async function withTimeout<T>(promiseFactory: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function checkDatabaseService(): Promise<TimedServiceResult> {
  const start = Date.now();
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('firms').select('id').limit(1);

    if (error) {
      return { status: 'unhealthy', latencyMs: Date.now() - start, error: error.message };
    }

    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

async function checkDeepgramService(): Promise<TimedServiceResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return { status: 'unhealthy', error: 'Missing DEEPGRAM_API_KEY' };
  }

  const start = Date.now();
  try {
    const response = await withTimeout((signal) =>
      fetch('https://api.deepgram.com/v1/projects', {
        method: 'GET',
        headers: {
          Authorization: `Token ${apiKey}`,
        },
        signal,
      }),
    );

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: `Deepgram responded with ${response.status}`,
      };
    }

    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown Deepgram error',
    };
  }
}

async function checkAnthropicService(): Promise<TimedServiceResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { status: 'unhealthy', error: 'Missing ANTHROPIC_API_KEY' };
  }

  const start = Date.now();
  try {
    const response = await withTimeout((signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ok' }],
        }),
        signal,
      }),
    );

    if (!response.ok) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: `Anthropic responded with ${response.status}`,
      };
    }

    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown Anthropic error',
    };
  }
}

async function checkStorageService(): Promise<TimedServiceResult> {
  const start = Date.now();
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.getBucket('depo-audio');

    if (error) {
      return { status: 'unhealthy', latencyMs: Date.now() - start, error: error.message };
    }

    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
}

function summarizeStatus(services: HealthCheckResult['services']): HealthCheckResult['status'] {
  const states = Object.values(services).map((s) => s.status);
  if (states.every((state) => state === 'healthy')) {
    return 'healthy';
  }
  const unhealthyCount = states.filter((s) => s === 'unhealthy').length;
  if (services.database.status === 'unhealthy' || unhealthyCount >= 3) {
    return 'unhealthy';
  }
  return 'degraded';
}

export async function getHealthStatus(): Promise<HealthCheckResult> {
  const [databaseResult, deepgramResult, anthropicResult, storageResult] = await Promise.allSettled([
    checkDatabaseService(),
    checkDeepgramService(),
    checkAnthropicService(),
    checkStorageService(),
  ]);

  function resolve(result: PromiseSettledResult<TimedServiceResult>, label: string): TimedServiceResult {
    return result.status === 'fulfilled'
      ? result.value
      : { status: 'unhealthy' as const, error: result.reason instanceof Error ? result.reason.message : `${label} check failed` };
  }

  const services = {
    database: resolve(databaseResult, 'Database'),
    deepgram: resolve(deepgramResult, 'Deepgram'),
    anthropic: resolve(anthropicResult, 'Anthropic'),
    storage: resolve(storageResult, 'Storage'),
  };

  const health: HealthCheckResult = {
    status: summarizeStatus(services),
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'unknown',
    uptime_seconds: Math.floor(process.uptime()),
    services,
  };

  logger.info('[health] Health check completed', {
    status: health.status,
    db: services.database.status,
    deepgram: services.deepgram.status,
    anthropic: services.anthropic.status,
    storage: services.storage.status,
  });

  return health;
}

export async function checkDatabase(): Promise<boolean> {
  const result = await checkDatabaseService();
  return result.status === 'healthy';
}

export function checkEnvironment(): { valid: boolean; missing: string[] } {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEEPGRAM_API_KEY',
    'ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_APP_URL',
    'CRON_SECRET',
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  return {
    valid: missing.length === 0,
    missing,
  };
}

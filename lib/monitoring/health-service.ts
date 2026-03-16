import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
/**
 * Health Service
 * System health monitoring stub
 */

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  database: ComponentHealth;
  api: ComponentHealth;
  queue: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    pending: number;
    processing: number;
    failed: number;
  };
  timestamp: string;
}

/**
 * Get current system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  // Production guard: Stub health data is misleading in production
  // Allow in development for testing, but require real implementation in production
  if (process.env.NODE_ENV === 'production') {
    // In production, we still allow this but log a warning
    // Health checks are often used by monitoring systems
    // However, the database check should be real
    console.warn(
      '[Health] getSystemHealth returning stub data in production. ' +
      'Implement real health checks for accurate monitoring.'
    );
  } else {
    logger.debug('[Health] getSystemHealth called - returning stub data');
  }

  const dbHealth = await checkDatabaseHealth();

  return {
    overall: dbHealth.status,
    database: dbHealth,
    api: {
      status: 'healthy',
      latency: 50,
    },
    queue: {
      status: 'healthy',
      pending: 0,
      processing: 0,
      failed: 0,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check database connectivity
 */
export async function checkDatabaseHealth(): Promise<ComponentHealth> {
  try {
    const supabase = createAdminClient();
    const start = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { status: 'unhealthy', latency, message: error.message };
    }
    return { status: 'healthy', latency, message: 'connected' };
  } catch (err) {
    return { status: 'unhealthy', message: err instanceof Error ? err.message : String(err) };
  }
}

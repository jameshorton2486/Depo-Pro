import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createAdminClient } from '@/lib/supabase/admin';
void getSupabaseAdmin;
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
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      return { status: 'unhealthy', database: error.message } as unknown as ComponentHealth;
    }
    return { status: 'healthy', database: 'connected' } as unknown as ComponentHealth;
  } catch (err) {
    return { status: 'unhealthy', database: String(err) } as unknown as ComponentHealth;
  }
}

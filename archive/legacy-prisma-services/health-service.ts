// =============================================================================
// SYSTEM HEALTH SERVICE
// lib/monitoring/health-service.ts
//
// Phase 3D-3: System health monitoring
// =============================================================================


export interface SystemHealth {
  api: {
    status: 'healthy' | 'degraded' | 'down';
    latency: number;
  };
  database: {
    status: string;
    connectionCount: number;
  };
  redis: {
    status: string;
    connected: boolean;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
  };
  storage: {
    used: number;
    available: number;
  };
}

/**
 * Get current system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const startTime = Date.now();

  // Check database connection
  let dbStatus = 'unknown';
  try {
    await db.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (_error) {
    dbStatus = 'disconnected';
  }

  // Check job queue status
  const [pending, processing, failed] = await Promise.all([
    db.backgroundJob.count({ where: { status: 'PENDING' } }),
    db.backgroundJob.count({ where: { status: 'PROCESSING' } }),
    db.backgroundJob.count({ where: { status: 'FAILED' } }),
  ]);

  // Calculate API latency (simplified - in production, track actual response times)
  const latency = Date.now() - startTime;

  return {
    api: {
      status: latency < 500 ? 'healthy' : latency < 2000 ? 'degraded' : 'down',
      latency,
    },
    database: {
      status: dbStatus,
      connectionCount: 0, // Would need connection pool metrics
    },
    redis: {
      status: 'unknown', // Would need Redis client status
      connected: false, // Would check actual Redis connection
    },
    queue: {
      pending,
      processing,
      failed,
    },
    storage: {
      used: 0, // Would calculate from Supabase storage
      available: 0, // Would get from Supabase quota
    },
  };
}

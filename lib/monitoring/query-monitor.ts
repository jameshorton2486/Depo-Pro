// =============================================================================
// QUERY MONITORING
// lib/monitoring/query-monitor.ts
//
// Phase 5B-1: Slow query detection and alerting
// =============================================================================

import { captureError } from './error-tracking';

/**
 * Configure Prisma client with query logging
 * Phase 5B-1: Monitor slow queries
 */
export function configureQueryMonitoring(_prisma: any) {
  // In production, enable query event logging
  // This would be configured when creating PrismaClient
  
  // Example configuration:
  // const prisma = new PrismaClient({
  //   log: [
  //     {
  //       emit: 'event',
  //       level: 'query',
  //     },
  //   ],
  // });
  
  // prisma.$on('query', (e: Prisma.QueryEvent) => {
  //   if (e.duration > 1000) { // 1 second
  //     console.warn(`Slow query detected: ${e.duration}ms`);
  //     captureError(new Error('Slow Query'), {
  //       query: e.query,
  //       duration: e.duration,
  //       params: e.params,
  //     });
  //   }
  // });
}

/**
 * Log slow query manually
 */
export function logSlowQuery(
  query: string,
  duration: number,
  params?: unknown
) {
  if (duration > 1000) {
    console.warn(`[SLOW QUERY] ${duration}ms: ${query.substring(0, 200)}`);
    captureError(new Error('Slow Query Detected'), {
      query: query.substring(0, 500),
      duration,
      params: params ? JSON.stringify(params).substring(0, 200) : undefined,
    });
  }
}

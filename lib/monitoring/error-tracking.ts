// =============================================================================
// ERROR TRACKING
// lib/monitoring/error-tracking.ts
//
// Phase 5B-1: Application error tracking and monitoring
// =============================================================================

/**
 * Capture and log errors
 * Phase 5B-1: Error tracking for production monitoring
 * 
 * Note: In production, integrate with Sentry or similar service
 */

export interface ErrorContext {
  userId?: string;
  userRole?: string;
  action?: string;
  resource?: string;
  query?: string;
  duration?: number;
  params?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Capture an error with context
 */
export function captureError(error: Error, context?: ErrorContext) {
  // In production, this would send to Sentry
  // For now, log to console and could extend to database logging
  
  console.error('[ERROR]', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });

  // Future: Send to Sentry
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context });
  // }

  // Future: Log to database for analysis
  // await db.errorLog.create({
  //   data: {
  //     message: error.message,
  //     stack: error.stack,
  //     context: context || {},
  //   },
  // });
}

/**
 * Capture a warning (non-fatal issue)
 */
export function captureWarning(message: string, context?: ErrorContext) {
  console.warn('[WARNING]', {
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Capture performance metric
 */
export function captureMetric(name: string, value: number, tags?: Record<string, string>) {
  // In production, send to monitoring service
  console.log('[METRIC]', {
    name,
    value,
    tags,
    timestamp: new Date().toISOString(),
  });
}

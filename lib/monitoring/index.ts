import { logger } from '@/lib/logger';
// ═══════════════════════════════════════════════════════════════════════════
// APPLICATION MONITORING
// Tracks errors, performance, and usage metrics
// ═══════════════════════════════════════════════════════════════════════════

// Note: Sentry integration is optional - only initialize if DSN is provided
// For now, we use console logging with structured format

// Track custom events
export function trackEvent(name: string, data?: Record<string, unknown>) {
  // Log locally in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[Event] ${name}`, data);
  }
  
  // In production, send to monitoring service (Sentry, PostHog, etc.)
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Sentry integration would go here
    // Sentry.addBreadcrumb({
    //   category: 'custom',
    //   message: name,
    //   data,
    //   level: 'info',
    // });
  }
}

// Track errors with context
export function trackError(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error.message, context);
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Sentry integration would go here
    // Sentry.withScope((scope) => {
    //   if (context) {
    //     Object.entries(context).forEach(([key, value]) => {
    //       scope.setExtra(key, value);
    //     });
    //   }
    //   Sentry.captureException(error);
    // });
  }
}

// Performance metrics
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  tags?: Record<string, string>;
}

export function trackPerformance(metric: PerformanceMetric) {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[Perf] ${metric.name}: ${metric.value}${metric.unit}`);
  }
  
  // Send to monitoring service
  trackEvent('performance', {
    ...metric,
    timestamp: Date.now(),
  });
}

// Business metrics
export const Metrics = {
  transcriptionStarted: (jobId: string, userId: string) => {
    trackEvent('transcription.started', { jobId, userId });
  },
  
  transcriptionCompleted: (jobId: string, durationMs: number, wordCount: number) => {
    trackEvent('transcription.completed', { jobId, durationMs, wordCount });
    trackPerformance({ name: 'transcription_duration', value: durationMs, unit: 'ms' });
  },
  
  transcriptionFailed: (jobId: string, error: string) => {
    trackEvent('transcription.failed', { jobId, error });
  },
  
  exportGenerated: (format: string, pageCount: number) => {
    trackEvent('export.generated', { format, pageCount });
  },
  
  reviewCompleted: (jobId: string, flaggedCount: number, correctedCount: number) => {
    trackEvent('review.completed', { jobId, flaggedCount, correctedCount });
  },
};

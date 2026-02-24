// lib/error-capture.ts
// Central error capture — structured logging for production debugging
//
// Usage:
//   import { captureError } from '@/lib/error-capture';
//   captureError(error, { route: 'PATCH /api/jobs/[id]/review', jobId, userId });

import { logger } from '@/lib/logger';

export interface ErrorContext {
  /** The API route or component name where the error occurred */
  route?: string;
  /** Current user ID (never log email for privacy) */
  userId?: string;
  /** Job ID being processed */
  jobId?: string;
  /** Transcription ID */
  transcriptionId?: string;
  /** Firm ID (for tenant isolation debugging) */
  firmId?: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Any additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Capture and log an error with structured context.
 *
 * For beta: Logs to Vercel's stdout as structured JSON.
 * Post-beta: Can be extended to send to Sentry, Datadog, etc.
 */
export function captureError(
  error: unknown,
  context: ErrorContext = {}
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  // Use the structured logger (handles dev vs prod formatting)
  logger.error(err.message, err, context as Record<string, unknown>);

  // Also emit raw JSON for Vercel log search in production
  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify({
      severity: 'ERROR',
      timestamp: new Date().toISOString(),
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
      ...context,
    }));
  }
}

/**
 * Capture a warning-level issue (not a crash, but worth investigating).
 */
export function captureWarning(
  message: string,
  context: ErrorContext = {}
): void {
  logger.warn(message, context as Record<string, unknown>);

  if (process.env.NODE_ENV === 'production') {
    console.warn(JSON.stringify({
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
      message,
      ...context,
    }));
  }
}

/**
 * Wrap an async handler with automatic error capture.
 * Use for API routes that don't use withRouteProtection.
 */
export function withErrorCapture<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  context: Omit<ErrorContext, 'statusCode'>
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      captureError(error, context);
      throw error; // Re-throw so Next.js can handle it
    }
  }) as T;
}

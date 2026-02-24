// lib/client/error-reporter.ts
// Client-side error capture — sends errors to server for logging
// Only imported in client components

interface ClientError {
  message: string;
  stack?: string;
  componentName?: string;
  url?: string;
  userAction?: string;
  metadata?: Record<string, unknown>;
}

const ERROR_ENDPOINT = '/api/client-errors';
const DEBOUNCE_MS = 5000;
const recentErrors = new Set<string>();

/**
 * Report a client-side error to the server.
 * Debounced to prevent flood on rapid failures.
 */
export function reportClientError(error: ClientError): void {
  // Deduplicate within debounce window
  const key = `${error.message}:${error.componentName}`;
  if (recentErrors.has(key)) return;
  recentErrors.add(key);
  setTimeout(() => recentErrors.delete(key), DEBOUNCE_MS);

  // Fire and forget — don't let error reporting cause more errors
  try {
    const body = JSON.stringify({
      ...error,
      url: error.url || (typeof window !== 'undefined' ? window.location.pathname : ''),
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });

    // Use sendBeacon for reliability (works even during page unload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(ERROR_ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(ERROR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {}); // Swallow — error reporting must never crash the app
    }
  } catch {
    // Absolute last resort — error reporting itself failed
  }
}

/**
 * Wrap a function with automatic error reporting.
 */
export function withClientErrorCapture<T extends (...args: any[]) => any>(
  fn: T,
  componentName: string
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          reportClientError({
            message: error.message,
            stack: error.stack,
            componentName,
          });
          throw error; // Re-throw so caller can handle
        });
      }
      return result;
    } catch (error) {
      if (error instanceof Error) {
        reportClientError({
          message: error.message,
          stack: error.stack,
          componentName,
        });
      }
      throw error;
    }
  }) as T;
}

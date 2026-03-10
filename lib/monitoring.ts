/**
 * Production monitoring utilities.
 * Designed to be upgraded to Sentry, Datadog, or similar after beta.
 * For beta: logs to Vercel Functions log with structured prefixes.
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

interface LogEvent {
  level: LogLevel
  message: string
  route?: string
  userId?: string
  firmId?: string
  jobId?: string
  error?: string
  stack?: string
  duration_ms?: number
  [key: string]: unknown
}

export function logEvent(event: LogEvent): void {
  const prefix = event.level === 'CRITICAL' ? '[CRITICAL]'
    : event.level === 'ERROR' ? '[ERROR]'
    : event.level === 'WARN' ? '[WARN]'
    : '[INFO]'

  if (process.env.NODE_ENV === 'development') {
    console.log(`${prefix} ${event.message}`, event)
  } else {
    console.log(JSON.stringify({ prefix, timestamp: new Date().toISOString(), ...event }))
  }
}

export function logRouteError(
  route: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  logEvent({
    level: 'CRITICAL',
    message: `Unhandled error in ${route}`,
    route,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  })
}

export function logSlowRequest(route: string, duration_ms: number, threshold_ms = 3000): void {
  if (duration_ms > threshold_ms) {
    logEvent({
      level: 'WARN',
      message: `Slow request detected`,
      route,
      duration_ms,
      threshold_ms
    })
  }
}

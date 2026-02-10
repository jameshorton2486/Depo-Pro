import { logger } from '@/lib/logger';
// =============================================================================
// STRUCTURED LOGGER
// Production-safe logging with levels and context
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// =============================================================================
// LOGGER IMPLEMENTATION
// =============================================================================

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }

  const { timestamp, level, message, context, error } = entry;
  let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`;
  }

  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack && (process.env.NODE_ENV as string) !== 'production') {
      output += `\n  ${error.stack}`;
    }
  }

  return output;
}

function log(level: LogLevel, message: string, context?: LogContext, err?: Error): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(err && {
      error: {
        name: err.name,
        message: err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      },
    }),
  };

  const output = formatEntry(entry);

  switch (level) {
    case 'debug':
    case 'info':
      logger.debug(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
}

// =============================================================================
// EXPORTED LOGGER
// =============================================================================

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, error?: Error, context?: LogContext) =>
    log('error', message, context, error),

  api: (method: string, path: string, status: number, durationMs: number, context?: LogContext) => {
    log('info', `${method} ${path} ${status} ${durationMs}ms`, {
      method,
      path,
      status,
      durationMs,
      ...context,
    });
  },

  time: (label: string) => {
    const start = performance.now();
    return {
      end: (context?: LogContext) => {
        const duration = Math.round(performance.now() - start);
        log('debug', `${label} completed`, { durationMs: duration, ...context });
        return duration;
      },
    };
  },
};

// =============================================================================
// REQUEST CONTEXT HELPER
// =============================================================================

export function createRequestContext(request: Request): LogContext {
  const url = new URL(request.url);
  return {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
  };
}

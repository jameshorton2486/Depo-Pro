/**
 * Logger Service
 * Structured logging with Winston-like interface
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: any;
  path?: string;
  error?: Error | string | any;
  userId?: string;
  jobId?: string;
  requestId?: string;
}

function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, meta));
    }
  },

  info(message: string, meta?: LogMeta): void {
    console.info(formatMessage('info', message, meta));
  },

  warn(message: string, meta?: LogMeta): void {
    console.warn(formatMessage('warn', message, meta));
  },

  error(message: string, meta?: LogMeta): void {
    console.error(formatMessage('error', message, meta));
  },

  // Child logger for request context
  child(defaultMeta: LogMeta) {
    return {
      debug: (msg: string, meta?: LogMeta) => logger.debug(msg, { ...defaultMeta, ...meta }),
      info: (msg: string, meta?: LogMeta) => logger.info(msg, { ...defaultMeta, ...meta }),
      warn: (msg: string, meta?: LogMeta) => logger.warn(msg, { ...defaultMeta, ...meta }),
      error: (msg: string, meta?: LogMeta) => logger.error(msg, { ...defaultMeta, ...meta }),
    };
  },
};

export default logger;


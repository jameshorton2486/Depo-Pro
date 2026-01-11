/**
 * Enhanced Logger Service for Depo-Pro
 * - Writes to console and files
 * - Structured JSON logging for production
 * - Human-readable for development
 * - Separate log files by category
 */

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log categories for file separation
export type LogCategory =
  | 'auth'           // Authentication events
  | 'api'            // API route calls
  | 'database'       // Database operations
  | 'transcription'  // Deepgram/transcription
  | 'export'         // Document export
  | 'general';       // Default category

interface LogMeta {
  category?: LogCategory;
  userId?: string;
  jobId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: Error | string | unknown;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  meta?: Record<string, unknown>;
  stack?: string;
}

import fs from 'fs';
import path from 'path';

// Check if we're on the server
const isServer = typeof window === 'undefined';

// Check if we're in development
const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

// Ensure logs directory exists (server-side only)
function ensureLogsDir(): string {
  if (!isServer || !fs || !path) return '';

  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return logsDir;
  } catch (e) {
    console.error('Failed to create logs directory:', e);
    return '';
  }
}

// Generate descriptive filename
function getLogFileName(category: LogCategory): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${category}-${date}.log`;
}

// Format entry for file output
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, category, message, meta, stack } = entry;
  const metaStr = meta && Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
  const stackStr = stack ? `\n  Stack: ${stack}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}${metaStr}${stackStr}\n`;
}

// Write to log file (server-side only)
function writeToFile(entry: LogEntry): void {
  if (!isServer || !fs || !path) return;

  try {
    const logsDir = ensureLogsDir();
    if (!logsDir) return;

    const fileName = getLogFileName(entry.category);
    const filePath = path.join(logsDir, fileName);
    const logLine = formatLogEntry(entry);

    fs.appendFileSync(filePath, logLine, 'utf8');

    // Also write errors to combined error log
    if (entry.level === 'error') {
      const errorFilePath = path.join(logsDir, `errors-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(errorFilePath, logLine, 'utf8');
    }
  } catch (e) {
    // Silent fail for file writing - don't break the app
    if (isDevelopment) {
      console.error('Failed to write to log file:', e);
    }
  }
}

// Console output formatting
function consoleOutput(entry: LogEntry): void {
  const { level, category, message, meta, stack } = entry;
  const prefix = `[${category.toUpperCase()}]`;

  // Get the appropriate console function
  const consoleFn = level === 'debug' ? console.debug
    : level === 'info' ? console.info
    : level === 'warn' ? console.warn
    : console.error;

  // Build the log message
  if (meta && Object.keys(meta).length > 0) {
    consoleFn(`${prefix} ${message}`, meta);
  } else {
    consoleFn(`${prefix} ${message}`);
  }

  // Log stack trace for errors
  if (stack && level === 'error') {
    console.error('Stack trace:', stack);
  }
}

// Process error object for logging
function processError(error: unknown): { message: string; name: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { name: 'Error', message: error };
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    return {
      name: String(errorObj.name || 'Error'),
      message: String(errorObj.message || errorObj.error_description || JSON.stringify(error)),
    };
  }

  return { name: 'Error', message: String(error) };
}

// Create log entry
function createLogEntry(
  level: LogLevel,
  message: string,
  meta?: LogMeta
): LogEntry {
  const category = meta?.category || 'general';

  // Create clean meta object without category
  const cleanMeta: Record<string, unknown> = {};

  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      if (key === 'category') continue;

      if (key === 'error' && value) {
        const processedError = processError(value);
        cleanMeta.error = {
          name: processedError.name,
          message: processedError.message,
        };
        // Store stack separately
        if (processedError.stack) {
          cleanMeta._errorStack = processedError.stack;
        }
      } else {
        cleanMeta[key] = value;
      }
    }
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
  };

  // Only add meta if it has content
  if (Object.keys(cleanMeta).length > 0) {
    // Extract stack before adding meta
    const stack = cleanMeta._errorStack as string | undefined;
    delete cleanMeta._errorStack;

    if (Object.keys(cleanMeta).length > 0) {
      entry.meta = cleanMeta;
    }

    if (stack) {
      entry.stack = stack;
    }
  }

  return entry;
}

// Main logger function
function log(level: LogLevel, message: string, meta?: LogMeta): void {
  const entry = createLogEntry(level, message, meta);

  // Always output to console in development, or for errors
  if (isDevelopment || level === 'error' || level === 'warn') {
    consoleOutput(entry);
  }

  // Write to file in all environments (server-side only)
  if (isServer) {
    writeToFile(entry);
  }
}

// Helper to create category-specific logger
function createCategoryLogger(category: LogCategory) {
  return {
    debug: (msg: string, meta?: Omit<LogMeta, 'category'>) =>
      log('debug', msg, { ...meta, category }),
    info: (msg: string, meta?: Omit<LogMeta, 'category'>) =>
      log('info', msg, { ...meta, category }),
    warn: (msg: string, meta?: Omit<LogMeta, 'category'>) =>
      log('warn', msg, { ...meta, category }),
    error: (msg: string, meta?: Omit<LogMeta, 'category'>) =>
      log('error', msg, { ...meta, category }),
  };
}

// Export logger with category-specific child loggers
export const enhancedLogger = {
  debug: (message: string, meta?: LogMeta) => log('debug', message, meta),
  info: (message: string, meta?: LogMeta) => log('info', message, meta),
  warn: (message: string, meta?: LogMeta) => log('warn', message, meta),
  error: (message: string, meta?: LogMeta) => log('error', message, meta),

  // Category-specific loggers
  auth: createCategoryLogger('auth'),
  api: createCategoryLogger('api'),
  database: createCategoryLogger('database'),
  transcription: createCategoryLogger('transcription'),
  export: createCategoryLogger('export'),
  general: createCategoryLogger('general'),
};

export default enhancedLogger;

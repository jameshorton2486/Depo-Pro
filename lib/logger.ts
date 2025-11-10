// ═══════════════════════════════════════════════════════════════
// LOGGER UTILITY
// ═══════════════════════════════════════════════════════════════
// Centralized logging with file output and console formatting
// Note: Only works in Node.js runtime (not Edge Runtime)

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  stack?: string;
}

// Check if we're in a Node.js environment (not Edge Runtime)
const isNodeRuntime = typeof process !== 'undefined' && typeof process.cwd === 'function';

class Logger {
  private logsDir?: string;
  private fs?: typeof import('fs');
  private path?: typeof import('path');

  constructor() {
    // Only initialize file logging in Node.js runtime
    if (isNodeRuntime) {
      this.initializeNodeLogger();
    }
  }

  private async initializeNodeLogger() {
    try {
      // Dynamic imports only work in Node.js runtime
      this.fs = await import('fs');
      this.path = await import('path');
      this.logsDir = this.path.join(process.cwd(), 'logs');
      this.ensureLogsDirectory();
    } catch {
      // Silently fail if not in Node.js runtime
      console.warn('Logger: File logging not available in Edge Runtime');
    }
  }

  private ensureLogsDirectory() {
    if (this.fs && this.logsDir && !this.fs.existsSync(this.logsDir)) {
      this.fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getLogFileName(level: LogLevel): string | undefined {
    if (!this.path || !this.logsDir) return undefined;
    
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    switch (level) {
      case LogLevel.ERROR:
        return this.path.join(this.logsDir, `error-${date}.log`);
      case LogLevel.WARN:
        return this.path.join(this.logsDir, `warn-${date}.log`);
      default:
        return this.path.join(this.logsDir, `app-${date}.log`);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
      entry.context ? `[${entry.context}]` : '',
      entry.message,
    ].filter(Boolean);

    let formatted = parts.join(' ');

    if (entry.data) {
      formatted += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.stack) {
      formatted += `\n  Stack: ${entry.stack}`;
    }

    return formatted;
  }

  private writeToFile(level: LogLevel, entry: LogEntry) {
    // Only write to file in Node.js runtime
    if (!this.fs || !isNodeRuntime) return;
    
    try {
      const fileName = this.getLogFileName(level);
      if (!fileName) return;
      
      const formatted = this.formatLogEntry(entry) + '\n';
      this.fs.appendFileSync(fileName, formatted, 'utf-8');
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      stack: error?.stack,
    };

    // Write to file (only in Node.js runtime)
    this.writeToFile(level, entry);

    // Always log to console
    const consoleMethod = level === LogLevel.ERROR ? console.error : 
                         level === LogLevel.WARN ? console.warn : 
                         console.log;
    
    consoleMethod(this.formatLogEntry(entry));
  }

  debug(message: string, context?: string, data?: Record<string, unknown>) {
    // Skip debug logs in production
    if (process.env.NODE_ENV === 'production') return;
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, error?: Error, data?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, context, { ...data, errorMessage: error?.message }, error);
  }

  // Helper for API route errors
  apiError(route: string, error: Error, additionalData?: Record<string, unknown>) {
    this.error(
      `API Error in ${route}`,
      'API',
      error,
      { route, ...additionalData }
    );
  }

  // Helper for database errors
  dbError(operation: string, error: Error, additionalData?: Record<string, unknown>) {
    this.error(
      `Database Error during ${operation}`,
      'Database',
      error,
      { operation, ...additionalData }
    );
  }

  // Helper for authentication errors
  authError(message: string, error?: Error, additionalData?: Record<string, unknown>) {
    this.error(
      `Auth Error: ${message}`,
      'Authentication',
      error,
      additionalData
    );
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, context?: string, data?: Record<string, unknown>) => 
  logger.debug(message, context, data);

export const logInfo = (message: string, context?: string, data?: Record<string, unknown>) => 
  logger.info(message, context, data);

export const logWarn = (message: string, context?: string, data?: Record<string, unknown>) => 
  logger.warn(message, context, data);

export const logError = (message: string, context?: string, error?: Error, data?: Record<string, unknown>) => 
  logger.error(message, context, error, data);

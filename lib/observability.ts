/**
 * Observability utilities for production monitoring
 * Phase 5: Production Hardening
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Structured log entry
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Structured logger
 */
export class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      metadata,
    };

    // In production, send to logging service (e.g., DataDog, CloudWatch)
    console.log(JSON.stringify(entry));
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>) {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : undefined;

    this.log(LogLevel.ERROR, message, { ...metadata, error: errorData });
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>) {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : undefined;

    this.log(LogLevel.FATAL, message, { ...metadata, error: errorData });
  }
}

// Global logger instance
export const logger = new Logger('depo-pro');

/**
 * Request logging middleware
 */
export function withRequestLogging(handler: (request: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Extract request info
    const url = new URL(request.url);
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    logger.info('Request started', {
      requestId,
      method: request.method,
      url: url.pathname,
      ipAddress,
      userAgent,
    });

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      logger.info('Request completed', {
        requestId,
        method: request.method,
        url: url.pathname,
        statusCode: response.status,
        duration,
      });

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Request failed', error as Error, {
        requestId,
        method: request.method,
        url: url.pathname,
        duration,
      });

      // Return error response with request ID
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      errorResponse.headers.set('X-Request-ID', requestId);

      return errorResponse;
    }
  };
}

/**
 * Health check utilities
 */
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  timestamp: string;
  duration?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const { db: prisma } = await import('@/lib/db');

    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;

    return {
      name: 'database',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * External service health checks
 */
export async function checkExternalServicesHealth(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Supabase check
  const supabaseStart = Date.now();
  try {
    const response = await fetch(process.env.SUPABASE_URL! + '/rest/v1/', {
      method: 'HEAD',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY!,
      },
    });

    checks.push({
      name: 'supabase',
      status: response.ok ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      duration: Date.now() - supabaseStart,
    });
  } catch (error) {
    checks.push({
      name: 'supabase',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
      timestamp: new Date().toISOString(),
      duration: Date.now() - supabaseStart,
    });
  }

  // Deepgram check (optional, as it might be rate limited)
  if (process.env.DEEPGRAM_API_KEY) {
    const deepgramStart = Date.now();
    try {
      const response = await fetch('https://api.deepgram.com/v1/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        },
      });

      checks.push({
        name: 'deepgram',
        status: response.ok ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: Date.now() - deepgramStart,
      });
    } catch (error) {
      checks.push({
        name: 'deepgram',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Connection failed',
        timestamp: new Date().toISOString(),
        duration: Date.now() - deepgramStart,
      });
    }
  }

  return checks;
}

/**
 * Overall health check endpoint
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const [dbCheck, ...externalChecks] = await Promise.all([
    checkDatabaseHealth(),
    ...await checkExternalServicesHealth(),
  ]);

  const allChecks = [dbCheck, ...externalChecks];
  const hasUnhealthy = allChecks.some(check => check.status === 'unhealthy');

  return {
    status: hasUnhealthy ? 'unhealthy' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: allChecks,
  };
}

/**
 * Audit logging for security events
 */
export interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * Log audit event
 */
export async function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
  const auditEvent: AuditEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  logger.info('Audit event', auditEvent);

  // In production, store in secure audit log database
  try {
    const { db: prisma } = await import('@/lib/db');

    await prisma.auditLog.create({
      data: {
        actorUserId: event.userId,
        action: event.action,
        targetType: event.entityType,
        targetId: event.entityId,
        metadata: event.details ? (event.details as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    });
  } catch (error) {
    logger.error('Failed to store audit event', error as Error, auditEvent);
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  getMetrics(name: string) {
    const values = this.metrics.get(name) || [];
    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
    };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [name] of this.metrics) {
      result[name] = this.getMetrics(name);
    }
    return result;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
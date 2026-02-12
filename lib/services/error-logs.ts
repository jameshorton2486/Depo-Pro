// lib/services/error-logs.ts
// Security Audit D.12 - Error Observability

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface ErrorLogInput {
  route: string;
  method: string;
  statusCode?: number;
  firmId?: string;
  userId?: string;
  errorMessage: string;
  errorCode?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Log an application error to the database
 * CRITICAL: Never let this function throw - it should fail silently
 */
export async function logError(input: ErrorLogInput): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    // Sanitize error message (remove PHI/PII)
    const sanitizedMessage = sanitizeErrorMessage(input.errorMessage);

    // Truncate stack trace to prevent huge DB entries
    const truncatedStack = input.stack ? input.stack.substring(0, 5000) : null;

    await supabase.from('error_logs').insert({
      route: input.route,
      method: input.method,
      status_code: input.statusCode || null,
      firm_id: input.firmId || null,
      user_id: input.userId || null,
      error_message: sanitizedMessage,
      error_code: input.errorCode || null,
      stack: truncatedStack,
      metadata: input.metadata || {},
      ip_address: input.ip || null,
      user_agent: input.userAgent || null,
    });
  } catch (error) {
    // NEVER let error logging break the request
    // Log to console as fallback
    logger.error('[error-logs] Failed to log error', error as Error, {
      route: input.route,
      originalError: input.errorMessage,
    });
  }
}

/**
 * Sanitize error message to remove potential PHI/PII
 */
function sanitizeErrorMessage(message: string): string {
  // Remove email addresses
  let sanitized = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  // Remove UUIDs (could be sensitive entity IDs in error messages)
  sanitized = sanitized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]');

  // Remove file paths (could contain usernames)
  sanitized = sanitized.replace(/[A-Z]:\\[\w\s\-\\]+/g, '[PATH]');
  sanitized = sanitized.replace(/\/[\w\s\-/]+/g, '[PATH]');

  // Truncate to reasonable length
  return sanitized.substring(0, 1000);
}

/**
 * Get recent errors for admin dashboard
 */
export async function getRecentErrors(options?: {
  limit?: number;
  route?: string;
  firmId?: string;
}): Promise<any[]> {
  try {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(options?.limit || 100);

    if (options?.route) {
      query = query.eq('route', options.route);
    }

    if (options?.firmId) {
      query = query.eq('firm_id', options.firmId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[error-logs] Failed to fetch recent errors', error as Error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('[error-logs] Exception during fetch', error as Error);
    return [];
  }
}

/**
 * Get error statistics for admin dashboard
 */
export async function getErrorStats(firmId?: string): Promise<{
  last24Hours: number;
  last7Days: number;
  topRoutes: Array<{ route: string; count: number }>;
  topErrors: Array<{ error_code: string; count: number }>;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Count last 24 hours
    let query24h = supabase
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (firmId) query24h = query24h.eq('firm_id', firmId);

    const { count: count24h } = await query24h;

    // Count last 7 days
    let query7d = supabase
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (firmId) query7d = query7d.eq('firm_id', firmId);

    const { count: count7d } = await query7d;

    return {
      last24Hours: count24h || 0,
      last7Days: count7d || 0,
      topRoutes: [],
      topErrors: [],
    };
  } catch (error) {
    logger.error('[error-logs] Failed to get stats', error as Error);
    return {
      last24Hours: 0,
      last7Days: 0,
      topRoutes: [],
      topErrors: [],
    };
  }
}

/**
 * Helper to extract error details from caught exceptions
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'Unknown error' };
}

/**
 * API Route Logger Middleware
 * Logs all API requests with timing and error details
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { enhancedLogger } from '@/lib/logger/enhanced-logger.server';

export interface RouteLogContext {
  path: string;
  method: string;
  startTime: number;
  requestId: string;
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Extract relevant headers for logging
function getLoggableHeaders(request: NextRequest): Record<string, string> {
  return {
    'content-type': request.headers.get('content-type') || 'unknown',
    'user-agent': request.headers.get('user-agent')?.substring(0, 50) || 'unknown',
  };
}

// Start logging for a route
export function startRouteLog(request: NextRequest): RouteLogContext {
  const context: RouteLogContext = {
    path: request.nextUrl.pathname,
    method: request.method,
    startTime: Date.now(),
    requestId: generateRequestId(),
  };

  enhancedLogger.api.info('Request started', {
    requestId: context.requestId,
    path: context.path,
    method: context.method,
    headers: getLoggableHeaders(request),
  });

  return context;
}

// Complete logging for a route
export function endRouteLog(
  context: RouteLogContext,
  response: NextResponse,
  error?: Error | unknown
): void {
  const duration = Date.now() - context.startTime;
  const statusCode = response.status;

  if (error) {
    enhancedLogger.api.error('Request failed', {
      requestId: context.requestId,
      path: context.path,
      method: context.method,
      statusCode,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
  } else if (statusCode >= 400) {
    enhancedLogger.api.warn('Request completed with error status', {
      requestId: context.requestId,
      path: context.path,
      method: context.method,
      statusCode,
      duration,
    });
  } else {
    enhancedLogger.api.info('Request completed', {
      requestId: context.requestId,
      path: context.path,
      method: context.method,
      statusCode,
      duration,
    });
  }
}

// Higher-order function to wrap route handlers
export function withRouteLogging<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, ...rest: any[]) => {
    const context = startRouteLog(request);

    try {
      const response = await handler(request, ...rest);
      endRouteLog(context, response);
      return response;
    } catch (error) {
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      endRouteLog(context, errorResponse, error);
      throw error;
    }
  }) as T;
}


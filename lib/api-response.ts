// lib/api-response.ts
// API response helpers with flexible signatures for backward compatibility
import { NextResponse } from 'next/server';

/**
 * Create a success response
 */
export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Create an error response
 * 
 * Supports multiple call signatures:
 * - error(message: string)
 * - error(message: string, status: number)
 * - error(code: string, message: string, status: number)
 */
export function error(
  codeOrMessage: string,
  messageOrStatus?: string | number,
  maybeStatus?: number
): NextResponse {
  let code: string;
  let message: string;
  let status: number;

  if (typeof messageOrStatus === 'number') {
    // Signature: error(message, status)
    code = 'ERROR';
    message = codeOrMessage;
    status = messageOrStatus;
  } else if (typeof messageOrStatus === 'string' && typeof maybeStatus === 'number') {
    // Signature: error(code, message, status)
    code = codeOrMessage;
    message = messageOrStatus;
    status = maybeStatus;
  } else {
    // Signature: error(message) - defaults
    code = 'ERROR';
    message = codeOrMessage;
    status = 500;
  }

  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Create an unauthorized response
 */
export function unauthorized(message = 'Unauthorized') {
  return error('UNAUTHORIZED', message, 401);
}

/**
 * Create a forbidden response
 */
export function forbidden(message = 'Forbidden') {
  return error('FORBIDDEN', message, 403);
}

/**
 * Create a not found response
 */
export function notFound(message = 'Not found') {
  return error('NOT_FOUND', message, 404);
}

/**
 * Create a server error response
 */
export function serverError(message = 'Internal server error') {
  return error('SERVER_ERROR', message, 500);
}

/**
 * Handle API errors consistently
 */
export function handleApiError(err: unknown, defaultMessage = 'An error occurred') {
  console.error('[API Error]', err);
  
  if (err instanceof Error) {
    return serverError(err.message);
  }
  
  return serverError(defaultMessage);
}

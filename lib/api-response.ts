// =============================================================================
// STANDARDIZED API RESPONSES
// Consistent error handling across all API routes
// =============================================================================

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// =============================================================================
// ERROR CODES
// =============================================================================

export const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// =============================================================================
// SUCCESS RESPONSES
// =============================================================================

export function success<T>(data: T, meta?: Record<string, unknown>): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

export function created<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true, data },
    { status: 201 }
  );
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

export function error(
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details: details || undefined,
      },
    },
    { status }
  );
}

export function unauthorized(message = 'Authentication required'): NextResponse<ApiErrorResponse> {
  return error(ErrorCodes.UNAUTHENTICATED, message, 401);
}

export function forbidden(message = 'Access denied'): NextResponse<ApiErrorResponse> {
  return error(ErrorCodes.FORBIDDEN, message, 403);
}

export function notFound(resource = 'Resource'): NextResponse<ApiErrorResponse> {
  return error(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
}

export function badRequest(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
  return error(ErrorCodes.INVALID_INPUT, message, 400, details);
}

export function conflict(message: string): NextResponse<ApiErrorResponse> {
  return error(ErrorCodes.CONFLICT, message, 409);
}

export function rateLimited(retryAfter?: number): NextResponse<ApiErrorResponse> {
  const response = error(ErrorCodes.RATE_LIMITED, 'Too many requests', 429);
  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }
  return response;
}

export function internalError(message = 'An unexpected error occurred'): NextResponse<ApiErrorResponse> {
  return error(ErrorCodes.INTERNAL_ERROR, message, 500);
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

export function handleApiError(err: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', err);

  if (err instanceof ZodError) {
    return error(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      err.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }))
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return error(
          ErrorCodes.ALREADY_EXISTS,
          'A record with this value already exists',
          409,
          { field: err.meta?.target }
        );
      case 'P2025':
        return notFound();
      case 'P2003':
        return error(
          ErrorCodes.INVALID_INPUT,
          'Referenced record does not exist',
          400
        );
      default:
        return error(
          ErrorCodes.DATABASE_ERROR,
          'Database operation failed',
          500
        );
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return error(
      ErrorCodes.INVALID_INPUT,
      'Invalid query parameters',
      400
    );
  }

  if (err instanceof AppError) {
    return error(err.code, err.message, err.status, err.details);
  }

  if (err instanceof Error) {
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;
    return internalError(message);
  }

  return internalError();
}

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createNotFoundError(resource: string): AppError {
  return new AppError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
}

export function createForbiddenError(message = 'Access denied'): AppError {
  return new AppError(ErrorCodes.FORBIDDEN, message, 403);
}

export function createValidationError(message: string, details?: unknown): AppError {
  return new AppError(ErrorCodes.VALIDATION_ERROR, message, 400, details);
}

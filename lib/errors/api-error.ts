// =============================================================================
// CENTRALIZED API ERROR HANDLING
// =============================================================================
// SECURITY RULE: Internal error details (stack traces, database errors,
// Supabase error codes, SQL fragments) must NEVER be returned to the client.
// All 500-class errors return a generic message. Specific error details are
// logged server-side only.
// =============================================================================

import { NextResponse } from 'next/server';

export type SafeErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'STALE_DATA'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

/**
 * Safe catch handler for unexpected errors in API routes.
 *
 * Usage:
 *   try { ... } catch (err) {
 *     return handleUnexpectedError(err, 'POST /api/jobs');
 *   }
 */
export function handleUnexpectedError(
  err: unknown,
  context: string,
): NextResponse {
  console.error(`[api-error] Unexpected error in ${context}:`, err);

  return NextResponse.json(
    { error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR' as SafeErrorCode },
    { status: 500 },
  );
}

/**
 * Safe handler for Supabase query errors.
 *
 * Supabase error objects contain table names, column names, and Postgres
 * error codes. NEVER pass them directly to the client.
 */
export function handleSupabaseError(
  error: { message?: string; code?: string; details?: string } | null,
  context: string,
): NextResponse {
  if (error) {
    console.error(`[api-error] Supabase error in ${context}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }

  return NextResponse.json(
    { error: 'A database error occurred.', code: 'INTERNAL_ERROR' as SafeErrorCode },
    { status: 500 },
  );
}

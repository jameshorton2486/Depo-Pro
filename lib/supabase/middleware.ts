// lib/supabase/middleware.ts
// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE CLIENT - For Edge runtime (middleware.ts)
// Handles session refresh and token management via cookies
// ═══════════════════════════════════════════════════════════════
//
// This client is specifically designed for the Next.js middleware
// where we need to:
// 1. Read cookies from the incoming request
// 2. Refresh expired sessions
// 3. Write updated cookies to the response
//
// The middleware client ensures sessions stay valid across requests.
//
// FIXED: Removed hardcoded fallbacks - env vars are now REQUIRED
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MiddlewareClientResult {
  supabase: SupabaseClient;
  response: NextResponse;
}

/**
 * Create a Supabase client for use in Next.js middleware
 *
 * Returns both the client and a response object that must be returned
 * from the middleware to properly set cookies.
 *
 * @example
 * ```ts
 * export async function middleware(request: NextRequest) {
 *   const { supabase, response } = await createSupabaseMiddlewareClient(request);
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 *   if (!user) {
 *     return NextResponse.redirect(new URL('/login', request.url));
 *   }
 *
 *   return response; // IMPORTANT: Return this response to set cookies
 * }
 * ```
 */
function getEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      '[Supabase Middleware] Missing NEXT_PUBLIC_SUPABASE_URL environment variable.'
    );
  }

  if (!anonKey) {
    throw new Error(
      '[Supabase Middleware] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.'
    );
  }

  return { url, anonKey };
}

export async function createSupabaseMiddlewareClient(
  request: NextRequest
): Promise<MiddlewareClientResult> {
  const { url, anonKey } = getEnvVars();

  // Create a response that we'll modify with cookie updates
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update cookies on the request (for downstream handlers)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        // Create a new response with the updated cookies
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        // Set cookies on the response (for the browser)
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, response };
}

/**
 * Helper to extract access token from request
 * Checks Authorization header first, then falls back to cookies
 */
export function getAccessTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Check for Supabase auth cookie
  // The cookie name follows the pattern: sb-<project-ref>-auth-token
  const cookies = request.cookies.getAll();
  const authCookie = cookies.find(
    (cookie) => cookie.name.includes('-auth-token')
  );

  if (authCookie) {
    try {
      // The cookie value is a JSON array: [access_token, refresh_token]
      const parsed = JSON.parse(authCookie.value);
      if (Array.isArray(parsed) && parsed[0]) {
        return parsed[0];
      }
    } catch {
      // Cookie is not JSON, might be the token itself
      return authCookie.value;
    }
  }

  return null;
}

// Alias for backward compatibility
export const createMiddlewareClient = createSupabaseMiddlewareClient;

export default createSupabaseMiddlewareClient;

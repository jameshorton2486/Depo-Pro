// =============================================================================
// MIDDLEWARE
// =============================================================================
// Single security boundary for authentication
//
// Responsibilities:
// - Read Supabase session
// - Redirect unauthenticated users → /login
// - Redirect authenticated users away from auth pages → /dashboard
//
// ❌ No DB calls
// ❌ No role logic
// ❌ No business rules
// =============================================================================

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

// -----------------------------------------------------------------------------
// Route Policy
// -----------------------------------------------------------------------------

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/auth/invite/accept',
];

const AUTH_REDIRECT_ROUTES = ['/login', '/register'];

// -----------------------------------------------------------------------------
// Security Headers
// -----------------------------------------------------------------------------

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

function isAuthRedirectRoute(pathname: string): boolean {
  return AUTH_REDIRECT_ROUTES.includes(pathname);
}

function isBypassRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/api/health'
  );
}

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Bypass static assets and health checks
  if (isBypassRoute(pathname)) {
    return NextResponse.next();
  }

  const { supabase, response } = await createMiddlewareClient(request);

  // Public routes
  if (isPublicRoute(pathname)) {
    // Redirect authenticated users away from login/register
    if (isAuthRedirectRoute(pathname)) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const redirect = NextResponse.redirect(
          new URL('/dashboard', request.url)
        );
        return applySecurityHeaders(redirect);
      }
    }

    return applySecurityHeaders(response);
  }

  // Protected routes
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'callbackUrl',
      `${pathname}${search}`
    );

    const redirect = NextResponse.redirect(loginUrl);
    return applySecurityHeaders(redirect);
  }

  // Authenticated → allow access
  return applySecurityHeaders(response);
}

// -----------------------------------------------------------------------------
// Matcher
// -----------------------------------------------------------------------------

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

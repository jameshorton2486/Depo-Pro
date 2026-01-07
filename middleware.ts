// middleware.ts
// ═══════════════════════════════════════════════════════════════
// GLOBAL AUTH GATEKEEPER
// Single source of truth for authentication and route protection
// ═══════════════════════════════════════════════════════════════

export const runtime = 'edge';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicRoute, hasRouteAccess } from '@/lib/permissions/route-access';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

// Routes that should bypass auth even if not in PUBLIC_ROUTES
const AUTH_BYPASS_ROUTES = [
  '/auth/callback',
  '/auth/confirm',
  '/update-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals first (fast path)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/health') ||
    pathname.includes('.') // Static files (images, etc.)
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow auth callback routes (needed for PKCE flow and password recovery)
  if (AUTH_BYPASS_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  try {
    // Create Supabase client and get the response object for cookie management
    const { supabase, response } = await createSupabaseMiddlewareClient(request);

    // CRITICAL: getUser() validates the session with Supabase Auth
    // This also refreshes expired tokens automatically
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Not authenticated - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get role from user metadata (single source of truth)
    const userRole = (user.user_metadata?.role as string) || 'REPORTER';

    // Check route access using role from user_metadata
    if (!hasRouteAccess(pathname, userRole as any)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Add security headers to the response
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  } catch (error) {
    console.warn('[middleware] Auth error:', error);
    // On error, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

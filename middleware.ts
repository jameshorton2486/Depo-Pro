// middleware.ts
// ═══════════════════════════════════════════════════════════════
// GLOBAL AUTH GATEKEEPER
// Single source of truth for authentication and route protection
// ═══════════════════════════════════════════════════════════════

export const runtime = 'experimental-edge';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicRoute, hasRouteAccess } from '@/lib/permissions/route-access';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Add comprehensive security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

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

    // Fetch user profile (includes firm_id and role)
    // Note: In Edge runtime, we can query Supabase but it's limited
    // The profile check provides early firm_id validation
    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id, role')
      .eq('id', user.id)
      .single();

    // If user doesn't have firm_id, redirect to setup
    // (unless already on setup page or public route)
    if (!profile?.firm_id && !pathname.startsWith('/setup-firm') && !isPublicRoute(pathname)) {
      console.warn('[middleware] User without firm_id', { userId: user.id });
      return NextResponse.redirect(new URL('/setup-firm', request.url));
    }

    // Get role from profile (preferred) or user metadata (fallback)
    const userRole = (profile?.role as string) || (user.user_metadata?.role as string) || 'REPORTER';

    // Check route access using role
    if (!hasRouteAccess(pathname, userRole as any)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Protect admin routes - require admin role
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'admin') {
        console.warn('[middleware] Non-admin attempting to access admin route', {
          userId: user.id,
          role: userRole,
        });
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Firm isolation check for protected routes
    // RLS will handle the actual enforcement at database level
    // Middleware ensures user has firm_id before accessing protected routes
    if (
      profile?.firm_id &&
      (pathname.startsWith('/dashboard') ||
        pathname.startsWith('/cases') ||
        pathname.startsWith('/calendar') ||
        pathname.startsWith('/transcripts'))
    ) {
      // Firm ID is validated - RLS will enforce access at database level
      // Middleware ensures user has firm_id before accessing protected routes
    }

    // Add comprehensive security headers
    addSecurityHeaders(response);

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

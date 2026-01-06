// middleware.ts
// ═══════════════════════════════════════════════════════════════
// GLOBAL AUTH GATEKEEPER
// Single source of truth for authentication and route protection
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicRoute, hasRouteAccess, type Role } from '@/lib/permissions/route-access';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/webhooks/')
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  try {
    // Update session and get user
    const { response, user, error } = await updateSession(request);

    if (!user || error) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get role from Supabase user_metadata (single source of truth)
    const role = (user.user_metadata?.role as Role) || 'REPORTER';

    // Check route access using role from user_metadata
    if (!hasRouteAccess(pathname, role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  } catch (error) {
    console.error('Middleware auth error:', error);
    // On error, redirect to login
    const loginUrl = new URL('/login', request.url);
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
     * - Files with extensions (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|.*\\..*).*)',
  ],
};

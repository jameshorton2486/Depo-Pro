// middleware.ts
// ═══════════════════════════════════════════════════════════════
// GLOBAL AUTH GATEKEEPER
// Single source of truth for authentication and route protection
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { isPublicRoute, hasRouteAccess } from '@/lib/permissions/route-access';
import { db } from '@/lib/db';

// Routes that should bypass auth even if not in PUBLIC_ROUTES
const AUTH_BYPASS_ROUTES = [
  '/auth/callback',
  '/auth/confirm',
  '/update-password',
  '/reset-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals
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

  // Allow auth callback routes (needed for PKCE flow)
  if (AUTH_BYPASS_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  try {
    // Create Supabase client and refresh session
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

    // CRITICAL SECURITY: Get role from database, NOT from user_metadata
    // This prevents role escalation attacks where users modify their metadata
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!profile) {
      // Profile doesn't exist - redirect to registration completion
      const registerUrl = new URL('/register', request.url);
      registerUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(registerUrl);
    }

    // Check route access using role from database (authoritative source)
    if (!hasRouteAccess(pathname, profile.role as any)) {
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

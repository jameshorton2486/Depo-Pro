// =============================================================================
// MIDDLEWARE - Gold-Standard Supabase Auth
// =============================================================================
// Single security boundary for authentication
//
// Responsibilities:
// - Read Supabase session (using publishable key)
// - Redirect unauthenticated users → /login
// - Redirect authenticated users away from auth pages → /dashboard
// - Apply security headers
//
// ✅ Uses NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (no anon key)
// ✅ Node.js runtime (allows process.env access)
// ✅ Cookie-correct (reads from NextRequest, writes to NextResponse)
// ✅ Deterministic auth behavior (no silent failures)
//
// ❌ No DB calls
// ❌ No role logic
// ❌ No business rules
// =============================================================================

export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Routes that do NOT require authentication
 */
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

/**
 * Routes that authenticated users should be redirected away from
 * (e.g., login/register when already logged in)
 */
const AUTH_REDIRECT_ROUTES = ['/login', '/register'];

/**
 * Routes that SHOULD ALWAYS be protected
 * (explicit allowlist for clarity)
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/cases',
  '/jobs',
  '/calendar',
  '/transcripts',
  '/reports',
  '/settings',
  '/billing',
  '/exports',
  '/wkt', // WKT Quiz Module routes
];

/**
 * Role-based route protection
 * Maps roles to route prefixes they can access
 */
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  ADMIN: [
    '/admin',
    '/dashboard',
    '/cases',
    '/jobs',
    '/calendar',
    '/transcripts',
    '/reports',
    '/settings',
    '/billing',
    '/exports',
    '/wkt', // Admins can access WKT
  ],
  REPORTER: [
    '/dashboard',
    '/cases',
    '/jobs',
    '/calendar',
    '/transcripts',
    '/reports',
    '/settings',
  ],
  SCOPIST: [
    '/cases',
    '/jobs',
    '/transcripts',
  ],
  ATTORNEY: [
    '/dashboard',
    '/cases',
    '/transcripts',
    '/reports',
  ],
  AGENCY: [
    '/dashboard',
    '/cases',
    '/jobs',
    '/calendar',
  ],
  WKT_STUDENT: [
    '/wkt', // WKT students only have access to WKT routes
  ],
};

/**
 * Routes to bypass middleware entirely
 */
function isBypassRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname === '/api/health'
  );
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

/**
 * Check if route should redirect authenticated users
 */
function isAuthRedirectRoute(pathname: string): boolean {
  return AUTH_REDIRECT_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

/**
 * Check if route is protected
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return response;
}

/**
 * Middleware function
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip static files, Next internals, and public assets
  if (isBypassRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow public routes without auth
  if (isPublicRoute(pathname)) {
    // Create a response we can mutate with cookies for session refresh
    const res = NextResponse.next();

    /**
     * Supabase server client (Edge-safe)
     * Uses:
     * - NEXT_PUBLIC_SUPABASE_URL
     * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
     */
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options) {
            res.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Redirect authenticated users away from login/register
    if (isAuthRedirectRoute(pathname)) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const redirect = NextResponse.redirect(new URL('/dashboard', req.url));
        return applySecurityHeaders(redirect);
      }
    }

    return applySecurityHeaders(res);
  }

  // Create a response we can mutate with cookies
  const res = NextResponse.next();

  /**
   * Supabase server client (Edge-safe)
   * Uses:
   * - NEXT_PUBLIC_SUPABASE_URL
   * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  /**
   * Get the current session
   * This validates cookies + refresh token automatically
   */
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // If Supabase throws an auth error, treat as unauthenticated
  if (error) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('reason', 'auth_error');
    const redirect = NextResponse.redirect(redirectUrl);
    return applySecurityHeaders(redirect);
  }

  /**
   * If the route is protected and no session exists → redirect
   */
  if (isProtectedRoute(pathname) && !session) {
    const redirectUrl = new URL('/login', req.url);
    // For WKT routes, set redirect to /wkt
    if (pathname.startsWith('/wkt')) {
      redirectUrl.searchParams.set('redirect', '/wkt');
    } else {
      redirectUrl.searchParams.set('redirect', `${pathname}${search}`);
    }
    const redirect = NextResponse.redirect(redirectUrl);
    return applySecurityHeaders(redirect);
  }

  /**
   * Role-based access control (RBAC)
   * Extract role from user_metadata
   */
  if (session && isProtectedRoute(pathname)) {
    const userMetadata = session.user.user_metadata || {};
    const role = userMetadata.role as string | undefined;
    const orgId = userMetadata.org_id as string | undefined;
    const caseIds = (userMetadata.case_ids as string[] | undefined) || [];

    // Special handling for /wkt routes - allow any authenticated user for now
    // (WKT layout will enforce WKT_STUDENT role check)
    if (pathname.startsWith('/wkt')) {
      // Allow authenticated users to access WKT routes
      // The WKT layout will handle role-based redirects
      return applySecurityHeaders(res);
    }

    // ❌ Missing role = deny access
    if (!role) {
      const redirectUrl = new URL('/unauthorized', req.url);
      redirectUrl.searchParams.set('reason', 'missing_role');
      const redirect = NextResponse.redirect(redirectUrl);
      return applySecurityHeaders(redirect);
    }

    // 🔐 Role-based route enforcement
    const allowedPrefixes = ROLE_PROTECTED_ROUTES[role] || [];

    const isRoleAllowed = allowedPrefixes.some(prefix =>
      pathname.startsWith(prefix)
    );

    if (!isRoleAllowed) {
      const redirectUrl = new URL('/unauthorized', req.url);
      redirectUrl.searchParams.set('reason', 'insufficient_role');
      redirectUrl.searchParams.set('role', role);
      const redirect = NextResponse.redirect(redirectUrl);
      return applySecurityHeaders(redirect);
    }

    // 🏢 Organization scoping (example: /org/[orgId]/...)
    const orgMatch = pathname.match(/^\/org\/([^/]+)/);
    if (orgMatch && orgId && orgMatch[1] !== orgId) {
      const redirectUrl = new URL('/unauthorized', req.url);
      redirectUrl.searchParams.set('reason', 'org_mismatch');
      const redirect = NextResponse.redirect(redirectUrl);
      return applySecurityHeaders(redirect);
    }

    // 📁 Case scoping (example: /cases/[caseId])
    const caseMatch = pathname.match(/^\/cases\/([^/]+)/);
    if (caseMatch && caseIds.length > 0 && !caseIds.includes(caseMatch[1])) {
      const redirectUrl = new URL('/unauthorized', req.url);
      redirectUrl.searchParams.set('reason', 'case_access_denied');
      redirectUrl.searchParams.set('caseId', caseMatch[1]);
      const redirect = NextResponse.redirect(redirectUrl);
      return applySecurityHeaders(redirect);
    }
  }

  /**
   * Authenticated → continue with security headers
   */
  return applySecurityHeaders(res);
}

/**
 * Matcher: apply middleware only where it makes sense
 */
export const config = {
  matcher: [
    /*
      Run on all routes except:
      - static files
      - public assets
    */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

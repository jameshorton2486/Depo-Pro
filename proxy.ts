// proxy.ts
// Auth middleware re-export — consumed by tests via @/proxy and Next.js edge runtime.
// Handles session checking, RBAC, org scoping, case scoping, and security headers.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require ADMIN role
const ADMIN_PREFIXES = ['/admin'];

// Routes requiring any authenticated user with a role
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/jobs',
  '/reporter',
  '/scopist',
  '/attorney',
];

// Routes accessible to authenticated users regardless of role
const WKT_PREFIX = '/wkt';
const ORG_PREFIX = '/org';
const CASES_PREFIX = '/cases';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
const BYPASS_PREFIXES = ['/_next', '/api/health', '/api/cron', '/favicon.ico', '/api/auth'];
const BYPASS_EXTENSIONS = ['.ico', '.png', '.jpg', '.svg', '.webp', '.css', '.js'];

function bypass(pathname: string): boolean {
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (BYPASS_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return true;
  return false;
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  return response;
}

/**
 * Auth proxy middleware.
 * - Unauthenticated → /login?redirect=<url>
 * - Authenticated on /login → /dashboard
 * - Missing role → /unauthorized?reason=missing_role
 * - Insufficient role → /unauthorized?reason=insufficient_role
 * - Org mismatch → /unauthorized?reason=org_mismatch
 * - Case access denied → /unauthorized?reason=case_access_denied
 * - Security headers applied to all responses
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Static assets, health check, etc. — bypass entirely
  if (bypass(pathname)) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder';

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = user?.user_metadata ?? {};

  // --- Public path — allow through ---
  if (PUBLIC_PATHS.includes(pathname)) {
    // Authenticated user on /login → redirect to dashboard
    if (user && pathname === '/login') {
      url.pathname = '/dashboard';
      return applySecurityHeaders(NextResponse.redirect(url, { status: 307 }));
    }
    return applySecurityHeaders(response);
  }

  // --- Unauthenticated user accessing any non-public path ---
  if (!user) {
    const isProtected =
      PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
      ADMIN_PREFIXES.some((p) => pathname.startsWith(p)) ||
      pathname.startsWith(WKT_PREFIX) ||
      pathname.startsWith(ORG_PREFIX) ||
      pathname.startsWith(CASES_PREFIX);

    if (isProtected) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname + (url.search || ''));
      return applySecurityHeaders(NextResponse.redirect(redirectUrl, { status: 307 }));
    }
    return applySecurityHeaders(response);
  }

  // --- Authenticated from here on ---
  const role: string | undefined = meta.role;

  // WKT routes: any authenticated user, role not required
  if (pathname.startsWith(WKT_PREFIX)) {
    return applySecurityHeaders(response);
  }

  // Org-scoped routes: /org/:org_id/...
  if (pathname.startsWith(ORG_PREFIX)) {
    const segments = pathname.split('/');
    const orgIdInUrl = segments[2]; // /org/<org_id>/...
    const userOrgId: string | undefined = meta.org_id;
    if (orgIdInUrl && userOrgId && orgIdInUrl !== userOrgId) {
      url.pathname = '/unauthorized';
      url.searchParams.set('reason', 'org_mismatch');
      return applySecurityHeaders(NextResponse.redirect(url, { status: 307 }));
    }
    return applySecurityHeaders(response);
  }

  // Case-scoped routes: /cases/:case_id
  if (pathname.startsWith(CASES_PREFIX)) {
    const segments = pathname.split('/');
    const caseIdInUrl = segments[2]; // /cases/<case_id>
    const caseIds: string[] = meta.case_ids ?? [];
    if (caseIdInUrl && caseIds.length > 0 && !caseIds.includes(caseIdInUrl)) {
      url.pathname = '/unauthorized';
      url.searchParams.set('reason', 'case_access_denied');
      return applySecurityHeaders(NextResponse.redirect(url, { status: 307 }));
    }
    return applySecurityHeaders(response);
  }

  // Role-required routes
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtectedRoute = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isAdminRoute || isProtectedRoute) {
    if (!role) {
      url.pathname = '/unauthorized';
      url.searchParams.set('reason', 'missing_role');
      return applySecurityHeaders(NextResponse.redirect(url, { status: 307 }));
    }
    if (isAdminRoute && role !== 'ADMIN') {
      url.pathname = '/unauthorized';
      url.searchParams.set('reason', 'insufficient_role');
      return applySecurityHeaders(NextResponse.redirect(url, { status: 307 }));
    }
  }

  return applySecurityHeaders(response);
}

export default proxy;

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE - ROUTE PROTECTION
// ═══════════════════════════════════════════════════════════════
// Protects dashboard, jobs, and API routes from unauthorized access

import { auth } from '@/lib/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Define protected routes
  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
  const isProtectedRoute = 
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/jobs') ||
    nextUrl.pathname.startsWith('/admin') ||
    nextUrl.pathname.startsWith('/reporter') ||
    nextUrl.pathname.startsWith('/scopist');

  // Allow public API routes (auth endpoints)
  if (isApiRoute) {
    if (nextUrl.pathname.startsWith('/api/auth')) {
      return; // Allow NextAuth routes
    }
    // Protect other API routes
    if (!isLoggedIn) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return;
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL('/dashboard', nextUrl));
  }

  // Redirect non-logged-in users to login
  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', callbackUrl);
    return Response.redirect(loginUrl);
  }

  return;
});

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};

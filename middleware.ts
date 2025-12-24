// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
];

// Paths that require specific roles
const roleRestrictedPaths: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/reporter': ['ADMIN', 'REPORTER'],
  '/scopist': ['ADMIN', 'SCOPIST'],
  '/attorney': ['ADMIN', 'ATTORNEY'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check authentication
  let token;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch (error) {
    // Handle JWT decryption errors (e.g., after secret rotation)
    // If token can't be decrypted, treat as not authenticated
    if (
      error instanceof Error &&
      (error.message.includes('decryption') ||
       error.message.includes('no matching decryption secret'))
    ) {
      token = null;
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  for (const [path, roles] of Object.entries(roleRestrictedPaths)) {
    if (pathname.startsWith(path)) {
      const userRole = token.role as string;
      if (!roles.includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // Add security headers
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
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

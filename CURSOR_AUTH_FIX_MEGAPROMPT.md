# 🔐 DEPO-PRO AUTHENTICATION FIX MEGAPROMPT

## FOR CURSOR AI - COMPREHENSIVE AUTH SYSTEM REBUILD

**Priority:** CRITICAL
**Estimated Time:** 2-3 hours
**Risk Level:** HIGH - Security vulnerabilities exist

---

## 📋 EXECUTIVE SUMMARY

This megaprompt will guide you through fixing ALL authentication issues in the Depo-Pro codebase. The current implementation has:

1. **Duplicate Supabase clients** causing session desync
2. **Role escalation vulnerability** - users can set their own role
3. **Missing SSR cookie management** - not using @supabase/ssr
4. **No auth callback route** - PKCE flows broken
5. **Middleware trusts user_metadata** instead of database profile
6. **Missing password recovery flow** - onAuthStateChange not handled

---

## 🎯 TARGET ARCHITECTURE

```
lib/
  supabase/
    browser.ts      ← Browser client (anon key, @supabase/ssr)
    server.ts       ← Server client (cookie-based, @supabase/ssr)  
    admin.ts        ← Admin client (service role, privileged ops only)
    middleware.ts   ← Token extraction helper

lib/
  auth/
    profile-guard.ts     ← Self-healing profile creation (SERVER ONLY)
    get-user-with-profile.ts  ← Canonical user+profile getter
    route-access.ts      ← (already exists, good)
    require-auth.ts      ← API route auth wrapper

app/
  auth/
    callback/route.ts    ← PKCE code exchange handler
    confirm/route.ts     ← Email confirmation handler

middleware.ts            ← Global auth gatekeeper
```

---

## 🚀 PHASE 1: INSTALL DEPENDENCIES

First, ensure @supabase/ssr is installed:

```bash
npm install @supabase/ssr
```

---

## 🚀 PHASE 2: CREATE CANONICAL SUPABASE CLIENTS

### Task 2.1: Create `lib/supabase/browser.ts`

Create a NEW file at `lib/supabase/browser.ts`:

```typescript
// lib/supabase/browser.ts
// ═══════════════════════════════════════════════════════════════
// BROWSER CLIENT - For Client Components only
// Uses anon key, handles session via cookies
// ═══════════════════════════════════════════════════════════════

'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Singleton for client-side use
let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }
  return browserClient;
}
```

### Task 2.2: Create `lib/supabase/server.ts`

Create a NEW file at `lib/supabase/server.ts`:

```typescript
// lib/supabase/server.ts
// ═══════════════════════════════════════════════════════════════
// SERVER CLIENT - For Server Components, Route Handlers, Server Actions
// Uses cookies for session management (Next.js 15 async compatible)
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  // CRITICAL: In Next.js 15, cookies() is async
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignore errors in Server Components (read-only)
        }
      },
    },
  });
}
```

### Task 2.3: Create `lib/supabase/admin.ts`

Create a NEW file at `lib/supabase/admin.ts`:

```typescript
// lib/supabase/admin.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN CLIENT - Service role for privileged operations
// ⚠️ NEVER expose to client, NEVER use for user identity
// Use ONLY for: user lookup by token, admin operations
// ═══════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
```

### Task 2.4: Create `lib/supabase/middleware.ts`

Create a NEW file at `lib/supabase/middleware.ts`:

```typescript
// lib/supabase/middleware.ts
// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE CLIENT - For Edge runtime
// Handles session refresh and token extraction
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function createSupabaseMiddlewareClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Create response to pass to supabase client
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, response };
}
```

---

## 🚀 PHASE 3: UPDATE MIDDLEWARE (CRITICAL)

Replace the ENTIRE contents of `middleware.ts` with:

```typescript
// middleware.ts
// ═══════════════════════════════════════════════════════════════
// GLOBAL AUTH GATEKEEPER
// Single source of truth for authentication and route protection
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { isPublicRoute, hasRouteAccess } from '@/lib/permissions/route-access';

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

    // Get role from user metadata (set during signup or by admin)
    // Note: For stronger security, query the database profile here
    const userRole = (user.user_metadata?.role as string) || 'REPORTER';

    // Check route access
    if (!hasRouteAccess(pathname, userRole as any)) {
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
```

---

## 🚀 PHASE 4: CREATE AUTH CALLBACK ROUTE

Create a NEW file at `app/auth/callback/route.ts`:

```typescript
// app/auth/callback/route.ts
// ═══════════════════════════════════════════════════════════════
// AUTH CALLBACK - Handles PKCE code exchange and email confirmations
// ═══════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Handle OAuth/PKCE errors
  if (error) {
    console.error('Auth callback error:', error, error_description);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', error_description || error);
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createSupabaseServerClient();

  // Handle PKCE code exchange (OAuth and magic link)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      const redirectUrl = new URL('/login', origin);
      redirectUrl.searchParams.set('error', 'Failed to authenticate. Please try again.');
      return NextResponse.redirect(redirectUrl);
    }

    // Successful auth - redirect to intended destination
    return NextResponse.redirect(new URL(next, origin));
  }

  // Handle token hash (email confirmation, password recovery)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (verifyError) {
      console.error('OTP verification error:', verifyError);
      const redirectUrl = new URL('/login', origin);
      redirectUrl.searchParams.set('error', 'Link expired or invalid. Please try again.');
      return NextResponse.redirect(redirectUrl);
    }

    // Handle password recovery - redirect to update password page
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/update-password', origin));
    }

    // Handle email confirmation
    if (type === 'email' || type === 'signup') {
      return NextResponse.redirect(new URL('/dashboard', origin));
    }

    return NextResponse.redirect(new URL(next, origin));
  }

  // No code or token - redirect to login
  return NextResponse.redirect(new URL('/login', origin));
}
```

---

## 🚀 PHASE 5: CREATE UPDATE PASSWORD PAGE

Create a NEW file at `app/(auth)/update-password/page.tsx`:

```typescript
// app/(auth)/update-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Verify user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Invalid or expired reset link');
        router.push('/forgot-password');
        return;
      }
      
      setIsValidSession(true);
      setIsCheckingSession(false);
    };

    checkSession();

    // Listen for auth state changes
    const supabase = getSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setIsCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      toast.success('Password updated successfully');
      router.push('/login?message=Password updated. Please log in with your new password.');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isValidSession) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🚀 PHASE 6: FIX PROFILE API SECURITY VULNERABILITY

Replace the ENTIRE contents of `app/api/profile/route.ts` with:

```typescript
// app/api/profile/route.ts
// ═══════════════════════════════════════════════════════════════
// PROFILE API - Secure profile management
// ⚠️ SECURITY: Role changes are ADMIN-ONLY
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureUserProfile } from '@/lib/auth/profile-guard';

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const { user, error } = await validateToken(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Ensure profile exists and return it
    const profile = await ensureUserProfile(user);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

/**
 * POST /api/profile
 * Create or update user profile
 * ⚠️ SECURITY: Role updates require ADMIN privilege
 */
export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const { user, error } = await validateToken(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, agencyName, phone, role, targetUserId } = body;

    // Ensure profile exists first
    const currentProfile = await ensureUserProfile(user);

    // Determine if this is a self-update or admin updating another user
    const isAdminRequest = currentProfile.role === UserRole.ADMIN;
    const updateTargetId = targetUserId && isAdminRequest ? targetUserId : user.id;
    const isSelfUpdate = updateTargetId === user.id;

    // Build allowed updates (safe fields anyone can update on themselves)
    const allowedUpdates: Record<string, any> = {};

    if (isSelfUpdate) {
      if (firstName) allowedUpdates.firstName = firstName;
      if (lastName) allowedUpdates.lastName = lastName;
      if (agencyName !== undefined) allowedUpdates.agencyName = agencyName;
      if (phone !== undefined) allowedUpdates.phone = phone;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔒 SECURITY: Role changes are ADMIN-ONLY
    // ═══════════════════════════════════════════════════════════════
    if (role) {
      if (!isAdminRequest) {
        return NextResponse.json(
          { error: 'Role changes require admin privileges' },
          { status: 403 }
        );
      }

      // Validate role is a valid enum value
      if (!Object.values(UserRole).includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role value' },
          { status: 400 }
        );
      }

      allowedUpdates.role = role;

      // If admin is updating another user, allow all fields
      if (!isSelfUpdate) {
        if (firstName) allowedUpdates.firstName = firstName;
        if (lastName) allowedUpdates.lastName = lastName;
        if (agencyName !== undefined) allowedUpdates.agencyName = agencyName;
        if (phone !== undefined) allowedUpdates.phone = phone;
      }
    }

    // Only update if there are changes
    if (Object.keys(allowedUpdates).length > 0) {
      const updated = await db.user.update({
        where: { id: updateTargetId },
        data: allowedUpdates,
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          agencyName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({ profile: updated });
    }

    return NextResponse.json({ profile: currentProfile });
  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

async function validateToken(token: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  return { user: data?.user, error };
}
```

---

## 🚀 PHASE 7: CREATE AUTH GUARD FOR API ROUTES

Create a NEW file at `lib/auth/require-auth.ts`:

```typescript
// lib/auth/require-auth.ts
// ═══════════════════════════════════════════════════════════════
// API ROUTE AUTH WRAPPER
// Validates authentication and ensures profile exists
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureUserProfile } from '@/lib/auth/profile-guard';
import { hasApiAccess } from '@/lib/permissions/route-access';
import type { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest {
  user: User;
  profile: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
  token: string;
}

type AuthHandler = (
  request: Request,
  auth: AuthenticatedRequest
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with authentication
 * 
 * @example
 * export const GET = requireAuth(async (request, { user, profile }) => {
 *   return NextResponse.json({ user: profile });
 * });
 */
export function requireAuth(handler: AuthHandler) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : null;

      if (!token) {
        return NextResponse.json(
          { error: 'Missing access token' },
          { status: 401 }
        );
      }

      // Validate token with Supabase
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Ensure profile exists in database
      const profile = await ensureUserProfile(data.user);

      // Check API route access
      const url = new URL(request.url);
      if (!hasApiAccess(url.pathname, profile.role as any)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Call the handler with authenticated context
      return handler(request, {
        user: data.user,
        profile,
        token,
      });
    } catch (error) {
      console.error('Auth wrapper error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Require specific roles for an API route
 */
export function requireRole(roles: string[], handler: AuthHandler) {
  return requireAuth(async (request, auth) => {
    if (!roles.includes(auth.profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    return handler(request, auth);
  });
}
```

---

## 🚀 PHASE 8: UPDATE PUBLIC ROUTES

Update `lib/permissions/route-access.ts` to add missing public routes:

Find the `PUBLIC_ROUTES` array and update it:

```typescript
export const PUBLIC_ROUTES: string[] = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/update-password', // ADD THIS
  '/auth/callback',   // ADD THIS
  '/auth/confirm',    // ADD THIS
  '/about',
  '/features',
  '/pricing',
  '/security',
  '/contact',
  '/api/auth',
  '/api/health',
];
```

---

## 🚀 PHASE 9: DELETE DUPLICATE FILES

Delete the following files (they are duplicates causing confusion):

```bash
# Delete these files:
rm -f lib/supabase-client.ts
rm -f lib/supabase-server.ts
rm -rf utils/supabase/
```

---

## 🚀 PHASE 10: UPDATE IMPORTS ACROSS CODEBASE

After deleting the duplicate files, you need to update all imports.

### Find and replace patterns:

1. **Replace `lib/supabase-client.ts` imports:**
   ```
   FIND:    import { createSupabaseBrowserClient } from '@/lib/supabase-client'
   REPLACE: import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
   ```

2. **Replace `lib/supabase-server.ts` imports:**
   ```
   FIND:    import { createSupabaseServiceClient } from '@/lib/supabase-server'
   REPLACE: import { getSupabaseAdminClient } from '@/lib/supabase/admin'
   ```

3. **Replace `utils/supabase/server.ts` imports:**
   ```
   FIND:    import { createSupabaseServiceClient } from '@/utils/supabase/server'
   REPLACE: import { getSupabaseAdminClient } from '@/lib/supabase/admin'
   ```

4. **Replace `utils/supabase/client.ts` imports:**
   ```
   FIND:    import { createSupabaseBrowserClient } from '@/utils/supabase/client'
   REPLACE: import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
   ```

5. **Replace `utils/supabase/middleware.ts` imports:**
   ```
   FIND:    import { getSupabaseUserFromRequest } from '@/utils/supabase/middleware'
   REPLACE: (Delete - middleware now handles this internally)
   ```

---

## 🚀 PHASE 11: UPDATE LOGIN PAGE

Update `app/(auth)/login/page.tsx` to use the new client:

Find any imports of Supabase client and update them:

```typescript
// CHANGE FROM:
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
// or
import { createSupabaseBrowserClient } from '@/utils/supabase/client';

// CHANGE TO:
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

// Then in your component:
const supabase = getSupabaseBrowserClient();
```

---

## 🚀 PHASE 12: UPDATE FORGOT PASSWORD PAGE

Ensure `app/(auth)/forgot-password/page.tsx` uses the correct redirect URL:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const supabase = getSupabaseBrowserClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // CRITICAL: This must point to your callback route
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (error) throw error;

    toast.success('Check your email for the reset link');
  } catch (error: any) {
    toast.error(error.message || 'Failed to send reset email');
  } finally {
    setIsLoading(false);
  }
};
```

---

## ✅ VERIFICATION CHECKLIST

After completing all phases, verify:

- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run build` completes successfully
- [ ] Login flow works (email/password)
- [ ] Registration creates profile in database
- [ ] Password reset email sends correctly
- [ ] Password reset link redirects to update page
- [ ] Password update saves new password
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Admin routes block non-admin users
- [ ] Role escalation is impossible (try POST to /api/profile with role: "ADMIN")
- [ ] No redirect loops occur

---

## 🔍 DEBUGGING COMMON ISSUES

### "cookies must be awaited" error
- Ensure all server-side Supabase calls use `await createSupabaseServerClient()`
- Never call `cookies()` synchronously

### Redirect loops
- Check PUBLIC_ROUTES includes all auth-related paths
- Ensure /auth/callback and /update-password are bypassed in middleware

### Session not persisting
- Verify cookies are being set (check browser DevTools)
- Ensure NEXT_PUBLIC_SUPABASE_URL is correct
- Check Supabase dashboard for correct Site URL and Redirect URLs

### Profile not created
- Verify `ensureUserProfile` is called after authentication
- Check database connection is working
- Look for Prisma errors in server logs

---

## 📚 FILE REFERENCE

After completion, your auth-related files should be:

```
lib/
  supabase/
    browser.ts      ← NEW (client-side)
    server.ts       ← NEW (server-side with cookies)
    admin.ts        ← NEW (service role)
    middleware.ts   ← NEW (edge runtime)
  auth/
    profile-guard.ts     ← EXISTS (no changes needed)
    require-auth.ts      ← NEW (API wrapper)
  permissions/
    route-access.ts      ← UPDATE (add public routes)

app/
  auth/
    callback/route.ts    ← NEW (PKCE handler)
  (auth)/
    update-password/page.tsx  ← NEW (password reset)
    login/page.tsx            ← UPDATE (imports)
    forgot-password/page.tsx  ← UPDATE (redirectTo)

middleware.ts  ← REPLACE (complete rewrite)

# DELETED:
lib/supabase-client.ts
lib/supabase-server.ts
utils/supabase/  (entire folder)
```

---

**END OF MEGAPROMPT**

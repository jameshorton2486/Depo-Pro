// ═══════════════════════════════════════════════════════════════
// AUTH HELPER FUNCTIONS (LEGACY - DEPRECATED)
// ═══════════════════════════════════════════════════════════════
// ⚠️ DEPRECATED: This file is kept for backward compatibility only
// 
// MIGRATION GUIDE:
// - Client components: Use useAuth() hook from '@/lib/auth/use-auth'
// - Server components: Use createSupabaseServerClient() from '@/lib/supabase/server'
// - API routes: Use createSupabaseServerClient() or getSupabaseAdmin()
// 
// This file will be removed in a future version.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/constants';
import type { UserRole } from '@/types/database';
import { redirect } from 'next/navigation';

/**
 * Get the current authenticated user's session
 * Returns null if not authenticated
 * Returns session format: { user: { id, email, role, name, firmId } }
 *
 * @example
 * ```ts
 * const session = await getCurrentUser();
 * if (session) {
 *   logger.debug(session.user.email);
 * }
 * ```
 */
export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    // Fetch user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // Return session format
    return {
      user: {
        id: user.id,
        email: user.email || '',
        role: (profile.role as UserRole) || 'REPORTER',
        name: profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name || profile.last_name || null,
        firmId: profile.firm_id || null,
      }
    };
  } catch (error) {
    console.error('[auth] Error getting current user:', error);
    return null;
  }
}

// Export auth as an alias for backward compatibility
export const auth = getCurrentUser;

// NextAuth has been removed - Supabase Auth is the only auth system

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in Server Components and API routes
 *
 * @throws Redirects to /login if not authenticated
 * @returns Session object
 *
 * @example
 * ```ts
 * const session = await requireAuth();
 * // User is guaranteed to be authenticated here
 * logger.debug(session.user.id);
 * ```
 */
export async function requireAuth() {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    redirect('/login');
  }

  return session;
}

/**
 * Require specific role(s) - throws error if user doesn't have required role
 * Use this to implement role-based access control
 *
 * @param roles - Array of allowed roles
 * @throws Error if user doesn't have required role
 * @returns Session object
 *
 * @example
 * ```ts
 * // Only allow admins and court reporters
 * const session = await requireRole([Role.ADMIN, Role.REPORTER]);
 * ```
 */
export async function requireRole(roles: Role[]) {
  const session = await requireAuth();

  if (!roles.includes(session.user.role as Role)) {
    throw new Error('Insufficient permissions');
  }

  return session;
}

/**
 * Check if user has specific role
 * Returns false if not authenticated
 *
 * @param role - Role to check
 * @returns true if user has the role
 *
 * @example
 * ```ts
 * const isAdmin = await hasRole(Role.ADMIN);
 * if (isAdmin) {
 *   // Show admin-only content
 * }
 * ```
 */
export async function hasRole(role: Role): Promise<boolean> {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    return false;
  }

  return session.user.role === role;
}

/**
 * Check if user has any of the specified roles
 * Returns false if not authenticated
 *
 * @param roles - Array of roles to check
 * @returns true if user has any of the roles
 *
 * @example
 * ```ts
 * const canCreateJob = await hasAnyRole([Role.ADMIN, Role.COURT_REPORTER]);
 * ```
 */
export async function hasAnyRole(roles: Role[]): Promise<boolean> {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    return false;
  }

  return roles.includes(session.user.role as Role);
}

/**
 * Require role for API routes - returns JSON error instead of redirect
 * Use this in API routes
 *
 * NOTE: This function intentionally returns NextResponse on failure
 * to simplify API route usage. Do NOT refactor to throw.
 *
 * @param roles - Array of allowed roles
 * @returns Session object or NextResponse error
 *
 * @example
 * ```ts
 * const session = await requireRoleApi([Role.ADMIN, Role.REPORTER]);
 * if (session instanceof NextResponse) return session; // Error response
 * // session is valid here
 * ```
 */
export async function requireRoleApi(
  roles: Role[]
): Promise<{ user: { id: string; email: string; role: Role } } | NextResponse> {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!roles.includes(session.user.role as Role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return session as { user: { id: string; email: string; role: Role } };
}

/**
 * Check if session has one of the allowed roles
 * Utility for inline checks
 *
 * @param session - Session object (can be null)
 * @param roles - Array of allowed roles
 * @returns true if session has one of the roles
 *
 * @example
 * ```ts
 * const session = await getCurrentUser();
 * if (isAuthorized(session, [Role.ADMIN, Role.REPORTER])) {
 *   // User is authorized
 * }
 * ```
 */
export function isAuthorized(session: any, roles: Role[]): boolean {
  return session?.user?.role && roles.includes(session.user.role as Role);
}

/**
 * Type guard to narrow session type after role check
 *
 * @param session - Session object
 * @param role - Role to check
 * @returns true if session has the role
 *
 * @example
 * ```ts
 * const session = await getCurrentUser();
 * if (assertRole(session, Role.ADMIN)) {
 *   // TypeScript knows session.user.role is Role.ADMIN here
 * }
 * ```
 */
export function assertRole<T extends Role>(
  session: any,
  role: T
): session is { user: { id: string; email: string; role: T } } {
  return session?.user?.role === role;
}

// /**
//  * Get current user's firm ID
//  * Returns null if not authenticated or no firm assigned
//  *
//  * @returns Firm ID or null
//  */
// export async function getCurrentFirmId(): Promise<string | null> {
//   const session = await getCurrentUser();

//   if (!session || !session.user) {
//     return null;
//   }

//   return null; // Firm concept removed
// }

// /**
//  * Require user to have a firm assigned
//  * Useful for multi-tenant features
//  *
//  * @throws Error if user doesn't have a firm
//  * @returns Firm ID
//  */
// export async function requireFirm(): Promise<string> {
//   const session = await requireAuth();

//   // Firm concept removed
//   throw new Error('Firm concept removed');
// }



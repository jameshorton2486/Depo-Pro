// ═══════════════════════════════════════════════════════════════
// AUTH HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
// Utility functions for authentication and authorization

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth-options';
import { Role } from '@/lib/constants';
import { redirect } from 'next/navigation';

// Initialize NextAuth with our config
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

/**
 * Get the current authenticated user's session
 * Returns null if not authenticated
 *
 * @example
 * ```ts
 * const session = await getCurrentUser();
 * if (session) {
 *   console.log(session.user.email);
 * }
 * ```
 */
export async function getCurrentUser() {
  try {
    return await auth();
  } catch (error) {
    // Handle JWT decryption errors (e.g., after secret rotation)
    // If the session token can't be decrypted, treat as logged out
    if (
      error instanceof Error &&
      (error.message.includes('decryption') ||
       error.message.includes('no matching decryption secret') ||
       error.name === 'JWTSessionError')
    ) {
      // Session token is invalid (likely from old secret), treat as logged out
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

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
 * console.log(session.user.id);
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

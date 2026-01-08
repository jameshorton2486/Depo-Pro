// ═══════════════════════════════════════════════════════════════
// SUPABASE-NATIVE AUTH HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
// Replaces NextAuth with Supabase-native authentication
// Use this in Server Components and API routes

import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import type { Role } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 * 
 * @example
 * ```ts
 * const user = await getUser();
 * if (user) {
 *   console.log(user.email);
 * }
 * ```
 */
export async function getUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('[Auth] Error getting user:', error);
    return null;
  }
}

/**
 * Get the current authenticated user with their profile
 * Returns null if not authenticated or profile not found
 * 
 * @example
 * ```ts
 * const userWithProfile = await getUserWithProfile();
 * if (userWithProfile) {
 *   console.log(userWithProfile.user.email);
 *   console.log(userWithProfile.profile.role);
 * }
 * ```
 */
export async function getUserWithProfile() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }
    
    // Fetch profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      // Profile might not exist yet (new user)
      return {
        user,
        profile: null,
      };
    }
    
    return {
      user,
      profile,
    };
  } catch (error) {
    console.error('[Auth] Error getting user with profile:', error);
    return null;
  }
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in Server Components and API routes
 * 
 * @throws Redirects to /login if not authenticated
 * @returns User object
 * 
 * @example
 * ```ts
 * const user = await requireAuth();
 * // User is guaranteed to be authenticated here
 * console.log(user.email);
 * ```
 */
export async function requireAuth() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

/**
 * Require authentication for API routes - returns JSON error instead of redirect
 * Use this in API routes
 * 
 * @returns User object or NextResponse error
 * 
 * @example
 * ```ts
 * const user = await requireAuthApi();
 * if (user instanceof NextResponse) return user; // Error response
 * // user is valid here
 * ```
 */
export async function requireAuthApi(): Promise<typeof user | NextResponse> {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return user;
}

/**
 * Require specific role(s) - throws error if user doesn't have required role
 * Use this to implement role-based access control
 * 
 * @param roles - Array of allowed roles
 * @throws Error if user doesn't have required role
 * @returns User with profile
 * 
 * @example
 * ```ts
 * // Only allow admins and court reporters
 * const { user, profile } = await requireRole(['ADMIN', 'REPORTER']);
 * ```
 */
export async function requireRole(roles: Role[]) {
  const userWithProfile = await getUserWithProfile();
  
  if (!userWithProfile || !userWithProfile.profile) {
    redirect('/login');
  }
  
  const userRole = userWithProfile.profile.role as Role;
  
  if (!roles.includes(userRole)) {
    throw new Error('Insufficient permissions');
  }
  
  return userWithProfile;
}

/**
 * Require specific role(s) for API routes - returns JSON error instead of redirect
 * Use this in API routes
 * 
 * @param roles - Array of allowed roles
 * @returns User with profile or NextResponse error
 * 
 * @example
 * ```ts
 * const result = await requireRoleApi(['ADMIN', 'REPORTER']);
 * if (result instanceof NextResponse) return result; // Error response
 * // result.user and result.profile are valid here
 * ```
 */
export async function requireRoleApi(
  roles: Role[]
): Promise<{ user: any; profile: any } | NextResponse> {
  const userWithProfile = await getUserWithProfile();
  
  if (!userWithProfile || !userWithProfile.profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userRole = userWithProfile.profile.role as Role;
  
  if (!roles.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  return userWithProfile;
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
 * const isAdmin = await hasRole('ADMIN');
 * if (isAdmin) {
 *   // Show admin-only content
 * }
 * ```
 */
export async function hasRole(role: Role): Promise<boolean> {
  const userWithProfile = await getUserWithProfile();

  if (!userWithProfile || !userWithProfile.profile) {
    return false;
  }

  return userWithProfile.profile.role === role;
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
 * const canCreateJob = await hasAnyRole(['ADMIN', 'REPORTER']);
 * ```
 */
export async function hasAnyRole(roles: Role[]): Promise<boolean> {
  const userWithProfile = await getUserWithProfile();

  if (!userWithProfile || !userWithProfile.profile) {
    return false;
  }

  return roles.includes(userWithProfile.profile.role as Role);
}

/**
 * Get current user's session
 * Returns null if not authenticated
 * 
 * @returns Session object or null
 */
export async function getSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('[Auth] Error getting session:', error);
    return null;
  }
}

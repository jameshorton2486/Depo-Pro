// lib/supabase/middleware-helper.ts
// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HELPER - Get user from Supabase Auth
// ═══════════════════════════════════════════════════════════════
// Gets authenticated user with role from user_metadata
// Supabase-only: No database lookups, uses user_metadata.role as single source of truth

import type { NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from './middleware';
import { getSupabaseAdminClient } from './admin';
import type { Role } from '@/lib/permissions/route-access';
import { VALID_ROLES } from '@/lib/permissions/route-access';

export interface MiddlewareUser {
  id: string;
  email: string;
  role: Role; // From Supabase user_metadata.role
}

/**
 * Get authenticated user from Supabase session
 * 
 * Uses user_metadata.role as the single source of truth for roles
 * No database lookups - fully Edge-compatible
 * 
 * @param request - Next.js request
 * @returns User with role from user_metadata, or null if not authenticated
 */
export async function getSupabaseUserWithProfile(
  request: NextRequest
): Promise<{ user: MiddlewareUser | null; error: string | null }> {
  try {
    const { supabase, response: _response } = await createSupabaseMiddlewareClient(request);
    
    // Get authenticated user from session
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !supabaseUser) {
      return { user: null, error: authError?.message || 'Not authenticated' };
    }

    if (!supabaseUser.email) {
      return { user: null, error: 'User missing email' };
    }

    // Get role from user_metadata (single source of truth)
    const role = supabaseUser.user_metadata?.role as Role | undefined;
    if (!role || !VALID_ROLES.includes(role)) {
      return { user: null, error: 'User profile incomplete: no role assigned' };
    }

    return {
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        role: role,
      },
      error: null,
    };
  } catch (error) {
    console.error('Middleware auth error:', error);
    return { user: null, error: 'Internal error' };
  }
}

/**
 * Get user by access token (for API routes)
 * 
 * Use this when you have a Bearer token instead of cookies
 * 
 * @param token - Access token from Authorization header
 * @returns User with role from user_metadata or null
 */
export async function getUserByToken(
  token: string
): Promise<{ user: MiddlewareUser | null; error: string | null }> {
  try {
    const supabase = getSupabaseAdminClient();
    
    // Verify token and get user
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !supabaseUser) {
      return { user: null, error: authError?.message || 'Invalid token' };
    }

    if (!supabaseUser.email) {
      return { user: null, error: 'User missing email' };
    }

    // Get role from user_metadata (single source of truth)
    const role = supabaseUser.user_metadata?.role as Role | undefined;
    if (!role || !VALID_ROLES.includes(role)) {
      return { user: null, error: 'User profile incomplete: no role assigned' };
    }

    return {
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        role: role,
      },
      error: null,
    };
  } catch (error) {
    console.error('Token auth error:', error);
    return { user: null, error: 'Internal error' };
  }
}

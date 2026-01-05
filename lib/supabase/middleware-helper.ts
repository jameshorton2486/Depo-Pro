// lib/supabase/middleware-helper.ts
// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HELPER - Get user with profile from database
// ═══════════════════════════════════════════════════════════════
// Gets authenticated user and their profile from database
// SECURITY: Never trusts user_metadata for role - always checks database

import { NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from './middleware';
import { getSupabaseAdminClient } from './admin';
// ⚠️ EDGE RUNTIME: Use dynamic import to avoid pulling Node APIs into Edge
// db.ts imports observability.ts which uses process.uptime() (Node-only)

export interface MiddlewareUser {
  id: string;
  email: string;
  role: string; // From database profile, NOT user_metadata
}

/**
 * Get authenticated user with profile from database
 * 
 * SECURITY: This function:
 * 1. Gets user from Supabase session (verified)
 * 2. Fetches profile from database (authoritative source for role)
 * 3. NEVER trusts user_metadata for role (prevents escalation)
 * 
 * @param request - Next.js request
 * @returns User with role from database, or null if not authenticated
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

    // CRITICAL: Get role from database, NOT from user_metadata
    // This prevents role escalation attacks
    // Use dynamic import to avoid Edge Runtime issues
    const { db } = await import('@/lib/db');
    const profile = await db.user.findUnique({
      where: { id: supabaseUser.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!profile) {
      // Profile doesn't exist - user needs to complete registration
      return { user: null, error: 'Profile not found' };
    }

    return {
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role, // From database - authoritative
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
 * @returns User with profile or null
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

    // Get role from database
    // Use dynamic import to avoid Edge Runtime issues
    const { db } = await import('@/lib/db');
    const profile = await db.user.findUnique({
      where: { id: supabaseUser.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!profile) {
      return { user: null, error: 'Profile not found' };
    }

    return {
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      },
      error: null,
    };
  } catch (error) {
    console.error('Token auth error:', error);
    return { user: null, error: 'Internal error' };
  }
}

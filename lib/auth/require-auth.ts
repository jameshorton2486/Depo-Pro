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
        profile: {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
        },
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

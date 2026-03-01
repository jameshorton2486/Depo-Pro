/**
 * @deprecated Use withRouteProtection from '@/lib/middleware/withRouteProtection' instead.
 * This file is maintained for backward compatibility with existing routes.
 * All new routes MUST use withRouteProtection.
 * See: docs/ARCHITECTURE_OVERVIEW.md — Auth Pattern Standard
 */
// lib/auth/require-auth.ts
// ═══════════════════════════════════════════════════════════════
// API ROUTE AUTH WRAPPER
// Validates authentication using Supabase Auth
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { hasApiAccess, VALID_ROLES } from '@/lib/permissions/route-access';
import type { User } from '@supabase/supabase-js';
import type { Role } from '@/lib/permissions/route-access';

export interface AuthenticatedRequest {
  user: User;
  profile: {
    id: string;
    email: string;
    role: Role;
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

      // Get profile from user_metadata (Supabase-only, no database lookup)
      const user = data.user;
      const role = user.user_metadata?.role as Role | undefined;
      if (!role || !VALID_ROLES.includes(role)) {
        return NextResponse.json(
          { error: 'User profile incomplete: no role assigned' },
          { status: 401 }
        );
      }
      const profile = {
        id: user.id,
        email: user.email || '',
        role: role,
        firstName: user.user_metadata?.firstName || '',
        lastName: user.user_metadata?.lastName || '',
      };

      // Check API route access
      const url = new URL(request.url);
      if (!hasApiAccess(url.pathname, role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Call the handler with authenticated context
      return handler(request, {
        user: user,
        profile: profile,
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
export function requireRole(roles: Role[], handler: AuthHandler) {
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

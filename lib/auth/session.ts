// =============================================================================
// SESSION HELPERS
// Wrapper around Supabase auth to match user's expected interface
// Returns NextAuth-compatible format: { user: {...} }
// =============================================================================

import { getUserWithProfile } from '@/lib/auth-supabase';
import type { UserRole } from '@/types/database';

// Session user format (flat structure for easier access)
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string | null;
  firmId?: string | null;
}

/**
 * Get current authenticated user
 * Returns null if not authenticated
 * Returns flat user object: { id, email, role, name, firmId }
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const userWithProfile = await getUserWithProfile();

  if (!userWithProfile || !userWithProfile.user) {
    return null;
  }

  return {
    id: userWithProfile.user.id,
    email: userWithProfile.user.email || '',
    role: (userWithProfile.profile?.role as UserRole) || 'REPORTER',
    name: userWithProfile.profile?.first_name && userWithProfile.profile?.last_name
      ? `${userWithProfile.profile.first_name} ${userWithProfile.profile.last_name}`
      : userWithProfile.profile?.first_name || userWithProfile.profile?.last_name || null,
    firmId: userWithProfile.profile?.firm_id || null,
  };
}

/**
 * Require authenticated user
 * Throws if not authenticated
 */
export async function requireCurrentUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }

  return user;
}

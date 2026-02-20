// =============================================================================
// SESSION HELPERS
// Wrapper around Supabase auth to match user's expected interface
// Returns NextAuth-compatible format: { user: {...} }
// =============================================================================

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/enums/roles';

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

  return {
    id: user.id,
    email: user.email || '',
    role: (profile.role as UserRole) || 'REPORTER',
    name: profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.first_name || profile.last_name || null,
    firmId: profile.firm_id || null,
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

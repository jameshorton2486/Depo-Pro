// =============================================================================
// SESSION HELPERS
// Wrapper around Supabase auth to match user's expected interface
// Returns authenticated user from Supabase session
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
  try {
    console.log('[auth/session] getCurrentUser called');

    const supabase = await createSupabaseServerClient();
    console.log('[auth/session] supabase client created');
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('[auth/session] getUser result:', {
      hasUser: !!user,
      userId: user?.id ?? 'none',
      error: userError?.message ?? 'none',
    });

    if (userError || !user) {
      console.log('[auth/session] returning null — no user or error');
      return null;
    }

    console.log('[auth/session] fetching profile for userId:', user.id);
    // Fetch user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, firm_id')
      .eq('id', user.id)
      .single();

    console.log('[auth/session] profile result:', {
      hasProfile: !!profile,
      role: profile?.role ?? 'none',
      isActive: (profile as { is_active?: boolean } | null)?.is_active ?? false,
      error: profileError?.message ?? 'none',
    });

    if (profileError || !profile) {
      return null;
    }

    if (!profile.role) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      role: profile.role as UserRole,
      name: profile.full_name || null,
      firmId: profile.firm_id || null,
    };
  } catch (e) {
    console.error('[auth/session] unexpected error:', e);
    return null;
  }
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

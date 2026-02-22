// ═══════════════════════════════════════════════════════════════
// AUTH COMPATIBILITY LAYER (DEPRECATED)
// ═══════════════════════════════════════════════════════════════
// ⚠️ DEPRECATED: NextAuth has been removed
// Use Supabase Auth directly via createSupabaseServerClient() from @/lib/supabase/server

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/enums/roles';

/**
 * Get auth session (legacy compatibility function)
 *
 * @deprecated Use createSupabaseServerClient() from @/lib/supabase/server instead
 */
export async function auth() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Fetch user profile from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, firm_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  if (!profile.role) {
    return null;
  }

  // Return session format
  return {
    user: {
      id: user.id,
      email: user.email || '',
      role: profile.role as UserRole,
      name: profile.full_name || null,
      firmId: profile.firm_id || null,
    },
  };
}

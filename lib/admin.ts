/**
 * Admin Role Helpers
 * Provides admin-only access checks
 * 
 * Security Rules:
 * - Admins are additive, never bypass RLS
 * - All admin checks use RLS policies
 * - No service role shortcuts for UI flows
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch (_error) {
    // Silently fail - not admin if check fails
    return false;
  }
}

/**
 * Require admin role - throws if user is not admin
 * Use in API routes that require admin access
 */
export async function requireAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
}

/**
 * Get admin user ID - throws if user is not admin
 * Returns the authenticated admin user ID
 */
export async function requireAdminUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }

  return user.id;
}

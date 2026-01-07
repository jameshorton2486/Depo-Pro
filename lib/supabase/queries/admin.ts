// ═══════════════════════════════════════════════════════════════
// ADMIN QUERY FUNCTIONS
// lib/supabase/queries/admin.ts
// ═══════════════════════════════════════════════════════════════
// All database access for admin operations goes through these functions

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * List users (Admin only - uses Admin API)
 * Note: This uses Admin API because user data is in auth.users, not public.users
 */
export async function listUsers(
  _supabase: SupabaseClient
) {
  // Use Admin API for user listing
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return data.users || [];
}

/**
 * Get user by ID (Admin only - uses Admin API)
 */
export async function getUserById(
  supabase: SupabaseClient,
  userId: string
) {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return data.user || null;
}

/**
 * Update user role (Admin only - uses Admin API)
 */
export async function updateUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: string
) {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      user_metadata: { role },
    }
  );

  if (error) {
    throw error;
  }

  return data.user;
}

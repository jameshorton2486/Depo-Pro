/**
 * User Query Layer for Depo-Pro v1.3
 *
 * Handles user/profile queries (wraps Supabase Auth)
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/schema-enums';

/**
 * Get user by ID using admin client
 * Used for fetching user details for display
 */
export async function getUserById(supabase: any, userId: string) {
  // If using admin client pattern
  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);

  if (error) return null;
  return data.user;
}

/**
 * Get users by role and optional firm filter
 * Returns users from Supabase Auth with role filtering
 */
export async function getUsersByRole(
  supabase: any,
  role: string,
  firmId?: string
): Promise<any[]> {
  const admin = await createAdminClient();

  // Get all users (Supabase doesn't support role-based auth queries directly)
  const { data, error } = await admin.auth.admin.listUsers();

  if (error || !data) return [];

  // Filter by role in user_metadata
  let users = data.users.filter((u) => u.user_metadata?.role === role);

  // Further filter by firm if provided
  if (firmId) {
    users = users.filter((u) => u.user_metadata?.firmId === firmId);
  }

  return users;
}

/**
 * List all users (admin only)
 */
export async function listUsers(supabase: any): Promise<any[]> {
  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();

  if (error || !data) return [];
  return data.users;
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ data: any; error: any }> {
  const admin = await createAdminClient();

  return await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
}

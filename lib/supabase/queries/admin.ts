/**
 * Admin query layer — user listing and role updates via Auth Admin API
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * List users (Admin only). Supports listUsers(supabase) or listUsers().
 */
export async function listUsers(supabaseOrNone?: SupabaseClient | any): Promise<any[]> {
  const _supabase = typeof supabaseOrNone === 'object' && supabaseOrNone?.from
    ? supabaseOrNone
    : null;
  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data?.users ?? [];
}

/**
 * Get user by ID (Admin)
 */
export async function getUserById(
  supabaseOrUserId: SupabaseClient | string,
  maybeUserId?: string
): Promise<any> {
  const isOld = typeof supabaseOrUserId === 'object' && (supabaseOrUserId as any)?.from;
  const userId = (isOld ? maybeUserId : supabaseOrUserId) as string;
  if (!userId) throw new Error('getUserById: userId required');
  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  return data?.user ?? null;
}

/**
 * Update user role (Admin)
 */
export async function updateUserRole(
  supabaseOrUserId: any,
  userIdOrRole?: string,
  maybeRole?: string
): Promise<any> {
  const isOld = typeof supabaseOrUserId === 'object' && supabaseOrUserId?.from;
  const userId = isOld ? userIdOrRole : supabaseOrUserId;
  const role = isOld ? maybeRole : userIdOrRole;
  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
  if (error) throw error;
  return data?.user;
}

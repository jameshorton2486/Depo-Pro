// ═══════════════════════════════════════════════════════════════
// USER QUERY FUNCTIONS (Non-Admin)
// lib/supabase/queries/users.ts
// ═══════════════════════════════════════════════════════════════
// User queries that don't require admin access
// For admin operations, use lib/supabase/queries/admin.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Get user by ID (uses Admin API for auth.users access)
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
 * Get user by email (uses Admin API)
 */
export async function getUserByEmail(
  supabase: SupabaseClient,
  email: string
) {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return data.users?.find(u => u.email === email) || null;
}

/**
 * Get users by firm (uses Admin API)
 * Note: Firm ID is stored in user_metadata
 */
export async function getUsersByFirm(
  supabase: SupabaseClient,
  firmId: string
) {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return (data.users || []).filter(
    u => u.user_metadata?.firmId === firmId || u.user_metadata?.firm_id === firmId
  );
}

/**
 * Get users by role (uses Admin API)
 */
export async function getUsersByRole(
  supabase: SupabaseClient,
  role: string,
  firmId?: string
) {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  let users = (data.users || []).filter(
    u => u.user_metadata?.role === role
  );

  if (firmId) {
    users = users.filter(
      u => u.user_metadata?.firmId === firmId || u.user_metadata?.firm_id === firmId
    );
  }

  return users;
}

/**
 * List scopists (uses Admin API)
 */
export async function listScopists(
  supabase: SupabaseClient,
  firmId?: string
) {
  return getUsersByRole(supabase, 'SCOPIST', firmId);
}

/**
 * List reporters (uses Admin API)
 */
export async function listReporters(
  supabase: SupabaseClient,
  firmId?: string
) {
  return getUsersByRole(supabase, 'REPORTER', firmId);
}

/**
 * Update user profile (uses Admin API)
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    timezone?: string;
    firmId?: string | null;
  }
) {
  const adminClient = getSupabaseAdminClient();
  
  // Get current user metadata
  const { data: userData } = await adminClient.auth.admin.getUserById(userId);
  const currentMetadata = userData?.user?.user_metadata || {};

  // Merge updates
  const newMetadata = {
    ...currentMetadata,
    ...(updates.firstName !== undefined && { firstName: updates.firstName }),
    ...(updates.lastName !== undefined && { lastName: updates.lastName }),
    ...(updates.phone !== undefined && { phone: updates.phone }),
    ...(updates.timezone !== undefined && { timezone: updates.timezone }),
    ...(updates.firmId !== undefined && { firmId: updates.firmId }),
  };

  const { data, error } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      user_metadata: newMetadata,
    }
  );

  if (error) {
    throw error;
  }

  return data.user;
}

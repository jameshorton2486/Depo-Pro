// ═══════════════════════════════════════════════════════════════
// PROFILE GUARD - Supabase-Only Profile Helper
// ═══════════════════════════════════════════════════════════════
// Supabase-only: Uses user_metadata for profile data
// No Prisma dependency - fully Edge-compatible
//
// Profile data is stored in Supabase Auth user_metadata:
// - role: User's role (ADMIN, REPORTER, etc.)
// - firstName: User's first name
// - lastName: User's last name
// - agencyName: User's agency (optional)
// - phone: User's phone (optional)
// ═══════════════════════════════════════════════════════════════

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Role } from '@/lib/permissions/route-access';
import { VALID_ROLES } from '@/lib/permissions/route-access';

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  agencyName?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get user profile from Supabase Auth user_metadata
 * 
 * Supabase-only: No database lookups, uses user_metadata as single source of truth
 * 
 * @param supabaseUser - Authenticated Supabase user
 * @returns User profile from user_metadata
 */
export function getUserProfile(supabaseUser: SupabaseUser): UserProfile {
  if (!supabaseUser.email) {
    throw new Error('Supabase user must have an email address');
  }

  const role = supabaseUser.user_metadata?.role as Role | undefined;
  if (!role || !VALID_ROLES.includes(role)) {
    throw new Error('User profile incomplete: no role assigned');
  }
  const firstName = supabaseUser.user_metadata?.firstName || '';
  const lastName = supabaseUser.user_metadata?.lastName || '';
  const agencyName = supabaseUser.user_metadata?.agencyName || null;
  const phone = supabaseUser.user_metadata?.phone || null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    role,
    firstName,
    lastName,
    agencyName,
    phone,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at || supabaseUser.created_at,
  };
}

/**
 * Ensure user has required metadata fields
 *
 * Validates metadata and fails if role is missing/invalid.
 * 
 * @param supabaseUser - Authenticated Supabase user
 * @returns Updated user profile
 */
export async function ensureUserProfile(supabaseUser: SupabaseUser): Promise<UserProfile> {
  return getUserProfile(supabaseUser);
}

/**
 * Get or create a user profile from Supabase user
 * 
 * Convenience wrapper that ensures profile exists
 * 
 * @param supabaseUser - Authenticated Supabase user
 * @returns The user profile
 */
export async function getOrCreateUserProfile(supabaseUser: SupabaseUser): Promise<UserProfile> {
  return ensureUserProfile(supabaseUser);
}

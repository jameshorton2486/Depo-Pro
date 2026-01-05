// ═══════════════════════════════════════════════════════════════
// PROFILE GUARD - Self-Healing Profile Creation
// ═══════════════════════════════════════════════════════════════
// Ensures that every Supabase-authenticated user has a profile
// in the public."User" table. Automatically creates one if missing.
//
// This is the recommended Supabase pattern:
// 1. User signs up via Supabase Auth
// 2. On first API call, ensure profile exists
// 3. Profile stores app-specific data (role, preferences, etc.)
// ═══════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import { Role } from '@/lib/constants';
import type { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Ensure a user profile exists in the database
 * 
 * If the profile doesn't exist, creates one with:
 * - id: Supabase user ID (UUID)
 * - email: From Supabase user
 * - role: From user_metadata or default REPORTER
 * - firstName/lastName: From user_metadata or email
 * 
 * This is safe to call multiple times (idempotent - uses upsert)
 * 
 * @param supabaseUser - Authenticated Supabase user
 * @returns The user profile (existing or newly created)
 * 
 * @example
 * ```ts
 * const { user } = await supabase.auth.getUser(token);
 * if (user) {
 *   const profile = await ensureUserProfile(user);
 *   // Profile is guaranteed to exist now
 * }
 * ```
 */
export async function ensureUserProfile(supabaseUser: SupabaseUser) {
  const userId = supabaseUser.id;
  const email = supabaseUser.email;
  
  if (!email) {
    throw new Error('Supabase user must have an email address');
  }

  // Extract role from user_metadata (if set during signup)
  const metadataRole = supabaseUser.user_metadata?.role as string | undefined;
  const assignedRole = (metadataRole as Role) || Role.REPORTER;

  // Extract name from user_metadata or parse from email
  const metadataFirstName = supabaseUser.user_metadata?.firstName as string | undefined;
  const metadataLastName = supabaseUser.user_metadata?.lastName as string | undefined;
  
  // Parse name from email if not provided (fallback)
  const emailParts = email.split('@')[0].split('.');
  const defaultFirstName = emailParts[0] || 'User';
  const defaultLastName = emailParts[1] || '';

  // Upsert profile (create if doesn't exist, update if exists)
  const profile = await db.user.upsert({
    where: { id: userId },
    update: {
      // Only update email if it changed (Supabase email updates)
      email: email.toLowerCase(),
      // Don't override role if profile already exists (preserve admin assignments)
      // Only update if metadata explicitly set
      ...(metadataRole && { role: assignedRole }),
    },
    create: {
      id: userId,
      email: email.toLowerCase(),
      role: assignedRole,
      firstName: metadataFirstName || defaultFirstName,
      lastName: metadataLastName || defaultLastName,
      // passwordHash is nullable - not set for Supabase users
    },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return profile;
}

/**
 * Get or create a user profile from Supabase user
 * 
 * Convenience wrapper that ensures profile exists
 * 
 * @param supabaseUser - Authenticated Supabase user
 * @returns The user profile
 */
export async function getOrCreateUserProfile(supabaseUser: SupabaseUser) {
  return ensureUserProfile(supabaseUser);
}

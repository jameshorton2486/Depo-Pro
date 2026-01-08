// ═══════════════════════════════════════════════════════════════
// AUTH COMPATIBILITY LAYER
// ═══════════════════════════════════════════════════════════════
// Provides NextAuth-compatible interface using Supabase
// This allows gradual migration of API routes

import { getUserWithProfile } from './auth-supabase';
import type { UserRole } from '@/types/database';

/**
 * Get auth session in NextAuth-compatible format
 * Use this for API routes that haven't been migrated yet
 * 
 * @deprecated Use getUserWithProfile() from @/lib/auth-supabase instead
 */
export async function auth() {
  const userWithProfile = await getUserWithProfile();

  if (!userWithProfile || !userWithProfile.user) {
    return null;
  }

  // Return in NextAuth-compatible format
  return {
    user: {
      id: userWithProfile.user.id,
      email: userWithProfile.user.email || '',
      role: (userWithProfile.profile?.role as UserRole) || 'REPORTER',
      name: userWithProfile.profile?.first_name && userWithProfile.profile?.last_name
        ? `${userWithProfile.profile.first_name} ${userWithProfile.profile.last_name}`
        : userWithProfile.profile?.first_name || userWithProfile.profile?.last_name || null,
      firmId: userWithProfile.profile?.firm_id || null,
    },
  };
}

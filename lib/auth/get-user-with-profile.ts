// ═══════════════════════════════════════════════════════════════
// GET USER WITH PROFILE - Self-Healing Profile Helper
// ═══════════════════════════════════════════════════════════════
// Helper function for API routes that need both:
// 1. Supabase authentication (who you are)
// 2. Database profile (your role, preferences, etc.)
//
// Automatically creates profile if Supabase user exists but profile doesn't.
// ═══════════════════════════════════════════════════════════════

import { createSupabaseServiceClient } from '@/utils/supabase/server';
import { ensureUserProfile } from './profile-guard';
import { db } from '@/lib/db';

/**
 * Get authenticated Supabase user and ensure profile exists
 * 
 * Use this in API routes where you need:
 * - Supabase authentication (verified)
 * - Database profile (for role, preferences, etc.)
 * 
 * Automatically creates profile if missing (self-healing).
 * 
 * @param request - Next.js request object (for extracting token)
 * @returns Object with supabaseUser and profile, or null if not authenticated
 * 
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const authResult = await getUserWithProfile(request);
 *   if (!authResult) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   
 *   const { supabaseUser, profile } = authResult;
 *   // profile is guaranteed to exist
 *   // Use profile.role for authorization
 * }
 * ```
 */
export async function getUserWithProfile(request: Request | { headers: Headers }) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !userResult.user) {
    return null;
  }

  // Ensure profile exists (self-healing)
  const profile = await ensureUserProfile(userResult.user);

  return {
    supabaseUser: userResult.user,
    profile,
  };
}

/**
 * Get user profile from database by Supabase user ID
 * 
 * Does NOT create profile if missing (use getUserWithProfile for that)
 * 
 * @param supabaseUserId - Supabase auth user ID (UUID)
 * @returns User profile or null if not found
 */
export async function getUserProfile(supabaseUserId: string) {
  return db.user.findUnique({
    where: { id: supabaseUserId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      agencyName: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

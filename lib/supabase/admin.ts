// lib/supabase/admin.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN CLIENT - Service role for privileged operations
// ⚠️ NEVER expose to client, NEVER use for user identity in middleware
// ═══════════════════════════════════════════════════════════════
//
// USE CASES:
// - Validating access tokens in API routes
// - Admin operations (user management, etc.)
// - Bypassing RLS for server-side operations
//
// DO NOT USE FOR:
// - Client-side operations
// - Middleware (use the cookie-based client instead)
// - Anything that could expose the service role key
// ═══════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let adminClient: SupabaseClient | null = null;

/**
 * Get the Supabase admin client (service role)
 * 
 * This client bypasses Row Level Security and has full database access.
 * Use only on the server for privileged operations.
 * 
 * @example
 * ```ts
 * // Validate an access token
 * const supabase = getSupabaseAdminClient();
 * const { data: { user }, error } = await supabase.auth.getUser(token);
 * ```
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'The admin client requires the service role key.'
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Service role client should not persist sessions
      persistSession: false,
      autoRefreshToken: false,
      // Detect session from URL is not needed for admin operations
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}

/**
 * Alias for backwards compatibility
 * @deprecated Use getSupabaseAdminClient instead
 */
export const createSupabaseServiceClient = getSupabaseAdminClient;

export default getSupabaseAdminClient;

// lib/supabase/admin.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN CLIENT - Service role for privileged operations
// ⚠️ NEVER expose to client, NEVER use for user identity in middleware
// ⚠️ NEVER use for login or user authentication
// ═══════════════════════════════════════════════════════════════
//
// USE CASES:
// - Admin operations (user management, etc.)
// - Bypassing RLS for server-side operations
// - Cron jobs and background tasks
//
// DO NOT USE FOR:
// - Client-side operations (use browser.ts instead)
// - Middleware (use middleware.ts instead)
// - User login/authentication (use browser.ts instead)
// - Anything that could expose the service role key
// ═══════════════════════════════════════════════════════════════

import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Get the Supabase admin client (service role)
 * 
 * This client bypasses Row Level Security and has full database access.
 * Use only on the server for privileged operations.
 * 
 * 🚫 Never imported into client
 * 🚫 Never used for login
 * 
 * @example
 * ```ts
 * // Admin operation
 * const supabase = getSupabaseAdmin();
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*');
 * ```
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'The admin client requires the service role key.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

/**
 * Alias for backwards compatibility
 * @deprecated Use getSupabaseAdmin instead
 */
export const getSupabaseAdminClient = getSupabaseAdmin;

/**
 * Alias for backwards compatibility
 * @deprecated Use getSupabaseAdmin instead
 */
export const createSupabaseServiceClient = getSupabaseAdmin;

export default getSupabaseAdmin;

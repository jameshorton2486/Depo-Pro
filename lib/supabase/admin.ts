// lib/supabase/admin.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN CLIENT - Service role with proper validation
// ═══════════════════════════════════════════════════════════════

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let adminClientInstance: SupabaseClient | null = null;

function validateAdminEnvVars(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Validate URL
  if (!url || url.trim() === '') {
    throw new Error(
      '[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL is missing or empty.'
    );
  }

  // Validate service role key
  if (!serviceRoleKey || serviceRoleKey.trim() === '') {
    throw new Error(
      '[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is missing or empty. ' +
      'The admin client requires the service role key for privileged operations.'
    );
  }

  return { url: url.trim(), serviceRoleKey: serviceRoleKey.trim() };
}

/**
 * Get the Supabase admin client (service role)
 * ⚠️ NEVER expose to client
 * ⚠️ NEVER use for user authentication
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClientInstance) {
    return adminClientInstance;
  }

  const { url, serviceRoleKey } = validateAdminEnvVars();

  adminClientInstance = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return adminClientInstance;
}

// Aliases for backward compatibility
export const getSupabaseAdminClient = getSupabaseAdmin;
export const createSupabaseServiceClient = getSupabaseAdmin;

export default getSupabaseAdmin;

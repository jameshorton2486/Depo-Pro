// lib/supabase/service.ts
// ═══════════════════════════════════════════════════════════════
// SERVICE CLIENT - Service role for privileged operations
// Compatibility export (alias for admin client)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Re-export for compatibility
export { createServiceClient as createSupabaseServiceClient };

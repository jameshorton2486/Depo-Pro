import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client using the service role key for privileged operations (never expose to the client).
export const createSupabaseServiceClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL or service role key is missing.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

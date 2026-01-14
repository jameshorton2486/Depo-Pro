'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requirePublishableSupabaseKey } from '@/lib/env/require-public-supabase-key';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  requirePublishableSupabaseKey()
);

// Backward compatibility - for code that uses getSupabaseBrowserClient()
export function getSupabaseBrowserClient() {
  return supabase;
}

export default supabase;

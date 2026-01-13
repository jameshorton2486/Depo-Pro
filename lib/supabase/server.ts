// lib/supabase/server.ts
// ═══════════════════════════════════════════════════════════════
// SERVER CLIENT - With proper validation
// ═══════════════════════════════════════════════════════════════

import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function validateServerEnvVars(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.trim() === '') {
    throw new Error(
      '[Supabase Server] NEXT_PUBLIC_SUPABASE_URL is missing or empty. ' +
      'Check your environment variables.'
    );
  }

  if (!anonKey || anonKey.trim() === '') {
    throw new Error(
      '[Supabase Server] NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty. ' +
      'Check your environment variables.'
    );
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export async function createSupabaseServerClient() {
  const { url, anonKey } = validateServerEnvVars();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (_error) {
          // Ignore cookie errors in read-only contexts (Server Components)
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (_error) {
          // Ignore cookie errors in read-only contexts
        }
      },
    },
  });
}

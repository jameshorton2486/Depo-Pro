// lib/supabase/browser.ts
// Browser client with publishable key validation
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClientInstance: SupabaseClient | null = null;

function validatePublishableKey(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || url.trim() === '') {
    throw new Error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL is missing. ' +
      'Add it to your .env.local file.'
    );
  }

  if (!key || key.trim() === '') {
    throw new Error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. ' +
      'Get it from Supabase Dashboard → Settings → API Keys → Publishable key.'
    );
  }

  const trimmedKey = key.trim();

  // Validate key format - must start with sb_publishable_
  if (!trimmedKey.startsWith('sb_publishable_')) {
    throw new Error(
      '[Supabase] INVALID KEY FORMAT. ' +
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must start with "sb_publishable_". ' +
      'You appear to have a legacy JWT key. ' +
      'Get the new publishable key from Supabase Dashboard → Settings → API Keys.'
    );
  }

  return { url: url.trim(), key: trimmedKey };
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClientInstance) {
    return browserClientInstance;
  }

  const { url, key } = validatePublishableKey();
  browserClientInstance = createBrowserClient(url, key);
  return browserClientInstance;
}

export function createSupabaseBrowserClient(): SupabaseClient {
  return getSupabaseBrowserClient();
}

// Default export for convenience
export const supabase = getSupabaseBrowserClient();

export default supabase;

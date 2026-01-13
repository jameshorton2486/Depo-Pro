// lib/supabase/browser.ts
// ═══════════════════════════════════════════════════════════════
// BROWSER CLIENT - Lazy initialization with validation
// ═══════════════════════════════════════════════════════════════
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton - NOT created at module load
let browserClientInstance: SupabaseClient | null = null;

function validateEnvVars(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check for undefined
  if (url === undefined) {
    throw new Error(
      '[Supabase Browser] NEXT_PUBLIC_SUPABASE_URL is undefined. ' +
      'Ensure it is set in your .env.local file.'
    );
  }

  // Check for empty string
  if (url === '' || url.trim() === '') {
    throw new Error(
      '[Supabase Browser] NEXT_PUBLIC_SUPABASE_URL is empty. ' +
      'Add the full Supabase URL (e.g., https://xxx.supabase.co)'
    );
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error(
      `[Supabase Browser] NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}"`
    );
  }

  // Check anon key
  if (!anonKey || anonKey.trim() === '') {
    throw new Error(
      '[Supabase Browser] NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty.'
    );
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

/**
 * Get the Supabase browser client (lazy singleton)
 * Creates client on first call, reuses on subsequent calls
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClientInstance) {
    return browserClientInstance;
  }

  const { url, anonKey } = validateEnvVars();

  browserClientInstance = createBrowserClient(url, anonKey);
  return browserClientInstance;
}

/**
 * Alias for backward compatibility
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  return getSupabaseBrowserClient();
}

export default getSupabaseBrowserClient;

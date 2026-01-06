// lib/supabase/browser.ts
// ═══════════════════════════════════════════════════════════════
// BROWSER CLIENT - For Client Components only
// Uses anon key, handles session via cookies with @supabase/ssr
// ═══════════════════════════════════════════════════════════════

'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let browserClient: SupabaseClient | null = null;

/**
 * Create a Supabase client for use in the browser (Client Components)
 * Uses the anon key - safe to expose to the client
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  // Next.js 16: Environment variables are available at runtime in client components
  // These are injected at build time and are safe to use (they're public anyway)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Debug logging (remove in production)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[Supabase Client] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlPreview: supabaseUrl?.substring(0, 40) + '...',
      keyPreview: supabaseAnonKey?.substring(0, 30) + '...',
      keyStartsWith: supabaseAnonKey?.substring(0, 10),
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] Missing environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseAnonKey?.length || 0,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
    });
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Make sure .env.local exists and dev server was restarted.'
    );
  }

  // Check for quotes in the values (common mistake)
  if (supabaseUrl.startsWith('"') || supabaseUrl.endsWith('"')) {
    console.error('[Supabase Client] URL has quotes! Remove quotes from .env.local');
    throw new Error('NEXT_PUBLIC_SUPABASE_URL contains quotes. Remove quotes from .env.local');
  }
  if (supabaseAnonKey.startsWith('"') || supabaseAnonKey.endsWith('"')) {
    console.error('[Supabase Client] Anon key has quotes! Remove quotes from .env.local');
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY contains quotes. Remove quotes from .env.local');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Get the singleton Supabase browser client
 * Recommended for most client-side use cases to avoid creating multiple instances
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  // Always recreate in development to pick up env var changes
  if (process.env.NODE_ENV === 'development') {
    browserClient = null;
  }
  
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }
  return browserClient;
}

// Default export for convenience
export default getSupabaseBrowserClient;

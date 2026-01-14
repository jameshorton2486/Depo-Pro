/**
 * Runtime-Blocking Environment Variable Validation
 * 
 * This module enforces that required env vars exist at startup.
 * Importing this in app/layout.tsx will cause the app to fail fast
 * if env vars are missing, preventing silent auth failures.
 */

import 'server-only';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

/**
 * Server-only environment variables
 * Never exposed to browser
 */
export const SERVER_ENV = {
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
};

/**
 * Browser-safe environment variables
 * Must exist at build time (NEXT_PUBLIC_*)
 * 
 * Note: NEXT_PUBLIC_SUPABASE_ANON_KEY is validated in browser.ts
 * using requirePublishableSupabaseKey() to ensure it's a publishable key.
 */
export const PUBLIC_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  // Key validation happens in lib/env/require-public-supabase-key.ts
  // This ensures publishable key format (sb_publishable_*) is enforced
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
};

/**
 * Runtime-Blocking Environment Variable Validation
 *
 * This module enforces that required env vars exist at startup.
 * Importing this in app/layout.tsx will cause the app to fail fast
 * if env vars are missing, preventing silent auth failures.
 */

import 'server-only';

const ROUTE_REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/** Core API keys required for document intake and transcription. Run `npm run check:apis` to validate connections. */
const CORE_API_KEYS = ['ANTHROPIC_API_KEY', 'DEEPGRAM_API_KEY'] as const;

export function validateEnv(): void {
  const missing = ROUTE_REQUIRED_ENV_KEYS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(`Missing environment variable(s): ${missing.join(', ')}`);
  }
}

/**
 * Validates that core API keys are present (not that they work).
 * For full connection validation, run: npm run check:apis
 */
export function validateApiKeys(): void {
  const missing = CORE_API_KEYS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing API key(s): ${missing.join(', ')}. Add to .env.local and run: npm run check:apis`
    );
  }
}

export function requireEnv(name: string): string {
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
 * Note: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is validated in browser.ts
 * using validatePublishableKey() to ensure it's a publishable key.
 */
export const PUBLIC_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  // Key validation happens in lib/supabase/browser.ts
  // This ensures publishable key format (sb_publishable_*) is enforced
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
};

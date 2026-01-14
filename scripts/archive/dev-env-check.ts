// lib/supabase/dev-env-check.ts
// ═══════════════════════════════════════════════════════════════
// DEVELOPMENT ENVIRONMENT VARIABLE VALIDATION
// ═══════════════════════════════════════════════════════════════
// 
// This module provides development-time validation of Supabase
// environment variables. It only runs in non-production environments
// and logs clear error messages if required variables are missing.
//
// ⚠️ IMPORTANT: This does NOT log secret values, only variable names
// ═══════════════════════════════════════════════════════════════

/**
 * Validate Supabase environment variables (development only)
 * 
 * This function checks that required Supabase environment variables
 * are present and provides clear error messages if they're missing.
 * 
 * Only runs in non-production environments (NODE_ENV !== 'production').
 * Logs errors but does NOT throw (non-blocking).
 * 
 * @example
 * ```ts
 * // In app/layout.tsx or similar startup file
 * if (process.env.NODE_ENV !== 'production') {
 *   validateSupabaseEnvVars();
 * }
 * ```
 */
export function validateSupabaseEnvVars(): void {
  // Only run in development
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const errors: string[] = [];

  // Check NEXT_PUBLIC_SUPABASE_URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.trim() === '') {
    errors.push(
      '❌ NEXT_PUBLIC_SUPABASE_URL is missing or empty.\n' +
      '   Add it to your .env.local file:\n' +
      '   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co'
    );
  } else {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      errors.push(
        `❌ NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}"\n` +
        '   Expected format: https://your-project.supabase.co'
      );
    }
  }

  // Check NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey || anonKey.trim() === '') {
    errors.push(
      '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty.\n' +
      '   Add it to your .env.local file:\n' +
      '   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    );
  } else if (anonKey.length < 50) {
    // Basic sanity check - anon keys are typically 200+ characters
    errors.push(
      '⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be too short.\n' +
      '   Verify you copied the complete key from Supabase Dashboard.'
    );
  }

  // Check SUPABASE_SERVICE_ROLE_KEY (optional for client-only apps)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || serviceRoleKey.trim() === '') {
    console.warn(
      '⚠️  SUPABASE_SERVICE_ROLE_KEY is missing.\n' +
      '   This is required for server-side admin operations.\n' +
      '   Add it to your .env.local file if you need admin functionality.'
    );
  }

  // Log errors if any
  if (errors.length > 0) {
    console.error('\n🔴 SUPABASE ENVIRONMENT VARIABLE ERRORS:\n');
    errors.forEach(error => console.error(error));
    console.error(
      '\n📖 Get your Supabase credentials from:\n' +
      '   https://app.supabase.com/project/_/settings/api\n\n'
    );
  } else {
    console.log('✅ Supabase environment variables validated');
  }
}

/**
 * Runtime-Blocking Publishable Key Validator
 * 
 * This function enforces that NEXT_PUBLIC_SUPABASE_ANON_KEY is:
 * 1. Present
 * 2. A publishable key (sb_publishable_*), not a legacy JWT
 * 
 * Throws immediately if invalid, preventing silent auth failures.
 */

export function requirePublishableSupabaseKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      '[Supabase Key] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Set it in your .env.local file.'
    );
  }

  const trimmedKey = key.trim();

  // Check for legacy JWT key (eyJhbGciOi...)
  if (trimmedKey.startsWith('eyJhbGciOi')) {
    throw new Error(
      '[Supabase Key] INVALID: Legacy JWT anon key detected. ' +
      'Legacy JWT keys (starting with eyJhbGciOi) are not supported for browser auth. ' +
      'Get the publishable key from Supabase Dashboard → Settings → API Keys. ' +
      'It must start with sb_publishable_.'
    );
  }

  // Check for publishable key format
  if (!trimmedKey.startsWith('sb_publishable_')) {
    throw new Error(
      '[Supabase Key] INVALID: Expected publishable key format (sb_publishable_*). ' +
      'Current key does not match expected format. ' +
      'Get the publishable key from Supabase Dashboard → Settings → API Keys.'
    );
  }

  return trimmedKey;
}

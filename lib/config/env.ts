// lib/config/env.ts
// Beta Hardening Plan - Phase 4E: Environment Validation

/**
 * Required environment variables
 * App will refuse to start if any are missing
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEEPGRAM_API_KEY',
  'ANTHROPIC_API_KEY',
] as const;

/**
 * Optional environment variables (with defaults or feature-specific)
 */
const OPTIONAL_ENV_VARS = [
  'NODE_ENV',
  'VERCEL_ENV',
  'ENABLE_MEDICAL_CHRONOLOGY',
  'ENABLE_EXPORT',
  'ENABLE_AI_EXTRACTION',
  'ENABLE_TRANSCRIPTION',
  'ENABLE_DEMAND_BUILDER',
  'ENABLE_REALTIME',
  'ENABLE_EXHIBITS',
  'ENABLE_VOCABULARY',
  'ENABLE_SHARING',
] as const;

/**
 * Validate that all required environment variables are set
 * Throws error on startup if any are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMessage = [
      '',
      '═══════════════════════════════════════════════',
      '  ENVIRONMENT VARIABLE VALIDATION FAILED',
      '═══════════════════════════════════════════════',
      '',
      'The following required environment variables are missing:',
      '',
      ...missing.map(key => `  ❌ ${key}`),
      '',
      'Please set these variables in your .env.local file or hosting platform.',
      '',
      '═══════════════════════════════════════════════',
      '',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Warn about missing optional vars (don't throw)
  const missingOptional: string[] = [];
  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      missingOptional.push(key);
    }
  }

  if (missingOptional.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[env] Optional environment variables not set:', missingOptional.join(', '));
  }
}

/**
 * Validate specific environment variable patterns
 */
export function validateEnvPatterns(): void {
  // Supabase URL must be valid HTTPS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be HTTPS');
  }

  // Anon key must not be empty string
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey && anonKey.length < 20) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY appears invalid (too short)');
  }

  // Service role key must not be exposed to client
  if (typeof window !== 'undefined') {
    const dangerousKeys = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'DEEPGRAM_API_KEY',
      'ANTHROPIC_API_KEY',
    ];

    for (const key of dangerousKeys) {
      // Check if it's accidentally in NEXT_PUBLIC_*
      const publicKey = `NEXT_PUBLIC_${key}`;
      if (process.env[publicKey]) {
        throw new Error(`SECURITY ERROR: ${key} must NOT be exposed with NEXT_PUBLIC_ prefix`);
      }
    }
  }
}

/**
 * Get environment name
 */
export function getEnvironment(): 'production' | 'preview' | 'development' {
  if (process.env.VERCEL_ENV === 'production') return 'production';
  if (process.env.VERCEL_ENV === 'preview') return 'preview';
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Get a required environment variable (throws if not set)
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Print environment summary (safe for logs - no secrets)
 */
export function printEnvSummary(): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ENVIRONMENT SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`Environment: ${getEnvironment()}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`\nSupabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`Supabase Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...`);
  console.log(`Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`Deepgram API Key: ${process.env.DEEPGRAM_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log('═══════════════════════════════════════════════\n');
}

// =============================================================================
// ENVIRONMENT VARIABLE VALIDATION
// Fail fast if required env vars are missing
// =============================================================================

import { z } from 'zod';

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgres'),
  DIRECT_URL: z.string().url().startsWith('postgres').optional(),
  
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  DEEPGRAM_API_KEY: z.string().min(1),
  
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// =============================================================================
// VALIDATION
// =============================================================================

function validateEnv() {
  if (typeof window !== 'undefined') {
    return;
  }

  const serverResult = serverEnvSchema.safeParse(process.env);
  
  if (!serverResult.success) {
    console.error('❌ Invalid server environment variables:');
    console.error(serverResult.error.format());
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables');
    }
  }
}

validateEnv();

// =============================================================================
// TYPE-SAFE ENV ACCESS
// =============================================================================

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  DIRECT_URL: process.env.DIRECT_URL,
  
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
  
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY!,
  
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  
  NODE_ENV: process.env.NODE_ENV as 'development' | 'test' | 'production',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

// =============================================================================
// SECURITY CHECKS
// =============================================================================

export function getSupabaseServiceKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('Service role key cannot be accessed on client');
  }
  
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  
  return env.SUPABASE_SERVICE_ROLE_KEY;
}

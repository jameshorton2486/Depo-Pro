/**
 * Centralized Environment Configuration
 * 
 * IMPORTANT:
 * - Do NOT call dotenv.config() anywhere in the app
 * - Next.js loads env files automatically
 * - This file is for validation + access only
 * 
 * Usage:
 *   import { env } from '@/lib/env';
 *   const apiKey = env.deepgramApiKey;
 */

import { z } from 'zod';

// Define what's actually required vs optional
const envSchema = z.object({
  // === REQUIRED (app won't start without these) ===
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  DEEPGRAM_API_KEY: z.string().min(1, 'DEEPGRAM_API_KEY is required'),

  // === REQUIRED FOR STORAGE ===
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // === OPTIONAL ===
  DIRECT_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  SENDGRID_WEBHOOK_SECRET: z.string().optional(),

  // === SETTINGS (with defaults) ===
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOW_CONFIDENCE_THRESHOLD: z.string().default('0.85'),
  FILE_RETENTION_DAYS: z.string().default('90'),
  WORKER_CONCURRENCY: z.string().default('3'),
  WORKER_RATE_LIMIT_MAX: z.string().default('10'),
  WORKER_RATE_LIMIT_DURATION: z.string().default('1000'),
  PORT: z.string().default('3000'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // === FEATURE FLAGS ===
  USE_CLOUD_STORAGE: z.string().transform(v => v === 'true').optional(),
});

// Validate on module load
let _env: z.infer<typeof envSchema> | null = null;
let _validationError: z.ZodError | null = null;

try {
  _env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    _validationError = error;
    // Log but don't exit - let the app decide how to handle
    console.error('⚠️  Environment validation warnings:');
    error.issues.forEach(issue => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
  }
}

// Export validated env
export function getEnv() {
  if (!_env) {
    throw new Error('Environment validation failed. Check logs for details.');
  }
  return _env;
}

// Export individual getters for lazy validation
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Safe getter that returns undefined instead of throwing
export function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

// Specific getters for common use cases
export const env = {
  get databaseUrl() { return getRequiredEnv('DATABASE_URL'); },
  get nextAuthSecret() { return getRequiredEnv('NEXTAUTH_SECRET'); },
  get nextAuthUrl() { return getRequiredEnv('NEXTAUTH_URL'); },
  get deepgramApiKey() { return getRequiredEnv('DEEPGRAM_API_KEY'); },
  get supabaseUrl() { return getOptionalEnv('SUPABASE_URL'); },
  get supabaseAnonKey() { return getOptionalEnv('SUPABASE_ANON_KEY'); },
  get supabaseServiceRoleKey() { return getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY'); },
  get anthropicApiKey() { return getOptionalEnv('ANTHROPIC_API_KEY'); },
  get resendApiKey() { return getOptionalEnv('RESEND_API_KEY'); },
  get redisUrl() { return getOptionalEnv('REDIS_URL'); },
  get redisHost() { return getOptionalEnv('REDIS_HOST') || 'localhost'; },
  get redisPort() { return parseInt(getOptionalEnv('REDIS_PORT') || '6379'); },
  get redisPassword() { return getOptionalEnv('REDIS_PASSWORD'); },
  get nodeEnv() { return process.env.NODE_ENV || 'development'; },
  get isDev() { return this.nodeEnv === 'development'; },
  get isProd() { return this.nodeEnv === 'production'; },
  get lowConfidenceThreshold() { 
    return parseFloat(process.env.LOW_CONFIDENCE_THRESHOLD || '0.85'); 
  },
  get fileRetentionDays() {
    return parseInt(process.env.FILE_RETENTION_DAYS || '90');
  },
  get workerConcurrency() {
    return parseInt(process.env.WORKER_CONCURRENCY || '3');
  },
  get workerRateLimitMax() {
    return parseInt(process.env.WORKER_RATE_LIMIT_MAX || '10');
  },
  get workerRateLimitDuration() {
    return parseInt(process.env.WORKER_RATE_LIMIT_DURATION || '1000');
  },
  get port() {
    return parseInt(process.env.PORT || '3000');
  },
  get appUrl() {
    return process.env.APP_URL || 'http://localhost:3000';
  },
  get useCloudStorage() {
    return process.env.USE_CLOUD_STORAGE === 'true';
  },
};

export default env;

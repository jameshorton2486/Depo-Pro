import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Environment variable schema
const envSchema = z.object({
  // Core Infrastructure
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.string().min(1),
  REDIS_PASSWORD: z.string().optional(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),

  // API Keys
  DEEPGRAM_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),

  // Feature Flags
  USE_CLOUD_STORAGE: z.string().transform(v => v === 'true').optional(),
  
  // Optional
  SENDGRID_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Settings
  FILE_RETENTION_DAYS: z.string().default('90'),
  WORKER_CONCURRENCY: z.string().default('3'),
  WORKER_RATE_LIMIT_MAX: z.string().default('10'),
  WORKER_RATE_LIMIT_DURATION: z.string().default('1000'),
  LOW_CONFIDENCE_THRESHOLD: z.string().default('0.85'),
});

// Parse and validate environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment variables:');
  if (error instanceof z.ZodError) {
    console.error(error.issues);
  }
  process.exit(1);
}

// Export validated environment variables
export const config = {
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT),
    password: env.REDIS_PASSWORD,
  },
  apis: {
    deepgram: env.DEEPGRAM_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    vercelBlob: env.BLOB_READ_WRITE_TOKEN,
    sendgrid: env.SENDGRID_WEBHOOK_SECRET,
    resend: env.RESEND_API_KEY,
  },
  app: {
    env: env.NODE_ENV,
    port: parseInt(env.PORT),
    url: env.APP_URL,
  },
  settings: {
    fileRetentionDays: parseInt(env.FILE_RETENTION_DAYS),
    workerConcurrency: parseInt(env.WORKER_CONCURRENCY),
    workerRateLimitMax: parseInt(env.WORKER_RATE_LIMIT_MAX),
    workerRateLimitDuration: parseInt(env.WORKER_RATE_LIMIT_DURATION),
    lowConfidenceThreshold: parseFloat(env.LOW_CONFIDENCE_THRESHOLD),
  },
};

export default config;

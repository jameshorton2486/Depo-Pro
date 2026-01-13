declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Database
      DATABASE_URL: string;

      // Supabase
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      SUPABASE_STORAGE_BUCKET: string;

      // Auth
      // NextAuth removed - using Supabase only
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      MICROSOFT_CLIENT_ID?: string;
      MICROSOFT_CLIENT_SECRET?: string;

      // Email
      RESEND_API_KEY: string;
      FROM_EMAIL: string;
      USE_RESEND: string;

      // Transcription
      DEEPGRAM_API_KEY: string;
      USE_DEEPGRAM: string;

      // Payments
      STRIPE_SECRET_KEY: string;
      STRIPE_PUBLISHABLE_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;
      USE_STRIPE: string;

      // Queue
      REDIS_URL: string;
      USE_QUEUE: string;

      // Feature flags
      USE_CLOUD_STORAGE: string;
      USE_REAL_EXPORT: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};

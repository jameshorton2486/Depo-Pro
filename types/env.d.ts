declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Supabase
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;

      // Deepgram
      DEEPGRAM_API_KEY: string;
      DEEPGRAM_WEBHOOK_SECRET?: string;

      // Anthropic
      ANTHROPIC_API_KEY: string;

      // Email (Resend)
      RESEND_API_KEY?: string;
      ADMIN_EMAIL?: string;

      // Stripe
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      USE_STRIPE?: string;

      // Google Calendar
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      GOOGLE_REDIRECT_URI?: string;

      // Queue
      REDIS_URL?: string;
      USE_QUEUE?: string;

      // Application
      NEXT_PUBLIC_APP_URL?: string;
      NEXT_PUBLIC_SITE_URL?: string;
      CRON_SECRET?: string;
      INTERNAL_API_SECRET?: string;
      WEBHOOK_SECRET?: string;
      CONTACT_WEBHOOK_URL?: string;
      LOG_LEVEL?: string;
      UPLOADS_DIR?: string;
      LOW_CONFIDENCE_THRESHOLD?: string;

      // Platform (auto-set)
      NODE_ENV: 'development' | 'production' | 'test';
      VERCEL_ENV?: 'production' | 'preview' | 'development';
      NEXT_PHASE?: string;

      // Feature flags
      ENABLE_MEDICAL_CHRONOLOGY?: string;
      ENABLE_EXPORT?: string;
      ENABLE_AI_EXTRACTION?: string;
      ENABLE_TRANSCRIPTION?: string;
      ENABLE_DEMAND_BUILDER?: string;
      ENABLE_REALTIME?: string;
      ENABLE_EXHIBITS?: string;
      ENABLE_VOCABULARY?: string;
      ENABLE_SHARING?: string;
      ENABLE_BILLING_PHASE_6?: string;
      DISABLE_PRE_BETA?: string;
    }
  }
}

export {};

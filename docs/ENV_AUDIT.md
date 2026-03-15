# Environment Variable Audit

## Required (application will not function correctly without these)
| Variable | Purpose | Where Set |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Vercel |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable client key | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side privileged access | Vercel |
| `DEEPGRAM_API_KEY` | Transcription API | Vercel |
| `ANTHROPIC_API_KEY` | Medical extraction pipeline | Vercel |

## Optional
| Variable | Purpose | Default |
|---|---|---|
| `REDIS_URL` | Queue/rate-limit backing store | In-memory fallback |
| `RESEND_API_KEY` | Resend email API key | none |
| `CRON_SECRET` | Protects cron endpoints | none |
| `WEBHOOK_SECRET` | Webhook signing | none |
| `DEEPGRAM_WEBHOOK_SECRET` | Deepgram callback signing | none |
| `STRIPE_SECRET_KEY` | Billing integration | none |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook validation | none |
| `SENTRY_DSN` | Error telemetry | none |

## Deprecated (remove from production env)
| Variable | Reason |
|---|---|
| `DATABASE_URL` | Prisma-era DB var |
| `DIRECT_URL` | Prisma migration var |
| `NEXTAUTH_SECRET` | NextAuth removed |
| `NEXTAUTH_URL` | NextAuth removed |

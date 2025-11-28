# Depo-Pro Environment Setup Checklist

## Required for Development
| Variable | Source | Status |
|----------|--------|--------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string | ✅ Present (rotate if previously shared). |
| `NEXTAUTH_SECRET` | Generate locally via `openssl rand -base64 32` | ⚠️ Present but rotate if credentials leaked. |
| `NEXTAUTH_URL` | Usually `http://localhost:3000` for dev | ✅ Present. |
| `DEEPGRAM_API_KEY` | console.deepgram.com → API Keys | ⏳ Placeholder (`your_deepgram_api_key_here`). |

## Required for Supabase Features
| Variable | Source | Status |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API (Project URL) | ⛔ Missing (only `SUPABASE_URL` defined). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon key) | ⛔ Missing (use same value as `SUPABASE_ANON_KEY`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service role) | ⚠️ Present but flagged for rotation. |
| `SUPABASE_STORAGE_BUCKET` | Supabase Storage bucket name | ✅ `depo-files`. |

## Optional (Can Add Later)
| Variable | Source | Purpose |
|----------|--------|---------|
| `REDIS_URL` or `REDIS_HOST`/`PORT` | Upstash or local Redis | BullMQ background jobs. |
| `RESEND_API_KEY` / `FROM_EMAIL` | resend.com | Email notifications. |
| `USE_RESEND`, `USE_STRIPE`, `USE_DEEPGRAM`, `USE_QUEUE` | Manual flags | Feature toggles for optional systems. |
| `ANTHROPIC_API_KEY` / other LLM keys | console.anthropic.com (etc.) | Advanced AI summarization (future). |

## Setup Steps
1. Copy `.env.example` to `.env` if not already done.
2. Log into Supabase, open your project, and collect DB URL + anon/service keys.
3. Generate a fresh `NEXTAUTH_SECRET` and update both `.env` and Vercel env vars.
4. Create a Deepgram API key (free credit available) and set `DEEPGRAM_API_KEY` + `USE_DEEPGRAM="true"` when ready.
5. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` so client-side code can talk to Supabase storage.
6. (Optional) Configure Redis/Resend/Stripe flags if those services are enabled.

## Verification Checklist
1. Run `npx prisma generate` (after installing deps) to ensure Prisma picks up schema.
2. Run `npm run db:seed` to create demo users/jobs.
3. Start `npm run dev` and open `http://localhost:3000/login`.
4. Log in with `admin@depo-pro.com / password123` to confirm auth + DB connectivity.

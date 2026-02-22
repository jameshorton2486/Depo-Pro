# Deployment Lockdown Checklist

Date: February 22, 2026

## Vercel Function Limits
- `app/api/jobs/[id]/transcribe/route.ts`: `maxDuration = 300`
- `app/api/jobs/[id]/medical-records/[recordId]/extract/route.ts`: `maxDuration = 120`

Configured in `vercel.json`.

## Cron
- `GET /api/cron/process-jobs` scheduled every minute in `vercel.json`.

## Environment Audit
- Reference: `docs/ENV_AUDIT.md`
- Required variables present in Vercel project:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DEEPGRAM_API_KEY`
  - `ANTHROPIC_API_KEY`

## Deprecated Environment Variables
Remove if present:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Production Error Logging
Critical routes emit `[CRITICAL]` on production exceptions:
- transcription trigger
- review mutation
- transcript export
- job export (GET/POST)
- invoice PDF generation

## Build Gate
Run before deploy:
1. `npx tsc --noEmit`
2. `npm run build`

Record:
- build status
- build warnings
- timestamp of verification

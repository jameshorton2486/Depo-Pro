# Depo-Pro Deployment Checklist
**Last updated:** 2026-03-06
**Platform:** Vercel + Supabase
**Live URL:** https://depo-pro.com

This checklist must be completed before every production deployment.

---

## PRE-DEPLOYMENT (run locally)

  - [ ] npm run build              -- must complete with 0 errors
  - [ ] npx tsc --noEmit           -- must return 0 errors
  - [ ] git status                 -- working tree must be clean
  - [ ] git diff main..HEAD --name-only  -- review what changed

---

## VERCEL CONFIGURATION

### Function Timeouts (vercel.json)
  - [ ] Transcription route:   maxDuration = 300 (Pro) / 60 (Hobby)
  - [ ] Medical extraction:    maxDuration = 120
  - [ ] DOCX export:           maxDuration = 60
  - [ ] Cron route:            schedule confirmed in "crons" block
  - [ ] vercel.json is valid JSON (no trailing commas, no comments)

### Environment Variables -- Production
Verify ALL of these are set in:
  Vercel -> Project -> Settings -> Environment Variables -> Production

  - [ ] CRON_SECRET
  - [ ] NEXT_PUBLIC_SITE_URL              = https://depo-pro.com
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] DEEPGRAM_API_KEY
  - [ ] USE_DEEPGRAM                      = true
  - [ ] ANTHROPIC_API_KEY

Confirm these are NOT present (deprecated -- delete if found):
  - [ ] NODE_ENV            (Vercel sets this automatically)
  - [ ] DATABASE_URL        (Prisma -- removed)
  - [ ] DIRECT_URL          (Prisma -- removed)
  - [ ] NEXTAUTH_SECRET     (NextAuth -- removed)
  - [ ] NEXTAUTH_URL        (NextAuth -- removed)
  - [ ] NEXT_PUBLIC_APP_URL (duplicate -- removed)

### next.config.ts
  - [ ] serverExternalPackages includes fluent-ffmpeg and @ffmpeg-installer/ffmpeg
  - [ ] Body size limit configured for audio uploads (2 GB)

---

## SUPABASE CONFIGURATION

### Auth Settings
  - [ ] Site URL: https://depo-pro.com
  - [ ] Redirect URLs include:
      https://depo-pro.com/**
      https://depo-pro.com/auth/callback
  Verify: Supabase -> Authentication -> URL Configuration

### Storage Buckets
  - [ ] depo-audio:    PRIVATE -- signed URLs, 2 GB limit per file
  - [ ] depo-files:    PRIVATE -- signed URLs, 50 MB limit per file
  - [ ] depo-exports:  PRIVATE -- signed URLs, authenticated download only
  - [ ] depo-chunks:   PRIVATE -- service role only
  Verify: Supabase Dashboard -> Storage -> [bucket] -> Policies

### RLS Policies
  - [ ] RLS enabled on: jobs, transcriptions, transcript_words, flagged_words
  Verify: Supabase -> Table Editor -> [table] -> RLS (green indicator)

---

## POST-DEPLOYMENT VERIFICATION

  - [ ] https://depo-pro.com loads -- no 404 or blank page
  - [ ] GET /api/health returns { "status": "healthy" }
  - [ ] Log in as test reporter -- dashboard loads without console errors
  - [ ] Vercel -> Logs -> Functions -- no [CRITICAL] lines on first load

---

## ROLLBACK PROCEDURE

If a deployment breaks production:
  1. Vercel -> Deployments -> find last known-good deployment
  2. Click ... -> "Promote to Production"
  3. Verify https://depo-pro.com is restored
  4. Identify the breaking commit and fix locally
  5. Run full pre-deployment checklist before redeploying

---

## KNOWN PRODUCTION QUIRKS

**Transcription timeout:**
  maxDuration: 300 requires Vercel Pro plan. Hobby plan cap is 60s.
  The chunking + polling pattern handles multi-hour depositions.
  Do not increase beyond 300s -- it won't help for long depositions.

**ffmpeg binary:**
  The @ffmpeg-installer/ffmpeg package provides a static binary.
  If audio processing fails in production with "ffmpeg not found",
  verify serverExternalPackages in next.config.ts includes it.

**Signed URL expiry:**
  depo-audio signed URLs expire after 1 hour. If audio playback
  returns 403 after a long review session, the player needs to
  request a fresh signed URL. Known post-beta improvement item.

**Cron jobs:**
  Vercel cron requires the CRON_SECRET env var to be set.
  Cron routes must validate: Authorization header = Bearer CRON_SECRET.
  Verify this is in place before enabling the cron schedule.

**Middleware deprecation:**
  Next.js 16 warns that "middleware" is deprecated in favor of "proxy".
  This is cosmetic -- middleware.ts still works. Migration tracked separately.

---

## CURRENT STATUS
  Last verified: 2026-03-06
  Build:         CLEAN
  /api/health:   HEALTHY
  Beta users:    0 (pre-launch)

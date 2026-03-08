# Beta Launch Criteria

> **Last Updated:** 2026-03-01
> **Purpose:** Single pass/fail gate before sending beta invitations
> **Rule:** ALL items must be checked. No exceptions. No "good enough."
> **When to run:** After completing Phase 6 in the [Production Readiness Guide](./PRODUCTION_READINESS_GUIDE.md)
> **Task details:** [Remaining Tasks Analysis](./REMAINING_TASKS_ANALYSIS.md)

---

## Build Health

- [ ] `npm run build` — zero errors
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — no critical warnings
- [ ] `grep -r "throw.*not implemented" lib/` — zero matches on active code paths

---

## Core Workflow (End-to-End)

- [ ] Reporter registers, verifies email, logs in, sees reporter dashboard
- [ ] Reporter creates a new job with case details
- [ ] Reporter uploads audio file (.mp3, .wav, or .m4a)
- [ ] Reporter triggers transcription → progress visible
- [ ] Transcription completes without error (Deepgram Nova-3)
- [ ] Flagged words (low-confidence) appear in review interface
- [ ] Reporter assigns a scopist to the job
- [ ] Scopist logs in, sees assigned job on scopist dashboard
- [ ] Scopist opens review page for the assigned job
- [ ] Scopist hears audio synced to transcript words
- [ ] Scopist corrects flagged words and saves corrections
- [ ] Corrections persist after page refresh
- [ ] DOCX export contains corrections (not original AI text)
- [ ] DOCX export has legal formatting (Courier New, 25 lines/page, line numbering)

---

## Stability

- [ ] 10 consecutive transcription jobs complete without crash (TST-02)
- [ ] No production-throwing stubs on active paths:
  - [ ] `lib/cost-control-service.ts` — returns safe defaults
  - [ ] `lib/transcripts/status-service.ts` — returns safe defaults
  - [ ] `lib/jobs.ts` — stubs return safely (no throws)
  - [ ] `lib/transcription/buildKeywords.ts` — returns `[]`
- [ ] Critical test suite passes (TST-01):
  - [ ] transcription-pipeline
  - [ ] flagged-words
  - [ ] review-api
  - [ ] export-with-corrections
  - [ ] auth-flow

---

## Security (Minimum Viable)

- [ ] All environment variables set in Vercel production (SEC-05)
- [ ] 20+ write-heavy API routes use `withRouteProtection` or equivalent (SEC-01)
- [ ] Stub routes check auth before responding (SEC-02)
- [ ] Storage bucket policies verified in Supabase Dashboard (SEC-04)
- [ ] Optimistic locking prevents silent correction overwrite (SEC-03)
- [ ] No secrets in client-side bundle (`NEXT_PUBLIC_*` only for safe values)

---

## Infrastructure

- [ ] `/api/health` returns all services healthy including database check
- [ ] Vercel `maxDuration` configured: transcription 300s, medical extraction 120s
- [ ] Cron job `/api/cron/process-jobs` running and processing
- [ ] HTTPS/SSL verified on depo-pro.com
- [ ] Security headers present in production (CSP, HSTS, X-Frame-Options)

---

## Export Formats

- [ ] DOCX — legal formatting + corrections included
- [ ] PDF — acceptable formatting + corrections included
- [ ] TXT — corrections included

---

## User Experience

- [ ] No blank white screens on any main page (error boundaries)
- [ ] No "Coming Soon" pages in sidebar navigation
- [ ] Dashboard loads in under 3 seconds
- [ ] Review page loads transcript and audio without timeout

---

## Onboarding

- [ ] Registration works end-to-end (register → verify email → login → dashboard)
- [ ] Admin can assign roles to registered users
- [ ] Invite accept page shows helpful message (not "not available")
- [ ] Contact form captures submissions

---

## Sign-Off

| Criteria | Date Passed | Verified By |
|----------|-------------|-------------|
| Build Health | | |
| Core Workflow | | |
| Stability | | |
| Security | | |
| Infrastructure | | |
| Export Formats | | |
| User Experience | | |
| Onboarding | | |

**Beta Launch Approved:** ⬜ Yes / ⬜ No

**Date:** _______________

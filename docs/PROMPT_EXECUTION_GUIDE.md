# DEPO-PRO — MASTER PROMPT INDEX & EXECUTION GUIDE
**Version:** 1.0 | **Date:** March 2026  
**Location in repo:** `docs/PROMPT_EXECUTION_GUIDE.md`

> This document is the single reference for running all Depo-Pro
> Codex implementation prompts in the correct order. Read this before
> starting any phase.

---

## PROMPT FILE INVENTORY

All prompt files live in `docs/prompts/` in the repo.

| File | Phase | Status | Description |
|---|---|---|---|
| `PHASE1_FOUNDATION_FIXES.md` | 1 | ✅ Ready | Bug fixes, status labels, nav labels, email templates, Zoho removal |
| `PHASE1_ADDENDUM_AUDIO.md` | 1B | ✅ Ready | FFmpeg neural denoising, audio quality scoring, Python manual tool |
| `PHASE2_AUDIO_WIZARD.md` | 2 | ✅ Ready | Audio/video upload wizard, Active Depositions directory, retire /transcription-tool |
| `PHASE3_NOTIFICATIONS.md` | 3 | ✅ Ready | Resend email triggers, secure download tokens, Deliver Transcript flow |
| `PHASE4_BILLING.md` | 4 | ✅ Ready | Billing tables migration, Stripe activation, invoice UI |
| `PHASE5_BETA_HARDENING.md` | 5 | ✅ Ready | BUG-003 fix, security tests, edge case tests, Miah Bardot account |

---

## EXECUTION ORDER

**IMPORTANT:** Phases must run in order. Each phase assumes the previous
is committed and verified. Never run two phases in the same Claude Code
session.

```
Phase 1  →  Phase 1B  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5
```

---

## HOW TO RUN EACH PHASE

### Standard Command (use for every phase)

```powershell
cd C:\Users\james\depo-pro
claude --dangerously-skip-permissions
```

Then paste the entire contents of the phase prompt file.

### Before Phase 4 Only

Lift the beta freeze manually first:

```powershell
# Edit BETA_FREEZE.md — change STATUS: ACTIVE to STATUS: LIFTED
git add BETA_FREEZE.md
git commit -m "docs: lift beta freeze — Phase 4 billing begins"
git push
```

---

## PHASE-BY-PHASE QUICK REFERENCE

---

### PHASE 1 — Foundation Fixes
**File:** `docs/prompts/PHASE1_FOUNDATION_FIXES.md`  
**Tasks:** 7  
**Touches:** 4 files

| # | Fix | File |
|---|---|---|
| 1.1 | Fix 403 — SUPER_ADMIN blocked from creating jobs | `app/api/jobs/route.ts` |
| 1.2 | Fix job_assignments FK crash on jobs list | `app/(dashboard)/jobs/page.tsx` |
| 1.3 | Update job status display labels | `components/jobs/job-status-badge.tsx` |
| 1.4 | Update navigation labels | `lib/navigation.ts` |
| 1.5 | Update jobs list status filter dropdown | `app/(dashboard)/jobs/page.tsx` |
| 1.6 | Add 4 lifecycle email templates | `lib/email.ts` |
| 1.7 | Remove Zoho from .env.example | `.env.example` |

**Post-flight:** Jobs list loads, no FK error, status badges show
"Ready for Proofing" etc., nav shows "New Deposition".

---

### PHASE 1B — Audio Enhancement Addendum
**File:** `docs/prompts/PHASE1_ADDENDUM_AUDIO.md`  
**Tasks:** 4  
**Touches:** 3 files + 2 new files

| # | Fix | File |
|---|---|---|
| 1.8 | Upgrade FFmpeg filter chain (arnndn, afftdn, compressor) | `lib/transcription/preprocessor.ts` |
| 1.9 | Add audio quality scoring function | `lib/transcription/preprocessor.ts` |
| 1.10 | Wire quality score into pipeline, replace Dolby stub | `lib/transcription/pipeline.ts`, `lib/services/audio-enhancement-service.ts` |
| 1.11 | Create manual Python enhancement script | `scripts/audio/enhance.py` (NEW), `scripts/audio/README.md` (NEW) |

**Post-flight:** Server logs show `[pipeline] Audio quality: XX/100`
and FFmpeg filter chain includes arnndn and afftdn.

---

### PHASE 2 — Audio/Video Upload Wizard
**File:** `docs/prompts/PHASE2_AUDIO_WIZARD.md`  
**Tasks:** 6  
**Touches:** 4 files + 2 new components

| # | Feature | File |
|---|---|---|
| 2.1 | Increase upload limit 100MB → 2GB, add M4A | `app/api/jobs/[id]/files/route.ts` |
| 2.2 | Add Step 4 audio upload to intake wizard | `components/intake/JobRequestWizard.tsx`, `components/intake/IntakeAudioStep.tsx` (NEW) |
| 2.3 | Retire /transcription-tool with redirect | `app/transcription-tool/page.tsx` |
| 2.4 | Active Depositions directory on reporter dashboard | `app/(dashboard)/reporter/page.tsx` |
| 2.5 | Audio quality badge on job detail page | `app/(dashboard)/jobs/[id]/page.tsx` |
| 2.6 | SUPER_ADMIN direct job creation fix | `app/api/intake/submit-request/route.ts` |

**Post-flight:** Intake wizard shows audio upload step, /transcription-tool
redirects, reporter dashboard shows Active Depositions panel.

---

### PHASE 3 — Notifications & Delivery
**File:** `docs/prompts/PHASE3_NOTIFICATIONS.md`  
**Tasks:** 7  
**Touches:** 4 files + 3 new files

| # | Feature | File |
|---|---|---|
| 3.1 | Change flagged words hard block → warning | `app/api/jobs/[id]/review/submit/route.ts` |
| 3.2 | Send proofingCompleteEmail on scopist submit | `app/api/jobs/[id]/review/submit/route.ts` |
| 3.3 | Recording reminder in daily cleanup cron + vercel.json | `app/api/cron/cleanup/route.ts`, `vercel.json` |
| 3.4 | Secure one-time download token system | `lib/security/download-tokens.ts` (NEW), `app/api/download/[token]/route.ts` (NEW) |
| 3.5 | Deliver Transcript button + API route | `components/jobs/DeliverTranscriptButton.tsx` (NEW), `app/api/jobs/[id]/deliver/route.ts` (NEW), `app/(dashboard)/jobs/[id]/page.tsx` |
| 3.6 | Scopist assignment UI verification | `app/(dashboard)/jobs/[id]/page.tsx` |
| 3.7 | readyForProofingEmail in transcription pipeline | `lib/transcription/pipeline.ts` |

**Post-flight:** Submitting review sends email, recording reminder runs
in cron, download tokens work one-time, Deliver button appears on
REVIEW_COMPLETE jobs.

---

### PHASE 4 — Billing & Stripe
**File:** `docs/prompts/PHASE4_BILLING.md`  
**Prerequisites:** BETA_FREEZE.md → STATUS: LIFTED  
**Tasks:** 7  
**Touches:** 4 files + 1 new migration + 1 new component

| # | Feature | File |
|---|---|---|
| 4.1 | Create billing_accounts, invoices, invoice_line_items tables | `supabase/migrations/20260315000100_billing_tables.sql` (NEW) |
| 4.2 | Activate real Stripe code in invoice service | `lib/invoice.ts` |
| 4.3 | Wire Stripe webhook event handlers | `app/api/webhooks/stripe/route.ts` |
| 4.4 | Add SUPER_ADMIN to invoice route | `app/api/jobs/[id]/invoice/route.ts` |
| 4.5 | Replace billing stub page with real invoice dashboard | `app/billing/page.tsx` |
| 4.6 | Add Generate Invoice button to completed jobs | `components/jobs/GenerateInvoiceButton.tsx` (NEW), `app/(dashboard)/jobs/[id]/page.tsx` |
| 4.7 | Set Stripe env vars in Vercel (manual — no code change) | Vercel dashboard |

**Post-flight:** Billing tables exist in Supabase, /billing shows
invoice history, Generate Invoice button works on completed jobs.

---

### PHASE 5 — Beta Hardening
**File:** `docs/prompts/PHASE5_BETA_HARDENING.md`  
**Tasks:** 8  
**Touches:** 4 files + 2 new test files

| # | Fix | File |
|---|---|---|
| 5.1 | Fix BUG-003: scopist PATCH authorization gap | `app/api/jobs/[id]/flagged-words/route.ts` |
| 5.2 | Fix transcript_shares column name mismatch | `lib/supabase/queries/shares.ts` |
| 5.3 | Add security tests proving BUG-003 fix | `tests/integration/flagged-words.test.ts` |
| 5.4 | Add audio pipeline edge case tests | `tests/integration/audio-pipeline-edge-cases.test.ts` (NEW) |
| 5.5 | Update beta testing guide for Phase 2 UI | `docs/BETA_TESTING_GUIDE.md` |
| 5.6 | Clean up .env.example placeholders | `.env.example` |
| 5.7 | Create Miah Bardot's account (manual — Supabase SQL) | Supabase dashboard |
| 5.8 | Final build verification | All — no file changes |

**Post-flight:** All tests pass, BUG-003 returns 403, Miah Bardot can
log in at depo-pro.com.

---

## ENVIRONMENT VARIABLES REQUIRED IN VERCEL

Set these in Vercel dashboard before deploying:

| Variable | Required By | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Always | Already set |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Always | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Always | Already set |
| `DEEPGRAM_API_KEY` | Phase 1B | Already set |
| `ANTHROPIC_API_KEY` | Always | Already set |
| `RESEND_API_KEY` | Phase 3 | Set before Phase 3 |
| `CRON_SECRET` | Phase 3 | Random string, set before Phase 3 |
| `STRIPE_SECRET_KEY` | Phase 4 | Use "depo-pro" key, NOT kollect-it |
| `STRIPE_WEBHOOK_SECRET` | Phase 4 | From "depo-pro-production" webhook |
| `USE_STRIPE` | Phase 4 | Set to `true` |
| `ENABLE_BILLING_PHASE_6` | Phase 4 | Set to `true` |
| `LOW_CONFIDENCE_THRESHOLD` | Phase 1B | Set to `0.85` |

---

## KEY DECISIONS LOCKED IN

These product decisions were confirmed during planning and must NOT
be changed without explicit discussion:

| Decision | Detail |
|---|---|
| **Audio quality scoring** | UNUSABLE files abort pipeline. POOR files auto-use AGGRESSIVE FFmpeg config |
| **Flagged word submission** | Warning only — scopists can submit with unresolved flags |
| **Attorney delivery** | One-time 72-hour download link. No attorney portal at beta. |
| **Notification provider** | Resend only. Zoho fully removed. |
| **DOCX generation** | System generates automatically. Reporter does NOT upload a DOCX. |
| **Cause number grouping** | Normalized (strip hyphens) for matching; display format preserved |
| **Scopist access window** | 60 days post-DELIVERED for audio/video; 18 months for transcripts |
| **SUPER_ADMIN** | Full access to all jobs across all firms — no firm_id filter |
| **job_assignments table** | Does NOT exist. Scopist assignment is `jobs.scopist_id` directly |
| **Multiple audio files** | `is_primary_audio` flag determines which file goes to Deepgram |
| **Video streaming** | Signed Supabase URLs — no custom streaming server |

---

## FILES NEVER TO MODIFY WITHOUT EXPLICIT APPROVAL

```
lib/middleware/withRouteProtection.ts
lib/auth/session.ts
lib/supabase/server.ts
lib/supabase/admin.ts
supabase/migrations/**
```

---

## FIRST BETA USER

**Miah Bardot** — CSR No. 12129 — SA Legal Solutions  
Created in Phase 5, Task 5.7.

Test case: Bianca Perez v. Simon Ugalde (Cause No. 2025-CI-12281)  
Audio: `3-11-2026-Bianca Perez_audio.mp3` (234.9 MB)

Known Deepgram misrecognition: "Miah Bardot" → "Miyamardeau" or
"Mia Bardeau" — both wrong. Correct: B-A-R-D-O-T.

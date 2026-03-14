# DEPO-PRO AI AGENT PROTOCOL & PHASE EXECUTION PLAN
**Version:** 1.0 | **Date:** March 2026 | **Status:** Active Build Plan  
**Companion to:** `01_MASTER_ARCHITECTURE.md`, `02_JOB_LIFECYCLE_AND_NOTIFICATIONS.md`, `03_AUDIO_PIPELINE.md`

> This document is the operating manual for all AI coding agents working on Depo-Pro.
> Read it entirely before touching any code. It contains the protocol every agent
> must follow AND the specific task-by-task execution plan for each phase.

---

## TABLE OF CONTENTS

1. [AI Agent Protocol — Read This First](#1-ai-agent-protocol--read-this-first)
2. [How to Start Every Session](#2-how-to-start-every-session)
3. [Commit Discipline](#3-commit-discipline)
4. [Architecture Guardrails](#4-architecture-guardrails)
5. [Phase 1 — Foundation Fixes](#5-phase-1--foundation-fixes) ✅ Prompt Ready
6. [Phase 1 Addendum — Audio Enhancement](#6-phase-1-addendum--audio-enhancement) ✅ Prompt Ready
7. [Phase 2 — Audio/Video Upload Wizard](#7-phase-2--audiovideo-upload-wizard) 🔲 Design Complete
8. [Phase 3 — Notifications & Delivery](#8-phase-3--notifications--delivery) 🔲 Design Complete
9. [Phase 4 — Billing & Stripe](#9-phase-4--billing--stripe) 🔲 Deferred
10. [Phase 5 — Beta Hardening](#10-phase-5--beta-hardening) 🔲 Pending
11. [Post-Beta Feature Backlog](#11-post-beta-feature-backlog)
12. [Testing Requirements](#12-testing-requirements)
13. [Deployment Safety Checklist](#13-deployment-safety-checklist)

---

## 1. AI Agent Protocol — Read This First

Before making ANY code change, every AI agent must follow this exact protocol.
No exceptions. Skipping steps causes destructive edits.

### The Think-Before-Coding Protocol

```
STEP 1: READ THE DOCS
  Read 01_MASTER_ARCHITECTURE.md for domain model and table names
  Read 02_JOB_LIFECYCLE_AND_NOTIFICATIONS.md for status and notification rules
  Read 03_AUDIO_PIPELINE.md for audio processing rules
  This document for the specific task instructions

STEP 2: UNDERSTAND THE PROBLEM
  State in plain English what is broken or missing
  Identify WHY it is broken (root cause, not symptom)
  Confirm this is actually needed — do not add speculative features

STEP 3: PLAN THE SOLUTION
  List the exact files that will be changed
  Confirm NO protected files are in that list (see Section 4)
  Confirm the change does not introduce new npm dependencies
  Confirm the change does not modify the Supabase schema
  Confirm the change does not create new API routes (unless explicitly instructed)

STEP 4: BASELINE CHECK
  Run: npx tsc --noEmit
  Document the baseline error count
  NO task may increase this count

STEP 5: IMPLEMENT
  Make only the changes listed in your plan
  Do not refactor surrounding code unless it is breaking
  Do not rename things just because you prefer different names
  Do not add comments that state the obvious

STEP 6: VERIFY
  Run: npx tsc --noEmit — zero new errors
  Run: npm run dev — server starts without errors
  Navigate to affected page — loads correctly
  Check browser console — no new errors
  Check server console — no new warnings/errors

STEP 7: COMMIT
  One commit per numbered task
  Use the exact commit message from the task spec
  Never batch multiple tasks into one commit
```

---

## 2. How to Start Every Session

```powershell
# Always run in a fresh session to prevent contamination
cd C:\Users\james\depo-pro
claude code --no-resume

# Verify baseline before any work
npx tsc --noEmit
```

**Active branch:** `DepoPro_Remaining_Development_Roadmap`

---

## 3. Commit Discipline

| Rule | Detail |
|---|---|
| **One commit per task** | Never batch — if Phase 1 has 7 tasks, make 7 commits |
| **Commit message format** | `type: description` — see prefixes below |
| **Baseline must not increase** | If TypeScript errors increase, do not commit |
| **No speculative changes** | Only change what the task specifies |

### Commit Message Prefixes

```
fix:   Bug fix — e.g. "fix: allow SUPER_ADMIN to create jobs"
feat:  New feature — e.g. "feat: add audio quality scoring"
chore: Maintenance — e.g. "chore: remove Zoho references"
docs:  Documentation only — e.g. "docs: add pipeline comments"
refactor: Code restructure without behavior change
```

---

## 4. Architecture Guardrails

These rules are NON-NEGOTIABLE. Violating them causes technical debt.

### What Goes Where

| Code Type | Where It Lives | Where It Does NOT Live |
|---|---|---|
| Business logic | `lib/services/` | API routes, components |
| Database queries | `lib/supabase/queries/` | Components, inline in routes |
| External service calls | `lib/services/` (wrapped) | Direct calls from components |
| Audio processing | `lib/transcription/` | API routes, UI |
| Email templates | `lib/email.ts` | API routes, components |
| Transcript formatting | `lib/transcription/formatter/` | API routes |
| React UI logic | `components/`, `app/` | lib/ files |

### Protected Files — NEVER Modify Without Explicit Instruction

```
lib/middleware/withRouteProtection.ts
lib/auth/session.ts
lib/supabase/server.ts
lib/supabase/admin.ts
supabase/migrations/**
```

### Prohibited Without Explicit Approval

- New npm dependencies
- New Supabase migrations or schema changes
- New API routes (unless the task spec says to create one)
- Modifying auth or middleware
- Hard deletes on `transcript_words`
- Modifying `original_word` field values
- `console.log` — use `console.warn` or `console.error` only

### Cross-Tenant Security (Mandatory)

Every database query must include `firm_id` filtering.
Failure to do this creates a cross-tenant data leak.

```typescript
// CORRECT
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('firm_id', user.firm_id)
  .eq('id', jobId);

// WRONG — missing firm_id filter
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('id', jobId);
```

---

## 5. Phase 1 — Foundation Fixes

**Status:** ✅ Codex prompt written — `DEPO_PRO_CODEX_PROMPT_PART1.md`  
**Purpose:** Fix blocking bugs and update labels before any new features.  
**Run with:** `claude code --no-resume` — paste prompt content

### Task 1.1 — Fix 403 on POST /api/jobs for SUPER_ADMIN

**File:** `app/api/jobs/route.ts`  
**Problem:** Inline role check excludes SUPER_ADMIN → 403 on job creation  
**Fix:** Add `userRole !== 'SUPER_ADMIN'` to the role check condition  
**Note:** `withRouteProtection` already handles SUPER_ADMIN → ADMIN promotion  
**Commit:** `fix: allow SUPER_ADMIN to create jobs via POST /api/jobs`

### Task 1.2 — Fix job_assignments FK Crash on Jobs List

**File:** `app/(dashboard)/jobs/page.tsx`  
**Problem:** Query joins `job_assignments` table which does not exist → page crash  
**Fixes:**
1. Remove `job_assignments(...)` from SELECT query
2. Replace SCOPIST `job_assignments` query with early return message
3. Remove scopist ID extraction loop
4. Replace `assignments` mapping with `assignments: []`
5. Add `SUPER_ADMIN` to role-based filtering (no filter — sees all)
6. Update `REPORTER` check to also include `COURT_REPORTER`

**Commit:** `fix: remove job_assignments FK error, add SUPER_ADMIN full access to jobs list`

### Task 1.3 — Update Job Status Display Labels

**File:** `components/jobs/job-status-badge.tsx`  
**Changes:**
- Change prop type from `JobStatus` (strict enum) to `string` with safe fallback
- Replace `statusConfig` with full human-readable label map
- Add new lifecycle statuses: SCHEDULED, RECORDING_PENDING, READY_FOR_PROOF, etc.

**Labels to apply:** See `02_JOB_LIFECYCLE_AND_NOTIFICATIONS.md` Section 2  
**Commit:** `feat: update job status display labels to legal industry language`

### Task 1.4 — Update Navigation Labels

**File:** `lib/navigation.ts`  
**Changes:**

| Find | Replace |
|---|---|
| `'New Job'` | `'New Deposition'` |
| `'All Jobs'` | `'All Depositions'` |
| `'My Jobs'` | `'My Depositions'` |
| `'Calendar'` | `'Deposition Calendar'` |
| `'In Progress'` (transcript section) | `'In Proofing'` |
| `'Ready'` (transcript section) | `'Ready for Proofing'` |

**Commit:** `feat: update navigation labels to legal industry terminology`

### Task 1.5 — Update Jobs List Page Labels and Filter

**File:** `app/(dashboard)/jobs/page.tsx`  
**Changes:**
- Page heading: "Jobs" → "Depositions"
- Subtitle: update to "Manage deposition jobs and transcripts"
- "+ New Job" button → "+ New Deposition"
- Status filter dropdown options → human-readable labels (see doc 02 Section 9)

**Commit:** `feat: update jobs page labels and status filter to legal terminology`

### Task 1.6 — Add Lifecycle Email Notification Functions

**File:** `lib/email.ts`  
**Changes:**
- Fix `info@depo-pro.com` reference → `notifications@depo-pro.com` in `invoiceEmail`
- Add 4 new exported functions after existing `invoiceEmail`:
  - `recordingNeededEmail(data)` — amber header, upload link
  - `readyForProofingEmail(data)` — green header, flagged word count badge, transcript link
  - `proofingCompleteEmail(data)` — blue header, flag warning/success panel, certify link
  - `transcriptDeliveredEmail(data)` — navy header, 72-hr download link, expiry notice

**See:** `DEPO_PRO_CODEX_PROMPT_PART1.md` Task 6 for full HTML template code  
**Commit:** `feat: add deposition lifecycle email notification templates`

### Task 1.7 — Remove Zoho References

**File:** `.env.example`  
**Changes:** Delete any lines containing `ZOHO`, `zoho`, `smtp.zoho`, `ZOHO_SMTP`  
**Commit:** `chore: remove Zoho references, confirm Resend as sole email provider`

### Phase 1 Post-Flight Verification

```bash
npx tsc --noEmit                    # zero new errors vs baseline
npm run dev
# Navigate to /jobs → loads without FK error
# Status badges show human-readable labels
# Nav shows "New Deposition", "All Depositions", "Deposition Calendar"
# SUPER_ADMIN can submit /jobs/new without 403
```

---

## 6. Phase 1 Addendum — Audio Enhancement

**Status:** ✅ Codex prompt written — `DEPO_PRO_CODEX_PROMPT_PART1_ADDENDUM_AUDIO.md`  
**Run after:** Phase 1 all tasks committed and verified  
**Purpose:** Upgrade the existing FFmpeg pipeline with neural denoising and quality scoring

### Task 1.8 — Upgrade FFmpeg Filter Chain

**File:** `lib/transcription/preprocessor.ts`  
**What already exists:** Basic loudnorm + highpass only (minimal)  
**What to add:**
- `NormalizationConfig` interface: add `arnndn`, `afftdn`, `afftdnStrength`, `compress`, `deess` fields
- `DEFAULT_NORMALIZATION_CONFIG`: enable all new filters with conservative values
- `AGGRESSIVE_NORMALIZATION_CONFIG`: stronger denoising for POOR tier
- Updated filter chain in `normalizeAudioForTranscription()`: highpass → arnndn → afftdn → acompressor → loudnorm

**See:** `03_AUDIO_PIPELINE.md` Section 4 for exact filter values  
**Commit:** `feat: upgrade FFmpeg audio enhancement with neural denoising and compression`

### Task 1.9 — Add Audio Quality Scoring Function

**File:** `lib/transcription/preprocessor.ts`  
**What to add:** `scoreAudioQuality(filePath): Promise<AudioQualityScore>` function  
**Scoring factors:** bitrate, sample rate, channels, codec, duration  
**Tier thresholds:** 85+ EXCELLENT, 70+ GOOD, 50+ FAIR, 25+ POOR, <25 UNUSABLE  
**Export:** Add to both named exports and default export  
**Commit:** `feat: add audio quality scoring with tier classification`

### Task 1.10 — Wire Quality Score into Pipeline

**Files:** `lib/transcription/pipeline.ts`, `lib/services/audio-enhancement-service.ts`  
**Changes to pipeline.ts:**
1. Import `scoreAudioQuality` and `AGGRESSIVE_NORMALIZATION_CONFIG` from preprocessor
2. Call `scoreAudioQuality()` before normalization — store result in `transcriptions.metadata`
3. Abort pipeline if tier is UNUSABLE with clear user-facing error
4. Auto-select AGGRESSIVE config if tier is POOR
5. Add `updateTranscriptionMetadata()` helper function

**Changes to audio-enhancement-service.ts:**
- Replace `enhanceWithDolby()` stub body with comment explaining delegation to preprocessor
- Keep API shape identical (returns `EnhancementResult`) for compatibility

**Commit:** `feat: wire audio quality scoring into pipeline, replace Dolby stub`

### Task 1.11 — Create Manual Enhancement Script

**Files to create:**
- `scripts/audio/enhance.py`
- `scripts/audio/README.md`

**What the script does:** Local Python tool for pre-processing poor audio before upload  
**Dependencies:** `pydub noisereduce scipy numpy` (pip) + system FFmpeg  
**See:** `03_AUDIO_PIPELINE.md` Section 9 for full usage and script content  
**Commit:** `feat: add manual audio enhancement Python script`

### Phase 1 Addendum Post-Flight

```bash
npx tsc --noEmit                    # zero new errors
npm run dev
# Upload any audio file → trigger transcription
# Server logs should show:
#   [pipeline] Audio quality: XX/100 (TIER)
#   [Preprocessor] FFmpeg command: ... (verify arnndn, afftdn in filter chain)
#   [pipeline] Audio enhanced in XXXms
```

---

## 7. Phase 2 — Audio/Video Upload Wizard

**Status:** 🔲 Design complete. Write Codex prompt after Phase 1 verified.  
**Purpose:** Add audio/video upload to the New Deposition intake wizard. Retire `/transcription-tool`.

### Task 2.1 — Extend /jobs/new Wizard to 4 Steps

**File:** `app/(dashboard)/jobs/new/page.tsx` and related components  
**Current:** 1 step (or 3 steps: Job Details → Upload Notice → Process)  
**Target:**
```
Step 1: Upload Notice (existing — NOD PDF)
Step 2: Review & Confirm Extracted Data (existing)
Step 3: Upload Audio/Video (NEW — optional, skippable)
Step 4: Processing / Confirmation (existing)
```

**Step 3 Requirements:**
- Accept: MP3, WAV, M4A, MP4 (audio), MP4 (video), MOV
- Max size: 2GB per file
- Multiple file support with primary selector
- Skip button: "Upload audio later"
- File type icon differentiation (audio vs video)
- Upload progress indicator

### Task 2.2 — Multiple Audio File Support with Primary Selector

**When multiple files present on job page:**
- Dropdown: "Select audio for transcription"
- Current primary clearly indicated
- Change primary before triggering transcription

### Task 2.3 — Video Streaming via Signed URLs

**Video storage:** Stored as-is in `cases/{cause_number}/jobs/{job_id}/video/`  
**Proofing UI:** Video streamed in-browser via Supabase signed URLs  
**No custom streaming server needed** — Supabase Storage signed URL API handles this

### Task 2.4 — Retire /transcription-tool Route

**File:** `app/transcription-tool/page.tsx`  
**Action:** Replace with redirect to `/jobs/new`  
```typescript
// app/transcription-tool/page.tsx
import { redirect } from 'next/navigation';
export default function TranscriptionToolPage() {
  redirect('/jobs/new');
}
```

### Task 2.5 — Active Depositions Directory on Reporter Dashboard

**Location:** Reporter dashboard (`/reporter`)  
**Feature:** A directory of active (not-yet-delivered) depositions grouped by cause number  
**Purpose:** Allows reporter to see all depositions under a case and attach files without re-entering data

```
Active Depositions

Perez v. Simon Ugalde (2025-CI-12281)
  ├── Bianca Perez — March 11 — [Transcribing]     [View]
  └── Simon Ugalde — March 5  — [Ready for Proofing] [View]

Rodriguez v. State Farm (2026-TX-04421)
  └── Maria Rodriguez — Feb 28 — [Recording Needed] [Upload Audio]
```

### Task 2.6 — Audio Quality Badge on Job Detail Page

**Location:** Job detail page — above the "Start Transcription" button  
**Source:** `transcriptions.metadata.audio_quality_score` and `audio_quality_tier`

```
Audio Quality: GOOD (78/100)

Audio Quality: ⚠ POOR (34/100)
Issues detected:
  • Low bitrate (64kbps)
Recommendation: Run manual enhancement script before re-uploading.
```

### Task 2.7 — Cause Number Auto-Match on Job Creation

**On job creation from NOD:**
1. Normalize cause number (strip hyphens/spaces → `2025CI12281`)
2. Query `case_metadata` for matching normalized `cause_number`
3. If found → attach new job to existing case (set `case_metadata_id`)
4. If not found → create new `case_metadata` record

---

## 8. Phase 3 — Notifications & Delivery

**Status:** 🔲 Design complete. Write Codex prompt after Phase 2 verified.  
**Purpose:** Wire email notifications into status transitions. Build secure delivery flow.

### Task 3.1 — Recording Needed Cron Job

**File:** `app/api/cron/process-jobs/route.ts`  
**Add:** Check for jobs where `status = 'CREATED'` and `deposition_date < TODAY` and `audio_file_url IS NULL`  
**Action:** Update status → `FILES_UPLOADED`, send `recordingNeededEmail()` to reporter + agency admin  
**Cron trigger:** Daily at midnight via Vercel Cron or external scheduler

### Task 3.2 — Ready for Proofing Notification

**File:** `lib/transcription/pipeline.ts` (Stage 6 completion)  
**Add:** After status set to `READY_FOR_EDIT`, call:
```typescript
// Determine recipient: scopist if assigned, otherwise reporter
const recipient = job.scopist_id ? scopist : reporter;
await sendEmail(readyForProofingEmail({ ...data, flaggedWordCount }));
```

### Task 3.3 — Proofing Complete Notification

**File:** `app/api/jobs/[id]/review/submit/route.ts`  
**Add:** After status set to `SUBMITTED_FOR_REVIEW`, call:
```typescript
const unresolvedCount = await countUnresolvedFlags(jobId);
await sendEmail(proofingCompleteEmail({ ...data, unresolvedFlagCount: unresolvedCount }));
```

### Task 3.4 — Secure One-Time Download Token

**New file to create:** `lib/security/download-tokens.ts`  
**Implementation:**
```typescript
// Generate token
export async function generateDownloadToken(jobId: string, transcriptId: string, expiresHours = 72): Promise<string>

// Validate token
export async function validateDownloadToken(token: string): Promise<{ jobId: string; transcriptId: string } | null>
```

Token stored in a new column or table. Each token is single-use.

### Task 3.5 — Transcript Delivered Notification

**File:** Delivery action route  
**Add:** Generate download token, send `transcriptDeliveredEmail()` to ordering attorney  
**Also:** Send agency admin notification (separate non-download email)

### Task 3.6 — Copy Order UI

**Location:** Job detail page when status is `REVIEW_COMPLETE`  
**Feature:** "Add Copy Order" button → modal:
- Attorney name, firm, email
- Delivery format (DOCX, PDF, ASCII)
- Charge amount
- Notes

Each copy order stored in DB. Each copy recipient gets their own download link email.

### Task 3.7 — Scopist Assignment UI

**Location:** Admin panel → job detail page  
**Feature:** Dropdown of SCOPIST-role users in the same firm  
**On select:** Set `jobs.scopist_id`, update status to `ASSIGNED` if currently `READY_FOR_EDIT`

---

## 9. Phase 4 — Billing & Stripe

**Status:** 🔲 Deferred — pending Stripe configuration  
**Current state:**
- New Stripe secret key created: labeled "depo-pro secret key"
- Webhook endpoint configured: `https://depo-pro.com/api/webhooks/stripe` named "depo-pro-production"
- `USE_STRIPE=false` in all environments
- Phase 11 billing routes already scaffolded in codebase

### Task 4.1 — Add Stripe Env Vars to Vercel

```bash
STRIPE_SECRET_KEY=sk_live_*      # the "depo-pro secret key"
STRIPE_WEBHOOK_SECRET=whsec_*   # from the "depo-pro-production" webhook
USE_STRIPE=true
```

Add to: Preview environment AND Production environment

### Task 4.2 — Activate Stripe Billing Routes

Review Phase 11 scaffolded routes and activate:
- `/api/billing/invoices`
- `/api/billing/invoice-preview`
- `/api/webhooks/stripe`

### Task 4.3 — Copy Order Charge Tracking

Connect copy order UI (Phase 3 Task 3.6) to Stripe invoice line items.

> ⚠️ **Note:** Depo-Pro has a separate Stripe key for `kollect-it.com`.
> Do not confuse the two. Always verify you are using the `depo-pro` secret key.

---

## 10. Phase 5 — Beta Hardening

**Status:** 🔲 Pending Phases 1–4 completion  
**Purpose:** Verify system stability before first real user (Miah Bardot, CSR #12129)

### Task 5.1 — Apply Pending Supabase Migrations

```bash
# Check migration status
supabase db diff

# Apply any pending migrations
supabase db push
```

### Task 5.2 — Fix Flagged Words Security Bug (BUG-003)

**File:** `app/api/jobs/[id]/flagged-words/route.ts`  
**Problem:** Any SCOPIST can PATCH flagged words regardless of job assignment  
**Fix:** In PATCH handler, verify `job.scopist_id === user.id` before allowing edit

### Task 5.3 — Configure Resend Domain Verification

1. Log in to Resend dashboard
2. Verify `depo-pro.com` domain
3. Add required DNS records at Bluehost
4. Set sending address to `notifications@depo-pro.com`
5. Test with a real email send

### Task 5.4 — Configure Supabase SMTP for Password Reset

In Supabase Dashboard → Authentication → Email → Custom SMTP:
```
Host: smtp.resend.com
Port: 465
Username: resend
Password: {RESEND_API_KEY starting with re_}
From: notifications@depo-pro.com
```

### Task 5.5 — Edge Case Tests

| Test Case | Expected |
|---|---|
| Deepgram API failure mid-job | Job status → FAILED, error stored, retry available |
| Mid-upload cancellation | Upload stops cleanly, no partial file in storage |
| Browser refresh during correction save | Correction not lost (optimistic update + re-fetch) |
| Audio file < 30 seconds | Processes normally, quality warning shown |
| Audio file > 30 minutes | Chunked correctly, reassembled accurately |
| Zero flagged words | Job proceeds to READY_FOR_EDIT, no flag count badge |
| UNUSABLE quality file | Pipeline aborts, clear error message shown |

### Task 5.6 — Full Playwright Smoke Test

Target: 20-step lifecycle from login through delivered transcript.

Key steps to cover:
1. Login as reporter
2. Upload NOD PDF
3. Verify AI extraction
4. Create job
5. Upload audio
6. Verify audio quality score appears
7. Start transcription
8. Verify status → TRANSCRIBING
9. Verify status → READY_FOR_EDIT
10. Open transcript editor
11. Correct a flagged word
12. Submit for review (as scopist)
13. Verify reporter notification
14. Reporter final review
15. Certify transcript
16. Deliver transcript
17. Verify attorney email (check delivery)
18. Verify job status → COMPLETED
19. Verify DOCX downloadable
20. Verify admin sees completed job

### Task 5.7 — Remove Deprecated Env Vars from Vercel

```bash
# Remove from ALL Vercel environments:
NEXTAUTH_SECRET
NEXTAUTH_URL
DATABASE_URL
DIRECT_URL
NODE_ENV    # Vercel sets automatically
```

### Task 5.8 — Manual DOCX Verification

Using the Bianca Perez case:
1. Upload the Perez audio file
2. Run through full pipeline
3. Export DOCX
4. Verify legal formatting spec compliance:
   - Q/A structure correct
   - Speaker labels correct (`THE REPORTER:` not `THE COURT REPORTER:`)
   - Em dashes as `--`
   - Line numbering correct
   - 25 lines per page
   - Page numbers and headers correct
   - Certificate page present

### Task 5.9 — Beta Launch

First beta user: **Miah Bardot**, CSR No. 12129, SA Legal Solutions  
First case: Bianca Perez v. Simon Ugalde (2025-CI-12281)

Pre-launch checklist:
- [ ] All Phase 1–3 tasks committed and verified
- [ ] BUG-003 flagged words security fix applied
- [ ] Resend domain verified
- [ ] Supabase SMTP configured
- [ ] DOCX formatting verified with real transcript
- [ ] Stripe deferred (billing not active at beta)
- [ ] Miah Bardot account created with REPORTER role
- [ ] SA Legal Solutions firm record created
- [ ] Test run with sample audio before live deposition

---

## 11. Post-Beta Feature Backlog

Planned but explicitly out of scope until after stable beta:

| Feature | Priority | Notes |
|---|---|---|
| Transcript editor UI | High | Word-by-word correction with audio sync |
| Upstash Redis / BullMQ queue | High | `USE_QUEUE=true` — activate after beta |
| Attorney portal login | Medium | Currently one-time links at beta |
| Phase 2 roles | Medium | Medical Expert, Videographer, Interpreter — "Coming Soon" |
| Archive automation | Medium | Monthly sweep for 60-day / 18-month windows |
| SMS notifications | Low | Via Resend SMS or Twilio |
| Live deposition transcription | Low | Real-time Zoom audio → Deepgram |
| Transcript intelligence layer | Future | Witness summary, contradiction detection, timeline |
| AI-powered impeachment search | Future | Cross-reference testimony |
| Advanced search | Future | By speaker, keyword, confidence |

---

## 12. Testing Requirements

Every task must be verified before committing.

### Minimum Verification for Every Task

```bash
# 1. TypeScript check (mandatory — never skip)
npx tsc --noEmit

# 2. Dev server starts
npm run dev

# 3. Page loads without error
# Navigate to affected page in browser

# 4. API route responds correctly
# Test with browser DevTools or curl

# 5. No console errors
# Check both browser console and server console
```

### API Route Testing (Quick)

```bash
# Test jobs list (verify no FK error)
curl http://localhost:3000/api/jobs -H "Cookie: {session_cookie}"

# Test job creation (verify SUPER_ADMIN can create)
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: {session_cookie}" \
  -d '{"caseName":"Test Case","title":"Test Deposition"}'

# Test health
curl http://localhost:3000/api/health
```

### Test Accounts

From `scripts/seed-beta-users.ts`:
- 2 reporter accounts
- 2 scopist accounts
- 1 attorney account

Run to seed: `npx ts-node scripts/seed-beta-users.ts`

---

## 13. Deployment Safety Checklist

Before deploying any changes to production:

```
[ ] npx tsc --noEmit — zero errors
[ ] npm run build — build succeeds
[ ] No new npm dependencies added without review
[ ] No Supabase schema changes without migration file
[ ] No API response shapes changed (breaking change for clients)
[ ] No storage paths changed (would break existing file references)
[ ] All protected files unchanged (withRouteProtection, session, supabase server/admin)
[ ] No Stripe keys confused with kollect-it.com keys
[ ] firm_id filtering present on all new database queries
[ ] No console.log in committed code
[ ] Git diff reviewed for accidental file inclusions
```

### Vercel Deployment

```bash
# Deploy preview
git push origin DepoPro_Remaining_Development_Roadmap

# Deploy production (after preview verified)
git push origin main
```

Monitor deployment at: https://vercel.com/james-hortons-projects-6d806c91

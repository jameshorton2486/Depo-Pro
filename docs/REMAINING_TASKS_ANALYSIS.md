# Remaining Tasks Analysis

> **Last Updated:** 2026-03-01
> **Status:** Pre-Beta Stabilization Phase
> **Total Tasks:** 47 | **Estimated Hours:** ~58
> **Scope Lock:** Beta workflow ONLY — see [Architecture Overview](./ARCHITECTURE_OVERVIEW.md#-scope-lock--beta-launch)
> **Frozen Layer:** see [Architecture Overview](./ARCHITECTURE_OVERVIEW.md#-frozen-layer--do-not-modify)
> **Refactor Rules:** see [Architecture Overview](./ARCHITECTURE_OVERVIEW.md#️-global-refactor-constraints)
> **AI Execution:** see [AI Execution Protocol](./AI_EXECUTION_PROTOCOL.md)

---

## ✅ Global Validation — Run After ANY Change

```bash
npm run typecheck     # Zero errors
npm run build         # Zero errors
npm run lint          # No new warnings
```

**If any fail, the change is not complete. Do not proceed to the next task.**

Additional rules:
- No new `throw new Error('not implemented')` introduced
- No new `// TODO` comments introduced
- No new `console.error` left in production code
- No files modified outside the task's listed paths

---

## AI Execution Assignment

| Tool | Tasks | Rationale |
|------|-------|-----------|
| **Claude Code** | SEC-01, SEC-03, EXP-01, UI-01, FTR-01 | Multi-file architectural changes |
| **Codex** | CRASH-01, CRASH-02, STB-02, STB-03, ONB-01, ONB-02, CLN-01 | Precise single-file rewrites |
| **Aider** | STB-01, SEC-02, UI-02, UI-03, CLN-02, CLN-03 | Iterative file-by-file edits |
| **Manual** | SEC-04, SEC-05, EXP-02, EXP-03, ONB-03, TST-01, TST-02, TST-03 | Dashboard checks, manual tests |

**Rule:** Never run more than one AI agent on the same file simultaneously.
**Rule:** Commit after each tool completes its batch. Run global validation before merging.

---

## Task Format

Every task follows this structure:
```
File:       Exact path(s) to modify
Risk:       What breaks if not fixed
Action:     Specific code changes — no ambiguity
Validation: How to confirm it works
Tool:       Assigned AI agent
Est:        Time estimate
```

---

## Phase 1: Crash Prevention

> **Goal:** Zero production-throwing stubs on active code paths.
>
> **Assigned to:** Codex (CRASH-01, CRASH-02, STB-02, STB-03) → Aider (STB-01)
>
> **Run order:** CRASH-01 → CRASH-02 → STB-01 → STB-02 → STB-03. Commit after all five.

### CRASH-01 ⬜ Fix cost-control-service `CRITICAL`

```
File:       lib/cost-control-service.ts
Risk:       Every export crashes in production
Action:
  - Find function useQuota() — replace throw with: return { allowed: true, remaining: 999 }
  - Find function checkQuota() — replace throw with: return { withinQuota: true }
  - Find function getUsageStats() — replace throw with: return { used: 0, limit: 999 }
  - Find function getUsageSummary() — replace throw with: return { totalJobs: 0, totalMinutes: 0 }
  - Keep all function signatures and return types unchanged
  - Add comment to each: // Phase 2: Replace with real Stripe usage tracking
Validation:
  - grep -r "throw" lib/cost-control-service.ts → zero matches
  - npm run typecheck passes
  - npm run build passes
Tool:       Codex
Est:        30 min
```

### CRASH-02 ⬜ Fix transcript-status-service `CRITICAL`

```
File:       lib/transcripts/status-service.ts
Risk:       Review submission workflow crashes
Action:
  - Find function transitionStatus()
  - Replace throw with:
      console.log('[TranscriptStatusService] Status transition', { from, to, transcriptId });
      return { success: true, previousStatus: from, newStatus: to };
  - Keep function signature and return type unchanged
  - Add comment: // Phase 2: Implement state machine with validation rules
Validation:
  - grep -r "throw" lib/transcripts/status-service.ts → zero matches
  - npm run typecheck passes
  - npm run build passes
Tool:       Codex
Est:        30 min
```

### STB-01 ⬜ Fix BullMQ job stubs `HIGH`

```
File:       lib/jobs.ts
Risk:       Crash if accidentally triggered from legacy code paths
Action:
  Step 1: Run: grep -rn "from.*lib/jobs" --include="*.ts" --include="*.tsx" app/ lib/
  Step 2: For each function (processTranscriptionJob, processExportJob, processEmailJob, getQueueStats):
    - Replace throw body with:
        console.warn('[jobs.ts] Legacy BullMQ stub called — transcription uses scheduler pattern now');
        return { success: false, message: 'Legacy stub — not implemented' };
  Step 3: Add to top of file:
    /**
     * @deprecated Legacy BullMQ stubs. Transcription uses lib/transcription/scheduler.ts now.
     * These functions are safe no-ops kept for backward compatibility.
     */
  Step 4: Do NOT delete the file — imports may exist
  Step 5: Keep all function signatures unchanged
Validation:
  - grep "throw" lib/jobs.ts → zero matches (only console.warn)
  - npm run typecheck passes
  - npm run build passes
Tool:       Aider
Est:        1 hr
```

### STB-02 ⬜ Fix keyword building service `HIGH`

```
File:       lib/transcription/buildKeywords.ts
Risk:       Pipeline crash if triggered during transcription
Action:
  - Replace function body with: return []
  - Keep function signature and return type unchanged
  - Add comment: // Phase 2: Implement Deepgram keyword boosting from job-specific dictionary
Validation:
  - grep "throw" lib/transcription/buildKeywords.ts → zero matches
  - npm run typecheck passes
Tool:       Codex
Est:        15 min
```

### STB-03 ⬜ Fix health endpoint DB check `HIGH`

```
File:       lib/monitoring/health-service.ts
Risk:       Health reports green when database is actually down
Action:
  - Find the TODO for database health check
  - Add import: import { createAdminClient } from '@/lib/supabase/admin';
  - Replace the TODO with:
      try {
        const supabase = createAdminClient();
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) return { status: 'unhealthy', database: error.message };
        return { status: 'healthy', database: 'connected' };
      } catch (err) {
        return { status: 'unhealthy', database: String(err) };
      }
  - Do NOT change any other health checks in this file
Validation:
  - npm run build passes
  - GET /api/health → response includes database: 'connected' (or 'healthy')
Tool:       Codex
Est:        30 min
```

### Phase 1 Completion Criteria

```
All of these must be true before starting Phase 2:

- [ ] grep -r "throw.*not implemented" lib/cost-control-service.ts → 0 matches
- [ ] grep -r "throw.*not implemented" lib/transcripts/status-service.ts → 0 matches
- [ ] grep -r "throw" lib/jobs.ts → 0 matches (only console.warn)
- [ ] grep -r "throw" lib/transcription/buildKeywords.ts → 0 matches
- [ ] GET /api/health returns database: healthy
- [ ] npm run build passes
- [ ] npm run typecheck passes
- [ ] git commit -m "phase-1: fix production-throwing stubs"
```

---

## Phase 2: Security Hardening

> **Goal:** Auth on all active routes. Optimistic locking. Storage/env verified.
>
> **Assigned to:** Claude Code (SEC-01, SEC-03) → Aider (SEC-02) → Manual (SEC-04, SEC-05)
>
> **Run order:** SEC-02 first (fast), then SEC-05 (manual), then SEC-01 (big), then SEC-03, then SEC-04. Commit after each tool's batch.

### SEC-01 ⬜ Migrate top routes to withRouteProtection `HIGH`

```
Files:      20-30 route files in app/api/jobs/* and app/api/transcripts/*
Template:   app/api/jobs/[id]/lock/route.ts (COPY THIS EXACT PATTERN)
Risk:       Inconsistent auth, missing tenant isolation on sensitive endpoints
Action:
  For each route file:
  Step 1: Import { withRouteProtection, ProtectedContext } from '@/lib/middleware/withRouteProtection'
  Step 2: Import { UserRole } from '@/lib/enums/roles'
  Step 3: Define ALLOWED_ROLES array appropriate to the route
  Step 4: Wrap handler: export const GET = withRouteProtection({ requireAuth: true, requireRole: ALLOWED_ROLES }, async (req, ctx) => { ... })
  Step 5: Replace manual getCurrentUser() + role checks with ctx.user
  Step 6: Replace manual supabase client creation with ctx.supabase
  Step 7: Do NOT change the route's business logic — only wrap it

  Priority order (do these first):
    1. app/api/jobs/[id]/route.ts (GET/PATCH/DELETE)
    2. app/api/jobs/route.ts (GET/POST)
    3. app/api/jobs/[id]/review/route.ts
    4. app/api/jobs/[id]/review/submit/route.ts
    5. app/api/transcripts/[id]/route.ts
    6. app/api/transcripts/[id]/corrections/route.ts
    7. app/api/transcripts/[id]/export/route.ts
    8. app/api/jobs/[id]/flagged-words/route.ts
    9. app/api/jobs/[id]/export/route.ts
    10. app/api/jobs/[id]/status/route.ts
  Continue with remaining jobs/* and transcripts/* routes until 20+ migrated.

  Do NOT touch routes in the Frozen Layer.
  Do NOT rename any URL paths.
  Do NOT change response schemas.
Validation:
  - npm run build passes
  - Unauthenticated request to each migrated route → 401
  - Wrong role request → 403
  - Correct role request → same response as before migration
Tool:       Claude Code
Est:        8 hrs
```

### SEC-02 ⬜ Add auth to unprotected stub routes `HIGH`

```
Files:
  - app/api/medical-records/route.ts
  - app/api/firms/route.ts
  - app/api/audit-logs/route.ts
  - app/api/matters/route.ts
  - app/api/depositions/route.ts
  - app/api/exhibits/route.ts
  - app/api/demands/route.ts
Risk:       Anonymous users can probe feature existence
Action:
  In each file, add at the START of every handler function (GET, POST, PUT, DELETE):
    const auth = await requireAuthV2();
    if (!auth.authorized) return auth.response;
  Each file already imports requireAuthV2 — just add the call.
  Do NOT change the response body, status codes, or anything else.
Validation:
  - npm run build passes
  - Unauthenticated GET to each route → 401 (not 501)
Tool:       Aider
Est:        1 hr
```

### SEC-03 ⬜ Implement optimistic locking on corrections `HIGH`

```
Files:
  - app/api/transcripts/[id]/corrections/route.ts
  - app/api/jobs/[id]/review/submit/route.ts
Risk:       Two scopists editing same transcript → second silently overwrites first
Action:
  Step 1: In the PATCH/POST handler, require `expectedVersion` (ISO timestamp string) in the request body
  Step 2: Before writing corrections, query current `updated_at` from the transcriptions table:
    const { data } = await supabase.from('transcriptions').select('updated_at').eq('id', transcriptId).single();
  Step 3: Compare:
    if (data.updated_at !== expectedVersion) {
      return NextResponse.json(
        { error: 'Conflict — transcript was modified by another user. Please reload the page.' },
        { status: 409 }
      );
    }
  Step 4: On successful write, the transcriptions.updated_at will auto-update
  Step 5: Do NOT modify lib/supabase/queries/locks.ts — build on top of it
  Step 6: Do NOT change any other logic in these routes
Validation:
  - npm run build passes
  - npm run typecheck passes
  - Test: open two tabs → edit in tab 1, save → edit in tab 2, save → tab 2 gets 409
Tool:       Claude Code
Est:        3 hrs
```

### SEC-04 ⬜ Verify storage bucket security `HIGH`

```
Location:   Supabase Dashboard → Storage → Policies
Reference:  supabase/migrations/20260225180101_b3_storage_bucket_security.sql
Risk:       Users could access other firms' files
Action:     MANUAL — not an AI task
  Step 1: Log into Supabase Dashboard
  Step 2: Go to Storage → each bucket → Policies tab
  Step 3: Verify for each bucket:
    - depo-audio: requires auth for uploads, read allowed for authenticated users
    - depo-files: private, signed URLs only, scoped to user's firm
    - depo-exports: private, scoped to user who created export
    - depo-chunks: private, temporary processing only
  Step 4: Compare against the SQL in the migration file
  Step 5: Check this box when verified
Validation:
  - Policies match migration intent
  - No buckets have permissive default (USING (true)) policies
Tool:       Manual
Est:        1 hr
```

### SEC-05 ⬜ Verify environment variables in Vercel `HIGH`

```
Location:   Vercel Dashboard → Project → Settings → Environment Variables
Reference:  lib/config/env.ts
Action:     MANUAL — not an AI task
  Verify ALL present for Production environment:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] DEEPGRAM_API_KEY
  - [ ] ANTHROPIC_API_KEY
  - [ ] INTERNAL_API_SECRET
  - [ ] CRON_SECRET
  - [ ] NEXT_PUBLIC_APP_URL
  - [ ] DEEPGRAM_WEBHOOK_SECRET
Validation:
  - All vars present and non-empty in Vercel Production environment
Tool:       Manual
Est:        30 min
```

### Phase 2 Completion Criteria

```
All of these must be true before starting Phase 3:

- [ ] 20+ routes use withRouteProtection
- [ ] All 7 stub routes call requireAuthV2() before responding
- [ ] Concurrent transcript edit → 409 Conflict response
- [ ] Storage bucket policies verified in Supabase Dashboard
- [ ] All 9 environment variables confirmed in Vercel
- [ ] npm run build passes
- [ ] npm run typecheck passes
- [ ] git commit -m "phase-2: security hardening"
```

---

## Phase 3: Export System

> **Goal:** All export formats produce correct output with scopist corrections.
>
> **Assigned to:** Claude Code (EXP-01) → Manual (EXP-02, EXP-03)
>
> **Run order:** EXP-02 first (manual test — might already work), then EXP-01 if PDF needs fixing, then EXP-03.

### EXP-01 ⬜ PDF export with legal formatting `HIGH`

```
File:       app/exports/transcript/[jobId]/pdf/route.ts
Risk:       PDF exports look unprofessional — no legal formatting
Action:
  Option A (recommended): DOCX-to-PDF conversion
    - npm install libreoffice-convert (ONLY approved new dependency)
    - In the GET handler:
      1. Import and call exportLegalDocx() from lib/services/export.ts to generate DOCX buffer
      2. Convert DOCX buffer to PDF using libreoffice-convert
      3. Return PDF buffer with headers: Content-Type: application/pdf, Content-Disposition
    - Do NOT modify lib/services/export.ts (FROZEN)
    - Do NOT modify src/lib/transcription/legal-formatter.ts (FROZEN)
  Option B (if libreoffice not available on Vercel): Use pdfkit
    - npm install pdfkit (ONLY approved new dependency)
    - Build parallel PDF formatter applying same rules as legal-formatter.ts:
      Courier New, 25 lines/page, 1-inch margins, line numbering
    - Do NOT modify legal-formatter.ts — read its rules and replicate for PDF

  ⚠️ IMPORTANT: Test on Vercel deployment — libreoffice may not be available serverless.
  If Option A fails on Vercel, fall back to Option B.
Validation:
  - Export same transcript as DOCX and PDF
  - PDF has Courier New font (or monospace equivalent)
  - PDF has approximately 25 lines per page
  - PDF has line numbering on left margin
  - npm run build passes
Tool:       Claude Code
Est:        4 hrs
```

### EXP-02 ⬜ Verify exports include corrections `HIGH`

```
File:       app/api/transcripts/[id]/export/route.ts (READ — do not modify unless broken)
Action:     MANUAL TEST
  Step 1: Upload audio → let transcription complete
  Step 2: Open review page → correct 5-10 flagged words → save review session
  Step 3: Export as DOCX
  Step 4: Open DOCX → check if your corrections appear (not the original AI words)
  Step 5: If corrections are MISSING → debug getFlaggedCorrections() in the export route
           Only then modify code to fix the data merge.
  Step 6: If corrections appear correctly → check the box, no code change needed.
Validation:
  - Exported DOCX contains corrected words where flagged words were fixed
  - Exported DOCX does NOT show original low-confidence words for corrected entries
Tool:       Manual (then Aider if fix needed)
Est:        2 hrs
```

### EXP-03 ⬜ Verify TXT export `MEDIUM`

```
File:       lib/export.ts (READ — do not modify unless broken)
Action:     MANUAL TEST — same procedure as EXP-02 but export as TXT format
Validation:
  - TXT file contains corrected words
Tool:       Manual
Est:        30 min
```

### Phase 3 Completion Criteria

```
- [ ] DOCX export: legal formatting + corrections included
- [ ] PDF export: acceptable formatting + corrections included
- [ ] TXT export: corrections included
- [ ] npm run build passes
- [ ] git commit -m "phase-3: export system verified"
```

---

## Phase 4: Review UX

> **Goal:** Keyboard-driven review. Error boundaries everywhere. No "Coming Soon" in nav.
>
> **Assigned to:** Claude Code (UI-01) → Aider (UI-02, UI-03)
>
> **Run order:** UI-01 first (biggest impact), then UI-02, then UI-03. Commit after each.

### UI-01 ⬜ Keyboard navigation for flagged words `HIGH`

```
Files:
  - components/review/flagged-word-panel.tsx (ADD to existing — do NOT rewrite)
  - app/(dashboard)/jobs/[id]/review/review-client-new.tsx (ADD to existing — do NOT rewrite)
Risk:       Scopists reviewing hundreds of words without keyboard = painfully slow
Action:
  In flagged-word-panel.tsx:
  - Add useEffect with keydown event listener for:
    Tab → increment selectedWordIndex to next flagged word
    Shift+Tab → decrement to previous flagged word
    Enter → focus the correction input field (existing behavior, keep it)
    Escape → deselect / cancel (existing behavior, keep it)
  - On selectedWordIndex change → call existing onWordSelect callback
  - Add Tailwind focus ring: ring-2 ring-blue-500 on currently selected word element
  - Do NOT rename any existing props or callbacks
  - Do NOT remove existing click-based selection behavior
  - Do NOT restructure the component hierarchy

  In review-client-new.tsx:
  - On word selection change → call waveformPlayerRef.current?.seekTo(word.startTime)
  - Auto-scroll transcript viewer to show the selected word in view
  - Do NOT modify the WaveformPlayer component itself (FROZEN)
  - Do NOT modify flagged-word-panel beyond what's specified above
Validation:
  - Open review page with flagged words
  - Tab → next word selected, audio plays at word's timestamp
  - Shift+Tab → previous word, audio plays
  - Enter → correction input focused
  - Escape → deselected
  - Mouse click still works as before
  - npm run build passes
Tool:       Claude Code
Est:        4 hrs
```

### UI-02 ⬜ Error boundaries on remaining pages `MEDIUM`

```
Files:
  - app/(dashboard)/page.tsx
  - app/(dashboard)/scopist/page.tsx
  - app/(dashboard)/reporter/page.tsx
  - app/(dashboard)/admin/page.tsx
  - app/(dashboard)/jobs/[id]/medical/page.tsx
Component:  components/ui/error-boundary.tsx (EXISTS — do NOT modify it)
Action:
  In each file:
  - Add import: import { ErrorBoundary } from '@/components/ui/error-boundary'
  - Wrap main content return in: <ErrorBoundary pageName="dashboard">...</ErrorBoundary>
  - Use appropriate pageName for each: "dashboard", "scopist-dashboard", "reporter-dashboard", "admin-dashboard", "medical"
  - Do NOT change anything else in these files
Validation:
  - npm run build passes
  - Each page renders without error
Tool:       Aider
Est:        2 hrs
```

### UI-03 ⬜ Hide stub pages from navigation `MEDIUM`

```
Files:      Find navigation config in ONE of:
            - components/layout/sidebar.tsx
            - components/layouts/dashboard-nav.tsx
            - components/layout/sidebar-nav.tsx
            (search for: grep -rn "billing\|reports\|Coming Soon" components/layout*)
Action:
  - Find the navigation link array/config object
  - Comment out (do NOT delete) links to these paths:
    /billing/usage, /billing/invoices,
    /settings/integrations, /settings/ai-models, /settings/audio-processing,
    /settings/billing-rates, /settings/roles,
    /reports/accuracy, /reports/system, /reports/usage,
    /transcription/live
  - Add comment above commented section: // Phase 2: Re-enable when features are implemented
  - Do NOT delete the page files themselves — only hide navigation links
  - Do NOT modify any other navigation links
Validation:
  - npm run build passes
  - Sidebar does not show links to any stub/"Coming Soon" pages
  - Direct URL access to stub pages still works (routes not broken)
Tool:       Aider
Est:        2 hrs
```

### Phase 4 Completion Criteria

```
- [ ] Tab/Shift+Tab navigates between flagged words with audio sync
- [ ] All 5 dashboard pages wrapped in ErrorBoundary
- [ ] No "Coming Soon" pages visible in sidebar navigation
- [ ] npm run build passes
- [ ] npm run typecheck passes
- [ ] git commit -m "phase-4: review ux polish"
```

---

## Phase 5: Beta Onboarding

> **Goal:** New user can register, log in, and complete the full workflow without getting stuck.
>
> **Assigned to:** Codex (ONB-01, ONB-02) → Manual (ONB-03)
>
> **Run order:** ONB-01 → ONB-02 → commit → ONB-03 (manual test). Fix anything ONB-03 finds.

### ONB-01 ⬜ Fix invite accept page text `HIGH`

```
File:       app/auth/invite/accept/invite-accept-client.tsx
Risk:       Page says "not available" — confuses beta testers
Action:
  - Find the "coming soon" / "not yet available" text block (around line 40-55)
  - Replace message text with:
      "Welcome to the Depo-Pro beta! Please register for an account below.
       Your administrator will assign your role after registration."
  - Keep the Register Account button — ensure it links to /register
  - Add below it: "Already have an account?" with link to /login
  - This is a TEXT AND LINK CHANGE ONLY — no new APIs, no email logic
Validation:
  - Visit /auth/invite/accept → shows friendly beta welcome message
  - Register link goes to /register
  - Login link goes to /login
  - npm run build passes
Tool:       Codex
Est:        15 min
```

### ONB-02 ⬜ Connect contact form to notification `MEDIUM`

```
File:       app/api/contact/route.ts
Risk:       Contact submissions go nowhere — you never see them
Action:
  - Find the commented-out sendEmail block (around line 80-85)
  - Add ABOVE the comment (do not remove the comment):
      if (process.env.CONTACT_WEBHOOK_URL) {
        await fetch(process.env.CONTACT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `[Depo-Pro Contact] From: ${name} (${email})\n${message.substring(0, 500)}`
          })
        }).catch(() => {}); // Non-blocking — don't fail the user's request
      }
  - Do NOT change existing validation, rate limiting, or audit logging
  - Do NOT remove any existing code
Validation:
  - npm run build passes
  - If CONTACT_WEBHOOK_URL is set: form submission → notification received
  - If CONTACT_WEBHOOK_URL is NOT set: form still returns success (no crash)
Tool:       Codex
Est:        30 min
```

### ONB-03 ⬜ End-to-end registration test `HIGH`

```
Action:     MANUAL TEST — not a code change
  Step 1: Open incognito browser → depo-pro.com/register
  Step 2: Register with email + password, select COURT_REPORTER role
  Step 3: Check email for verification → click link
  Step 4: Log in → verify reporter dashboard appears with correct navigation
  Step 5: Create a job → upload short audio file (~5 min)
  Step 6: Wait for transcription to complete
  Step 7: Verify flagged words appear on review page
  Step 8: Register a second account with SCOPIST role (repeat steps 2-4)
  Step 9: As admin: assign the scopist to the reporter's job
  Step 10: As scopist: open assigned job → review flagged words → correct 5 words → save
  Step 11: As scopist: export DOCX → verify corrections in downloaded file
  Step 12: Document ALL friction points, errors, and confusing moments

  If anything fails → create specific fix task and assign to appropriate AI tool.
Validation:
  - Both roles complete full workflow without errors
  - Exported DOCX contains corrections
Tool:       Manual
Est:        2 hrs
```

### Phase 5 Completion Criteria

```
- [ ] Registration works for reporter and scopist roles
- [ ] Invite accept page shows helpful message
- [ ] Full workflow tested: upload → transcribe → review → correct → export
- [ ] Contact form sends notification (if webhook configured)
- [ ] npm run build passes
- [ ] git commit -m "phase-5: beta onboarding ready"
```

---

## Phase 6: Testing & Validation

> **Goal:** Prove stability before inviting external testers.
>
> **Assigned to:** Aider (TST-01 fixes) → Manual (TST-01, TST-02, TST-03)
>
> **Run order:** TST-01 → TST-02 → TST-03. After Phase 6, run [Beta Launch Criteria](./BETA_LAUNCH_CRITERIA.md).

### TST-01 ⬜ Run automated test suite `HIGH`

```
Command:    npm run test
Action:
  Step 1: Run npm run test — document all failures
  Step 2: Fix failures in this priority order:
    1. tests/integration/transcription-pipeline.test.ts
    2. tests/integration/flagged-words.test.ts
    3. tests/integration/review-api.test.ts
    4. tests/integration/export-with-corrections.test.ts
    5. tests/integration/auth-flow.test.ts
    6. tests/integration/lock-api.test.ts
  Step 3: Tests requiring real database/API connection may skip — acceptable
  Step 4: Do NOT rewrite tests to make them pass — fix the code they test
  Step 5: Do NOT introduce mock data into tests that currently test real behavior
Validation:
  - npm run test — critical path tests pass (items 1-6 above)
  - No regressions in previously passing tests
Tool:       Manual run → Aider for fixes
Est:        4 hrs
```

### TST-02 ⬜ 10 consecutive jobs stability test `HIGH`

```
Action:     MANUAL TEST on production (depo-pro.com)
  Upload 10 different audio files. For each, verify all 5 stages complete.

  | Job | Upload | Transcribe | Flags | Review | Export | Pass |
  |-----|--------|-----------|-------|--------|--------|------|
  | 1   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 2   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 3   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 4   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 5   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 6   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 7   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 8   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 9   | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |
  | 10  | ⬜     | ⬜        | ⬜    | ⬜     | ⬜     | ⬜   |

  Mix of: 3 short clips (~5 min), 4 medium (~15 min), 3 long (~30 min)
  All 10 must pass. Any failure → investigate and fix before proceeding.
Validation:
  - 10/10 jobs complete all 5 stages
Tool:       Manual
Est:        3 hrs
```

### TST-03 ⬜ Performance spot check `MEDIUM`

```
Action:     MANUAL TEST with browser dev tools (Network + Performance tabs)
  - Dashboard load: < 3 seconds (DOMContentLoaded)
  - Review page load: < 3 seconds
  - Flagged word navigation: < 100ms per transition (Performance recording)
  - Medical extraction: < 120 seconds
Validation:
  - All targets met, or deviations documented with justification
Tool:       Manual
Est:        1 hr
```

### Phase 6 Completion Criteria

```
- [ ] Critical path tests pass (npm run test)
- [ ] 10/10 jobs complete without crash
- [ ] Performance within acceptable targets
- [ ] npm run build passes
- [ ] git commit -m "phase-6: testing complete"
- [ ] → RUN BETA LAUNCH CRITERIA CHECKLIST
```

---

## Phase 7: Cleanup (During Beta)

> **Goal:** Technical debt reduction. Not blocking beta — run alongside user feedback.
>
> **Assigned to:** Codex (CLN-01) → Aider (CLN-02, CLN-03, STB-04 through STB-11)

### CLN-01 ⬜ Delete dead files `MEDIUM`

```
Files to delete:
  - api-guards-v2 (1).ts
  - lib-enums-roles (1).ts
  - lib-permissions-role-groups (1).ts
  - Phase0-Super-Prompt (1).txt
  - archive/ (entire directory)
  - WKT-COMPLETE-CODEX-GUIDE.ps1
  - proxy.ts
Action:     git rm each file listed above
Validation: npm run build passes after deletion
Tool:       Codex
Est:        30 min
```

### CLN-02 ⬜ Deprecate legacy auth patterns `MEDIUM`

```
Files:
  - lib/security.ts
  - lib/auth/require-auth.ts
  - lib/permissions/api-guards.ts
Action:
  Add to the TOP of each file (before existing imports):
    /**
     * @deprecated Use withRouteProtection from '@/lib/middleware/withRouteProtection' instead.
     * This file is maintained for backward compatibility with existing routes.
     * All new routes MUST use withRouteProtection.
     */
  Do NOT change any function logic, signatures, or exports.
Validation: npm run build passes
Tool:       Aider
Est:        15 min
```

### CLN-03 ⬜ Remove old review client `LOW`

```
File:       app/(dashboard)/jobs/[id]/review/review-client.tsx (the OLD one, 453 lines)
Action:
  Step 1: grep -rn "review-client" --include="*.ts" --include="*.tsx" (without "-new")
  Step 2: Confirm the page.tsx only imports review-client-new.tsx
  Step 3: If nothing imports the old file → git rm review-client.tsx
  Step 4: If something imports it → do NOT delete, leave for later
Validation: npm run build passes
Tool:       Aider
Est:        15 min
```

### STB-04 through STB-11 ⬜ Secure remaining Phase 2 stubs `MEDIUM`

```
Files (batch — apply same fix to all):
  - lib/invoice.ts
  - lib/services/invoice-preview-service.ts
  - lib/external-calendar/sync-service.ts
  - lib/services/audio-enhancement-service.ts
  - lib/services/webhook-verification-service.ts
  - lib/services/rx-session-service.ts
  - lib/services/rx-eligibility-service.ts
  - lib/cache/dashboard.ts
  - lib/calendar/conflict-detection.ts
Action:
  In each file, for every function that throws "not implemented":
  - Replace throw with:
      console.warn('[ServiceName] Feature not available in beta');
      return { success: false, error: 'Feature not available in beta' };
  - Keep all function signatures unchanged
  - Add @deprecated JSDoc tag
  Do NOT implement any actual logic — these are Phase 2 features.
Validation:
  - grep -r "throw.*not implemented" across all listed files → 0 matches
  - npm run build passes
Tool:       Aider
Est:        2 hrs
```

### Phase 7 Completion Criteria

```
- [ ] Dead files removed from repo root
- [ ] Legacy auth files have @deprecated JSDoc
- [ ] Old review-client.tsx removed (if safe)
- [ ] All Phase 2 service stubs return safely (no throws)
- [ ] npm run build passes
- [ ] git commit -m "phase-7: cleanup and debt reduction"
```

---

## Phase 8: Harden During Beta

> **Goal:** Complete security audit and documentation.
>
> **Assigned to:** Claude Code (SEC-06) → Manual (SEC-07, DEP-01, DEP-02) → Codex (CLN-05, CLN-06)

### SEC-06 ⬜ Complete route security audit `HIGH`

```
Command:    npm run check:routes (if available), otherwise manual review
Action:
  - Audit all 140 routes across 5 dimensions: auth, role, tenant isolation, audit logging, rate limiting
  - Focus on routes that: write data, delete data, access transcripts, perform admin actions
  - Document gaps in SECURITY_AUDIT_CHECKLIST.md
  - Fix critical gaps found (writing/deleting without auth)
Validation:
  - All write-heavy routes have auth
  - Findings documented
Tool:       Claude Code (analysis) → Aider (fixes)
Est:        3 hrs
```

### SEC-07 ⬜ Verify RLS policies `MEDIUM`

```
Location:   Supabase Dashboard → Database → Policies
Command:    npm run verify:rls (if available)
Action:     MANUAL — verify each sensitive table has correct RLS
  Focus: transcriptions, transcription_corrections, review_sessions, medical_records
Validation: No USING (true) on sensitive tables. All data scoped to firm_id or user_id.
Tool:       Manual
Est:        2 hrs
```

### DEP-01 ⬜ Final deployment checklist `HIGH`

```
Action:     MANUAL verification
  - [ ] GET /api/health → all services healthy
  - [ ] npm run build → zero errors
  - [ ] vercel.json maxDuration: transcription 300s, medical 120s
  - [ ] Cron job /api/cron/process-jobs running
  - [ ] HTTPS/SSL on depo-pro.com verified
  - [ ] Security headers in browser Network tab (CSP, HSTS, X-Frame-Options)
Validation: All items checked
Tool:       Manual
Est:        1 hr
```

### DEP-02 ⬜ Verify cron stability `MEDIUM`

```
File:       app/api/cron/process-jobs/route.ts
Action:     Monitor Vercel function logs for 24 hours
  - Confirm cron runs every minute
  - Confirm no duplicate job processing
  - Confirm CRON_SECRET validated
  - Confirm graceful error handling
Validation: 24 hours of clean cron execution logs
Tool:       Manual
Est:        1 hr (setup) + passive monitoring
```

### CLN-05 ⬜ Update README `MEDIUM`

```
File:       README.md
Action:
  Replace current minimal content with:
  - What Depo-Pro does (3 sentences)
  - Quick start (npm install, env vars, npm run dev)
  - Required environment variables (copy from SEC-05 list)
  - Project structure (copy from ARCHITECTURE_OVERVIEW.md)
  - Deployment (Vercel push-to-deploy from main branch)
  - Link to /docs directory for full documentation
  Do NOT include marketing language. Engineering tone only.
Validation: README renders correctly on GitHub
Tool:       Codex
Est:        1 hr
```

### CLN-06 ⬜ Create beta tester guide `MEDIUM`

```
File:       docs/BETA_GUIDE.md (NEW FILE)
Action:
  Create guide covering:
  - How to register and log in
  - How to upload audio and trigger transcription
  - How to review flagged words (keyboard shortcuts)
  - How to export (DOCX, PDF, TXT)
  - How to report bugs (contact form or email)
  - Known limitations in beta
  Keep it under 200 lines. Plain language, no jargon.
Validation: File exists and is readable
Tool:       Codex
Est:        1 hr
```

### FTR-01 ⬜ Verify speaker diarization mapping `HIGH`

```
Files:
  - app/api/jobs/[id]/format-settings/route.ts
  - Review page format settings panel
Action:     MANUAL VERIFICATION
  Step 1: Open a completed job on the review page
  Step 2: Look for speaker mapping / format settings panel
  Step 3: Check: can you assign names to speakers? (Speaker 0 → "MR. SMITH")
  Step 4: Save mappings → export DOCX → verify real names appear
  Step 5: If panel doesn't exist → document as new task for Claude Code
  Step 6: If panel exists but doesn't save → debug the format-settings API route
Validation:
  - Exported DOCX uses mapped speaker names (not "Speaker 0")
Tool:       Manual (then Claude Code if build needed)
Est:        3 hrs
```

### Phase 8 Completion Criteria

```
- [ ] Route security audit documented
- [ ] RLS policies verified
- [ ] Deployment checklist passed
- [ ] Cron job stable for 24 hrs
- [ ] README updated
- [ ] Beta tester guide created
- [ ] Speaker diarization verified or task created
- [ ] git commit -m "phase-8: hardening and documentation"
```

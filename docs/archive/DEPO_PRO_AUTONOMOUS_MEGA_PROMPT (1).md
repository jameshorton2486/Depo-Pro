# DEPO-PRO — AUTONOMOUS CLAUDE CODE MEGA-PROMPT
# Version: 2.0 | Generated: 2026-03-09
# Author: James Horton | Platform: Depo-Pro Legal Transcription SaaS
# Purpose: Full page audit, stub completion, missing page creation, and tool verification

---

## SESSION INITIALIZATION — READ BEFORE ANYTHING ELSE

You are Claude Code operating autonomously on the Depo-Pro repository. Before writing
a single line of code, complete ALL steps in this initialization block.

### Step 1 — Read Governance Files (ALL FOUR, IN ORDER)

```bash
cat AI_AUTONOMOUS_RULES.md
cat MASTER_CONTROL.md
cat AI_MASTER_ORCHESTRATOR.md
cat BETA_FREEZE.md
```

**BETA FREEZE STATUS CHECK:**
- If `BETA_FREEZE.md` STATUS is `ACTIVE`: only bug fixes, security patches, test
  additions, and documentation updates are permitted. Stub pages with broken layouts
  are considered UI bugs. Stub pages that are fully functional but intentionally
  deferred to Phase 2 are NOT bugs — do not touch them unless James explicitly
  authorizes it in this prompt. See §BETA FREEZE SCOPE below for the precise list.
- If `BETA_FREEZE.md` STATUS is `LIFTED`: all tasks in this prompt are authorized.

### Step 2 — Run Repo Audit

```bash
bash scripts/repo-audit.sh
```

Report findings. If the audit reports critical failures, STOP and report to James
before proceeding.

### Step 3 — TypeScript Baseline

```bash
npx tsc --noEmit 2>&1 | head -40
```

Record the number of pre-existing TypeScript errors before you make any changes.
You are not responsible for fixing pre-existing errors. You ARE responsible for
not introducing new ones.

### Step 4 — Log Session Start

Append this to `ai_logs/change_log.md` before doing any work:

```markdown
## Session: [DATE] — Page Audit & Stub Completion Mega-Prompt
**Status:** Started
**Scope:** Full page inventory, stub page completion, missing page creation,
           transcription review verification, calendar verification
**Pre-existing TS errors:** [COUNT from Step 3]
```

---

## BETA FREEZE SCOPE

The BETA_FREEZE.md prohibits new features. The following tasks in this prompt
are classified as **bug fixes or UI completeness** (permitted during freeze):

✅ **PERMITTED regardless of freeze status:**
- Creating or improving `settings/` sub-pages that already have routes but show
  only a StubPage component — these are incomplete implementations, not deferred features
- Creating a `/notifications` page — navigation links to it and it 404s
- Creating a `/help` page — referenced in footer but returns 404
- Adding missing auth guards to pages that lack them
- Improving error states on existing pages
- Fixing TypeScript errors on existing pages
- Documenting all pages in an inventory file

✅ **PERMITTED only if BETA_FREEZE STATUS is LIFTED:**
- Creating fully new feature pages not referenced anywhere in the codebase
- Adding new API routes for new functionality
- New npm dependencies

---

## TASK LIST

Work through tasks in the numbered order below. After each task:
1. Run `npx tsc --noEmit` — if new errors appear, fix them before moving on
2. Commit with a message following `fix: [description]` or `feat: [description]` format
3. Do NOT batch multiple tasks into one commit

---

## TASK 1 — COMPLETE PAGE INVENTORY AUDIT

**Objective:** Create a comprehensive map of every route in the application,
its current status, and whether it needs work.

**Action:**

Create the file `docs/PAGE_INVENTORY.md` with the following format.
Discover pages by running:

```bash
find app -name "page.tsx" | sort
```

For each page.tsx found, categorize it as one of:
- `COMPLETE` — server-rendered or client-rendered page with real content and auth guards
- `STUB` — renders `<StubPage>` or similar "coming soon" placeholder
- `REDIRECT` — immediately redirects to another route
- `BROKEN` — crashes, has TypeScript errors, or missing imports
- `PARTIAL` — has some real content but missing critical sections

Format for `docs/PAGE_INVENTORY.md`:

```markdown
# Depo-Pro Page Inventory
Last updated: [DATE]

## Route Map

| Route | File | Status | Auth Guard | Notes |
|-------|------|--------|------------|-------|
| / | app/page.tsx | COMPLETE | None (public) | Marketing home |
| /login | app/(auth)/login/page.tsx | COMPLETE | Redirects if authed | ... |
...

## Summary
- Total pages: X
- Complete: X
- Stub: X
- Redirect: X
- Broken: X
- Partial: X

## Stub Pages Requiring Attention
[List stubs with rationale for why they exist]

## Missing Pages (404s referenced in navigation)
[List routes referenced in nav/links but missing page.tsx]
```

Commit: `docs: add complete page inventory audit`

---

## TASK 2 — SETTINGS PAGES: CREATE FUNCTIONAL CONTENT

**Objective:** The following settings pages currently show only `<StubPage>`.
Each one has a dedicated route and nav link, making the stub visible to users.
Replace each StubPage with a functional informational page using **only
data already available in the Supabase database** — no new API routes.

**IMPORTANT CONSTRAINT:** Do not add new database tables or columns. Use only
existing queries from `lib/supabase/queries/`.

---

### Task 2A — `/settings/roles` — Role Reference Page

**File:** `app/settings/roles/page.tsx`

Replace the StubPage with a server component that:
- Requires ADMIN role (redirect to `/unauthorized` if not admin)
- Displays a clean read-only table of all five system roles with their permissions
- Uses data from `lib/permissions/route-access.ts` or defines it inline
- No database query needed — roles are static

**Role permissions table to display:**

| Role | Can Create Jobs | Can Upload Audio | Can Review Transcripts | Can Export | Can Manage Users | Can View Reports |
|------|----------------|-----------------|----------------------|------------|-----------------|-----------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| REPORTER | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| SCOPIST | ❌ (assigned only) | ❌ | ✅ | ✅ | ❌ | ❌ |
| ATTORNEY | ❌ | ❌ | ✅ (read-only) | ✅ | ❌ | ❌ |

Add a note at the bottom:
> "Role assignments are managed in Settings → Users. Contact your firm administrator
> to request a role change."

Style: Use Tailwind, match the card/table pattern from `app/(dashboard)/admin/permissions/page.tsx`.
No new imports beyond what already exists in the project.

Commit: `fix: implement roles settings page with permission reference table`

---

### Task 2B — `/settings/ai-models` — AI Configuration Reference Page

**File:** `app/settings/ai-models/page.tsx`

Replace the StubPage with a server component that:
- Requires ADMIN role
- Displays the current AI model configuration in a read-only card layout
- Shows: Deepgram model (Nova-3), Anthropic model (claude-3-haiku), confidence threshold
- These are static values — do not read from env vars in client code

**Content to display:**

```
Speech-to-Text Engine
  Provider: Deepgram
  Model: Nova-3 (Medical)
  Language: en-US
  Confidence Threshold: 0.85 (words below this are flagged for review)
  
AI Correction Engine
  Provider: Anthropic
  Model: Claude (Medical Term Extraction)
  Purpose: Identifies and suggests corrections for medical terminology

Configuration
  Model settings are managed at the infrastructure level.
  Contact Depo-Pro support to request configuration changes.
```

Style: Card layout matching `app/(dashboard)/admin/page.tsx` StatCard pattern.

Commit: `fix: implement ai-models settings page with model configuration display`

---

### Task 2C — `/settings/audio-processing` — Audio Pipeline Reference Page

**File:** `app/settings/audio-processing/page.tsx`

Replace the StubPage with a server component that:
- Requires ADMIN role
- Displays the audio processing pipeline configuration as a read-only reference

**Content to display:**

```
Audio Processing Pipeline

Supported Formats
  Input: MP3, MP4, M4A, WAV, FLAC, OGG, WEBM
  Target: 16kHz mono WAV (normalized before transcription)
  Max file size: 500MB
  
Processing Steps
  1. File validation (format + size check)
  2. Audio extraction (video formats stripped to audio)
  3. Normalization (converted to 16kHz mono WAV)
  4. Deepgram Nova-3 transcription
  5. Word-level confidence scoring
  6. Low-confidence word flagging (threshold: 0.85)
  7. Transcript segments written to database

Storage
  Raw uploads: depo-audio bucket (Supabase Storage)
  Processed chunks: depo-chunks bucket
  Exported transcripts: depo-exports bucket
```

Commit: `fix: implement audio-processing settings page with pipeline reference`

---

### Task 2D — `/settings/billing-rates` — Billing Rates Page

**File:** `app/settings/billing-rates/page.tsx`

Replace the StubPage with a server component that:
- Requires ADMIN role
- Displays a read-only billing rates reference table
- Queries the `firms` table for the current firm's billing configuration if the
  column exists, otherwise uses static placeholder data
- Shows a "Contact support to update rates" CTA

**Content template:**

```
Billing Rates — [Firm Name]

Standard Rates
  Per audio minute (transcription): $X.XX
  Per page (court reporter): $X.XX
  Rush rate multiplier: X.Xx

Note: Rates shown here are for reference only.
Update requests must be submitted through the billing portal or by
contacting Depo-Pro support at info@depo-pro.com
```

Before rendering, check if the `firms` table has `billing_rate_per_minute`,
`billing_rate_per_page`, or similar columns using the existing Supabase client.
If they don't exist, render static placeholder values with a note that
configuration is managed externally.

Commit: `fix: implement billing-rates settings page`

---

### Task 2E — `/settings/integrations` — Integrations Page

**File:** `app/settings/integrations/page.tsx`

Replace the StubPage with a read-only server component showing:
- Current active integrations (Deepgram, Anthropic, Resend) — static display
- Future integrations roadmap (grayed out)
- No new API routes or functionality

**Active integrations to display:**

| Integration | Status | Purpose |
|-------------|--------|---------|
| Deepgram Nova-3 | ✅ Active | Speech-to-text transcription |
| Anthropic Claude | ✅ Active | Medical term extraction |
| Resend | ✅ Active | Transactional email delivery |

**Roadmap (grayed out, "Coming Soon"):**
- Zoom Live Transcription
- Clio (legal case management)
- iManage
- DocuSign

Commit: `fix: implement integrations settings page`

---

## TASK 3 — CREATE MISSING PAGES REFERENCED IN NAVIGATION

Discover all navigation links by running:

```bash
grep -r "href=" components/navbar.tsx components/footer.tsx components/layout.tsx \
  components/layouts/ components/dashboard/ 2>/dev/null | \
  grep -oP 'href="[^"]*"' | sort -u
```

Also check:
```bash
grep -r "href=" app/ --include="page.tsx" 2>/dev/null | \
  grep -oP 'href="[^"]*"' | sort -u | grep -v "^/api" | grep -v "http"
```

For each href found, verify the page.tsx exists. Any missing page that is
referenced in navigation must be created.

---

### Task 3A — `/notifications` page (if missing)

Check: `grep -r "/notifications" app/ components/ --include="*.tsx" | head -10`

If `/notifications` is referenced in nav links but `app/notifications/page.tsx`
does not exist, create it:

**File:** `app/notifications/page.tsx`

```typescript
// =============================================================================
// NOTIFICATIONS PAGE
// app/notifications/page.tsx
//
// User notification center — shows system events, job status changes, assignments
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // Query audit_logs for recent events affecting this user
  // Use existing audit table — no new DB schema needed
  const { data: recentEvents } = await supabase
    .from('audit_logs')
    .select('id, action, resource_type, resource_id, created_at, metadata')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const events = recentEvents || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      
      {events.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No notifications yet.</p>
          <p className="text-sm mt-2">
            System events, job updates, and assignments will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => (
            <div
              key={event.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3"
            >
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-900">
                  {formatAction(event.action)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {event.resource_type} • {formatDate(event.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}
```

Verify `audit_logs` table and columns exist by checking `supabase/migrations/`.
If the table doesn't exist, show a static empty state instead of the query.

Commit: `fix: create notifications page using audit_logs data`

---

### Task 3B — `/help` page (if missing)

Check: `grep -r "/help" app/ components/ --include="*.tsx" | head -10`

If `/help` is referenced but missing, create `app/help/page.tsx`:

```typescript
// =============================================================================
// HELP PAGE
// app/help/page.tsx
//
// Quick reference and support links for Depo-Pro users
// =============================================================================

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { BookOpen, MessageCircle, FileText, Mic, Upload, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Help & Support</h1>
      <p className="text-gray-600 mb-8">
        Quick reference for the Depo-Pro transcription platform.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <Upload className="w-6 h-6 text-indigo-600 mb-3" />
          <h2 className="font-semibold text-lg mb-2">Creating a Job</h2>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Go to Jobs → New Job</li>
            <li>Enter case name and deponent information</li>
            <li>Upload the deposition audio file</li>
            <li>Wait for Deepgram transcription to complete (~2–5 min)</li>
            <li>Assign to a scopist or begin review yourself</li>
          </ol>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <Mic className="w-6 h-6 text-indigo-600 mb-3" />
          <h2 className="font-semibold text-lg mb-2">Transcript Review</h2>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Open a job and click "Review Transcript"</li>
            <li>Flagged words (yellow) are low-confidence Deepgram output</li>
            <li>Click a word to hear the audio at that timestamp</li>
            <li>Type the correction in the edit field</li>
            <li>Click "Save" or press Enter to confirm</li>
            <li>Mark as reviewed when all flags are resolved</li>
          </ol>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <FileText className="w-6 h-6 text-indigo-600 mb-3" />
          <h2 className="font-semibold text-lg mb-2">Keyboard Shortcuts</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Play / Pause audio</span>
              <kbd className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">Space</kbd>
            </div>
            <div className="flex justify-between">
              <span>Rewind 5 seconds</span>
              <kbd className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">←</kbd>
            </div>
            <div className="flex justify-between">
              <span>Skip forward 5 seconds</span>
              <kbd className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">→</kbd>
            </div>
            <div className="flex justify-between">
              <span>Next flagged word</span>
              <kbd className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">Tab</kbd>
            </div>
            <div className="flex justify-between">
              <span>Mark reviewed</span>
              <kbd className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">Ctrl+Enter</kbd>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <Download className="w-6 h-6 text-indigo-600 mb-3" />
          <h2 className="font-semibold text-lg mb-2">Exporting Transcripts</h2>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Complete the transcript review</li>
            <li>Click "Finalize" on the job page</li>
            <li>Choose export format (DOCX — legal format)</li>
            <li>Download the formatted transcript</li>
          </ol>
          <p className="text-xs text-gray-400 mt-3">
            Exports follow legal formatting: 25 lines/page, numbered lines, Q/A structure.
          </p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <MessageCircle className="w-6 h-6 text-indigo-600 mb-2" />
        <h2 className="font-semibold text-lg mb-1">Need More Help?</h2>
        <p className="text-sm text-gray-600 mb-3">
          For technical support or billing questions, contact us at:
        </p>
        <a
          href="mailto:info@depo-pro.com"
          className="text-indigo-600 font-medium hover:underline"
        >
          info@depo-pro.com
        </a>
      </div>
    </div>
  );
}
```

Commit: `fix: create help page with workflow reference and keyboard shortcuts`

---

## TASK 4 — TRANSCRIPTION REVIEW TOOL AUDIT

**Objective:** Verify the core transcription review workflow is complete and
functional. This is the most critical feature in the platform.

### Step 1 — Verify All Components Are Imported Correctly

Check that all imports in the review page exist:

```bash
# Verify the review page and its client component load
grep -n "^import" app/\(dashboard\)/jobs/\[id\]/review/review-client-new.tsx | head -30

# Check each imported component exists
# Key components to verify:
grep -r "WaveformPlayer" components/audio/ | head -5
grep -r "SyncedTranscriptViewer" components/transcripts/ | head -5
grep -r "LowConfidencePanel" components/transcripts/ | head -5
grep -r "ExhibitTimelinePanel" components/transcripts/ | head -5
grep -r "ConfidenceAnalyticsPanel" components/transcripts/ | head -5
grep -r "CertificationPanel" components/transcript/ | head -5
grep -r "ConnectionStatus" components/review/ | head -5
```

For any import that resolves to a non-existent file, report it as:
`[BROKEN IMPORT] path/to/component — does not exist`

Do NOT create replacement components during this session (too high risk).
Simply report broken imports in the commit message and in `ai_logs/change_log.md`.

### Step 2 — Verify Review API Routes Exist

```bash
# The review page requires these API routes:
ls app/api/jobs/[id]/
ls app/api/jobs/[id]/flagged-words/ 2>/dev/null
ls app/api/jobs/[id]/lock/ 2>/dev/null
ls app/api/jobs/[id]/review-complete/ 2>/dev/null
ls app/api/transcriptions/ 2>/dev/null
```

Report: Which API routes exist, which are missing.

### Step 3 — Verify Audio URL Generation

```bash
grep -n "getFileUrl\|extractStoragePath\|audioUrl" \
  app/\(dashboard\)/jobs/\[id\]/review/page.tsx | head -20
```

Confirm that audio URL generation uses `getFileUrl` from `lib/storage/url.ts`
and that this file exists:

```bash
cat lib/storage/url.ts | head -30
```

### Step 4 — Verify Session Persistence

```bash
grep -n "useReviewSession\|review-session" \
  hooks/ --include="*.ts" --include="*.tsx" -r | head -10
cat hooks/use-review-session.ts 2>/dev/null | head -40
```

Confirm the session tracking hook exists and connects to the correct API endpoint.

### Step 5 — Verify Transcript Viewer

```bash
cat components/transcripts/synced-transcript-viewer.tsx | head -60
```

Confirm the component accepts `segments`, `currentTime`, `onWordClick` props.

### Step 6 — Run TypeScript Check on Review Files

```bash
npx tsc --noEmit 2>&1 | grep "review\|synced-transcript\|waveform\|confidence"
```

Report all errors found. Fix only errors that are clearly simple (missing return
type annotation, unused variable). Do not refactor complex logic.

**Commit:** `docs: transcription review tool audit complete — [PASS/FAIL with summary]`

---

## TASK 5 — CALENDAR TOOL AUDIT

**Objective:** Verify the calendar and deposition scheduling tools are complete.

### Step 1 — Verify Calendar Components

```bash
ls components/calendar/
```

Check for these expected components:
- `calendar-shell.tsx` — main calendar container
- `month-view.tsx` or similar — month grid
- `week-view.tsx` or similar — week column view
- `availability-editor.tsx` — time slot availability
- `deposition-form.tsx` or similar — create/edit deposition form

```bash
for f in calendar-shell availability-editor; do
  echo "=== $f ==="
  head -20 components/calendar/$f.tsx 2>/dev/null || echo "MISSING"
done
```

### Step 2 — Verify Deposition Create/Edit Pages

```bash
cat app/calendar/deposition/create/page.tsx | head -40
cat app/calendar/deposition/\[id\]/edit/page.tsx | head -40
cat app/calendar/deposition/\[id\]/confirm/page.tsx | head -40
```

Report if any of these are stubs or missing critical functionality.

### Step 3 — Verify Calendar API Routes

```bash
ls app/api/ | grep -i calendar
ls app/api/calendar/ 2>/dev/null
ls app/api/depositions/ 2>/dev/null
ls app/api/events/ 2>/dev/null
```

```bash
# Also check for calendar-related tables in migrations
grep -r "calendar\|deposition\|availability\|event" supabase/migrations/ \
  --include="*.sql" -l
```

### Step 4 — Verify the SQL Migration for Calendar

```bash
cat /mnt/project/20260310_014_calendar_events.sql 2>/dev/null | head -50
cat /mnt/project/20260310_015_reporter_prefs_playback.sql 2>/dev/null | head -50
```

(These files may be in the project directory if you have access to `/mnt/project/`)

Report: Whether the calendar DB schema has been migrated.
If the migration is in `/mnt/project/` but NOT in `supabase/migrations/`, flag this
clearly:
`[ACTION REQUIRED] Calendar migration exists but may not have been applied to Supabase.
James must run this migration manually via the Supabase dashboard SQL editor.`

### Step 5 — Verify CalendarShell Component

```bash
cat components/calendar/calendar-shell.tsx | head -80
```

Confirm:
- Component accepts `userRole` prop
- Component renders different views based on role
- Component handles loading/error states

**Commit:** `docs: calendar tool audit complete — [PASS/FAIL with summary]`

---

## TASK 6 — TRANSCRIPTS LIST & DETAIL PAGE AUDIT

**Objective:** Verify the main transcript-facing pages work correctly.

```bash
# Check transcripts list page
wc -l app/transcripts/page.tsx
head -80 app/transcripts/page.tsx

# Check transcript detail
wc -l app/transcripts/\[jobId\]/page.tsx
head -60 app/transcripts/\[jobId\]/page.tsx
```

Verify:
1. Transcripts list has role-based filtering (REPORTER sees own, SCOPIST sees assigned)
2. Transcript detail has a working link to the review page
3. Finalize page has export functionality
4. TypeScript check passes on all transcript pages

```bash
npx tsc --noEmit 2>&1 | grep "transcript"
```

**Commit:** `docs: transcripts page audit complete`

---

## TASK 7 — ADMIN DASHBOARD AUDIT

**Objective:** Verify the admin pages are complete and functional.

```bash
# Check all admin pages
for f in page.tsx actions/page.tsx features/page.tsx permissions/page.tsx rx-queue/page.tsx; do
  echo "=== /admin/$f ==="
  wc -l app/\(dashboard\)/admin/$f 2>/dev/null
  head -20 app/\(dashboard\)/admin/$f 2>/dev/null
done
```

Verify:
1. Admin dashboard shows real data (not placeholder)
2. Action console exists and renders
3. Feature flags page exists and renders
4. Permissions audit page exists and renders
5. RX queue manager exists and renders

```bash
npx tsc --noEmit 2>&1 | grep "admin"
```

**Commit:** `docs: admin dashboard audit complete`

---

## TASK 8 — FIX ANY BROKEN AUTH GUARDS FOUND DURING AUDIT

During Tasks 4–7, you may discover pages that are missing auth guards.

**Pattern to check:**
```typescript
// CORRECT — has auth guard
const currentUser = await getCurrentUser();
if (!currentUser) { redirect('/login'); }

// INCORRECT — no auth guard on a protected page
export default async function SomePage() {
  // renders without checking auth
}
```

For any protected page (anything under `/admin`, `/jobs`, `/transcripts`,
`/settings`, `/reports`, `/calendar`, `/exports`, `/billing`) that is missing
an auth guard, add one following the pattern above.

Do NOT add auth guards to:
- Public marketing pages (`/`, `/about`, `/pricing`, `/contact`, etc.)
- Auth pages (`/login`, `/register`, `/forgot-password`)

Commit each auth guard fix separately:
`fix: add auth guard to [page name]`

---

## TASK 9 — REPORTS PAGES: MAKE STUBS INFORMATIVE

**Objective:** The reports/accuracy, reports/usage, and reports/system stub pages
are visible to admins. Replace them with informational pages using data already
in the database.

### Task 9A — `/reports/usage` — Usage Summary Page

**File:** `app/reports/usage/page.tsx`

Replace StubPage with a server component (ADMIN only) that:
- Queries jobs table for counts by status
- Shows a simple summary table

```typescript
// Query pattern (uses existing queries):
const { data: jobsByStatus } = await supabase
  .from('jobs')
  .select('status')
  .eq('firm_id', currentUser.firmId); // firm-scoped

// Group by status in TypeScript:
const statusCounts = (jobsByStatus || []).reduce((acc: Record<string, number>, j: any) => {
  acc[j.status] = (acc[j.status] || 0) + 1;
  return acc;
}, {});
```

Display a table:
| Status | Count |
|--------|-------|
| CREATED | X |
| FILES_UPLOADED | X |
| TRANSCRIBING | X |
| READY_FOR_EDIT | X |
| IN_EDIT | X |
| COMPLETED | X |
| FAILED | X |

Add last-updated timestamp.

Commit: `fix: implement usage report page with job status breakdown`

---

### Task 9B — `/reports/accuracy` — Accuracy Reference Page

**File:** `app/reports/accuracy/page.tsx`

Replace StubPage with a server component (ADMIN only) that:
- Queries flagged_words table (if it exists) for aggregate confidence stats
- If flagged_words doesn't exist, display a static explanation of the accuracy system

Check if the table exists:
```bash
grep -r "flagged_words" supabase/migrations/ | head -5
```

If it exists, query for:
```typescript
const { data: flagStats } = await supabase
  .from('flagged_words')
  .select('confidence, status')
  .limit(1000);

// Calculate average confidence, review rate, etc.
```

Display:
- Average confidence score across all transcriptions
- Total words flagged for review
- Percentage reviewed
- If no data yet: "No transcription accuracy data available yet. Run your first job to see accuracy metrics."

Commit: `fix: implement accuracy report page`

---

### Task 9C — `/reports/system` — System Status Page

**File:** `app/reports/system/page.tsx`

Replace StubPage with a server component (ADMIN only) that displays:
- Supabase connection status (show "Connected" if the query succeeds)
- Total jobs in system
- Total users in system
- Storage bucket names (static)
- Environment info (Node version, deployment env)

```typescript
// Safe env display — only show non-secret values
const envInfo = {
  nodeEnv: process.env.NODE_ENV || 'unknown',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? 'Configured ✅' : 'Missing ❌',
  deepgramConfigured: process.env.DEEPGRAM_API_KEY 
    ? 'Configured ✅' : 'Missing ❌',
  anthropicConfigured: process.env.ANTHROPIC_API_KEY 
    ? 'Configured ✅' : 'Missing ❌',
};
```

⚠️ NEVER display actual key values — only show Configured/Missing status.

Commit: `fix: implement system report page with infrastructure status`

---

## TASK 10 — FINAL VERIFICATION

After all tasks are complete, run the full verification suite:

### Step 1 — TypeScript

```bash
npx tsc --noEmit 2>&1 | wc -l
npx tsc --noEmit 2>&1 | head -30
```

The error count after your changes must not be HIGHER than the baseline recorded
in Step 3 of initialization. If it is higher, fix the new errors before proceeding.

### Step 2 — Build Check

```bash
npm run build 2>&1 | tail -40
```

Build MUST succeed. If it fails, fix the failure before closing the session.

### Step 3 — Lint

```bash
npm run lint 2>&1 | head -30
```

### Step 4 — Update Change Log

Append to `ai_logs/change_log.md`:

```markdown
## Session: [DATE] — Page Audit & Stub Completion — COMPLETE

### Pages Audited
- Total routes discovered: X
- Complete: X
- Stubs converted to functional: X
- Missing pages created: X
- Broken imports found: X

### Tasks Completed
- Task 1: Page Inventory ✅/❌
- Task 2A: Roles Settings ✅/❌
- Task 2B: AI Models Settings ✅/❌
- Task 2C: Audio Processing Settings ✅/❌
- Task 2D: Billing Rates Settings ✅/❌
- Task 2E: Integrations Settings ✅/❌
- Task 3A: Notifications Page ✅/❌/SKIPPED
- Task 3B: Help Page ✅/❌/SKIPPED
- Task 4: Transcription Review Audit ✅/❌
- Task 5: Calendar Audit ✅/❌
- Task 6: Transcripts Audit ✅/❌
- Task 7: Admin Audit ✅/❌
- Task 8: Auth Guards ✅/❌
- Task 9A: Usage Report ✅/❌
- Task 9B: Accuracy Report ✅/❌
- Task 9C: System Report ✅/❌
- Task 10: Final Verification ✅/❌

### TypeScript
- Baseline errors: X
- Final errors: X
- New errors introduced: X (must be 0)

### Build
- Build status: PASS/FAIL

### Critical Findings
[Any broken imports, missing migrations, or issues that need James's attention]

### Commits Made
[List all commits in this session]
```

---

## STOPPING CONDITIONS

Stop immediately and report to James if:

1. `npm run build` fails and you cannot identify a simple fix
2. TypeScript errors increase by more than 5 from baseline
3. Any auth-related file (`middleware.ts`, `lib/auth/`, `lib/supabase/server.ts`)
   needs to be modified to complete a task
4. Any governance file (`AI_AUTONOMOUS_RULES.md`, `MASTER_CONTROL.md`,
   `AI_MASTER_ORCHESTRATOR.md`, `BETA_FREEZE.md`) is found to be missing or empty
5. A task requires modifying `supabase/migrations/` or `prisma/schema.prisma`
6. A Supabase query returns an unexpected schema error

In the stopping condition, write to `ai_logs/change_log.md`:
```
[STOPPED] Session halted at Task X. Reason: [exact reason].
James must review before resuming.
```

---

## WHAT NOT TO DO

- ❌ Do NOT modify middleware.ts under any circumstances
- ❌ Do NOT modify lib/auth/session.ts or lib/supabase/server.ts
- ❌ Do NOT add npm packages
- ❌ Do NOT modify the Prisma schema or Supabase migrations
- ❌ Do NOT rename files or reorganize directory structure
- ❌ Do NOT refactor existing working components (even if you see improvements)
- ❌ Do NOT present multiple options — make the decision and execute it
- ❌ Do NOT batch multiple tasks into one commit
- ❌ Do NOT modify the four governance files under any circumstances

---

## EXPECTED OUTCOMES

When this session completes successfully, the following should be true:

1. `docs/PAGE_INVENTORY.md` exists and documents every route
2. Five settings pages previously showing StubPage now show real content
3. `/notifications` page exists if it was referenced in navigation
4. `/help` page exists if it was referenced in navigation
5. The transcription review tool has been audited and any broken imports are documented
6. The calendar tool has been audited and any missing migrations are flagged
7. Admin report pages (usage, accuracy, system) show real data
8. All changes pass TypeScript and build checks
9. `ai_logs/change_log.md` contains a complete session summary

---

*Prompt version: 2.0 | Generated by Claude (claude.ai) for James Horton | Depo-Pro*
*Do not modify this prompt file without updating the version number*

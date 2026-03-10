# ═══════════════════════════════════════════════════════════════════════════════
# DEPO-PRO — PHASE 1C: UI FORMATTER TRIGGER
# Autonomous Implementation Prompt for Codex CLI / Claude Code
#
# Save to:  ai_prompts/phases/phase_01c_ui_formatter_trigger.md
# Session:  claude code --no-resume
# Run:      AFTER phase_01b_validation_gate.md reports EXIT CRITERION MET
# Version:  1.0 — Self-Contained
#
# This prompt adds the Run Formatter action to the job review page and the
# job detail page. It is a focused, single-commit implementation — no DB
# changes, no new routes, no new dependencies.
#
# Exit criterion: Run Formatter button visible on review page, calls
# POST /api/transcriptions/[id]/format, displays quality gate result.
# ═══════════════════════════════════════════════════════════════════════════════

---

## MISSION

Expose the Phase 1 formatter pipeline in the Depo-Pro review interface.

Court reporters and admins need a manual trigger to regenerate a
transcript's paragraph structure, pagination, and quality gate results
on demand — for example, after speaker assignments change or after
corrections are applied.

This prompt creates one reusable component and wires it into two
existing pages. It does not create new routes, new tables, new
dependencies, or new pages.

**Scope — this prompt touches exactly these files:**

```
MODIFY: app/(dashboard)/jobs/[id]/review/page.tsx          (or ReviewPageClient.tsx)
MODIFY: app/(dashboard)/jobs/[id]/page.tsx                 (job detail)
CREATE: components/transcripts/FormatterTrigger.tsx
CREATE: tests/unit/components/FormatterTrigger.test.tsx
```

No other files are modified.

---

## EMBEDDED PLATFORM CONTEXT

**Stack:** Next.js 15 App Router · React · TypeScript · Tailwind CSS · Supabase SSR

**Auth rules:**
- `createSupabaseServerClient()` from `lib/supabase/server.ts`
- `profiles` table only — never `users`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Auth failures → `/unauthorized?reason=missing_profile`

**Role access for formatter trigger:**
- `COURT_REPORTER` — YES (primary user)
- `ADMIN` — YES (support and override)
- `SCOPIST` — YES (can regenerate after corrections)
- `ATTORNEY` — NO (read-only role)

**API endpoint (already exists from Phase 1):**
```
POST /api/transcriptions/[id]/format
Response 200: { success: true, paragraphsCreated: N, pageCount: N, qualityGate: {...} }
Response 422: { success: false, error: "Quality gate blocked export" }
Response 500: { success: false, error: "..." }
```

**Quality gate result shape:**
```typescript
interface QualityGateResult {
  passed: boolean
  exportBlocked: boolean
  checks: Array<{
    code: string        // 'QG-001' through 'QG-012'
    severity: 'ERROR' | 'WARNING'
    passed: boolean
    message: string
  }>
  errorCount: number
  warningCount: number
}
```

**Job state machine:** `TRANSCRIBED → IN_REVIEW` — formatter runs only
on jobs with status `TRANSCRIBED`, `IN_REVIEW`, or `SCOPIST_COMPLETE`.

**Frozen files — DO NOT MODIFY:**
```
lib/supabase/server.ts
lib/supabase/client.ts
lib/auth/session.ts
middleware.ts
supabase/migrations/**
app/api/transcriptions/[id]/format/route.ts  ← already built in Phase 1
```

---

## IMPLEMENTATION ORDER

### PRE-FLIGHT

```bash
npx tsc --noEmit && npm run build
```

Both must pass before any code is written. Document result in
`ai_logs/phase1c_audit.md` (create if missing).

---

## STEP 1 — FORMATTER TRIGGER COMPONENT
**Commit:** `feat(ui): add FormatterTrigger component for transcript regeneration`

Create: `components/transcripts/FormatterTrigger.tsx`

**Component contract:**

```typescript
interface FormatterTriggerProps {
  transcriptionId: string
  jobStatus: string           // Current job.status from DB
  userRole: string            // From profiles.role
  onComplete?: (result: FormatterResult) => void
}

interface FormatterResult {
  success: boolean
  paragraphsCreated: number
  pageCount: number
  qualityGate: QualityGateResult
  durationMs: number
  error?: string
}
```

**Behavior:**

- Button text: `Run Formatter`
- Button icon: lucide-react `RefreshCw` (16px)
- Button style: `bg-indigo-600 hover:bg-indigo-700 text-white` for primary state
- Loading state: spinner (`animate-spin`) + text `Formatting...` — button disabled
- Role guard: if `userRole === 'ATTORNEY'` render `null` (do not show)
- Status guard: if `jobStatus` is `EXPORTED` or `COMPLETED` — render button with
  `variant="outline"` and tooltip "Transcript already exported — re-running will
  regenerate paragraphs only and will not affect the exported DOCX"

**On click:**

1. Set `isLoading = true`, clear previous result
2. `POST /api/transcriptions/${transcriptionId}/format`
3. On success (200): set result, call `onComplete(result)`
4. On error: set error state

**Result display (below button, not a modal):**

Show an inline result panel that appears after the run completes:

```
┌─────────────────────────────────────────────────────┐
│  ✓ Formatter complete                               │
│  Pages: 24   Paragraphs: 187   Time: 1.4s          │
│                                                     │
│  Quality Gate: 0 errors · 2 warnings               │
│  [▶ View details]   ← toggles check list below    │
└─────────────────────────────────────────────────────┘
```

When expanded, show each quality gate check as a row:

- ERROR checks that failed: red `X` icon + `code` + `message`
- WARNING checks that failed: amber `⚠` icon + `code` + `message`
- Passed checks: green `✓` icon + `code` + `message`

Use Tailwind only. No external component libraries beyond what is
already in the repository. Use lucide-react for icons.

**Implementation:**

```typescript
'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

// ... full implementation
```

Implement the complete component. No stubs, no `// TODO` comments.

---

## STEP 2 — ADD TO REVIEW PAGE
**Commit:** `feat(review): integrate FormatterTrigger into transcript review page`

**File:** `app/(dashboard)/jobs/[id]/review/page.tsx`
(or `ReviewPageClient.tsx` if the page uses a client component split)

Locate the existing action bar or header area on the review page.
Add `<FormatterTrigger>` to the right side of the action bar,
adjacent to the existing Export button (if present).

Pass props from the page's existing data:
- `transcriptionId` — from the loaded transcription record
- `jobStatus` — from `job.status`
- `userRole` — from the authenticated user's profile

On `onComplete`: invalidate or refresh the transcript paragraph data
so the review panel reflects the regenerated output.

Do not modify the three-panel layout. Do not modify the audio player,
transcript panel, or flagged word panel. This is an additive change only.

---

## STEP 3 — ADD TO JOB DETAIL PAGE
**Commit:** `feat(jobs): add FormatterTrigger to job detail page`

**File:** `app/(dashboard)/jobs/[id]/page.tsx`

Add `<FormatterTrigger>` to the job detail action area — the same row
that contains other job actions (start review, export, etc.).

Show the button only when `job.status` is one of:
`TRANSCRIBED`, `IN_REVIEW`, `SCOPIST_COMPLETE`

When `job.status` is `COMPLETED` or `EXPORTED`, show with `variant="outline"`
per the component's status guard.

---

## STEP 4 — UNIT TEST
**Commit:** `test(ui): add FormatterTrigger component tests`

Create: `tests/unit/components/FormatterTrigger.test.tsx`

Using Vitest + React Testing Library (already in project):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FormatterTrigger from '@/components/transcripts/FormatterTrigger'

describe('FormatterTrigger', () => {

  it('renders Run Formatter button for COURT_REPORTER', () => {
    render(<FormatterTrigger transcriptionId="t1" jobStatus="IN_REVIEW" userRole="COURT_REPORTER" />)
    expect(screen.getByText('Run Formatter')).toBeInTheDocument()
  })

  it('renders null for ATTORNEY role', () => {
    const { container } = render(<FormatterTrigger transcriptionId="t1" jobStatus="IN_REVIEW" userRole="ATTORNEY" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders for SCOPIST role', () => {
    render(<FormatterTrigger transcriptionId="t1" jobStatus="IN_REVIEW" userRole="SCOPIST" />)
    expect(screen.getByText('Run Formatter')).toBeInTheDocument()
  })

  it('renders for ADMIN role', () => {
    render(<FormatterTrigger transcriptionId="t1" jobStatus="IN_REVIEW" userRole="ADMIN" />)
    expect(screen.getByText('Run Formatter')).toBeInTheDocument()
  })

  it('shows loading state while request is in flight', async () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as any  // never resolves
    render(<FormatterTrigger transcriptionId="t1" jobStatus="IN_REVIEW" userRole="COURT_REPORTER" />)
    fireEvent.click(screen.getByText('Run Formatter'))
    await waitFor(() => expect(screen.getByText('Formatting...')).toBeInTheDocument())
  })

  it('displays quality gate summary on successful run', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        paragraphsCreated: 187,
        pageCount: 24,
        durationMs: 1400,
        qualityGate: {
          passed: true, exportBlocked: false,
          checks: [], errorCount: 0, warningCount: 2
        }
      })
    })) as any

    render(<FormatterTrigger transcriptionId="t1" jobStatus="IN_REVIEW" userRole="COURT_REPORTER" />)
    fireEvent.click(screen.getByText('Run Formatter'))
    await waitFor(() => expect(screen.getByText(/Formatter complete/)).toBeInTheDocument())
    expect(screen.getByText(/24/)).toBeInTheDocument()   // page count
    expect(screen.getByText(/187/)).toBeInTheDocument()  // paragraph count
    expect(screen.getByText(/2 warnings/)).toBeInTheDocument()
  })

  it('calls onComplete with result when run succeeds', async () => {
    const mockResult = {
      success: true, paragraphsCreated: 50, pageCount: 5, durationMs: 800,
      qualityGate: { passed: true, exportBlocked: false, checks: [], errorCount: 0, warningCount: 0 }
    }
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResult) })) as any
    const onComplete = vi.fn()
    render(<FormatterTrigger transcriptionId="t1" jobStatus="IN_REVIEW" userRole="COURT_REPORTER" onComplete={onComplete} />)
    fireEvent.click(screen.getByText('Run Formatter'))
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ success: true })))
  })

  it('shows outline variant for EXPORTED job status', () => {
    render(<FormatterTrigger transcriptionId="t1" jobStatus="EXPORTED" userRole="COURT_REPORTER" />)
    const btn = screen.getByText('Run Formatter').closest('button')
    expect(btn?.className).toContain('outline')
  })
})
```

---

## FINAL VERIFICATION

```bash
npx tsc --noEmit
npm run lint
npm run build
npx vitest run tests/unit/components/FormatterTrigger.test.tsx
```

All must pass.

Manual smoke test:
1. Open a job with status `IN_REVIEW` and a linked transcription
2. Navigate to `/jobs/[id]/review`
3. Confirm **Run Formatter** button is visible in the action bar
4. Click the button — confirm loading spinner appears
5. Wait for completion — confirm quality gate summary displays
6. Click **View details** — confirm check list expands
7. Navigate to `/jobs/[id]` — confirm button also present there
8. Log in as an ATTORNEY role — confirm button does not appear

---

## COMPLETION REPORT

```
╔═══════════════════════════════════════════════════════════════╗
║        DEPO-PRO — PHASE 1C UI FORMATTER TRIGGER COMPLETE     ║
╠═══════════════════════════════════════════════════════════════╣
║  FormatterTrigger component:   CREATED                       ║
║  Review page integration:      COMPLETE                      ║
║  Job detail integration:       COMPLETE                      ║
║  Unit tests:                   __ / 8 passing                ║
║  TypeScript:                   0 errors                      ║
║  Build:                        PASSING                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Next step: phase_01d_milestone_documentation.md             ║
╚═══════════════════════════════════════════════════════════════╝
```

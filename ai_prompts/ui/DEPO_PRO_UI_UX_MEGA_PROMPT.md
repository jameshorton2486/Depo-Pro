# DEPO-PRO — UI/UX TRANSFORMATION MEGA-PROMPT
## Complete Front-End Overhaul: Home Page, Role Dashboards, and Tool Navigation
**Version 1.0 — March 9, 2026**

---

## MISSION STATEMENT

You are a senior full-stack engineer and product designer tasked with transforming the Depo-Pro
user interface from a functional prototype into a professional, polished, production-grade legal
SaaS platform. The current pages are structurally sound but visually flat, informationally sparse,
and lack the guidance, interactivity, and visual hierarchy that professional users expect. Your
mission is to redesign the public landing page, all four role-specific dashboards, and the
global navigation so that every user lands in an environment that clearly communicates what tools
are available to them, what to do next, and how to do it — without needing documentation.

---

## MANDATORY PRE-FLIGHT (Read Before Writing a Single Line of Code)

Before making any changes, you MUST complete all of the following steps in order:

```
STEP 1: Read AI_AUTONOMOUS_RULES.md in the project root — full file, no skipping
STEP 2: Read BETA_FREEZE.md in the project root — understand what is locked
STEP 3: Read MASTER_CONTROL.md in the project root
STEP 4: Run: npx tsc --noEmit 2>&1 | tail -5 | tee /tmp/ts_baseline.txt
         Record the TypeScript error count. You must not increase it.
STEP 5: Run: npm run build 2>&1 | tail -20 | tee /tmp/build_baseline.txt
         Confirm the build passes before you touch anything.
STEP 6: Create branch: git checkout -b feature/ui-ux-transformation
STEP 7: Confirm existing files: list the contents of:
         - app/page.tsx
         - app/(dashboard)/reporter/page.tsx
         - app/(dashboard)/scopist/page.tsx
         - app/(attorney)/attorney-dashboard/page.tsx
         - app/(dashboard)/admin/page.tsx
         - components/layouts/app-sidebar.tsx
         - components/dashboard/stat-card.tsx
         - components/dashboard/recent-jobs.tsx
```

---

## ABSOLUTE CONSTRAINTS (NEVER VIOLATE THESE)

```
❌ DO NOT modify: middleware.ts
❌ DO NOT modify: lib/auth/session.ts
❌ DO NOT modify: lib/supabase/server.ts
❌ DO NOT modify: lib/supabase/admin.ts
❌ DO NOT modify: supabase/migrations/ (any file)
❌ DO NOT modify: prisma/schema.prisma
❌ DO NOT modify: any API route file
❌ DO NOT add new npm packages (use only what is already installed)
❌ DO NOT rename or move existing component files
❌ DO NOT refactor existing working components — extend them
❌ DO NOT remove existing data fetching logic from dashboard server components
❌ DO NOT touch any governance files (AI_AUTONOMOUS_RULES.md, MASTER_CONTROL.md, etc.)
❌ DO NOT make more than one commit per task
❌ DO NOT batch multiple tasks into a single commit

✅ You MAY create new components in components/dashboard/
✅ You MAY create new components in components/layouts/
✅ You MAY create new components in components/home/
✅ You MAY edit app/page.tsx (home page — public, no auth)
✅ You MAY edit the four dashboard page files listed above
✅ You MAY edit app-sidebar.tsx (visual only — do not change role/permission logic)
✅ You MAY edit stat-card.tsx and recent-jobs.tsx (visual enhancements only)
✅ You MAY use all existing shadcn/ui components already installed
✅ You MAY use all existing lucide-react icons already installed
✅ All new client components MUST be marked 'use client' at the top
✅ All new TypeScript must be strictly typed — no `any` without explicit comment
```

---

## DESIGN SYSTEM RULES

These rules apply to every file you touch or create:

**Colors — use existing Tailwind tokens only:**
- Primary navy: `slate-900`, `slate-800`
- Accent blue: `blue-600`, `indigo-600`
- Success: `green-600`, `green-500`
- Warning: `amber-500`, `yellow-600`
- Danger: `red-600`
- Muted text: `slate-500`, `slate--400`
- Backgrounds: `white`, `slate-50`, `slate-100`

**Typography:**
- Page titles: `text-2xl font-bold` or `text-3xl font-bold`
- Section headings: `text-xl font-semibold`
- Card headings: `text-base font-semibold`
- Body: `text-sm` with `text-slate-600` or `text-slate-700`
- Metadata/labels: `text-xs text-slate-500`

**Spacing:**
- Dashboard padding: `p-6` outer, `p-4` inner cards
- Card gap: `gap-6`
- Section gap: `mb-8` between major sections

**Interactions:**
- All clickable items: `transition-colors duration-150`
- Card hover: `hover:shadow-md` or `hover:border-blue-300`
- Buttons: use existing `Button` component from `@/components/ui/button`
- Tooltips: use existing `Tooltip` from `@/components/ui/tooltip`
- Popovers: use existing `Popover` from `@/components/ui/popover`

**No new dependencies.** If a visual effect requires a library not already in package.json, implement it with CSS/Tailwind instead.

---

## TASK 1 — HOME PAGE TRANSFORMATION (app/page.tsx)

### Objective
Transform the existing landing page into a dynamic, role-aware discovery experience that immediately
communicates Depo-Pro's value to each type of visitor and draws them into the platform. The page must
work without authentication — it is public.

### Current State
The current page has: Hero section, value props, audience section, features section, AI philosophy
section, security section, trust statement, CTA. The audience section lists three user types in a
generic grid with no interactivity or tool detail.

### Required Changes

**1A — Enhanced Hero Section**

Replace the current hero text block with a two-column layout:

LEFT COLUMN (text):
- Keep the existing headline and subheadline copy
- Add a metrics row below the subheadline with three animated counters using CSS animation (no JS library):
  - "25 lines per page — legal standard enforced"
  - "Deepgram Nova-3 — medical-grade accuracy"  
  - "100% human-confirmed — AI assists, humans decide"
- Keep the existing CTA buttons

RIGHT COLUMN (visual):
- Replace the plain placeholder box with a mock "transcript review card" — a styled div that
  looks like the actual review interface at a glance:
  - Dark card background (`slate-800`)
  - A fake waveform visualization: a row of 40 divs with varying heights using inline styles,
    colored `blue-500`, simulating an audio waveform
  - Below the waveform: three lines of mock transcript text in `mono` font showing Q/A formatting:
    ```
    Q.  When did you first observe the vehicle?
    A.  I believe it was around 2:47 in the afternoon.
    Q.  And where were you standing at that time?
    ```
  - One word highlighted with a yellow/amber background labeled "Low confidence: 2:47" with a
    small flag icon
  - A "Review" pill button in the bottom right of the card
  - This is purely decorative HTML — no JS interactivity required

**1B — Interactive Role Discovery Section**

Replace the existing "AudienceSection" with a new full-width section that includes:

SECTION HEADER:
- Centered: "Built for Every Legal Professional"
- Subtext: "Select your role to explore the tools built for you"

THREE ROLE CARDS (horizontal on desktop, vertical stack on mobile):

Each card is a large, clickable card (not a link — a button that toggles an expanded panel below):

**Court Reporter Card:**
- Icon: `Mic` (large, 48px)
- Title: "Court Reporter"
- Tagline: "From audio to certified transcript"
- Color accent: `blue-600`
- On click/hover: reveals an expanded tool list panel BELOW all three cards (not inside the card)

**Scopist Card:**
- Icon: `Edit3` (large, 48px)
- Title: "Scopist"
- Tagline: "AI-flagged words. Your expert corrections."
- Color accent: `indigo-600`
- On click/hover: reveals expanded tool list panel

**Attorney Card:**
- Icon: `Scale` (large, 48px)
- Title: "Attorney / Legal Team"
- Tagline: "Read, annotate, and search — instantly"
- Color accent: `teal-600`
- On click/hover: reveals expanded tool list panel

EXPANDED PANEL (renders below the 3 cards, full width, with smooth CSS transition):

When a role is selected, the panel slides open (use `max-height` CSS transition from 0 to `max-height: 800px`)
and displays a grid of tool tiles for that role:

**Court Reporter tools to display:**
```
[Mic icon]          High-Accuracy Transcription
                    "Upload MP3, MP4, WAV, or FLAC. AI transcribes with Deepgram Nova-3
                     and flags every word below your confidence threshold."

[Headphones icon]   Transcript Review Tool
                    "Time-synced audio playback alongside your transcript. Click any
                     flagged word, listen, correct, confirm — all in one screen."

[Edit icon]         Format & Speaker Settings
                    "Map speaker IDs to Q/A roles. Configure em-dashes, capitalization,
                     and legal formatting rules before export."

[FileText icon]     DOCX Export
                    "Export certified transcripts in legal format: 25 lines per page,
                     numbered, Q/A structured, and ready for court."

[Calendar icon]     Deposition Calendar
                    "Schedule depositions, manage availability, and track upcoming
                     sessions. Convert confirmed events directly to jobs."

[StickyNote icon]   Deposition Notes
                    "Capture proper nouns, spellings, and real-time notes during the
                     deposition. Notes sync to the review tool automatically."
```

**Scopist tools to display:**
```
[Play icon]         Review Queue
                    "Your assigned jobs, ranked by urgency. See flagged word count
                     and review progress before you open a single transcript."

[Headphones icon]   Synced Audio Review
                    "Same waveform review tool as the reporter — with access to the
                     reporter's notes and proper noun dictionary."

[StickyNote icon]   Reporter Notes Access
                    "Read the court reporter's timestamped deposition notes. Jump to
                     any note's audio position with one click."

[GraduationCap icon] WKT — Word Knowledge Training
                    "Flashcards, practice mode, and timed mock exams for medical
                     terminology, legal terms, grammar, Texas Rules, and spelling."

[BarChart3 icon]    Progress Tracker
                    "Track your WKT performance by category. Spaced-repetition
                     scheduling surfaces the questions you need most."
```

**Attorney tools to display:**
```
[FileText icon]     Transcript Viewer
                    "Read finalized transcripts shared by the reporting firm. Search
                     full text, navigate by page and line, or play synced audio."

[MessageSquare icon] Annotations & Issue Codes
                    "Highlight passages, add notes, and apply color-coded issue codes
                     (objection, relevance, privilege) — shareable with co-counsel."

[Paperclip icon]    Exhibit Linking
                    "Link exhibits to annotation points in the transcript. Organized
                     by exhibit number and timestamp."

[Briefcase icon]    Case Overview
                    "All depositions for a case in one place — with witness names,
                     dates, and annotation summaries."

[CalendarClock icon] Upcoming Depositions
                    "See scheduled depositions relevant to your cases, with remote
                     links and location details."
```

Each tool tile should be:
- `flex` row with icon on left (48px container, icon at 24px in a colored background circle)
- Title in `font-semibold text-slate-900`
- Description in `text-sm text-slate-500` wrapping to 2 lines max
- Right arrow `ChevronRight` at far right
- `cursor-pointer` styling but no active link (visitor is not logged in)
- A non-functional "Learn More" or information tooltip on hover using the existing Tooltip component
  that says: "Sign in to access this tool"

After the tool list, a CTA row:
- "Ready to get started?" → Button: "Request Access" → `/register`
- Role-specific text: for Reporter: "Works alongside your existing CSR workflow"

**1C — Enhanced Features Section**

The existing features section lists three generic points. Replace the content only (keep the JSX
structure) with more specific features organized by workflow phase:

Phase 1 — Ingest: "Upload audio in any common format. We normalize it to 16kHz mono for maximum
Deepgram accuracy."

Phase 2 — Transcribe: "Deepgram Nova-3 returns word-level timestamps and confidence scores for
every word in your recording."

Phase 3 — Review: "Low-confidence words are flagged and queued. Play the audio, hear the word,
make the call. Corrections are versioned."

Phase 4 — Export: "Generate certified DOCX transcripts in legal format. Preflight checks block
export until all flags are resolved."

**1D — Social Proof / Trust Bar**

Add a new section just before the Security section with the following structure:
- Dark background (`slate-900`)
- Three stat cards in a row:
  - "Word-level timestamps" — "Every word includes start time, end time, and confidence score"
  - "25-line page standard" — "Formatting complies with legal transcript page layout requirements"
  - "Full edit history" — "Every correction is versioned with user, timestamp, and original value"
- Do not use fake customer quotes or invented testimonials. These are factual product capabilities only.

---

## TASK 2 — COURT REPORTER DASHBOARD (app/(dashboard)/reporter/page.tsx)

### Objective
Transform the reporter dashboard from a simple stats + recent jobs layout into a comprehensive
command center that communicates workflow status at a glance and guides the reporter to their
most urgent next action.

### Architecture Note
This file is a **server component** (no `'use client'` directive). It fetches data directly from
Supabase. Keep all existing data fetching logic intact. Extract visual sections into new client
components in `components/dashboard/reporter/` as needed.

### Required New Components to Create

Create `components/dashboard/reporter/reporter-tool-grid.tsx`:
A client component that renders the tool navigation grid (see below). This is purely presentational
— no data fetching.

Create `components/dashboard/reporter/workflow-pipeline.tsx`:
A client component that renders the visual pipeline status (see below).

### Dashboard Layout Changes

**2A — Header Enhancement**

Replace the current simple header div with a two-row header:

ROW 1: Left side has greeting "Good [morning/afternoon/evening], [firstName]" with current date.
Right side has the existing action buttons. Use server-side time for the greeting logic.

ROW 2: A horizontally scrollable "pipeline status bar" showing the five workflow stages as
connected nodes with job counts:

```
[Upload] —— [Transcribing] —— [Ready for Review] —— [In Review] —— [Completed]
  {n}           {n}                  {n}               {n}             {n}
```

Each node is a pill badge with:
- Job count number (from the existing `jobCounts` object)
- Status label
- Color-coded: gray=empty, blue=has jobs, green=completed
- Clicking a node navigates to `/jobs?status={STATUS}` — use `Link` from Next.js
- The connecting lines between nodes are simple `border-t-2 border-slate-200` divs
- This component receives jobCounts as a prop from the server component

**2B — Redesigned Stats Row**

Enhance the existing 4 StatCard components. Replace the generic `StatCard` usage with new
enhanced stat cards that include trend indicators. Do NOT modify the base `StatCard` component
— create a new `EnhancedStatCard` wrapper in `components/dashboard/reporter/`.

Each card gets:
- The existing value (large number, bold)
- A subtitle showing context: e.g., "Total Jobs" → subtitle: "Across all cases in your firm"
- A small badge showing change: since we don't have historical data, show static context badges:
  - Total Jobs: badge with `Briefcase` icon
  - Pending Transcription: badge with `Clock` icon + "Awaiting Deepgram" text
  - Processing: badge with animated pulse dot (CSS `animate-pulse`) + "Live" text
  - Completed: badge with `CheckCircle` icon + "This firm" text

**2C — Tool Navigation Grid**

Between the stats row and the Recent Jobs section, add a new full-width section:

SECTION HEADER: "Your Tools" with a subtle separator line

A 2-column by 3-row grid of tool cards (renders as `ToolGrid` client component):

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 🎙️ High-Accuracy            │  │ 🔍 Transcript Review         │
│    Transcription             │  │    Tool                      │
│    "Upload audio and         │  │    "Open any completed job   │
│     trigger AI pipeline"     │  │     and start correcting"    │
│    [Launch Tool →]           │  │    [Open Jobs →]             │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 📅 Deposition Calendar       │  │ 📝 Deposition Notes          │
│    "Schedule and manage      │  │    "Capture proper nouns     │
│     your depositions"        │  │     and notes in real-time"  │
│    [Open Calendar →]         │  │    [View Jobs →]             │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ ⚙️ Format Settings           │  │ 📥 Export Transcripts        │
│    "Configure speaker        │  │    "Download certified       │
│     mapping and rules"       │  │     DOCX transcripts"        │
│    [Manage Jobs →]           │  │    [View Exports →]          │
└─────────────────────────────┘  └─────────────────────────────┘
```

Each tool card:
- `rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer`
- Large icon (40px container, icon at 20px) with colored background matching the tool's theme
- Tool name in `text-base font-semibold`
- One-line description in `text-sm text-slate-500`
- A `[Label →]` link at the bottom using `Link` component — styled as `text-sm text-blue-600 font-medium`
- The entire card is wrapped in a `Link` to the appropriate route
- On hover: `border-blue-300 shadow-md bg-blue-50/30`

Tool routes:
- High-Accuracy Transcription → `/transcription-tool`
- Transcript Review Tool → `/jobs` (filtered view)
- Deposition Calendar → `/calendar`
- Deposition Notes → `/jobs` (reporter will open a specific job)
- Format Settings → `/jobs` (settings are per-job, guide them to jobs list)
- Export Transcripts → `/exports`

**2D — Recent Jobs Enhancement**

Keep the existing `RecentJobs` component but add a header bar above it with:
- Title: "Recent Jobs" on the left
- "View All Jobs →" link on the right pointing to `/jobs`
- A filter row below the header with three pill toggle buttons: "All" | "In Progress" | "Completed"
  These are visual-only filters — implement client-side filtering using `useState` and
  filtering the passed-in `jobs` array by status. Create a new
  `components/dashboard/reporter/filtered-jobs-list.tsx` client component that wraps `RecentJobs`
  and adds this filtering capability.

**2E — Quick Actions Sidebar Enhancement**

Rename the "Quick Actions" panel to "Next Steps" and redesign it as a prioritized action list:

If `jobCounts.pending > 0`:
  → Show highlighted card: "You have {n} jobs pending transcription — check status"
  → Link to `/jobs?status=TRANSCRIBING`
  → Background: `bg-amber-50 border-amber-200`

If `jobCounts.processing > 0`:
  → Show highlighted card: "Transcription in progress for {n} jobs"
  → Link to `/jobs?status=TRANSCRIBING`
  → Background: `bg-blue-50 border-blue-200`

Always show (below priority items):
- New Job → `/jobs/new`
- Assign to Scopist → `/jobs?filter=ai_complete`
- View Exports → `/exports`
- Calendar → `/calendar`

Each item has an icon, title, short description, and right-arrow chevron.
Current active items (pending/processing) get a colored background. Idle items have the existing styling.

---

## TASK 3 — SCOPIST DASHBOARD (app/(dashboard)/scopist/page.tsx)

### Objective
The scopist dashboard is focused on one thing: clear their queue. The redesign should immediately
show what jobs need attention, in priority order, with prominent "Start Review" actions and
meaningful progress indicators.

### Architecture Note
Server component — keep all existing Supabase data fetching intact.

### Required New Components
Create `components/dashboard/scopist/scopist-tool-grid.tsx` — presentational only.
Create `components/dashboard/scopist/job-queue-card.tsx` — enhanced single-job card.

### Dashboard Layout Changes

**3A — Header Enhancement**

Same greeting pattern as reporter: "Good [time], [firstName]"
Add a subtitle showing workload summary:
- If queue empty: "Your queue is clear — great work! 🎉"
- If has jobs: "You have {pendingReview} jobs ready for review"

Add an urgent badge if any job has been waiting more than 3 days:
- Show a red `AlertCircle` badge: "1 job overdue" — calculate from `updatedAt` field.
  If `updatedAt < now - 3 days`, mark as overdue.
- Badge uses `bg-red-100 text-red-700 border border-red-200 rounded-full px-3 py-1 text-xs`

**3B — Enhanced Stats Row**

Keep the four StatCards but add context subtitles:
- Active Jobs: subtitle "Currently assigned to you"
- Pending Review: subtitle "Ready to start — AI complete"
- Completed This Month: subtitle formatted as current month name (e.g. "In March 2026")
- Total Completed: subtitle "All time"

Add a simple horizontal progress bar below the stats row:
- Label: "Monthly goal: {completedThisMonth} / 20 transcripts" (20 is a placeholder target)
- Bar: `h-2 bg-slate-200 rounded-full` with fill `bg-green-500` at `width: {min(completedThisMonth/20*100, 100)}%`
- This shows at a glance how the scopist is tracking

**3C — Enhanced Job Queue**

Replace the current job queue list with a new `JobQueueCard` component per job.

Each `JobQueueCard` shows:

TOP ROW:
- Job title (`font-semibold`) + case name (`text-sm text-slate-500`)
- Status badge (existing color mapping)
- Overdue badge if applicable (`bg-red-100 text-red-600 text-xs rounded-full px-2 py-0.5`)

MIDDLE ROW:
- Two metrics side by side:
  - Left: "🚩 {flaggedCount} flagged words" in amber
  - Right: "✅ {reviewedCount} reviewed" in green
- A progress bar: `h-2.5 rounded-full bg-slate-200` with green fill at review percentage
- Percentage label: "{progress}%" right-aligned

BOTTOM ROW:
- Left: "Last updated {timeAgo}" in `text-xs text-slate-400`
- Right: Primary CTA button:
  - If progress === 0: `bg-blue-600 hover:bg-blue-700 text-white` → "Start Review →" → `/jobs/{id}/review`
  - If progress > 0 && progress < 100: `bg-indigo-600 hover:bg-indigo-700 text-white` → "Continue Review →"
  - If progress === 100: `bg-green-600 hover:bg-green-700 text-white` → "Finalize →" → `/transcripts/{id}/finalize`

Sort order: jobs with `progress === 0` first (most urgent), then by `updatedAt` descending.

**3D — Tool Navigation Grid**

Below the queue, add a 2×2 tool grid for scopist tools:

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 🎓 WKT Training              │  │ 📚 Practice Mode             │
│    "Sharpen your vocabulary  │  │    "Targeted practice by     │
│     across 6 categories"     │  │     category or difficulty"  │
│    [Open WKT →]              │  │    [Start Practice →]        │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 📝 Mock Exam                 │  │ 📊 My Progress               │
│    "Timed exam matching the  │  │    "Track improvement across │
│     real CSR certification"  │  │     all WKT categories"      │
│    [Take Exam →]             │  │    [View Progress →]         │
└─────────────────────────────┘  └─────────────────────────────┘
```

Routes: `/wkt`, `/wkt/practice`, `/wkt/mock-exam`, `/wkt/progress`
Card styling: same as reporter tool cards but with `indigo` accent color on hover.

**3E — Tips Panel Redesign**

Replace the static Quick Tips panel with a tabbed reference panel using existing `Tabs` component
from `@/components/ui/tabs`:

TAB 1 — "Keyboard Shortcuts":
Display a small reference table with:
- Space → Play / Pause audio
- ↑ / ↓ → Previous / Next flagged word
- Enter → Edit current word
- Escape → Cancel edit
- Tab → Next flagged word (confirm this is wired in review tool)
- Ctrl+Enter → Mark word as reviewed

TAB 2 — "Quick Reference":
- "Flag threshold: words below 85% confidence are flagged"
- "Corrections are versioned — original is always preserved"
- "Export is blocked until all flagged words are reviewed"
- "Audio seek: click any word timestamp to jump to that position"

TAB 3 — "WKT Reminder":
Show the scopist's most recent WKT session summary if available (fetch from
`/api/wkt/progress` on the client side — wrap in a `useEffect` with loading state).
If no WKT data: "Start your WKT practice to track progress here."
Link to `/wkt`.

---

## TASK 4 — ATTORNEY DASHBOARD (app/(attorney)/attorney-dashboard/page.tsx)

### Objective
The attorney dashboard is currently a client component that fetches its own data. Keep this
architecture. The redesign should emphasize transcript discovery and fast access to case annotations,
since attorneys do not manage jobs — they consume finalized transcripts.

### Architecture Note
This is a CLIENT COMPONENT ('use client'). Data is fetched in useEffect from `/api/attorney/dashboard`.
Keep this pattern exactly. Do not convert to server component.

### Required New Components
Create `components/attorney/attorney-tool-grid.tsx` — presentational tool navigation.
Create `components/attorney/recent-transcript-card.tsx` — enhanced transcript card.

### Dashboard Layout Changes

**4A — Header Enhancement**

Two-column header:
LEFT: Title "Attorney Dashboard" with subtitle based on `stats.accessibleTranscripts`:
- 0 transcripts: "No transcripts have been shared with you yet"
- 1+ transcripts: "{n} transcript{s} shared with your account"

RIGHT: A single primary button: "Browse Transcripts →" → `/attorney/transcripts`

Below the header, a horizontal "status bar" with 4 stat pills:
- Cases: `{stats.totalCases}` with `Briefcase` icon
- Transcripts: `{stats.accessibleTranscripts}` with `FileText` icon
- Annotations: `{stats.annotations.total}` with `MessageSquare` icon
- Upcoming: `{stats.upcomingDepositions}` with `CalendarClock` icon

Each pill: `inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-700`

**4B — Tool Navigation Grid**

A 2×2 grid of attorney tool cards before the transcripts list:

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 📄 My Transcripts            │  │ 🗂️ Case Overview             │
│    "View all transcripts     │  │    "All depositions for      │
│     shared with your         │  │     each of your cases"      │
│     account"                 │  │                              │
│    [View Transcripts →]      │  │    [View Cases →]            │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 💬 My Annotations            │  │ 📅 Upcoming Depositions      │
│    "Review all your          │  │    "{n} depositions          │
│     highlights, notes,       │  │     scheduled"               │
│     and issue codes"         │  │                              │
│    [View Annotations →]      │  │    [View Calendar →]         │
└─────────────────────────────┘  └─────────────────────────────┘
```

Routes: `/attorney/transcripts`, `/attorney/cases`, `/attorney/annotations` (if exists, else `/attorney/transcripts`), `/calendar`

Note: If the `/attorney/annotations` route does not exist, link to `/attorney/transcripts?tab=annotations`.

**4C — Recent Transcripts Enhancement**

Replace the current transcript list with a richer card grid (2 columns on desktop, 1 on mobile):

Each `RecentTranscriptCard` shows:
- Header row: Case name (`font-semibold`) + case number badge (`text-xs text-slate-500 bg-slate-100`)
- Witness/deponent line: witness icon + name or "No witness listed"
- Deposition date: formatted as "Month D, YYYY" — if null: "Date not set"
- Access level badge:
  - VIEW: `bg-slate-100 text-slate-600` + `Eye` icon
  - COMMENT: `bg-blue-100 text-blue-700` + `MessageSquare` icon
  - EDIT: `bg-green-100 text-green-700` + `Edit` icon
- Last accessed: "Last viewed {timeAgo}" or "Not yet opened"
- Expiry warning: if `expiresAt` is within 7 days, show `bg-amber-100 text-amber-700` warning badge
- Footer CTA: "Open Transcript →" button, full width, linking to the transcript viewer

Empty state: Use existing `EmptyTranscripts` component with message:
"Your reporting firm hasn't shared any transcripts yet. Contact them to request access."

**4D — Annotation Summary Panel**

In the sidebar (right column on desktop), show an annotations summary panel:
- Three rows:
  - `Highlighter` icon → "{stats.annotations.highlights} highlights"
  - `StickyNote` icon → "{stats.annotations.notes} notes"
  - `Bookmark` icon → "{stats.annotations.bookmarks} bookmarks"
- Each row: `flex justify-between items-center py-2 border-b border-slate-100`
- Footer: "View all annotations →" link

If all counts are 0, show: "Add annotations while reading transcripts. Select text to highlight,
note, or flag passages."

---

## TASK 5 — ADMIN DASHBOARD (app/(dashboard)/admin/page.tsx)

### Objective
The admin dashboard is already the most complete. Enhance it with better visual organization,
a system health summary, and quick navigation to all admin sub-tools.

### Architecture Note
Server component — keep all existing data fetching.

### Required New Components
Create `components/dashboard/admin/admin-nav-grid.tsx` — presentational tool grid.

### Dashboard Layout Changes

**5A — Header Enhancement**

Keep existing header structure but add a subtitle showing system time:
"System overview — Last refreshed: {new Date().toLocaleTimeString()}"

Add a health indicator badge next to the title:
- Fetch from Supabase client (already available in scope): if connection works, show
  `bg-green-100 text-green-700 ● System Operational`
- On Supabase error: `bg-red-100 text-red-700 ● Connection Issue`

**5B — Admin Tool Navigation Grid**

Add a 3-column grid of admin navigation cards (between stats and the existing components):

```
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ 👥 User Management    │  │ ⚙️ System Actions      │  │ 🏢 Feature Flags      │
│    "/settings/users"  │  │    "/admin/actions"    │  │    "/admin/features"  │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘

┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│ 🔐 Permissions Matrix │  │ 📋 Audit Log          │  │ 🔄 RX Queue           │
│    "/admin/permissions│  │    "/reports/audit-log │  │    "/admin/rx-queue"  │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

Each card:
- Icon + Title + one-line description
- `hover:border-slate-400 hover:shadow-sm transition-all`
- Small "→" arrow at bottom right

**5C — Layout Reorganization**

Rearrange the existing content into a two-column layout:

LEFT COLUMN (2/3 width):
- Stats row (existing 4 stat cards)
- Admin navigation grid (new, 5B above)
- Recent Jobs (existing `RecentJobs` component)

RIGHT COLUMN (1/3 width):
- Health Dashboard (existing `HealthDashboard` component)
- Action Console (existing `ActionConsole` component, collapsed to show only most recent 3 items)

Keep the existing `RxQueueManager` component — place it below the two-column layout as a full-width section.

---

## TASK 6 — SIDEBAR NAVIGATION ENHANCEMENT (components/layouts/app-sidebar.tsx)

### Objective
The sidebar currently renders navigation items from a schema. Enhance it visually without touching
the permission/role logic.

### Constraints
- DO NOT change the `getNavigationForRole` function or `NavSection`/`NavItem` types
- DO NOT change which items appear for which roles
- DO NOT change link href values
- Only modify visual rendering

### Required Changes

**6A — Active State Enhancement**

The current active state is `bg-primary text-primary-foreground`. Enhance to:
- Active item: `bg-blue-600 text-white font-medium rounded-lg`
- Active item has a 3px left border accent: `border-l-3 border-blue-400`
  (implement with `border-l-[3px]` Tailwind arbitrary value)

**6B — User Profile Section**

At the BOTTOM of the sidebar (pinned above the collapse button), add a compact user profile section.
This requires the sidebar to receive the user's name and email as additional props. Check how the
sidebar is rendered in the layout file and pass the props through.

When NOT collapsed:
```
┌────────────────────────────┐
│  [avatar initials]  John D │
│  john@example.com          │
│  Court Reporter            │
│  [Settings] [Logout]       │
└────────────────────────────┘
```

When collapsed:
- Show only the avatar initials circle with a tooltip showing name + role

The avatar: a `div` with `w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm` containing
the first letter of the user's first name and last name.

Do NOT implement actual logout here — wrap the logout in a `Link` to `/logout` or use the existing
logout mechanism if one exists in the codebase. Search for an existing logout route before implementing.

**6C — Section Separators**

Add subtle section separators between `NavSection` groups:
- A 1px horizontal line: `<Separator className="my-2" />`
- The section title (if rendered): increase from current styling to `text-xs font-semibold uppercase
  tracking-wider text-slate-400 px-3 py-2`

**6D — Notification Badge Support**

Add optional badge support to NavItems. If a `navItem.badge` property exists (check the NavItem type
and only add if it already supports extra metadata OR if adding the optional `badge?: number`
property to the interface does not break existing usage):
- Render a small `{badge}` pill at the right side of the nav item
- Style: `ml-auto bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center`
- This is future-ready wiring — badges will be populated later

---

## TASK 7 — SHARED COMPONENT ENHANCEMENTS

### 7A — Enhanced StatCard (components/dashboard/stat-card.tsx)

Add support for new optional props (keep all existing props — DO NOT break existing usage):

```typescript
interface StatCardProps {
  // ... existing props unchanged ...
  trend?: {
    value: string;    // e.g. "+12%"
    direction: 'up' | 'down' | 'neutral';
    label: string;    // e.g. "vs last month"
  };
  href?: string;      // If provided, entire card becomes a Link
  badge?: {
    text: string;
    color: 'blue' | 'green' | 'amber' | 'red' | 'slate';
  };
  loading?: boolean;  // If true, show skeleton state
}
```

When `href` is provided, wrap the card in a `Link` and add `hover:shadow-md hover:border-blue-200 cursor-pointer` class.

When `loading` is true, show skeleton state using existing `Skeleton` component from `@/components/ui/skeleton`.

When `trend` is provided, show below the value:
- `TrendingUp` icon (green) if direction === 'up'
- `TrendingDown` icon (red) if direction === 'down'
- `Minus` icon (slate) if direction === 'neutral'
- Value and label text: `text-xs text-slate-500`

### 7B — Enhanced RecentJobs (components/dashboard/recent-jobs.tsx)

Add an optional `showViewAll?: boolean` and `viewAllHref?: string` prop:
When true, add a "View All →" link to the header row.

Add optional `filterByStatus?: string[]` prop:
When provided, only show jobs matching those statuses.

These are additive — existing usage requires no changes.

---

## TASK 8 — FINAL VERIFICATION

After all tasks are complete, run the following commands IN THIS EXACT ORDER and record outputs:

```bash
# 1. TypeScript check — must not exceed baseline error count from pre-flight
npx tsc --noEmit 2>&1 | tail -10

# 2. Full build — must succeed with 0 errors
npm run build 2>&1 | tail -30

# 3. Linting — address any errors, warnings OK to leave
npm run lint 2>&1 | head -30

# 4. Verify no governance files were modified
git diff --name-only HEAD | grep -E "MASTER_CONTROL|AI_AUTONOMOUS|BETA_FREEZE|middleware" && echo "⛔ VIOLATION" || echo "✅ Clean"

# 5. List changed files for review
git diff --name-only HEAD
```

If the build fails at step 2, STOP immediately. Do not attempt to fix by adding packages or
altering architecture. Fix TypeScript and import errors only.

**Commit each task separately with message format:**
```
feat(ui): [Task N] — [brief description]
Example: feat(ui): [Task 2] — Enhanced reporter dashboard with pipeline status bar and tool grid
```

---

## STOPPING CONDITIONS

Stop immediately and report the problem if ANY of the following occur:

- `npm run build` fails and cannot be fixed by correcting imports or TypeScript types alone
- TypeScript error count increases by more than 5 from baseline
- Any auth-related file needs modification to complete a task
- Any middleware file needs modification to complete a task
- Any Supabase query needs to be added to an API route to complete a task
- Any new npm package is required to complete a task
- The layout of authenticated pages breaks (sidebar disappears, content overflows viewport)

---

## DELIVERABLES CHECKLIST

At completion, confirm each of the following:

```
[ ] app/page.tsx — Home page transformed with interactive role cards and tool panels
[ ] app/(dashboard)/reporter/page.tsx — Pipeline status bar, tool grid, enhanced quick actions
[ ] app/(dashboard)/scopist/page.tsx — Enhanced job queue cards, tool grid, tabbed tips
[ ] app/(attorney)/attorney-dashboard/page.tsx — Tool grid, enhanced transcript cards, annotation panel
[ ] app/(dashboard)/admin/page.tsx — Admin tool grid, reorganized 2-column layout
[ ] components/layouts/app-sidebar.tsx — Enhanced active state, user profile section, separators
[ ] components/dashboard/stat-card.tsx — New optional props (backward compatible)
[ ] components/dashboard/recent-jobs.tsx — New optional props (backward compatible)
[ ] All new components created in correct directories
[ ] No new npm packages added
[ ] TypeScript error count ≤ baseline
[ ] Build passes
[ ] All 8 tasks committed individually
```

---

## IMPLEMENTATION NOTES

**On the interactive role card panel (Task 1B):**
Since the home page is a server component, the interactive expansion logic must be extracted into
a client component. Create `components/home/role-discovery-section.tsx` as a `'use client'`
component containing the three role cards and the expandable panel. The server component
(`app/page.tsx`) simply renders `<RoleDiscoverySection />`. State is managed in the client
component via `useState<'reporter' | 'scopist' | 'attorney' | null>(null)`.

**On the CSS transition for the expanding panel:**
Use this pattern for the smooth expand/collapse:
```tsx
<div
  className={`overflow-hidden transition-all duration-500 ease-in-out ${
    selectedRole ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
  }`}
>
  {/* panel content */}
</div>
```

**On server/client component boundaries:**
Tasks 2 and 3 are server components. Extract all interactive or stateful UI into small client
components. Pass data down as props. Never attempt to use `useState` or `useEffect` in a server
component.

**On the attorney dashboard (Task 4):**
This is already a client component. You can use `useState` and `useEffect` directly. The existing
fetch pattern is: `fetch('/api/attorney/dashboard')` in a `useEffect`. Keep this. Do not change
what the API returns — render whatever comes back, with null-safe fallbacks everywhere.

**On the sidebar user profile (Task 6B):**
Before adding props to the sidebar, search the codebase for where `AppSidebar` is rendered
(likely in a layout file at `app/(dashboard)/layout.tsx` or similar). Check what props are
currently passed. Add the new `userName`, `userEmail`, and `userRole` props as optional
(with `?` operator) so existing usage remains valid.

---

*End of Mega-Prompt — Depo-Pro UI/UX Transformation v1.0*
*Prepared: March 9, 2026*

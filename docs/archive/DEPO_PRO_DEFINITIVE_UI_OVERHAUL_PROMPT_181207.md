# ═══════════════════════════════════════════════════════════════════════════════
# DEPO-PRO — DEFINITIVE UI/UX OVERHAUL & PRODUCT DESIGN MEGA-PROMPT
# Version 2.0 — Consolidated from all reference documents
# ═══════════════════════════════════════════════════════════════════════════════
#
# USAGE: Paste this entire file into Claude Code, Cursor, or Codex CLI.
# Run from the root of the depo-pro-main repository.
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## ROLE & MISSION

You are operating as a five-discipline product team simultaneously:

- **SaaS Product Architect** — defining information architecture and user flows
- **UX Design Lead** — creating intuitive, workflow-driven experiences
- **Legal Workflow Specialist** — understanding what court reporters, scopists, and attorneys actually need
- **Frontend System Designer** — producing clean, consistent visual design
- **Senior Next.js Engineer** — writing production-grade, TypeScript-strict code

Your mission is to transform the Depo-Pro platform from a developer-centric tool interface into a **world-class professional legal SaaS product** comparable in quality, clarity, and usability to Stripe, Linear, Notion, and Vercel.

The current system is **technically functional** but lacks:
- Strong product design and visual hierarchy
- User guidance and workflow orientation
- Tool discoverability
- Role-appropriate dashboards that answer "what do I do next?"
- A homepage that clearly explains the platform to first-time visitors

You will fix all of this.

---

## ⚠️ ABSOLUTE CONSTRAINTS — READ BEFORE WRITING ANY CODE

**You MUST NOT:**
- Modify `middleware.ts`, `lib/auth/session.ts`, or `lib/supabase/server.ts`
- Change any file in `supabase/migrations/` or `prisma/schema.prisma`
- Alter any existing API route in `app/api/`
- Add any new npm packages
- Change authentication logic or session handling
- Rename or delete existing working components
- Modify the Prisma schema

**You MUST:**
- Read `AI_AUTONOMOUS_RULES.md`, `MASTER_CONTROL.md`, and `BETA_FREEZE.md` before any work
- Record the TypeScript error baseline (`npx tsc --noEmit`) before starting
- Create one commit per task — never batch multiple tasks into one commit
- Verify `npm run build` passes after each task
- Mark every client component with `'use client'`
- Apply `dark:` Tailwind variants to every color class you write

**BETA_FREEZE classification:** All work in this prompt is classified as **UI enhancement and bug fix**, not new feature development. Stubs with missing auth guards are UI bugs. Poor dashboard usability impedes existing workflows.

---

## PRODUCT CONTEXT (Read and internalize before starting)

Depo-Pro is a **legal deposition workflow platform** serving:

| Role | Primary Need |
|------|-------------|
| Court Reporter | Upload audio → generate transcript → certify and export |
| Scopist | Review assigned transcripts → correct flagged words → finalize |
| Attorney | Access shared transcripts → annotate → track case depositions |
| Admin / Agency | Manage users, firms, jobs, billing, system health |

**The complete deposition workflow, in order:**
```
Schedule Deposition → Upload Audio → AI Transcription (Deepgram Nova-3)
→ Transcript Review → Flagged Word Correction → Certification → Export (DOCX/PDF/TXT)
```

**Existing platform capabilities (fully built — just undiscoverable):**
- Waveform audio player with word-level time sync (WaveSurfer.js)
- Low-confidence word flagging and correction with Deepgram alternatives
- Confidence heatmap, risk scoring, per-speaker analytics
- Deposition notes, proper nouns manager, custom dictionary
- Format settings: speaker mapping, Q/A role assignment, legal formatting rules
- Medical chronology tool with AI PDF extraction (Anthropic API)
- WKT (Word Knowledge Training): flashcards, practice mode, mock certification exam
- Calendar: month/week views, availability editor, deposition create/edit
- Attorney transcript viewer with annotations and exhibit linking
- Export: DOCX (legal format), PDF, plain text
- Admin: action console, feature flags, health dashboard, RX queue, audit log

**Key page routes to know:**
- `/reporter` — Court reporter dashboard
- `/scopist` — Scopist dashboard  
- `/attorney-dashboard` — Attorney dashboard
- `/admin` — Admin dashboard
- `/jobs/[id]/review` — Core review tool (waveform + synced transcript)
- `/transcription-tool` — High-accuracy upload tool
- `/wkt` — Word knowledge training home
- `/calendar/month` — Calendar view
- `/exports` — Export center

---

## PRE-WORK: COMPLETE UI/UX AUDIT

Before implementing anything, scan the full UI codebase and produce a brief audit covering:

1. Navigation clarity — can a new user find what they need?
2. Dashboard usefulness — does each dashboard answer "what do I do right now?"
3. Tool discoverability — can users find tools that already exist?
4. Workflow guidance — does the UI explain the deposition pipeline?
5. Role separation — do different users get appropriately different experiences?
6. Empty states — are missing-data states helpful or just blank?
7. Visual hierarchy — is there clear priority among page elements?

Output the audit findings as a comment block at the top of `ai_logs/change_log.md` before proceeding to implementation.

---

## TASK 1 — GLOBAL NAVIGATION ARCHITECTURE

**Goal:** Establish a three-layer navigation model used by every top SaaS platform.

### 1A — Top Navigation Bar

The top bar (`components/layouts/navbar.tsx` or equivalent) must contain, left to right:

**Left:** Depo-Pro logo (existing `DP` mark + wordmark)

**Center:** Global search input — styled as a prominent search field, not an icon:
```
[ 🔍  Search cases, transcripts, jobs...              ⌘K ]
```
- The search field is cosmetic/UI-only for now — on click or `⌘K`, open the existing `CommandPalette` component (`components/command/command-palette.tsx`)
- Do NOT implement new search backend logic

**Right (left to right):**
1. Notifications bell icon — badge with unread count — links to `/notifications` (show "0" if the page doesn't exist yet)
2. Help icon (`?` circle) — links to `/help`
3. User avatar — clicking opens a dropdown with: Profile, Settings, Sign Out

The top bar must be present on ALL authenticated pages (not just dashboard). It must be sticky (`sticky top-0 z-50`).

### 1B — Sidebar Navigation Redesign

Restructure `components/layouts/app-sidebar.tsx` to use the following primary navigation sections, in this order. The sidebar must be **role-aware** — show only sections applicable to the current user's role.

**Section: MAIN**
```
Dashboard          → /dashboard (role redirect)
Jobs               → /jobs          [badge: active job count — use animated green dot]
Transcripts        → /transcripts
Calendar           → /calendar/month
```

**Section: TOOLS** (shown to REPORTER, SCOPIST, ADMIN)
```
Transcription Tool → /transcription-tool
Review Center      → /jobs?filter=in_review
Export Center      → /exports
```

**Section: LEARNING** (shown to REPORTER, SCOPIST)
```
Word Training (WKT) → /wkt
```

**Section: ATTORNEY** (shown to ATTORNEY only)
```
My Transcripts     → /attorney/transcripts
My Cases           → /attorney/cases
```

**Section: ADMINISTRATION** (shown to ADMIN only)
```
User Management    → /settings/users
Reports            → /reports
Audit Log          → /reports/audit-log
System             → /admin
```

**Section: ACCOUNT** (all roles, bottom of sidebar)
```
Settings           → /settings/profile
Help               → /help
```

**Sidebar header (above nav sections):**
Add a compact user identity block at the very top of the sidebar:
```
┌─────────────────────┐
│  [JH]  James Horton │  ← initials in role-colored circle + name
│  COURT REPORTER      │  ← role badge in small pill
└─────────────────────┘
```
The initials circle color maps to role: REPORTER=indigo, SCOPIST=violet, ATTORNEY=blue, ADMIN=slate.

Use the `userRole` and `userName` props already passed to the sidebar component.

### 1C — Page Header Component

Create `components/layouts/page-header.tsx` (or enhance existing if it exists). Every authenticated page must use this component at the top of its content area:

```tsx
<PageHeader
  title="Reporter Dashboard"
  subtitle="3 active jobs · 1 awaiting review"
  actions={<Button>New Transcription</Button>}
  breadcrumbs={[{ label: 'Dashboard', href: '/reporter' }]}
/>
```

Props: `title`, `subtitle?`, `actions?`, `breadcrumbs?`

Styling: clean bottom border, consistent padding, responsive.

### 1D — Deposition Workflow Progress Bar (Reusable Component)

Create `components/shared/workflow-timeline.tsx` — a reusable horizontal progress indicator showing where a job sits in the deposition pipeline.

```
[ Schedule ] ──→ [ Upload ] ──→ [ Transcribe ] ──→ [ Review ] ──→ [ Export ]
     ✓                ✓              ✓              ← CURRENT          ○
```

Props:
```tsx
interface WorkflowTimelineProps {
  currentStep: 'scheduled' | 'uploaded' | 'transcribing' | 'review' | 'exported';
  jobId?: string;
  compact?: boolean; // compact=true for use in job list rows
}
```

Completed steps: filled circle + checkmark, connected by solid line, accent color  
Current step: filled circle with pulse animation, bold label  
Future steps: open circle, gray line, muted label

This component will be used in: job detail pages, dashboard active job cards, and the home page.

**Commit 1 message:** `feat(nav): three-layer navigation — top bar, sidebar restructure, page header, workflow timeline`

---

## TASK 2 — HOMEPAGE REDESIGN

**File:** `app/page.tsx`  
**New components:** `components/home/role-selector.tsx`, `components/home/tool-preview-grid.tsx`, `components/home/workflow-diagram.tsx`

The homepage must convert a skeptical legal professional who has never heard of Depo-Pro into someone who immediately understands the product and wants to sign up. The current page is generic. The new page must be specific, visual, and role-aware.

### 2A — Hero Section (enhance existing)

Keep the existing dark gradient hero but enhance the copy to be more specific:

**Headline:** `"Deposition Transcripts. Done Right."`  
**Subheadline:** `"AI-powered transcription for court reporters and scopists. Review, correct, and certify legal-quality transcripts with audio synchronized word-by-word."`

Add a small **"Trusted by legal professionals"** social proof strip below the CTA buttons — just 3-4 credential-style badges (no logos needed since this is a new product):
- `⚖️ Legal-grade accuracy standards`
- `🔒 Firm-scoped data isolation`
- `🎙️ Deepgram Nova-3 transcription`
- `📜 Verbatim-first philosophy`

### 2B — Deposition Workflow Diagram Section

**Heading:** `"How Depo-Pro Works"`  
**Subheading:** `"From deposition room to certified transcript — a complete digital workflow."`

Use the `WorkflowTimeline` component created in Task 1 (non-compact mode, no job ID) as a large visual centerpiece. Below each step, add a 2-line description:

- **Schedule** → "Create the deposition event, assign reporter, set location or Zoom link"
- **Upload** → "Upload MP3, MP4, WAV, or FLAC — system normalizes to 16kHz automatically"
- **Transcribe** → "Deepgram Nova-3 processes audio; word-level timestamps and confidence scores generated"
- **Review** → "Reporter or scopist corrects flagged low-confidence words with synchronized audio playback"
- **Export** → "Certified DOCX, PDF, or plain text — formatted to legal transcript standards"

Section background: `bg-slate-50` with subtle dot grid pattern.

### 2C — Role Selector Section ("How do you use Depo-Pro?")

**This is the centerpiece section of the entire homepage.**

Replace the existing flat `AudienceSection` with the new `<RoleSelector />` component.

**Section heading:** `"Built for Every Role in the Deposition Workflow"`  
**Subheading:** `"Select your role to see exactly how Depo-Pro serves you."`

#### Layout

Four large role cards in a 2×2 grid on desktop, 1-column stack on mobile.

#### Card — At Rest State

Each card at rest shows:
- A colored accent bar across the top (`h-2 rounded-t-2xl`, role gradient)
- Large role icon in a colored soft circle (`h-12 w-12`, role accent)
- Role name in `text-xl font-bold`
- A 2-sentence value proposition
- `"See your toolkit →"` text link in role accent color
- Card border: `border-2 border-slate-200 hover:border-{accent}-400`
- Hover: `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`

#### Card — Expanded State (click/tap)

On click (mobile and desktop), the card expands to reveal:

**"Your Toolkit" section** — a 2-column list of tools with icons:
Each tool: `icon + name (font-medium) + one-line description (text-xs text-slate-500)`

**"Your Typical Day" mini-workflow** — 3-step horizontal flow specific to the role

**CTA button** — full-width, role accent color — links to the role's dashboard

#### Role Card Data

**Card 1 — Court Reporter** | Accent: `indigo` | Icon: `Mic`
Value prop: "Upload deposition recordings and get AI-powered transcripts in minutes. Review, correct, and certify with precision tools designed for your professional standards."
Typical Day: `Record Deposition → Upload & Transcribe → Review & Certify`
Tools:
- 🎙️ High-Accuracy Transcription — Deepgram Nova-3 pipeline
- 🎧 Synchronized Review — Waveform player with word-level sync
- 🚩 Low-Confidence Flagging — AI highlights uncertain words
- 📝 Deposition Notes — Timestamped categorized session notes
- 🔤 Proper Nouns Manager — Live capture: names, places, terms
- 📖 Custom Dictionary — Job-level term library with phonetics
- ⚙️ Format Settings — Speaker mapping, Q/A roles, legal rules
- 📅 Scheduling Calendar — Depositions, availability, assignments
- 📊 Confidence Analytics — Risk score, speaker accuracy breakdown
- 📤 Export Center — DOCX, PDF, plain text in legal format
CTA: "Open Reporter Dashboard" → `/reporter`

**Card 2 — Scopist** | Accent: `violet` | Icon: `PenTool`
Value prop: "Your professional editing environment for producing final-quality legal transcripts. Review assigned jobs, correct the AI's work, and expand your knowledge with built-in certification training."
Typical Day: `Open Assigned Job → Review & Correct → Finalize & Submit`
Tools:
- ✏️ Transcript Editor — Full correction interface with change tracking
- 🎧 Synced Review Tool — Same waveform + transcript viewer as reporter
- 📋 Reporter Notes Access — Read session notes with audio seek
- 🔤 Proper Nouns Reference — View reporter's captured terms
- 🎓 Word Knowledge Training — Flashcards across 6 certification categories
- 📊 Progress Dashboard — Track WKT scores and exam history
- 📝 Mock Certification Exam — Timed exam matching CSR distribution
- 📤 Finalization & Export — Submit certified transcripts
CTA: "Open Scopist Dashboard" → `/scopist`

**Card 3 — Attorney** | Accent: `blue` | Icon: `Scale`
Value prop: "Access, analyze, and annotate the depositions that matter to your case. Transcripts shared by the reporting firm appear instantly — searchable, annotatable, and exportable."
Typical Day: `Access Shared Transcript → Annotate Key Passages → Export for Case File`
Tools:
- 📄 Transcript Viewer — Clean legal-format reader with search
- 🖊️ Annotations — Highlight, note, and bookmark any passage
- 🏷️ Issue Code Palette — Color-coded legal tags (Objection, Exhibit, etc.)
- 📎 Exhibit Linker — Connect exhibits to specific transcript moments
- 📁 Case Files — Depositions organized by case
- 🔒 Access Controls — VIEW, COMMENT, or EDIT per transcript
CTA: "Open Attorney Dashboard" → `/attorney-dashboard`

**Card 4 — Agency / Admin** | Accent: `slate` | Icon: `Building2`
Value prop: "Complete operational oversight for multi-reporter, multi-firm deposition workflows. Manage users, jobs, assignments, and system health from one command center."
Typical Day: `Monitor Job Pipeline → Manage Assignments → Review System Health`
Tools:
- 🏢 User & Firm Management — Roles, access, firm settings
- 📋 Jobs Overview — Real-time status across all transcription jobs
- 👥 Assignment Engine — Assign reporters and scopists to depositions
- 🏥 Medical Chronology — AI extraction for personal injury depositions
- 📊 Usage & Accuracy Reports — Platform-wide analytics
- 🔍 Audit Log — Tamper-evident action history
- ⚡ System Health Monitor — Live service status
- 🔧 Feature Flag Manager — Control features per firm
CTA: "Open Admin Dashboard" → `/admin`

#### Implementation Notes for `role-selector.tsx`

- `'use client'` component
- State: `const [activeCard, setActiveCard] = useState<number | null>(null)`
- Desktop: click to toggle expand, click again or click another card to collapse
- Mobile: same toggle behavior
- Animation: `max-height` transition from `200px` to `700px` using CSS class swap — `className={activeCard === i ? 'max-h-[700px]' : 'max-h-[220px]'} overflow-hidden transition-all duration-500 ease-in-out`
- Expanded cards show a smooth chevron rotation: `transform rotate-180 transition-transform`

### 2D — Tool Preview Grid Section

**Heading:** `"A Complete Legal Toolchain"`  
**Subheading:** `"Every tool your deposition workflow needs — integrated in one platform."`

Create a 3-column grid of compact `ToolPreviewCard` components — one per major tool category. Each card:
- Icon in accent color circle
- Tool name (`font-semibold`)
- 1-sentence description
- "Available to:" role pill tags
- No launch buttons (this is a preview, not a launcher)

Tools to show (12 cards, 4 rows of 3):
1. AI Transcription | indigo | Reporter, Scopist, Admin
2. Synchronized Review | violet | Reporter, Scopist, Admin
3. Low-Confidence Correction | amber | Reporter, Scopist, Admin
4. Deposition Notes | blue | Reporter
5. Proper Nouns Manager | teal | Reporter
6. Custom Dictionary | green | Reporter, Scopist, Admin
7. Format & Export | slate | Reporter, Scopist, Admin
8. Medical Chronology | red | Reporter, Scopist, Admin
9. Word Knowledge Training | purple | Reporter, Scopist
10. Scheduling Calendar | indigo | Reporter, Admin
11. Attorney Transcript Viewer | blue | Attorney
12. Annotation & Issue Codes | violet | Attorney

### 2E — "AI Assists, Humans Decide" Philosophy Section

Keep the existing `AIPhilosophySection` — it is well-written. Only enhance its visual presentation:
- Add a side-by-side split layout (text left, visual right on desktop)
- The right visual: a mock transcript excerpt with a word highlighted in amber and a floating correction card showing "72% confidence — did you mean: defendant?" — built with pure HTML/CSS/Tailwind, no images needed

### 2F — Final CTA Section

Keep the existing `CTASection`. Enhance it to include two tracks:
- **Primary CTA:** "Request Access" → `/register`
- **Secondary CTA:** "Schedule a Demo" → `/contact` (existing page)

**Commit 2 message:** `feat(home): complete homepage redesign — role selector, workflow diagram, tool preview grid`

---

## TASK 3 — COURT REPORTER DASHBOARD OVERHAUL

**File:** `app/(dashboard)/reporter/page.tsx`  
**New components:**
- `components/dashboard/reporter/reporter-stats-bar.tsx`
- `components/dashboard/reporter/active-jobs-panel.tsx`
- `components/dashboard/reporter/reporter-tool-launcher.tsx`
- `components/dashboard/reporter/upcoming-depositions-strip.tsx`

### 3A — Dashboard Philosophy

The reporter dashboard must answer one question the moment it loads: **"What do I need to work on right now?"**

Priority order of information on the page:
1. Jobs actively in review (need my attention today)
2. Jobs ready to be assigned to scopist
3. Upcoming depositions to prepare for
4. Quick-launch buttons for tools
5. Statistics

### 3B — Greeting Header

```
Good morning, James                           [ + New Transcription ]
Reporter Dashboard
3 active jobs · 1 flagged for review
```

Implement `getGreeting(hour: number): string` — returns "Good morning" (5–11), "Good afternoon" (12–17), "Good evening" (18+) — as a pure function in the page file.

User name comes from `getCurrentUser()` — use `user.firstName` or first word of `user.name` or `user.email.split('@')[0]` as fallback.

### 3C — Stats Bar (`reporter-stats-bar.tsx`)

4 stat cards in a responsive grid (`grid-cols-2 lg:grid-cols-4`), each with:
- Left border accent (`border-l-4 border-l-{color}-500`)
- Large metric value (`text-3xl font-bold`)
- Label and subtitle text
- Role icon

**Stats (all sourced from existing `jobCounts` object — no new fetching):**

| # | Label | Color | Data Source |
|---|-------|-------|-------------|
| 1 | Active Jobs | `indigo` | `jobCounts.inReview + jobCounts.assigned` |
| 2 | Ready to Export | `green` | `jobCounts.completed` |
| 3 | Pending Scopist | `amber` | `jobCounts.processing` (AI_COMPLETE) |
| 4 | This Month | `violet` | filter `recentJobs` by current month |

### 3D — Active Jobs Panel (`active-jobs-panel.tsx`)

**"Needs Attention" section** — top of panel, bordered in `amber-200`:

Filter `recentJobs` for jobs where `flaggedCount > 0 AND reviewedCount < flaggedCount`. Show max 3. Each card:

```
┌─────────────────────────────────────────────────────────┐
│ [PRIORITY]  Smith v. Johnson — Dep. of Jane Doe         │
│             March 8, 2026 · 47 words remaining          │
│ ████████████████░░░░░░░  73% reviewed                   │
│                                                          │
│  [▶ Continue Review]          [Export]                   │
└─────────────────────────────────────────────────────────┘
```

- `PRIORITY` badge shows only if `reviewedCount / flaggedCount < 0.5`
- Progress bar: `h-2 rounded-full bg-slate-200` with `bg-indigo-500` fill
- `Continue Review` → `/jobs/{id}/review` (primary button, indigo)
- `Export` → `/exports` (ghost button)

**"All Recent Jobs" table** — below the priority section:

| Case | Date | Status | Words | Action |
|------|------|--------|-------|--------|
| Smith v. Johnson | Mar 8 | IN_REVIEW | 47/230 flagged | Review |
| Peterson v. State | Mar 5 | COMPLETED | — | Export |

Use the existing `StatusBadge` component from `components/transcripts/status-badge.tsx`.
Show max 8 rows. "View all jobs →" link to `/jobs`.

**Empty state** (no jobs):
```
[Upload icon]
No jobs yet
Upload a deposition recording to get started.
[ Upload Audio ]  [ Schedule Deposition ]
```

### 3E — Tool Launcher Grid (`reporter-tool-launcher.tsx`)

8 clickable card-links in a `grid-cols-2 gap-3` layout. Each is a `<Link>` styled as a bordered hover card.

Card anatomy:
```
┌────────────────────────────────┐
│  [🎙️]  High-Accuracy           │
│        Transcription      →    │
│        Nova-3 pipeline         │
└────────────────────────────────┘
```

| # | Icon | Name | Subtitle | Route | Accent |
|---|------|------|----------|-------|--------|
| 1 | `Mic` | High-Accuracy Transcription | Deepgram Nova-3 pipeline | `/transcription-tool` | `indigo` |
| 2 | `Upload` | Upload Recording | Create a new job | `/transcription/upload` | `blue` |
| 3 | `Headphones` | Review Transcripts | Flagged word review | `/jobs` | `violet` |
| 4 | `Calendar` | Scheduling | Manage depositions | `/calendar/month` | `teal` |
| 5 | `BookOpen` | Dictionary | Custom term library | `/jobs` | `amber` |
| 6 | `FileText` | Transcripts | All transcripts | `/transcripts` | `green` |
| 7 | `Download` | Export Center | Download certified files | `/exports` | `emerald` |
| 8 | `GraduationCap` | Word Training | WKT flashcards & exams | `/wkt` | `purple` |

Below the grid, add a dark keyboard shortcuts card (`bg-slate-800 rounded-xl p-4`):
```
Keyboard Shortcuts
[Space]  Play/Pause audio
[Tab]    Next flagged word
[↵]      Mark word reviewed
[← →]   Seek ±3 seconds
```
Keys styled as `<kbd>` elements with `font-mono text-xs bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5`.

### 3F — Upcoming Depositions Strip (`upcoming-depositions-strip.tsx`)

Full-width section at the bottom of the dashboard.

Heading: `"Upcoming Depositions"` with `"View Calendar →"` link to `/calendar/month`.

Horizontal scrollable row of deposition pills — one per upcoming job that has `depositionDate > now`, sorted ascending, max 5 shown:

```
[ Mon Mar 11 · Smith v Johnson · SCHEDULED · Open → ]
[ Wed Mar 13 · Peterson Case   · SCHEDULED · Open → ]
```

Each pill: rounded-xl, border, date badge + case name + status badge + link. If no upcoming depositions: centered empty state with calendar icon and "Schedule a deposition" link.

**Data:** Filter `recentJobs` for `depositionDate > new Date()`. No new API call.

**Commit 3 message:** `feat(dashboard): court reporter dashboard — stats bar, active jobs panel, tool launcher, deposition strip`

---

## TASK 4 — SCOPIST DASHBOARD OVERHAUL

**File:** `app/(dashboard)/scopist/page.tsx`  
**New components:**
- `components/dashboard/scopist/scopist-stats-bar.tsx`
- `components/dashboard/scopist/assigned-jobs-panel.tsx`
- `components/dashboard/scopist/wkt-progress-widget.tsx`
- `components/dashboard/scopist/scopist-tool-launcher.tsx`

### 4A — Dashboard Philosophy

The scopist dashboard answers: **"Which transcript do I pick up next, and how is my certification progress?"**

### 4B — Greeting Header

Same pattern as reporter (Task 3B) using `violet` accent.  
Subtitle: `"{n} transcripts assigned · {n} ready for review"`  
CTA button: `"▶ Open Review Queue"` → `/jobs?filter=assigned`

### 4C — Stats Bar (`scopist-stats-bar.tsx`)

| # | Label | Color | Data |
|---|-------|-------|------|
| 1 | Assigned to Me | `violet` | Jobs with `assignedScopistId === currentUser.id` |
| 2 | In Progress | `indigo` | Assigned jobs with partial review progress |
| 3 | Submitted This Month | `green` | SUBMITTED status jobs, current month |
| 4 | WKT Best Score | `purple` | Latest mock exam score from WKT API, or `"—"` |

For the WKT score: attempt to fetch from `/api/wkt/progress` in a `useEffect`. Show `"—"` while loading.

### 4D — Assigned Jobs Panel (`assigned-jobs-panel.tsx`)

**Priority jobs** (top, `border-l-4 border-violet-500`):
- Same card anatomy as reporter (Task 3D) but violet accent
- Show `OVERDUE` badge (red) if job was assigned more than 72 hours ago and is not SUBMITTED
- CTA: `"▶ Continue Editing"` → `/jobs/{id}/review`

**Completed/submitted jobs** (collapsible section, collapsed by default):
- Header: `"Recently Submitted (last 7 days)"` with toggle chevron
- `useState` for open/closed
- Rows: case name + submitted date + `"View"` link

**Empty state:** ClipboardList icon + "No assignments yet" + "When a court reporter assigns a transcript to you, it appears here." + `"Practice with WKT →"` button

### 4E — WKT Progress Widget (`wkt-progress-widget.tsx`)

This is the scopist's exclusive feature — court reporters and attorneys do not see this widget.

```
┌───────────────────────────────────┐
│ Word Knowledge Training  [Go →]   │
│ ─────────────────────────────     │
│ Overall Progress                  │
│ ████████████░░░░░░░  61%          │
│                                   │
│ 🏥 Medical Terminology  ██░░ 45%  │
│ ⚖️  Legal Terminology   ████ 78%  │
│ 📖 Grammar & Usage      ███░ 60%  │
│ ✏️  Spelling            █░░░ 22%  │
│ 📋 Texas Rules          ████ 80%  │
│ 💼 Reporter Duties      ███░ 65%  │
│ ─────────────────────────────     │
│ Last Exam: 84% — PASS             │
│                                   │
│ [ Practice ]   [ Take Mock Exam ] │
└───────────────────────────────────┘
```

Fetch from `/api/wkt/progress` (existing endpoint) with `useEffect`. Show skeleton loading state during fetch. Handle error with "WKT data unavailable" message. Show "Start Training" CTA if no data yet.

### 4F — Scopist Tool Launcher (`scopist-tool-launcher.tsx`)

6-button grid (`grid-cols-2`):

| # | Icon | Name | Route | Accent |
|---|------|------|-------|--------|
| 1 | `Headphones` | Review Transcripts | `/jobs` | `violet` |
| 2 | `BookOpen` | WKT Flashcards | `/wkt/flashcards` | `purple` |
| 3 | `GraduationCap` | Mock Exam | `/wkt/mock-exam` | `indigo` |
| 4 | `TrendingUp` | My Progress | `/wkt/progress` | `teal` |
| 5 | `FileText` | All Transcripts | `/transcripts` | `blue` |
| 6 | `Download` | Export Center | `/exports` | `green` |

**Commit 4 message:** `feat(dashboard): scopist dashboard — stats, assigned jobs, WKT progress widget, tool launcher`

---

## TASK 5 — ATTORNEY DASHBOARD OVERHAUL

**File:** `app/(attorney)/attorney-dashboard/page.tsx`  
**New components:**
- `components/dashboard/attorney/attorney-stats-bar.tsx`
- `components/dashboard/attorney/shared-transcripts-panel.tsx`
- `components/dashboard/attorney/attorney-tool-launcher.tsx`
- `components/dashboard/attorney/annotation-summary-widget.tsx`

### 5A — Dashboard Philosophy

Attorneys are external users with a different mental model. They do not manage jobs — they **access and analyze transcripts that have been shared with them**. The dashboard must feel like a clean legal research workspace: organized by case, not by system status.

### 5B — Greeting Header

Blue accent. Subtitle: `"{n} transcripts shared with me · {n} cases active"`.  
CTA: `"Open Transcript Library →"` → `/attorney/transcripts`

### 5C — Stats Bar (`attorney-stats-bar.tsx`)

| # | Label | Color | Data |
|---|-------|-------|------|
| 1 | Shared Transcripts | `blue` | `stats.accessibleTranscripts` |
| 2 | Active Cases | `indigo` | `stats.activeCases` |
| 3 | Upcoming Depositions | `teal` | `stats.upcomingDepositions` |
| 4 | My Annotations | `violet` | `stats.annotations.total` |

All values sourced from the existing `stats` object in the attorney dashboard state — no new fetching.

### 5D — Shared Transcripts Panel (`shared-transcripts-panel.tsx`)

Replace the existing flat table with a **case-grouped view**:

```
┌─────────────────────────────────────────────────────────┐
│ 📁  Smith v. Johnson — Case #2024-CV-1847               │
│ ─────────────────────────────────────────────────────── │
│  Jane Doe          Mar 8, 2026    [COMMENT]  COMPLETED  [Open] │
│  John Smith        Feb 22, 2026   [VIEW]     COMPLETED  [Open] │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📁  Peterson v. State — Case #2024-CR-0329              │
│ ─────────────────────────────────────────────────────── │
│  Mary Peterson     Mar 1, 2026    [EDIT]     IN_REVIEW  [Open] │
└─────────────────────────────────────────────────────────┘
```

Group `recentTranscripts` by `transcript.job.caseNumber + transcript.job.caseName`. For each group, render a case header then rows for each transcript.

**Access level badges:**
- `VIEW` → `bg-slate-100 text-slate-600`
- `COMMENT` → `bg-blue-100 text-blue-700`
- `EDIT` → `bg-green-100 text-green-700`

All badges use `rounded-full px-3 py-1 text-xs font-medium`.

**"Open Transcript"** button → construct href from `transcript.job.id`:
- If transcript status is COMPLETED: `/jobs/{jobId}/review`
- Otherwise: `/transcripts/{jobId}`

**Empty state:** Scale icon + "No transcripts have been shared with you yet." + "Contact the reporting firm managing your case to request access."

### 5E — Attorney Tool Launcher (`attorney-tool-launcher.tsx`)

Vertical list (`flex flex-col gap-2`) in sidebar — not a grid:

| # | Icon | Name | Description | Route |
|---|------|------|-------------|-------|
| 1 | `FileText` | Transcript Library | All transcripts shared with me | `/attorney/transcripts` |
| 2 | `Briefcase` | Case Files | Depositions organized by case | `/attorney/cases` |
| 3 | `Tag` | My Annotations | Highlights, notes, bookmarks | `/attorney/transcripts` |
| 4 | `Calendar` | Deposition Calendar | Upcoming depositions | `/calendar/month` |
| 5 | `User` | My Profile | Attorney settings | `/settings/profile` |

### 5F — Annotation Summary Widget (`annotation-summary-widget.tsx`)

```
┌──────────────────────────────────┐
│ My Annotations                   │
│ ──────────────────────────────── │
│ 🟡  14  Highlights               │
│ 📝   8  Notes                    │
│ 🔖   3  Bookmarks                │
│ ────────────────────────────     │
│     25  Total annotations        │
│                                  │
│ [ View All Annotations → ]       │
└──────────────────────────────────┘
```

Data from `stats.annotations.highlights`, `stats.annotations.notes`, `stats.annotations.bookmarks`, `stats.annotations.total` — all available in existing dashboard state.

**Commit 5 message:** `feat(dashboard): attorney dashboard — case-grouped transcripts, stats bar, annotation widget, tool launcher`

---

## TASK 6 — ADMIN DASHBOARD OVERHAUL

**File:** `app/(dashboard)/admin/page.tsx`  
**New components:**
- `components/dashboard/admin/platform-kpi-header.tsx`
- `components/dashboard/admin/admin-tool-grid.tsx`

### 6A — Dashboard Philosophy

The admin dashboard is a **command center**. It must communicate platform-wide health, user activity, and job pipeline state in a single viewport — then give fast access to every management tool.

### 6B — Platform KPI Header (`platform-kpi-header.tsx`)

6 KPI tiles in `grid-cols-3 lg:grid-cols-6`. Each tile:
- Icon in colored circle (`h-8 w-8`)
- Large metric (`text-2xl font-bold`)
- Label (`text-sm text-slate-500`)
- Bottom accent underline (`border-b-2 border-b-{color}-400`)

| # | Label | Icon | Color | Data Source |
|---|-------|------|-------|-------------|
| 1 | Total Users | `Users` | `blue` | `totalUsers` (existing) |
| 2 | Total Jobs | `Briefcase` | `green` | `totalJobs` (existing) |
| 3 | Active Firms | `Building2` | `purple` | `totalFirms` (existing) |
| 4 | Active Jobs | `Activity` | `amber` | `activeJobs` (existing) |
| 5 | Jobs This Month | `Calendar` | `teal` | filter `recentJobs` by month |
| 6 | System Status | `Shield` | `green` | Static: "Operational" |

### 6C — Admin Tool Grid (`admin-tool-grid.tsx`)

9 tool-area cards in `grid-cols-1 md:grid-cols-3`. Each card is tall (~220px min) and contains:
- Large icon in accent circle (`h-10 w-10`)
- Tool area title (`text-lg font-bold`)
- 2-sentence description
- Capability list (3-4 bullet points, `text-sm text-slate-500`)
- Full-width "Open →" button at bottom, role accent

| # | Icon | Title | Description | Route | Accent |
|---|------|-------|-------------|-------|--------|
| 1 | `Users` | User Management | Add and manage all platform users, assign roles, and control firm membership. View activity history and deactivate accounts. | invite, assign roles, view activity, deactivate | `/settings/users` | `blue` |
| 2 | `Briefcase` | Jobs & Transcriptions | Full visibility into every transcription job across all firms. Monitor the pipeline from upload through export. | status pipeline, assignments, quality, history | `/jobs` | `indigo` |
| 3 | `Building2` | Firm Management | Configure and oversee all court reporting firms. Manage settings, billing rates, and feature access per firm. | firm settings, billing rates, feature access, quotas | `/settings` | `violet` |
| 4 | `BarChart3` | Reports & Analytics | Platform-wide usage, accuracy, and performance reporting. Understand how the platform is being used. | usage metrics, accuracy reports, export history, system reports | `/reports` | `teal` |
| 5 | `Shield` | Audit & Compliance | Complete tamper-evident audit trail for every action taken on the platform. Required for legal defensibility. | action history, user events, security log, export audit | `/reports/audit-log` | `green` |
| 6 | `Zap` | Feature Flags | Enable or disable platform features per firm or globally. Manage your feature rollout strategy. | enable/disable, firm overrides, release management | `/admin/features` | `amber` |
| 7 | `HeartPulse` | System Health | Real-time monitoring of all platform services. Track Deepgram connectivity, API latency, and error rates. | service status, API latency, error rates, Deepgram | `/admin` | `red` |
| 8 | `RefreshCw` | RX Queue | Manage the retranscription queue for failed or reprocessed audio jobs. Manually trigger and monitor queue items. | queue status, manual trigger, failed recovery, logs | `/admin/rx-queue` | `orange` |
| 9 | `Settings` | Platform Configuration | Core configuration for AI models, audio processing, integrations, and billing rates. | AI model config, audio settings, integrations, billing | `/settings` | `slate` |

### 6D — Layout Reassembly

After the KPI header and tool grid, render the existing dashboard sections in this order:
1. `<RecentJobs />` (existing component — keep as-is)
2. `<HealthDashboard />` (existing — keep as-is)
3. `<ActionConsole />` (existing — keep as-is)
4. `<RxQueueManager />` (existing — keep as-is)

**Commit 6 message:** `feat(dashboard): admin dashboard — KPI header, 9-tool command grid`

---

## TASK 7 — TOOL DIRECTORY PAGE

**New route:** `app/(dashboard)/tools/page.tsx`  
**Layout file:** Ensure it uses the existing authenticated layout with sidebar

**This is a new page.** It is the centralized catalog of every tool in the platform, accessible from the sidebar under the "TOOLS" section.

### 7A — Page Structure

```
[ Tools Directory ]
[ "Every tool available in your Depo-Pro workspace" ]

[ Filter by role: All | Reporter | Scopist | Attorney | Admin ]

[ Grid of ToolCard components ]
```

### 7B — Filter Bar

A horizontal row of pill-filter buttons: `All`, `Reporter`, `Scopist`, `Attorney`, `Admin`.
Active filter: filled background in `indigo-600`, white text.
Inactive: `bg-white border border-slate-200 text-slate-600`.
Clicking a filter hides/shows cards via `useState` + `Array.filter`.

### 7C — ToolCard Component

Create `components/shared/tool-card.tsx`:

```tsx
interface ToolCardProps {
  icon: LucideIcon;
  name: string;
  description: string;        // 2-3 sentences
  howItWorks: string;         // 1-2 sentences
  roles: ('REPORTER' | 'SCOPIST' | 'ATTORNEY' | 'ADMIN')[];
  route: string;
  accent: string;             // tailwind color name e.g. 'indigo'
  isAvailableToUser: boolean; // pass current user role to determine
}
```

Card layout:
- Accent color bar at top
- Icon + name header
- Description paragraph
- "How it works:" italic 1-liner
- Role access pills (small, colored by role)
- If `isAvailableToUser`: `"Launch Tool →"` button in accent color
- If not available: `"Not available for your role"` in `text-slate-400`

### 7D — Tool Directory Data

Define the full tool catalog inline as a TypeScript array in the page file:

| Name | Icon | Description | Roles | Route |
|------|------|-------------|-------|-------|
| High-Accuracy Transcription | `Mic` | Convert deposition audio to legal-quality transcripts using Deepgram Nova-3. The system normalizes audio, runs speech-to-text, and preserves word-level confidence scores and timestamps. | REPORTER, ADMIN | `/transcription-tool` |
| Synchronized Review | `Headphones` | Review the full transcript while listening to the original audio. Each word highlights in real-time as the audio plays. Click any word to jump the audio to that exact moment. | REPORTER, SCOPIST, ADMIN | `/jobs` |
| Low-Confidence Word Correction | `AlertCircle` | AI flags words it is uncertain about. Review each flagged word with audio context, see Deepgram's alternative suggestions, and correct or accept with a single click. | REPORTER, SCOPIST, ADMIN | `/jobs` |
| Confidence Analytics | `BarChart3` | Understand transcript accuracy at a glance. View a risk score, per-speaker confidence breakdown, and a list of the highest-risk words before final export. | REPORTER, SCOPIST, ADMIN | `/jobs` |
| Deposition Notes | `StickyNote` | Capture timestamped categorized notes during or after the deposition session. Categories include spelling, exhibit, objection, stipulation, off-record, and more. | REPORTER | `/jobs` |
| Proper Nouns Manager | `BookMarked` | Live-capture proper nouns during a deposition: person names, company names, places, medical terms, acronyms. These feed into the transcript review to flag potential misrecognitions. | REPORTER | `/jobs` |
| Custom Dictionary | `BookOpen` | Build a job-level glossary of specialized terms with phonetic hints and categories. Medical, legal, and technical terms are pre-categorized. | REPORTER, SCOPIST, ADMIN | `/jobs` |
| Format & Speaker Settings | `Settings` | Map Deepgram speaker IDs to legal roles (Q, A, THE COURT, etc.), set Q/A formatting rules, configure em-dash insertion, and enable diarization correction. | REPORTER, ADMIN | `/jobs` |
| DOCX Export | `FileText` | Export certified transcripts as Microsoft Word documents formatted to legal transcript standards: 25 lines per page, numbered lines, Q/A structure, speaker labels. | REPORTER, SCOPIST, ADMIN | `/exports` |
| PDF Export | `File` | Export transcripts as PDF documents for direct filing or sharing with attorneys and courts. | REPORTER, SCOPIST, ADMIN | `/exports` |
| Plain Text Export | `FileType` | Export as ASCII plain text for legacy court systems, court filing portals, or archival purposes. | REPORTER, SCOPIST, ADMIN | `/exports` |
| Medical Chronology | `HeartPulse` | Upload medical record PDFs and let AI extract a structured chronology of treatments, visits, diagnoses, and procedures. Filter, sort, verify, and export as a DOCX chronology report. | REPORTER, SCOPIST, ADMIN | `/jobs/{id}/medical` |
| Scheduling Calendar | `Calendar` | Manage your deposition schedule with month and week views. Set availability blocks, create deposition events with Zoom links or physical addresses, and manage multi-session depositions. | REPORTER, ADMIN | `/calendar/month` |
| Transcript Viewer (Attorney) | `Eye` | A clean, searchable transcript viewer showing final certified transcripts. Includes basic audio playback. Attorneys can access any transcript that has been explicitly shared with them. | ATTORNEY | `/attorney/transcripts` |
| Annotations & Issue Codes | `Tag` | Highlight passages, add notes, add bookmarks, and apply color-coded legal issue codes (Objection, Exhibit, Key Testimony, etc.) to any line in a shared transcript. | ATTORNEY | `/attorney/transcripts` |
| Exhibit Linker | `Paperclip` | Link uploaded exhibit documents to specific annotation points in a transcript. Useful for case preparation and deposition analysis. | ATTORNEY | `/attorney/transcripts` |
| Word Knowledge Training | `GraduationCap` | A complete certification preparation suite for scopists and reporters. Includes flashcard decks, practice mode, and a timed mock exam matching the actual CSR exam question distribution. | REPORTER, SCOPIST | `/wkt` |
| Audit Log | `ClipboardList` | Complete tamper-evident record of every action taken on the platform: who did what, when, to which record. | ADMIN | `/reports/audit-log` |
| Feature Flag Manager | `Zap` | Toggle platform features on or off per firm or globally. Used for controlled feature rollouts and firm-specific customization. | ADMIN | `/admin/features` |
| System Health Monitor | `HeartPulse` | Live dashboard showing the status of all platform services, API connectivity, error rates, and Deepgram integration health. | ADMIN | `/admin` |

**Commit 7 message:** `feat(tools): add tool directory page with filterable tool catalog`

---

## TASK 8 — EMPTY STATE SYSTEM

**Files to update:** Any page or component with a blank "no data" state

All empty states across the platform must be upgraded from bare text to informative, action-oriented panels.

### 8A — Empty State Component

Create `components/shared/empty-state.tsx` if a comprehensive version doesn't already exist:

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: {
    label: string;
    href: string;
    variant?: 'default' | 'outline';
  }[];
}
```

Visual: centered vertically and horizontally, icon in large muted circle, title `text-lg font-semibold text-slate-700`, description `text-sm text-slate-500 max-w-xs mx-auto`, action buttons below.

### 8B — Empty States to Implement

| Page / Component | Old State | New Title | New Description | Actions |
|-----------------|-----------|-----------|-----------------|---------|
| Reporter dashboard (no jobs) | "No jobs" | "No depositions yet" | "Upload a recording to create your first transcript, or schedule an upcoming deposition." | Upload Audio, Schedule Deposition |
| Scopist dashboard (no assignments) | blank | "No assignments yet" | "When a court reporter assigns a transcript to you for review, it will appear here." | Practice with WKT |
| Attorney dashboard (no transcripts) | blank | "No transcripts shared" | "Contact the reporting firm managing your case to request access to deposition transcripts." | (no action — contact instruction only) |
| Jobs list (no jobs) | "No jobs found" | "No jobs match your filters" | "Try clearing the filters, or create a new job." | Clear Filters, New Job |
| Transcripts list (no transcripts) | blank | "No transcripts yet" | "Transcripts appear here after AI transcription completes." | Upload Audio |
| Exports page (no exports) | blank | "No exports yet" | "Export a completed transcript to see it here." | View Transcripts |
| Calendar (no events) | blank | "No depositions scheduled" | "Create a deposition event to get started." | Schedule Deposition |

**Commit 8 message:** `feat(ui): unified empty state system across all major pages`

---

## TASK 9 — VISUAL POLISH & CONSISTENCY PASS

### 9A — Loading Skeletons

Every component that fetches data with `useEffect` + `fetch` must show proper loading skeletons while data is loading. Use the existing `Skeleton` component (`components/ui/skeleton.tsx`).

Skeleton shapes must match the component being loaded:
- Stats bar: 4 rectangular blocks the size of stat cards
- Job cards: 3 job-card-shaped skeleton blocks
- Tool launcher grid: 8 small rectangular blocks in 2-column grid
- WKT widget: vertical stack of text-width skeleton lines

### 9B — Dark Mode Completeness

All new Tailwind classes must include their `dark:` variants. Follow the existing pattern:
```
bg-white dark:bg-slate-800
text-slate-900 dark:text-slate-100
border-slate-200 dark:border-slate-700
text-slate-600 dark:text-slate-400
```

### 9C — Responsive Completeness

All grid layouts must be responsive:
- Mobile (`default`): `grid-cols-1`
- Tablet (`md:`): `grid-cols-2`
- Desktop (`lg:`): full multi-column as specified

All flex layouts that are horizontal on desktop must stack vertically on mobile.

### 9D — Focus & Accessibility

All interactive elements must have visible focus rings:
```
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
```

All icons used decoratively must have `aria-hidden="true"`.  
All icon-only buttons must have `aria-label="..."`.  
All cards that are `<Link>` wrappers must be keyboard-navigable.

### 9E — Error Boundaries

All new async components must be wrapped in the existing `ErrorBoundary` component (`components/ui/error-boundary.tsx`). Verify existing dashboards also have this wrapping — add where missing.

**Commit 9 message:** `chore(ui): polish pass — loading skeletons, dark mode, responsive breakpoints, accessibility`

---

## TASK 10 — FINAL VERIFICATION & DOCUMENTATION

### 10A — TypeScript Verification

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

This number must not exceed the baseline recorded before you started. If it does, fix all new errors before committing.

### 10B — Build Verification

```bash
npm run build 2>&1 | tail -30
```

Build must pass with zero errors. Warnings are acceptable.

### 10C — Lint Verification

```bash
npm run lint 2>&1 | grep "error" | head -20
```

No new lint errors are acceptable. Warnings are acceptable.

### 10D — Protected File Integrity Check

```bash
git diff --name-only | grep -E "middleware|session\.ts|server\.ts|schema\.prisma|migrations/"
```

This command must produce **zero output**. If any protected files appear, revert them immediately.

### 10E — Change Log Update

Update `ai_logs/change_log.md` with:
- Timestamp
- Summary of all 10 tasks completed
- Complete list of all files created and modified
- TypeScript error count before and after
- Build result: PASS or FAIL

---

## APPENDIX A — DESIGN SYSTEM REFERENCE

### Color Token Map (Tailwind class names only)

| Role / Context | Primary | Hover Border | Background | Text |
|----------------|---------|-------------|------------|------|
| Court Reporter | `indigo-600` | `indigo-400` | `indigo-50` | `indigo-700` |
| Scopist | `violet-600` | `violet-400` | `violet-50` | `violet-700` |
| Attorney | `blue-700` | `blue-400` | `blue-50` | `blue-700` |
| Admin | `slate-700` | `slate-400` | `slate-100` | `slate-800` |
| Warning / Flagged | `amber-500` | `amber-400` | `amber-50` | `amber-700` |
| Success / Complete | `green-600` | `green-400` | `green-50` | `green-700` |
| Error / Overdue | `red-600` | `red-400` | `red-50` | `red-700` |
| Medical | `rose-600` | `rose-400` | `rose-50` | `rose-700` |

### Component Pattern Library

**Tool Launcher Card:**
```tsx
<Link href={route} className={`
  group flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200
  hover:border-${accent}-400 bg-white dark:bg-slate-800
  hover:bg-${accent}-50 dark:hover:bg-${accent}-900/20
  hover:shadow-md hover:-translate-y-0.5
  transition-all duration-200 cursor-pointer
`}>
  <div className={`w-10 h-10 rounded-lg bg-${accent}-100 flex items-center justify-center shrink-0`}>
    <Icon className={`h-5 w-5 text-${accent}-600`} />
  </div>
  <div className="flex-1 min-w-0">
    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{name}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
  </div>
  <ChevronRight className={`h-4 w-4 text-slate-300 group-hover:text-${accent}-500 transition-colors shrink-0`} />
</Link>
```

**Stat Card (with accent border):**
```tsx
<div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 border-l-4 border-l-${color}-500`}>
  <div className="flex items-center justify-between mb-2">
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    <Icon className={`h-4 w-4 text-${color}-500`} />
  </div>
  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
</div>
```

**Section Label:**
```tsx
<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
  {sectionTitle}
</p>
```

---

## APPENDIX B — DATA AVAILABILITY (NO NEW API CALLS)

| Dashboard | Data Needed | Existing Source | Notes |
|-----------|------------|-----------------|-------|
| Reporter | Job counts | `jobCounts` already in `reporter/page.tsx` | Use as-is |
| Reporter | Recent jobs | `recentJobs` already in `reporter/page.tsx` | Use as-is |
| Reporter | User name | `getCurrentUser()` return | `user.firstName` or `user.name` |
| Scopist | Assigned jobs | `recentJobs` filtered by role | No new fetch |
| Scopist | WKT progress | `/api/wkt/progress` | Client-side fetch in widget |
| Attorney | Shared transcripts | `recentTranscripts` from `/api/attorney/dashboard` | Already fetched |
| Attorney | Annotation counts | `stats.annotations` in dashboard state | Already in state |
| Admin | All KPIs | `totalUsers`, `totalJobs`, `totalFirms`, `activeJobs` | Already in `admin/page.tsx` |
| Admin | Recent jobs | `recentJobs` in `admin/page.tsx` | Already fetched |

---

## APPENDIX C — FILE NAMING CONVENTIONS

All new component files must follow this structure:

```
components/
  home/
    role-selector.tsx
    tool-preview-grid.tsx
    workflow-diagram.tsx
  shared/
    workflow-timeline.tsx
    tool-card.tsx
    empty-state.tsx
  layouts/
    page-header.tsx          (enhance or create)
  dashboard/
    reporter/
      reporter-stats-bar.tsx
      active-jobs-panel.tsx
      reporter-tool-launcher.tsx
      upcoming-depositions-strip.tsx
    scopist/
      scopist-stats-bar.tsx
      assigned-jobs-panel.tsx
      wkt-progress-widget.tsx
      scopist-tool-launcher.tsx
    attorney/
      attorney-stats-bar.tsx
      shared-transcripts-panel.tsx
      attorney-tool-launcher.tsx
      annotation-summary-widget.tsx
    admin/
      platform-kpi-header.tsx
      admin-tool-grid.tsx

app/
  (dashboard)/
    tools/
      page.tsx               (new tool directory page)
```

---

## APPENDIX D — HARD STOP CONDITIONS

Stop immediately and do NOT continue if any of the following occur:

| Condition | Action |
|-----------|--------|
| TypeScript errors increase by more than 5 from baseline | Stop, fix errors, re-verify before continuing |
| `npm run build` fails | Stop, fix build failure, do not proceed to next task |
| A protected file appears in `git diff` | Revert that file immediately — do not commit |
| Any file in `app/api/` is modified | Revert and re-read constraints |
| A new entry appears in `package.json` dependencies | Revert and re-read constraints |
| `middleware.ts` is modified in any way | Revert immediately — this controls all auth routing |

---

## COMMIT SEQUENCE (10 COMMITS TOTAL)

```
commit 1:  feat(nav): three-layer navigation — top bar, sidebar restructure, page header, workflow timeline
commit 2:  feat(home): complete homepage redesign — role selector, workflow diagram, tool preview grid
commit 3:  feat(dashboard): court reporter dashboard — stats bar, active jobs panel, tool launcher, deposition strip
commit 4:  feat(dashboard): scopist dashboard — stats, assigned jobs, WKT progress widget, tool launcher
commit 5:  feat(dashboard): attorney dashboard — case-grouped transcripts, stats bar, annotation widget, tool launcher
commit 6:  feat(dashboard): admin dashboard — KPI header, 9-tool command grid
commit 7:  feat(tools): add tool directory page with filterable tool catalog
commit 8:  feat(ui): unified empty state system across all major pages
commit 9:  chore(ui): polish pass — loading skeletons, dark mode, responsive breakpoints, accessibility
commit 10: docs(changelog): update ai_logs/change_log.md with full implementation report
```

---

*DEPO-PRO UI/UX OVERHAUL MEGA-PROMPT — Version 2.0*  
*Synthesized from: World-Class Legal SaaS UI System Prompt, Master Product Architect Prompt,*  
*SaaS Product Design & UX Transformation Prompt, Product UX Restructure & Dashboard System Prompt,*  
*Navigation Architecture Document, Dashboard Blueprint, and Tool Status Report*  
*For use with Claude Code, Cursor, or Codex CLI*  
*Target: Vercel auto-deploy via GitHub push*

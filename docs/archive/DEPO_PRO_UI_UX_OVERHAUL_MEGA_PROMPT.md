# DEPO-PRO UI/UX OVERHAUL — CLAUDE CODE MEGA-PROMPT
**Version:** 1.0  
**Scope:** Home Page · All Role Dashboards · Navigation · Tool Discovery  
**Constraint Class:** Visual Enhancement Only — No Schema Changes, No New APIs, No Auth Modifications  
**Deploy Target:** Vercel (auto-deploy on git push)

---

## ⚠️ PRE-FLIGHT REQUIREMENTS — READ BEFORE WRITING A SINGLE LINE OF CODE

Before any work begins, you MUST:

1. **Read all governance files** in order:
   - `AI_AUTONOMOUS_RULES.md`
   - `MASTER_CONTROL.md`
   - `BETA_FREEZE.md`

2. **Record TypeScript baseline:**
   ```bash
   npx tsc --noEmit 2>&1 | tail -5
   ```
   Save the error count. Your work must NOT increase it.

3. **Confirm build passes before starting:**
   ```bash
   npm run build 2>&1 | tail -10
   ```

4. **NEVER touch these files under any circumstances:**
   - `middleware.ts`
   - `lib/auth/session.ts`
   - `lib/supabase/server.ts`
   - `prisma/schema.prisma`
   - Any file in `supabase/migrations/`
   - Any existing API route (`app/api/**`)

5. **One commit per task. Never batch tasks into a single commit.**

6. **All new interactive UI that requires client-side state must use `'use client'` and be placed in a dedicated component file, not directly in the page file.**

7. **Do not install any new npm packages. Use only dependencies already present in `package.json`.**

---

## DESIGN SYSTEM STANDARDS — APPLY TO ALL WORK IN THIS PROMPT

The following standards govern every file you touch or create. They define the visual language for the entire overhaul.

### Color Tokens (Tailwind classes — do not hardcode hex values)

| Role | Primary Accent | Secondary | Background |
|------|----------------|-----------|------------|
| Court Reporter | `indigo-600` | `indigo-100` | `indigo-50` |
| Scopist | `violet-600` | `violet-100` | `violet-50` |
| Attorney | `blue-700` | `blue-100` | `blue-50` |
| Admin | `slate-800` | `slate-100` | `slate-50` |
| Global Brand | `indigo-600` | `teal-500` | `slate-50` |

### Typography Scale
- **Page title:** `text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight`
- **Section heading:** `text-lg font-semibold text-slate-800 dark:text-slate-200`
- **Card title:** `text-base font-semibold text-slate-900 dark:text-slate-100`
- **Body / description:** `text-sm text-slate-600 dark:text-slate-400`
- **Caption / meta:** `text-xs text-slate-500 dark:text-slate-500`

### Component Patterns
- **Dashboard cards:** `bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200`
- **Tool launcher buttons:** `group flex items-center gap-4 p-4 rounded-xl border-2 hover:border-{color}-400 bg-white dark:bg-slate-800 hover:bg-{color}-50 dark:hover:bg-{color}-900/20 transition-all duration-200 cursor-pointer`
- **Stat cards:** Use gradient accent bar on top-left border (`border-l-4 border-l-{color}-500`)
- **Section labels:** `text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500`

### Animation Classes (Tailwind only — no external libraries)
- Hover scale: `hover:scale-[1.02] transition-transform duration-150`
- Fade-in skeleton: `animate-pulse bg-slate-200 dark:bg-slate-700 rounded`
- Active state: `active:scale-95 transition-transform`

### Icon Usage
Use `lucide-react` exclusively. Every tool launcher must have a clearly identifiable icon. Every stat card must have an icon. Icon size in launchers: `h-6 w-6`. Icon size in stat cards: `h-5 w-5`.

---

## TASK 1 — HOME PAGE ROLE DISCOVERY SECTION

**File to modify:** `app/page.tsx`  
**New component to create:** `components/home/role-discovery-cards.tsx`

### Objective

Replace the current flat `AudienceSection` (a simple list of five icons with labels) with a rich, interactive **Role Discovery Section** that allows any visitor — regardless of familiarity with the platform — to immediately understand what Depo-Pro does for their specific role. Each role card expands on hover (desktop) or tap (mobile) to reveal the complete toolkit available to that user type, with direct "Get Started" call-to-action links.

### Detailed Requirements

#### 1.1 — Section Wrapper

Create a new section titled **"Built for Every Role in the Deposition Workflow"** with a supporting subheadline: *"Click your role to explore your complete toolkit."*

The section background should use a subtle diagonal gradient from `slate-50` to `white` with a very light grid dot pattern (CSS `background-image` radial-gradient, `opacity-[0.04]`).

#### 1.2 — Role Cards (Desktop: 4-column grid, Mobile: 1-column stacked)

Create **four primary role cards**, one for each user type. Each card must:

**At rest (collapsed state):**
- Display the role name in large, bold text (`text-xl font-bold`)
- Display the role's accent color as a gradient strip across the top of the card (`h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-{color}-500 to-{color}-400`)
- Display the role icon (large, `h-10 w-10`) in a soft colored circle
- Display a two-sentence value proposition below the role name
- Display a "See your tools →" text link in the role accent color
- Card height approximately `200px`
- Soft shadow: `shadow-sm`

**On hover / expanded state (CSS transition, no JavaScript state required for desktop):**
- Card expands vertically using `max-height` transition (`max-h-[200px] hover:max-h-[600px] overflow-hidden transition-all duration-500 ease-in-out`)
- Reveal a **"Your Toolkit"** section listing all tools available to that role
- Each tool entry: small icon (`h-4 w-4`), tool name in `font-medium`, one-line description in `text-xs text-slate-500`
- A clear **"Access [Role] Dashboard →"** button at the bottom in the role accent color
- Elevated shadow: `shadow-xl`
- Slight upward shift: `hover:-translate-y-1 transition-transform`

**Mobile (tap-to-expand):**
- Wrap each card in a `<details>` element with custom styling for the `<summary>` element, OR implement a simple React `useState` toggle per card in the client component. Use the React `useState` approach since this is a Next.js App Router project.
- The expanded section is revealed with a smooth max-height transition
- A chevron icon rotates 180° when expanded

#### 1.3 — Role Card Content Specifications

Implement the following data structure for each role card. All tool descriptions must be accurate to what actually exists in the platform (no fabricated features).

**Card 1 — Court Reporter**  
*Accent:* `indigo`  
*Icon:* `Mic` from lucide-react  
*Tagline:* "From audio file to certified legal transcript — your complete production workflow."  
*Value prop:* "Upload deposition recordings and get AI-powered transcripts in minutes. Review, correct, and certify with precision tools designed for your standards."

Tools to list:
- 🎙️ **High-Accuracy Transcription** — Deepgram Nova-3 pipeline with audio normalization
- 🎧 **Synchronized Review** — Waveform player with word-level audio sync
- 🚩 **Low-Confidence Word Flagging** — AI highlights uncertain words for your review
- 📊 **Confidence Analytics** — Risk score, per-speaker accuracy breakdown
- 📝 **Deposition Notes** — Categorized timestamped notes during recording
- 🔤 **Proper Nouns Manager** — Live capture of names, places, medical terms
- 📖 **Custom Dictionary** — Job-level term library with phonetic hints
- ⚙️ **Format Settings** — Speaker mapping, Q/A roles, legal formatting rules
- 📅 **Calendar & Scheduling** — Manage depositions, availability, and assignments
- 📤 **Export** — DOCX, PDF, and plain text in legal formatting standards

*CTA button:* "Open Reporter Dashboard" → `/reporter`

---

**Card 2 — Scopist**  
*Accent:* `violet`  
*Icon:* `PenTool` from lucide-react  
*Tagline:* "Your professional editing environment for final-quality legal transcripts."  
*Value prop:* "Review assigned transcripts with full audio synchronization. Correct, polish, and finalize — with access to reporter notes and a built-in word knowledge training suite."

Tools to list:
- ✏️ **Transcript Editor** — Full-featured correction interface with change tracking
- 🎧 **Synced Review Tool** — Same waveform + transcript viewer as the reporter
- 📋 **Reporter Notes Access** — Read reporter's deposition notes with audio seek
- 🔤 **Proper Nouns Reference** — View reporter's captured names and terms
- 🎓 **Word Knowledge Training (WKT)** — Flashcards, practice mode, mock exams
- 📊 **Progress Dashboard** — Track WKT scores across 6 certification categories
- 📝 **Mock Certification Exam** — Timed exam matching actual CSR exam distribution
- 📤 **Transcript Finalization** — Submit and trigger certified export

*CTA button:* "Open Scopist Dashboard" → `/scopist`

---

**Card 3 — Attorney**  
*Accent:* `blue`  
*Icon:* `Scale` from lucide-react  
*Tagline:* "Access, analyze, and annotate the depositions that matter to your case."  
*Value prop:* "Securely access transcripts shared with you by the reporting firm. Annotate, highlight, and link exhibits — with a clean viewer built for legal review."

Tools to list:
- 📄 **Transcript Viewer** — Clean legal-format reader with search and audio playback
- 🖊️ **Annotation Tools** — Highlight, note, and bookmark any passage
- 🏷️ **Issue Code Palette** — Color-coded legal tags (Objection, Exhibit, Key Testimony, etc.)
- 📎 **Exhibit Linker** — Connect exhibits to specific transcript annotations
- 📁 **Case Management** — Organized view of all cases and associated depositions
- 📅 **Deposition Calendar** — Upcoming depositions and scheduling visibility
- 🔒 **Access-Level Controls** — VIEW, COMMENT, or EDIT access per transcript

*CTA button:* "Open Attorney Dashboard" → `/attorney-dashboard`

---

**Card 4 — Agency / Admin**  
*Accent:* `slate`  
*Icon:* `Building2` from lucide-react  
*Tagline:* "Complete operational oversight for multi-reporter, multi-firm workflows."  
*Value prop:* "Manage users, firms, assignments, billing, and system health from a single command center. Built for agencies that operate at scale."

Tools to list:
- 🏢 **Firm & User Management** — Add users, assign roles, manage firm settings
- 📋 **Jobs Overview** — Real-time status across all active transcription jobs
- 👥 **Assignment Management** — Assign reporters and scopists to depositions
- 🏥 **Medical Chronology Tool** — AI extraction of medical records for PI depositions
- 📊 **Usage & Accuracy Reports** — Platform-wide analytics
- 🔍 **Audit Log** — Complete tamper-evident action history
- ⚡ **System Health Monitor** — Live service status dashboard
- 🔧 **Feature Flag Manager** — Control platform features per firm
- 🧾 **RX Queue Manager** — Manage forensic audio enhancement jobs
- ⚙️ **Settings & Configuration** — Roles, AI models, audio processing, integrations

*CTA button:* "Open Admin Dashboard" → `/admin`

#### 1.4 — "How the Workflow Connects" Diagram

Below the four role cards, add a simple horizontal workflow diagram showing how the roles connect in sequence. Use a responsive flex row (stacked on mobile):

```
[ Court Reporter ] → [ AI Transcription ] → [ Scopist Review ] → [ Attorney Access ]
     Uploads                 Deepgram               Corrects              Analyzes
```

Each node is a rounded pill badge with icon + label. The arrows between nodes are `→` characters styled in `text-slate-300`. On mobile, the flow becomes vertical with `↓` arrows.

#### 1.5 — Implementation Instructions

1. Create `components/home/role-discovery-cards.tsx` as a `'use client'` component containing the full interactive implementation.
2. Import and render it in `app/page.tsx` in place of the existing `AudienceSection` component. Do NOT delete `AudienceSection` from its definition — simply stop rendering it in the main page and render `RoleDiscoverySection` instead.
3. The component receives no props — all data is static and defined inline.
4. Use `useState` for mobile card expansion (one state value per card: `openCard: number | null`).
5. Desktop hover expansion uses pure CSS `group` and `group-hover` Tailwind classes — no JavaScript for desktop.

---

## TASK 2 — COURT REPORTER DASHBOARD OVERHAUL

**File to modify:** `app/(dashboard)/reporter/page.tsx`  
**New components to create:**
- `components/dashboard/reporter/tool-launcher-grid.tsx`
- `components/dashboard/reporter/active-jobs-panel.tsx`
- `components/dashboard/reporter/reporter-stats-bar.tsx`

### Objective

Transform the current reporter dashboard from a basic stat card + recent jobs list into a mission-control-style workspace that surfaces active jobs prominently, provides one-click access to every tool, and gives the reporter a clear picture of their workload at a glance.

### Layout Structure

Use a **three-region layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  STATS BAR  (4 stat cards across full width)                │
├──────────────────────────────────┬──────────────────────────┤
│  ACTIVE JOBS PANEL (left, 60%)   │  TOOL LAUNCHER (right,  │
│  - Priority job at top           │  40%)                    │
│  - Jobs needing attention        │  - 8 tool buttons        │
│  - Progress bars                 │  - Quick tips            │
│  - Direct Review/Export buttons  │                          │
├──────────────────────────────────┴──────────────────────────┤
│  CALENDAR PREVIEW  (full width — upcoming depositions row)  │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Specifications

#### 2.1 — Reporter Stats Bar (`reporter-stats-bar.tsx`)

Four stat cards in a responsive grid (`grid-cols-2 lg:grid-cols-4`). Each card must have:
- Colored left-border accent (`border-l-4`)
- Large metric value (`text-3xl font-bold`)
- Label and subtitle
- Subtle trend indicator (arrow up/down icon, green/red text) — derive from existing data or show static placeholder with `text-slate-400`

Stats to display:
1. **Active Jobs** (border `indigo-500`) — jobs in `IN_EDIT`, `IN_REVIEW`, `ASSIGNED` status
2. **Ready to Export** (border `green-500`) — jobs in `COMPLETED` status  
3. **Pending Review** (border `amber-500`) — jobs in `AI_COMPLETE` status awaiting scopist
4. **This Month** (border `violet-500`) — count of jobs with `createdAt` in current calendar month

All data comes from the **existing `jobCounts` object** already fetched in the current `reporter/page.tsx`. Do not add new data fetching.

#### 2.2 — Active Jobs Panel (`active-jobs-panel.tsx`)

This is the highest-priority element on the dashboard. It replaces the existing `RecentJobs` component.

**"Needs Attention" section at top:**
- Query the existing `recentJobs` data for jobs where `flaggedCount > 0 && progress < 100`
- Display these as a priority stack — max 3 jobs shown, "View all →" link to `/jobs?filter=in_review`
- Each job card must show:
  - Case name in `font-semibold`
  - Deponent name in `text-sm text-slate-500`
  - Deposition date formatted as `"MMM d, yyyy"` using `date-fns`
  - Flagged words remaining: `{flaggedCount - reviewedCount} words remaining` in `text-amber-600 font-medium`
  - Progress bar (green fill, `h-2 rounded-full`)
  - Two action buttons side by side:
    - `"▶ Continue Review"` → `/jobs/{id}/review` — primary button, role accent color
    - `"Export"` → `/exports` — ghost variant button
  - A `"PRIORITY"` badge in `text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5` if `progress < 50`

**"All Recent Jobs" section below:**
- Table format with columns: Case, Date, Status badge, Flagged/Total, Action
- Show up to 8 rows
- Use `StatusBadge` component already in `components/transcripts/status-badge.tsx`

#### 2.3 — Tool Launcher Grid (`tool-launcher-grid.tsx`)

An `8-button grid` (`grid-cols-2 gap-3`) on the right sidebar. Each button is a fully clickable card link (`<Link href="...">`) styled as described in the Design System Standards above (bordered card, hover accent color, scale animation).

Each tool launcher button must include:
- Icon (left-aligned, `h-6 w-6`, in a small colored circle `w-10 h-10 rounded-lg`)
- Tool name in `font-semibold text-sm`
- One-line description in `text-xs text-slate-500`
- Right-side chevron arrow icon (`ChevronRight`, `h-4 w-4 text-slate-300 group-hover:text-{color}-500 transition-colors`)

Tool buttons and destinations:

| # | Icon | Name | Description | Route | Accent |
|---|------|------|-------------|-------|--------|
| 1 | `Mic` | High-Accuracy Transcription | Deepgram Nova-3 pipeline | `/transcription-tool` | `indigo` |
| 2 | `Upload` | Upload New Recording | Create a new job manually | `/transcription/upload` | `blue` |
| 3 | `Headphones` | Review Transcripts | Open flagged word review | `/jobs` | `violet` |
| 4 | `Calendar` | Scheduling Calendar | Manage depositions | `/calendar` | `teal` |
| 5 | `BookOpen` | Custom Dictionary | Manage term library | `/jobs` | `amber` |
| 6 | `FileText` | Transcripts Library | All transcripts list | `/transcripts` | `green` |
| 7 | `Download` | Export Center | Download finalized files | `/exports` | `emerald` |
| 8 | `BarChart3` | Reports | Usage and accuracy reports | `/reports` | `slate` |

Below the tool launcher grid, add a compact **"Keyboard Shortcuts"** reference card:
- `Space` — Play/Pause audio  
- `Tab` — Jump to next flagged word  
- `Ctrl + Enter` — Mark word as reviewed  
- `← →` — Seek audio ±3 seconds  

Style as a dark card (`bg-slate-800 dark:bg-slate-900 rounded-xl p-4`) with monospace key badges (`<kbd>` elements styled with `font-mono text-xs bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded border border-slate-600`).

#### 2.4 — Calendar Preview Strip (full-width bottom row)

Add a "Upcoming Depositions" strip at the bottom of the dashboard. This is a **read-only horizontal scroll list** of the next 5 jobs that have a `depositionDate` in the future, sorted ascending by date.

Each item is a compact pill card:
- Date formatted as day-of-week + date (`"Mon, Mar 11"`)
- Case name truncated to 20 characters
- Status badge
- `"Open →"` link

Use data from the **existing `recentJobs` array** filtered by `depositionDate > now`. Do not make any new API calls.

If no upcoming depositions exist, show a subtle empty state: calendar icon + `"No upcoming depositions"` + `"Schedule one →"` link to `/calendar`.

#### 2.5 — Dashboard Header Enhancement

Replace the current plain `<h1>` page title with a proper greeting header:

```tsx
<div className="flex items-center justify-between mb-8">
  <div>
    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">
      {getGreeting()}, {firstName}  {/* getGreeting() returns "Good morning/afternoon/evening" based on hour */}
    </p>
    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
      Reporter Dashboard
    </h1>
    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
      {activeJobCount} active job{activeJobCount !== 1 ? 's' : ''} · {pendingReviewCount} awaiting review
    </p>
  </div>
  <div className="flex gap-3">
    <Link href="/transcription-tool">
      <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
        <Mic className="h-4 w-4" />
        New Transcription
      </Button>
    </Link>
  </div>
</div>
```

Implement `getGreeting()` as a simple pure function in the same file based on `new Date().getHours()`.

---

## TASK 3 — SCOPIST DASHBOARD OVERHAUL

**File to modify:** `app/(dashboard)/scopist/page.tsx`  
**New components to create:**
- `components/dashboard/scopist/scopist-tool-launcher.tsx`
- `components/dashboard/scopist/assigned-jobs-panel.tsx`
- `components/dashboard/scopist/wkt-progress-widget.tsx`

### Objective

The scopist's primary concern is: **"What do I need to review today, and how am I progressing toward my certification?"** The new dashboard must answer both questions immediately on page load.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  GREETING HEADER + "Start Review" CTA                       │
├──────────────────────────────────┬──────────────────────────┤
│  ASSIGNED JOBS PANEL (left, 65%) │  RIGHT SIDEBAR (35%)     │
│  - Jobs needing review           │  - WKT Progress Widget   │
│  - Priority flags                │  - Tool Launcher         │
│  - Due dates                     │  - Quick Reference       │
│  - Continue Review buttons       │                          │
└──────────────────────────────────┴──────────────────────────┘
```

### Detailed Specifications

#### 3.1 — Greeting Header

Same pattern as reporter (Task 2.5) using `violet` accent color. CTA button: `"▶ Continue Review"` linking to `/jobs?filter=assigned`.

#### 3.2 — Assigned Jobs Panel (`assigned-jobs-panel.tsx`)

This replaces the existing basic recent jobs section.

**Priority Jobs** (top, boxed with `border-l-4 border-violet-500`):
- Job cards identical to Task 2.2 but using `violet` accent
- Show jobs where the scopist is assigned AND `reviewedWords / flaggedWords < 1.0`
- `"PRIORITY"` badge if job was assigned more than 48 hours ago and is not yet submitted

**Completed Jobs** (collapsible section below):
- Header: `"Recently Completed (last 7 days)"` with toggle arrow
- Collapsed by default
- Shows jobs with `SUBMITTED` or `COMPLETED` status from the last 7 days
- Each row: case name, date completed, `"View"` link, `"Export"` link

**Empty State:**
If no assigned jobs exist, show a centered card:
- Large `ClipboardList` icon in `text-violet-200`
- Heading: `"No assignments yet"`  
- Body: `"When a court reporter assigns a transcript to you for review, it will appear here."`
- Button: `"Practice with WKT →"` linking to `/wkt`

#### 3.3 — WKT Progress Widget (`wkt-progress-widget.tsx`)

A compact summary card showing the scopist's WKT progress. This data comes from the existing `/api/wkt/progress` endpoint (already implemented).

The widget displays:
- **Header:** `"Word Knowledge Training"` with a `"Go to WKT →"` link
- **Overall completion percentage:** Large circular progress ring using SVG (static calculation: `questionsAttempted / totalQuestions * 100`) or a simple horizontal progress bar if SVG is complex
- **Category rows** (6 rows, one per WKT category):
  - Category name + icon emoji (Medical 🏥, Legal ⚖️, Grammar 📖, Spelling ✏️, Texas Rules 📋, Reporter Duties 💼)
  - Mini progress bar (`h-1.5 rounded-full bg-violet-500`)
  - Score percentage
- **Quick actions:**
  - `"Practice"` button → `/wkt/practice`
  - `"Take Mock Exam"` button → `/wkt/mock-exam`
- **Last exam score** (if available): Displayed as a large number with pass/fail badge

**Data handling:** Fetch from `/api/wkt/progress` with `useEffect` on mount. Show skeleton loading state while fetching. Handle fetch error gracefully with `"WKT data unavailable"` message.

#### 3.4 — Scopist Tool Launcher (`scopist-tool-launcher.tsx`)

6-button grid (`grid-cols-2`) with the same card-link style as Task 2.3.

| # | Icon | Name | Route | Accent |
|---|------|------|-------|--------|
| 1 | `Headphones` | Review Transcripts | `/jobs` | `violet` |
| 2 | `BookOpen` | WKT Flashcards | `/wkt/flashcards` | `purple` |
| 3 | `GraduationCap` | Mock Exam | `/wkt/mock-exam` | `indigo` |
| 4 | `TrendingUp` | My Progress | `/wkt/progress` | `teal` |
| 5 | `FileText` | All Transcripts | `/transcripts` | `blue` |
| 6 | `Download` | Export Center | `/exports` | `green` |

#### 3.5 — Scopist Stats Bar

Four stat cards using `violet` accent:
1. **Assigned** — Jobs currently assigned to me
2. **In Progress** — Jobs I have started reviewing
3. **Submitted** — Jobs submitted this month
4. **WKT Score** — Latest mock exam percentage (or `"—"` if none taken)

---

## TASK 4 — ATTORNEY DASHBOARD OVERHAUL

**File to modify:** `app/(attorney)/attorney-dashboard/page.tsx`  
**New components to create:**
- `components/dashboard/attorney/attorney-tool-launcher.tsx`
- `components/dashboard/attorney/shared-transcripts-panel.tsx`

### Objective

Attorneys are external users with a very different mental model. They don't manage jobs — they **access and analyze transcripts that have been shared with them**. The dashboard must feel like a clean legal research workspace: authoritative, organized, and frictionless.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  GREETING HEADER + "View My Transcripts" CTA                │
├──────────────────────────────────┬──────────────────────────┤
│  SHARED TRANSCRIPTS PANEL (65%)  │  RIGHT SIDEBAR (35%)     │
│  - Grouped by case               │  - Tool Launcher         │
│  - Access level badges           │  - Upcoming Depositions  │
│  - Last accessed timestamp       │  - Annotation Summary    │
│  - Open / Download buttons       │                          │
└──────────────────────────────────┴──────────────────────────┘
```

### Detailed Specifications

#### 4.1 — Greeting Header

Use `blue` accent. CTA: `"Open Transcript Library →"` linking to `/attorney/transcripts`.

#### 4.2 — Shared Transcripts Panel (`shared-transcripts-panel.tsx`)

This replaces the existing attorney transcript table.

**Group transcripts by case name.** For each case group:
- Case name as a section header with `Briefcase` icon and case number
- Deponent rows within that case group
- Each row shows: deponent name, deposition date, access level badge (`VIEW` = gray, `COMMENT` = blue, `EDIT` = green), transcript status badge, `"Open Transcript"` button

**Access level badges** must be prominently styled:
- `VIEW`: `bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs font-medium`
- `COMMENT`: `bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-medium`
- `EDIT`: `bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs font-medium`

**Empty state:** `Scale` icon + `"No transcripts have been shared with you yet."` + `"Contact the reporting firm for access"` in `text-slate-500`.

#### 4.3 — Attorney Tool Launcher (`attorney-tool-launcher.tsx`)

5-button grid (`grid-cols-1 gap-2`) — vertical layout in the sidebar.

| # | Icon | Name | Description | Route | Accent |
|---|------|------|-------------|-------|--------|
| 1 | `FileText` | Transcript Library | All transcripts shared with me | `/attorney/transcripts` | `blue` |
| 2 | `Briefcase` | Case Files | Organized by case | `/attorney/cases` | `indigo` |
| 3 | `Tag` | Annotations | My highlights and notes | `/attorney/transcripts` | `violet` |
| 4 | `Calendar` | Upcoming Depositions | Deposition schedule | `/calendar` | `teal` |
| 5 | `User` | My Profile | Attorney profile settings | `/attorney/profile` | `slate` |

#### 4.4 — Annotation Summary Widget

In the sidebar below the tool launcher, show a compact summary of annotation activity:

```
┌─────────────────────────────┐
│ My Annotations              │
│ ─────────────────────────── │
│ 🟡 14 Highlights            │
│ 📝  8 Notes                 │
│ 🔖  3 Bookmarks             │
│ ──────────────────────────  │
│ Total: 25 annotations       │
│                             │
│ [ View All Annotations → ]  │
└─────────────────────────────┘
```

Use data from `stats.annotations` already available in the existing dashboard state.

---

## TASK 5 — ADMIN DASHBOARD OVERHAUL

**File to modify:** `app/(dashboard)/admin/page.tsx`  
**New components to create:**
- `components/dashboard/admin/admin-tool-grid.tsx`
- `components/dashboard/admin/platform-stats-header.tsx`

### Objective

The admin dashboard is a command center. It must give a senior administrator or agency manager **complete situational awareness** in a single viewport: platform health, user activity, job pipeline state, and fast access to every management tool.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  PLATFORM STATS HEADER (6 KPI tiles across full width)      │
├────────────────────────────────────────────────────────────-┤
│  ADMIN TOOL GRID (full width — 3-column card grid)          │
│  Each card = one admin tool area with description + button  │
├──────────────────────────────────┬──────────────────────────┤
│  RECENT JOBS TABLE (left, 60%)   │  SYSTEM HEALTH (right)   │
│  (existing RecentJobs component) │  (existing component)    │
├──────────────────────────────────┴──────────────────────────┤
│  ACTION CONSOLE + RX QUEUE (full width — existing)          │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Specifications

#### 5.1 — Platform Stats Header (`platform-stats-header.tsx`)

Six KPI tiles in a responsive `grid-cols-3 lg:grid-cols-6` layout. Each tile has:
- Icon in a colored circle
- Large number
- Label
- Subtle `border-b-2` accent underline at bottom of tile

Stats (use existing data already fetched in `admin/page.tsx`):
1. **Total Users** (`Users` icon, `blue`)
2. **Total Jobs** (`Briefcase` icon, `green`)
3. **Active Firms** (`Building2` icon, `purple`)
4. **Active Jobs** (`Activity` icon, `amber`)
5. **Jobs This Month** (`Calendar` icon, `teal`) — filter `recentJobs` by current month
6. **System Status** (`Shield` icon, `green` if healthy / `red` if issues) — static `"Operational"` label

#### 5.2 — Admin Tool Grid (`admin-tool-grid.tsx`)

Nine tool area cards in a `grid-cols-1 md:grid-cols-3` responsive grid. Each card is larger than a launcher button — approximately `240px` tall — and contains:

- Large icon in accent color circle (`h-10 w-10`)
- Tool area name (`text-lg font-bold`)
- 2–3 sentence description of what this tool area manages
- List of 3–4 specific capabilities (small bullet points, `text-sm text-slate-500`)
- Full-width `"Open →"` button at the bottom in the accent color

Tool area cards:

| # | Icon | Title | Description | Capabilities | Route | Accent |
|---|------|-------|-------------|--------------|-------|--------|
| 1 | `Users` | User Management | Add and manage all users, assign roles, and control firm membership | Invite users, Assign roles, View activity, Deactivate accounts | `/settings/users` | `blue` |
| 2 | `Briefcase` | Jobs & Transcriptions | Full visibility into every transcription job across all firms | Status pipeline view, Assignment management, Quality monitoring, Job history | `/jobs` | `indigo` |
| 3 | `Building2` | Firm Management | Configure and oversee all court reporting firms on the platform | Firm settings, Billing rates, Feature access, Usage quotas | `/settings/firms` | `violet` |
| 4 | `BarChart3` | Reports & Analytics | Platform-wide usage, accuracy, and performance reporting | Usage metrics, Accuracy reports, Export history, System reports | `/reports` | `teal` |
| 5 | `Shield` | Audit & Compliance | Complete tamper-evident audit trail for all platform actions | Action history, User events, Security log, Export audit data | `/reports/audit-log` | `green` |
| 6 | `Zap` | Feature Flags | Control platform features per firm or globally | Enable/disable features, Firm-level overrides, Release management | `/admin/features` | `amber` |
| 7 | `HeartPulse` | System Health | Real-time monitoring of all platform services and integrations | Service status, API latency, Error rates, Deepgram connection | `/admin` | `red` |
| 8 | `RefreshCw` | RX Queue | Manage the forensic audio enhancement retranscription queue | Queue status, Manual triggers, Failed job recovery, Processing logs | `/admin/rx-queue` | `orange` |
| 9 | `Settings` | Platform Settings | Core platform configuration for AI models, audio processing, and integrations | AI model config, Audio settings, Integration keys, Billing rates | `/settings` | `slate` |

---

## TASK 6 — GLOBAL NAVIGATION ENHANCEMENTS

**Files to modify:**
- `components/layouts/app-sidebar.tsx` (minor additions only)
- `components/layouts/public-header.tsx` (minor addition only)

### 6.1 — Sidebar: Active Job Badge on Review Link

In `app-sidebar.tsx`, find the navigation item that links to `/jobs` (the "Jobs" nav item). Add a live count badge showing the number of jobs in `IN_REVIEW` or `AI_COMPLETE` status.

**Important:** Do NOT add a new API call in the sidebar. Instead, read from a `data-*` attribute or render a static badge that says `"Active"` using a green dot animation (`animate-pulse w-2 h-2 rounded-full bg-green-500`). The badge is purely decorative visual feedback — it does not need to show a live number.

### 6.2 — Sidebar: Role Identity Header

At the very top of the sidebar (above the nav items), add a compact user identity block showing:
- User's initials in a colored avatar circle (role accent color)
- User's first name
- Role badge: `REPORTER` / `SCOPIST` / `ATTORNEY` / `ADMIN` in a small pill

This replaces or supplements any existing user display at the top of the sidebar. Use the `userRole` and `userName` props already passed to `AppSidebar`.

### 6.3 — Public Header: "Your Role" Dropdown Hint

In `public-header.tsx`, add a `"Your Role"` dropdown item to the desktop navigation between the existing nav items. This is a pure CSS/hover dropdown (no React state needed) that shows a mini preview of the 4 role cards with their names and a brief one-liner. Each item links to the `#roles` anchor on the home page (you will add `id="roles"` to the Role Discovery Section created in Task 1).

This dropdown must:
- Open on hover using CSS (`group-hover:opacity-100 group-hover:visible`)
- Have a `z-50` z-index
- Be positioned absolutely below the nav item
- Have a subtle drop shadow and white background
- Disappear when the mouse leaves the nav item

---

## TASK 7 — VISUAL POLISH PASS

**Applies to:** All files created or modified in Tasks 1–6

After completing Tasks 1–6, perform a visual polish pass with the following checklist:

### 7.1 — Loading States
Every component that fetches data (`useEffect` + `fetch`) must show a proper loading state. Use the existing `Skeleton` component from `components/ui/skeleton.tsx`. Skeleton shapes must match the actual content shape (e.g., for a tool launcher grid, show 8 skeleton rectangles in a 2-column grid).

### 7.2 — Empty States
Every list or table must have a proper empty state. Use the existing `EmptyState` components from `components/ui/empty-states.tsx` where applicable, or create simple inline empty states with an icon, heading, and descriptive body text.

### 7.3 — Error Boundaries
All dashboard sections that fetch data must be wrapped in the existing `ErrorBoundary` component (`components/ui/error-boundary.tsx`). This is already done in some dashboards — verify it is applied to all new components added in this prompt.

### 7.4 — Dark Mode
All new Tailwind classes must include their `dark:` variants. Follow the pattern established in existing components: `bg-white dark:bg-slate-800`, `text-slate-900 dark:text-slate-100`, `border-slate-200 dark:border-slate-700`.

### 7.5 — Responsive Breakpoints
Every grid and flex layout must be responsive. Required breakpoints:
- Mobile (default): single column, full width
- Tablet (`md:`): 2-column where applicable
- Desktop (`lg:`): Full multi-column layout as specified above

### 7.6 — Accessibility
- All interactive elements must have `aria-label` attributes where the visible label is insufficient
- All images and icons used decoratively must have `aria-hidden="true"`
- Focus states must be visible: `focus:outline-none focus:ring-2 focus:ring-{accent}-500 focus:ring-offset-2`
- Color alone must not convey meaning — always pair color with text or icon

---

## TASK 8 — VERIFICATION & COMMIT SEQUENCE

Execute ALL verification steps before committing any task. If any step fails, fix the issue before proceeding.

### Verification Checklist (run after each task)

```bash
# 1. TypeScript — must not exceed baseline error count
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# 2. Build — must pass without errors
npm run build 2>&1 | tail -20

# 3. Lint — must produce no new errors (warnings acceptable)
npm run lint 2>&1 | grep "error" | head -20

# 4. Check for any accidental changes to protected files
git diff --name-only | grep -E "middleware|session|server\.ts|schema\.prisma|migrations"
# ^ This command must produce NO OUTPUT. If it does, STOP and revert those changes.
```

### Commit Sequence

Create exactly **8 commits**, one per task:

```
feat(home): add interactive role discovery section with tool popouts
feat(dashboard): overhaul court reporter dashboard with tool launcher grid
feat(dashboard): overhaul scopist dashboard with WKT progress widget  
feat(dashboard): overhaul attorney dashboard with case-grouped transcript panel
feat(dashboard): overhaul admin dashboard with tool grid and KPI header
feat(nav): add role identity header and active job badge to sidebar
feat(home): add role dropdown to public header navigation
chore(ui): visual polish pass — loading states, dark mode, responsive breakpoints
```

### Final Update

After all 8 commits and successful verification, update `ai_logs/change_log.md` with:
- Date and time
- Summary of each task completed
- File list of all created and modified files
- TypeScript error count (before and after)
- Build status: PASS

---

## APPENDIX A — DATA AVAILABILITY REFERENCE

This table maps dashboard data requirements to existing data sources. Do NOT create new API routes. Use only what is listed here.

| Dashboard | Data Needed | Existing Source |
|-----------|------------|-----------------|
| Reporter | Job counts by status | `jobCounts` object in `reporter/page.tsx` (already fetched) |
| Reporter | Recent jobs list | `recentJobs` array in `reporter/page.tsx` (already fetched) |
| Reporter | User first name | `getCurrentUser()` return value, `user.firstName` or `user.name` |
| Scopist | Assigned jobs | Same `recentJobs` pattern — filter by `assignedScopistId === currentUser.id` |
| Scopist | WKT progress | Fetch from `/api/wkt/progress` (already implemented) |
| Attorney | Shared transcripts | `recentTranscripts` array in attorney dashboard (already fetched via `/api/attorney/dashboard`) |
| Attorney | Annotation counts | `stats.annotations` in attorney dashboard state |
| Admin | User/job/firm counts | `totalUsers`, `totalJobs`, `totalFirms`, `activeJobs` (already fetched in `admin/page.tsx`) |
| Admin | Recent jobs | `recentJobs` array in admin page (already fetched) |

---

## APPENDIX B — COMPONENT FILE NAMING CONVENTIONS

All new components created in this prompt must follow this naming and location convention:

```
components/
  home/
    role-discovery-cards.tsx       (Task 1)
  dashboard/
    reporter/
      reporter-stats-bar.tsx       (Task 2)
      active-jobs-panel.tsx        (Task 2)
      tool-launcher-grid.tsx       (Task 2)
    scopist/
      scopist-tool-launcher.tsx    (Task 3)
      assigned-jobs-panel.tsx      (Task 3)
      wkt-progress-widget.tsx      (Task 3)
    attorney/
      attorney-tool-launcher.tsx   (Task 4)
      shared-transcripts-panel.tsx (Task 4)
    admin/
      admin-tool-grid.tsx          (Task 5)
      platform-stats-header.tsx    (Task 5)
```

Each component file must:
1. Begin with `'use client';` if it uses any hooks or event handlers
2. Export a named function component (not default export, to maintain consistency with the rest of the codebase — check existing components for the pattern used in this project)
3. Be typed with explicit TypeScript interfaces for all props
4. Include a brief JSDoc comment at the top explaining the component's purpose

---

## APPENDIX C — WHAT NOT TO BUILD (HARD STOPS)

The following items are explicitly OUT OF SCOPE for this prompt. If you find yourself building any of these, stop immediately and re-read this prompt:

- ❌ Any new database tables, columns, or migrations
- ❌ Any changes to authentication, session handling, or middleware
- ❌ Any new API routes (all data must come from existing endpoints)
- ❌ Any new npm packages or dependencies
- ❌ Any changes to the Prisma schema
- ❌ Any changes to existing API routes in `app/api/`
- ❌ Any real-time WebSocket or subscription features
- ❌ Any changes to Supabase storage bucket configuration
- ❌ Any multi-page routing changes (no new routes, no renamed routes)
- ❌ Any modifications to TypeScript type definitions in `types/` (read them, do not modify)
- ❌ Billing, invoice, or payment UI (Phase 2 items)
- ❌ Live transcription UI (Phase 2 item)
- ❌ Transcript version compare UI (Phase 2 item)

---

*End of Depo-Pro UI/UX Overhaul Mega-Prompt v1.0*  
*Prepared for Claude Code autonomous execution*  
*Target: Vercel deployment via GitHub auto-deploy*

# DEPO-PRO UI/UX OVERHAUL — CLAUDE CODE MEGA-PROMPT
**Version:** 2.0 — Updated with full role set including Medical roles  
**Scope:** Home Page · All Role Dashboards · Navigation · Tool Discovery · /tools Directory  
**Constraint Class:** Visual & Content Enhancement Only — No Schema Changes, No New APIs, No Auth Modifications  
**Governance:** BETA_FREEZE active — all changes must pass build and TypeScript check  

---

## ⚠️ PRE-FLIGHT — READ BEFORE WRITING ANY CODE

**Step 1 — Read governance files in order:**
```
AI_AUTONOMOUS_RULES.md
MASTER_CONTROL.md
BETA_FREEZE.md
```

**Step 2 — Record baseline. Your work must NOT increase TypeScript errors:**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

**Step 3 — Confirm build passes before starting:**
```bash
npm run build 2>&1 | tail -10
```

**Step 4 — These files are FROZEN. Never touch them:**
```
middleware.ts
lib/auth/session.ts
lib/supabase/server.ts
prisma/schema.prisma
supabase/migrations/**
app/api/**
```

**Step 5 — One commit per numbered task. No batching.**

**Step 6 — All interactive/stateful UI must be `'use client'` components in dedicated files.**

**Step 7 — No new npm packages. Use only what is in `package.json`.**

---

## ROLE REFERENCE — FULL PLATFORM

Depo-Pro serves the following roles. All UI work must be aware of this full set.

**Agency side:** ADMIN · COURT_REPORTER · SCOPIST · VIDEOGRAPHER · INTERPRETER  
**Law firm side:** MANAGER · ATTORNEY · PARALEGAL · MEDICAL_EXPERT · MEDICAL_RECORDS_SPECIALIST  

The current production codebase implements: ADMIN, COURT_REPORTER, SCOPIST, ATTORNEY.  
The remaining roles (VIDEOGRAPHER, INTERPRETER, MANAGER, PARALEGAL, MEDICAL_*) are Phase 2.  
Do NOT create dashboards or routes for Phase 2 roles. DO reference them in the homepage role discovery section as "Coming Soon" cards.

---

## DESIGN SYSTEM — APPLY TO ALL WORK

### Role Color Tokens (Tailwind utility classes only)

| Role | Primary | Secondary | Background |
|------|---------|-----------|------------|
| Court Reporter | `indigo-600` | `indigo-100` | `indigo-50` |
| Scopist | `violet-600` | `violet-100` | `violet-50` |
| Attorney | `blue-700` | `blue-100` | `blue-50` |
| Admin | `slate-800` | `slate-100` | `slate-50` |
| Medical (Phase 2) | `rose-600` | `rose-100` | `rose-50` |
| Videographer (Phase 2) | `amber-600` | `amber-100` | `amber-50` |
| Paralegal (Phase 2) | `purple-600` | `purple-100` | `purple-50` |

### Component Patterns

**Dashboard card:**
```
bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700
shadow-sm hover:shadow-md transition-shadow duration-200
```

**Tool launcher button:**
```
group flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200
hover:border-{accent}-400 bg-white dark:bg-slate-800 hover:bg-{accent}-50
dark:hover:bg-{accent}-900/20 transition-all duration-200 cursor-pointer
```

**Stat card accent bar:** `border-l-4 border-l-{accent}-500`

**Section labels:** `text-xs font-semibold uppercase tracking-widest text-slate-400`

### Animations (Tailwind only — no external libraries)
- Hover scale: `hover:scale-[1.02] transition-transform duration-150`
- Active press: `active:scale-95 transition-transform`
- Chevron rotate: `transition-transform duration-300 group-open:rotate-180`

### Icons — lucide-react exclusively. No other icon libraries.

### Dark mode — Every new class must have its `dark:` variant.

### Responsive — Every layout must work at mobile (default), tablet (`md:`), and desktop (`lg:`).

---

## TASK 1 — HOME PAGE: ROLE DISCOVERY SECTION

**File to modify:** `app/page.tsx`  
**New component:** `components/home/role-discovery-section.tsx` (`'use client'`)

### Objective

Replace the current flat `AudienceSection` (five icon pills with labels) with a full interactive **Role Discovery Section** that explains what Depo-Pro does for each user type, with expandable tool details.

### Section Wrapper

- Section `id="roles"` (used by public header dropdown anchor link)
- Heading: `"Built for Every Role in the Deposition Workflow"`
- Subheading: `"Click your role to explore your complete toolkit."`
- Background: `bg-slate-50 dark:bg-slate-900` with subtle radial dot pattern (`background-image: radial-gradient(...)` via `style` prop)

### Live Role Cards (4 cards — these exist in the current codebase)

Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6`

Each card uses `useState` for mobile expand (one `openCard: number | null` state at the section level). Desktop uses CSS `group-hover` max-height expansion.

**Card anatomy — collapsed state:**
- Top accent gradient strip: `h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-{accent}-500 to-{accent}-400`
- Large role icon circle (`h-14 w-14`, `bg-{accent}-100`, `text-{accent}-600`)
- Role name: `text-xl font-bold text-slate-900`
- Two-sentence value proposition: `text-sm text-slate-500`
- `"See your tools →"` text link in accent color
- Card height: ~`min-h-[200px]`

**Card anatomy — expanded state (CSS hover on desktop, useState on mobile):**
- `"Your Toolkit"` section with tools listed (icon + name + one-line description)
- Full-width `"Open [Role] Dashboard →"` button in accent color
- Card elevates: `shadow-xl -translate-y-1`

**Card 1 — Court Reporter** (`indigo`) `Mic` icon → `/reporter`  
Tools: High-Accuracy Transcription · Synchronized Review · Flagged Word Flagging · Confidence Analytics · Deposition Notes · Proper Nouns Manager · Custom Dictionary · Format Settings · Scheduling Calendar · Export Center

**Card 2 — Scopist** (`violet`) `PenTool` icon → `/scopist`  
Tools: Transcript Editor · Synced Review Tool · Reporter Notes Access · Proper Nouns Reference · Word Knowledge Training (WKT) · WKT Progress Dashboard · Mock Certification Exam · Transcript Finalization

**Card 3 — Attorney** (`blue`) `Scale` icon → `/attorney-dashboard`  
Tools: Transcript Viewer (legal format) · Color-Coded Issue Tags · Cross-Transcript Search · Exhibit Linker · AI Deposition Analysis · Contradiction Detector · Deposition Designations · Trial Clip Generator · Litigation Reports

**Card 4 — Admin** (`slate`) `Building2` icon → `/admin`  
Tools: User Management · Jobs Overview · Firm Management · Reports & Analytics · Audit Log · Feature Flags · System Health Monitor · RX Queue · Platform Settings

### Coming Soon Cards (Phase 2 Roles — 5 cards)

Below the live role cards, add a "Coming in Phase 2" subsection with a `text-xs` label. Display 5 compact, greyed-out preview cards (non-interactive, no expand). Each has:
- Grayscale icon with `opacity-50`
- Role name in `text-slate-500`
- `"Coming Soon"` badge: `text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5`
- A one-sentence teaser

Roles: Videographer · Interpreter · Law Firm Manager · Paralegal · Medical (Expert + Records)

### Workflow Connection Diagram

Between the live cards and coming-soon cards, add a horizontal flow diagram:

```
[ Court Reporter ] → [ AI Transcription ] → [ Scopist Review ] → [ Attorney Access ]
     Uploads               Deepgram               Corrects             Analyzes
```

Style: flex row, rounded pill badges, `→` arrows in `text-slate-300`. Stacks vertically on mobile with `↓`.

### Implementation Notes

1. Create `components/home/role-discovery-section.tsx` as `'use client'`
2. Replace `<AudienceSection />` in `app/page.tsx` with `<RoleDiscoverySection />`
3. Do NOT delete `AudienceSection` — only stop rendering it
4. Add `id="roles"` to the section wrapper

---

## TASK 2 — COURT REPORTER DASHBOARD OVERHAUL

**File to modify:** `app/(dashboard)/reporter/page.tsx`  
**New components:**
- `components/dashboard/reporter/reporter-stats-bar.tsx`
- `components/dashboard/reporter/active-jobs-panel.tsx`
- `components/dashboard/reporter/reporter-tool-launcher.tsx`

### Dashboard Layout

```
┌────────────────────────────────────────────────────────┐
│  GREETING HEADER  (Good morning, [name])               │
│  subtitle: 3 active jobs · 2 awaiting review   [CTA]  │
├────────────────────────────────────────────────────────┤
│  STATS BAR  (4 cards across full width)                │
├──────────────────────────────┬─────────────────────────┤
│  ACTIVE JOBS PANEL  (60%)    │  TOOL LAUNCHER (40%)    │
│  - Priority jobs             │  - 8 tool buttons       │
│  - All recent jobs           │  - Keyboard shortcuts   │
├──────────────────────────────┴─────────────────────────┤
│  UPCOMING DEPOSITIONS STRIP (full width)               │
└────────────────────────────────────────────────────────┘
```

### 2.1 — Greeting Header

```tsx
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
```

Right side: `"+ New Transcription"` button → `/transcription-tool`, `bg-indigo-600 hover:bg-indigo-700`.

### 2.2 — Stats Bar (`reporter-stats-bar.tsx`)

4 cards, `grid-cols-2 lg:grid-cols-4`, `border-l-4` accent:
1. **Active Jobs** (`border-indigo-500`) — IN_EDIT, IN_REVIEW, ASSIGNED
2. **Ready to Export** (`border-green-500`) — COMPLETED status
3. **Pending Review** (`border-amber-500`) — AI_COMPLETE status
4. **This Month** (`border-violet-500`) — jobs with `createdAt` in current month

**Data source:** Use the existing `jobCounts` object already in `reporter/page.tsx`. Do not add new data fetching.

### 2.3 — Active Jobs Panel (`active-jobs-panel.tsx`)

**Priority stack (top, "Needs Attention"):**
- Filter `recentJobs` where `reviewedWords / flaggedWords < 1.0` and `flaggedCount > 0`
- Show max 3 with `"View all →"` link
- Per card: case name, deponent, deposition date, `"{N} words remaining"` in `text-amber-600`, progress bar, `"▶ Continue Review"` → `/jobs/{id}/review`, `"Export"` → `/exports`
- `"PRIORITY"` badge if `progress < 50`

**All recent jobs (below):**
- Table: Case · Date · Status (using existing `StatusBadge`) · Flagged/Total · Action
- Max 8 rows
- `"View all jobs →"` link to `/jobs`

**Empty state:** `ClipboardList` icon + `"No active jobs"` + `"Start a new transcription →"` button.

### 2.4 — Tool Launcher Grid (`reporter-tool-launcher.tsx`)

`grid-cols-2 gap-3` — 8 buttons. Each: icon circle + name + one-line description + right chevron.

| Icon | Name | Route | Accent |
|------|------|-------|--------|
| `Mic` | High-Accuracy Transcription | `/transcription-tool` | `indigo` |
| `Upload` | Upload New Recording | `/transcription/upload` | `blue` |
| `Headphones` | Review Transcripts | `/jobs?filter=review` | `violet` |
| `Calendar` | Scheduling Calendar | `/calendar` | `teal` |
| `BookOpen` | Custom Dictionary | `/settings/profile` | `amber` |
| `FileText` | Transcript Library | `/transcripts` | `green` |
| `Download` | Export Center | `/exports` | `emerald` |
| `BarChart3` | Reports | `/reports` | `slate` |

**Keyboard shortcuts card below the grid:**

Dark card `bg-slate-800 rounded-xl p-4`:
- `Space` Play/Pause · `Tab` Next flagged word · `Ctrl+Enter` Mark reviewed · `←→` Seek ±3s
- Use `<kbd>` tags styled: `font-mono text-xs bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded border border-slate-600`

### 2.5 — Upcoming Depositions Strip

Full-width horizontal scroll list of next 5 jobs with `depositionDate > now`, ascending.  
Each: date pill (`"Mon Mar 11"`) + case name (truncated 20 chars) + status badge + `"Open →"` link.  
**Data source:** Filter existing `recentJobs` — no new API call.  
**Empty state:** Calendar icon + `"No upcoming depositions"` + `"Schedule one →"` → `/calendar`.

---

## TASK 3 — SCOPIST DASHBOARD OVERHAUL

**File to modify:** `app/(dashboard)/scopist/page.tsx`  
**New components:**
- `components/dashboard/scopist/scopist-stats-bar.tsx`
- `components/dashboard/scopist/assigned-jobs-panel.tsx`
- `components/dashboard/scopist/wkt-progress-widget.tsx`
- `components/dashboard/scopist/scopist-tool-launcher.tsx`

### Dashboard Layout

```
┌────────────────────────────────────────────────────────┐
│  GREETING HEADER  [Continue Review CTA]                │
├────────────────────────────────────────────────────────┤
│  STATS BAR  (4 cards)                                  │
├────────────────────────────────┬───────────────────────┤
│  ASSIGNED JOBS PANEL  (65%)    │  RIGHT SIDEBAR (35%)  │
│  - Priority jobs               │  WKT Progress Widget  │
│  - Recently completed          │  Tool Launcher        │
└────────────────────────────────┴───────────────────────┘
```

### 3.1 — Stats Bar (`scopist-stats-bar.tsx`)

`violet` accent throughout:
1. **Assigned** — jobs assigned to me, not yet submitted
2. **In Progress** — jobs I've started (reviewed at least 1 word)
3. **Submitted This Month** — SUBMITTED or COMPLETED in current month
4. **WKT Score** — latest mock exam % or `"—"` if none taken

### 3.2 — Assigned Jobs Panel (`assigned-jobs-panel.tsx`)

Identical structure to Task 2.3 but `violet` accent.

**PRIORITY badge** if job was assigned more than 48 hours ago and `progress < 100`.

**"Recently Completed" collapsible section:**
- Header with toggle chevron — collapsed by default (`useState`)
- Shows SUBMITTED/COMPLETED jobs from last 7 days
- Columns: case name, date completed, `"View"` link, `"Export"` link

**Empty state:** `ClipboardList` icon + `"No assignments yet"` + `"Practice with WKT →"` → `/wkt`

### 3.3 — WKT Progress Widget (`wkt-progress-widget.tsx`)

`'use client'` component. On mount, fetch `/api/wkt/progress`.

Show while loading: skeleton bars matching content shape.  
On error: `"WKT data unavailable"` with retry button.

Content:
- Header: `"Word Knowledge Training"` + `"Go to WKT →"` link
- Overall progress: horizontal bar (`h-3 rounded-full bg-violet-500`)
- 6 category rows: Medical 🏥 · Legal ⚖️ · Grammar 📖 · Spelling ✏️ · Texas Rules 📋 · Reporter Duties 💼
  - Each: category name + mini bar + `"{N}%"` score
- Latest mock exam score (if available) as large number with PASS/FAIL badge
- Two buttons: `"Practice"` → `/wkt/practice` · `"Mock Exam"` → `/wkt/mock-exam`

### 3.4 — Tool Launcher (`scopist-tool-launcher.tsx`)

`grid-cols-2 gap-3` — 6 buttons, `violet` accent:

| Icon | Name | Route |
|------|------|-------|
| `Headphones` | Review Transcripts | `/jobs?filter=assigned` |
| `BookOpen` | WKT Flashcards | `/wkt/flashcards` |
| `GraduationCap` | Mock Exam | `/wkt/mock-exam` |
| `TrendingUp` | My Progress | `/wkt/progress` |
| `FileText` | Transcripts | `/transcripts` |
| `Download` | Export Center | `/exports` |

---

## TASK 4 — ATTORNEY DASHBOARD OVERHAUL

**File to modify:** `app/(attorney)/attorney-dashboard/page.tsx`  
**New components:**
- `components/dashboard/attorney/attorney-tool-launcher.tsx`
- `components/dashboard/attorney/shared-transcripts-panel.tsx`
- `components/dashboard/attorney/annotation-summary.tsx`

### Dashboard Layout

```
┌────────────────────────────────────────────────────────┐
│  GREETING HEADER  [View Transcripts CTA]               │
├────────────────────────────────────────────────────────┤
│  STATS BAR  (4 cards — blue accent)                    │
├────────────────────────────────┬───────────────────────┤
│  SHARED TRANSCRIPTS  (65%)     │  RIGHT SIDEBAR (35%)  │
│  - Grouped by case             │  Tool Launcher        │
│  - Access level badges         │  Annotation Summary   │
│  - Open/Download buttons       │  Upcoming Depositions │
└────────────────────────────────┴───────────────────────┘
```

### 4.1 — Stats Bar

`blue` accent:
1. **Total Cases** — count of unique case names in `recentTranscripts`
2. **Accessible Transcripts** — all transcripts shared with me
3. **Upcoming Depositions** — depositionDate > now
4. **My Annotations** — `stats.annotations` count

### 4.2 — Shared Transcripts Panel (`shared-transcripts-panel.tsx`)

Group transcripts by case name. For each case group:
- Case header: `Briefcase` icon + case name + case number
- Deponent rows: deponent name · deposition date · access level badge · status badge · `"Open Transcript"` button

**Access level badges:**
- `VIEW`: `bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs font-medium`
- `COMMENT`: `bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-medium`
- `EDIT`: `bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs font-medium`

**Empty state:** `Scale` icon + `"No transcripts have been shared with you yet."` + `"Contact the reporting firm for access"` in `text-slate-500`.

### 4.3 — Tool Launcher (`attorney-tool-launcher.tsx`)

`grid-cols-1 gap-2` (vertical, sidebar context) — 5 buttons, `blue` accent:

| Icon | Name | Route |
|------|------|-------|
| `FileText` | Transcript Library | `/attorney/transcripts` |
| `Briefcase` | Case Files | `/attorney/cases` |
| `Tag` | Annotations | `/attorney/transcripts` |
| `Calendar` | Depositions | `/calendar` |
| `User` | My Profile | `/attorney/profile` |

### 4.4 — Annotation Summary (`annotation-summary.tsx`)

Compact card showing annotation breakdown from `stats.annotations`:
- 🟡 Highlights count · 📝 Notes count · 🔖 Bookmarks count
- Total count
- `"View All Annotations →"` link

---

## TASK 5 — ADMIN DASHBOARD OVERHAUL

**File to modify:** `app/(dashboard)/admin/page.tsx`  
**New components:**
- `components/dashboard/admin/admin-kpi-header.tsx`
- `components/dashboard/admin/admin-tool-grid.tsx`

### Dashboard Layout

```
┌────────────────────────────────────────────────────────┐
│  KPI HEADER  (6 tiles across full width)               │
├────────────────────────────────────────────────────────┤
│  ADMIN TOOL GRID  (3-column — 9 tool area cards)       │
├────────────────────────────────┬───────────────────────┤
│  RECENT JOBS (existing)  60%   │  SYSTEM HEALTH (exist)│
├────────────────────────────────┴───────────────────────┤
│  ACTION CONSOLE + RX QUEUE  (existing — full width)    │
└────────────────────────────────────────────────────────┘
```

### 5.1 — KPI Header (`admin-kpi-header.tsx`)

`grid-cols-3 lg:grid-cols-6`, `slate` accent. Each tile: icon circle + large number + label + `border-b-2` accent underline.

1. **Total Users** (`Users`, `blue`)
2. **Total Jobs** (`Briefcase`, `green`)
3. **Active Firms** (`Building2`, `purple`)
4. **Active Jobs** (`Activity`, `amber`)
5. **This Month** (`Calendar`, `teal`) — filter recentJobs by current month
6. **System Status** (`Shield`, `green`) — static `"Operational"` label

**Data source:** Existing `totalUsers`, `totalJobs`, `totalFirms`, `activeJobs` in `admin/page.tsx`. No new fetching.

### 5.2 — Admin Tool Grid (`admin-tool-grid.tsx`)

`grid-cols-1 md:grid-cols-3 gap-4` — 9 tool area cards (~`240px` tall each):

Each card: large icon (`h-10 w-10`) + title (`text-lg font-bold`) + 2–3 sentence description + 3–4 capability bullet points + full-width `"Open →"` button.

| # | Icon | Title | Route | Accent |
|---|------|-------|-------|--------|
| 1 | `Users` | User Management | `/settings/users` | `blue` |
| 2 | `Briefcase` | Jobs & Transcriptions | `/jobs` | `indigo` |
| 3 | `Building2` | Firm Management | `/settings/firms` | `violet` |
| 4 | `BarChart3` | Reports & Analytics | `/reports` | `teal` |
| 5 | `Shield` | Audit & Compliance | `/reports/audit-log` | `green` |
| 6 | `Zap` | Feature Flags | `/admin/features` | `amber` |
| 7 | `HeartPulse` | System Health | `/admin` | `red` |
| 8 | `RefreshCw` | RX Queue | `/admin/rx-queue` | `orange` |
| 9 | `Settings` | Platform Settings | `/settings` | `slate` |

---

## TASK 6 — /tools DIRECTORY PAGE

**New file:** `app/(dashboard)/tools/page.tsx`  
**New component:** `components/tools/tool-directory.tsx`

### Objective

Create a `/tools` route that serves as the platform's tool discovery hub. Every tool in the system is listed here, organized by category and role. This is the page a new user visits to understand what the platform can do.

### Page Layout

```
┌────────────────────────────────────────────────────────┐
│  Header: "Platform Tools"                              │
│  "Explore every tool available on Depo-Pro"            │
├────────────────────────────────────────────────────────┤
│  FILTER BAR: All · Reporter · Scopist · Attorney · Admin│
├────────────────────────────────────────────────────────┤
│  TOOL CARDS  (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)│
│  Each card: icon · name · description · roles · [Launch]│
└────────────────────────────────────────────────────────┘
```

### Tool Card Structure

```tsx
interface ToolEntry {
  id: string;
  icon: LucideIcon;
  name: string;
  description: string;         // 2–3 sentences
  roles: UserRole[];           // which roles can use this tool
  route: string;               // launch destination
  accentColor: string;         // Tailwind color name
  status: 'live' | 'coming-soon';
}
```

### Tool Entries

| Name | Description | Roles | Route | Accent |
|------|-------------|-------|-------|--------|
| High-Accuracy Transcription | Deepgram Nova-3 AI pipeline for depositions. Upload audio and receive a word-level timestamped transcript. | Reporter, Admin | `/transcription-tool` | `indigo` |
| Synchronized Review | Waveform audio player synchronized to the transcript. Click any word to seek. Tab through flagged words. | Reporter, Scopist, Admin | `/jobs` | `violet` |
| Flagged Word Correction | Review low-confidence words identified by AI. Correct, accept, or mark each word while listening to audio. | Reporter, Scopist, Admin | `/jobs` | `amber` |
| Transcript Editor | Full-featured legal transcript editor with change tracking and speaker mapping. | Reporter, Scopist, Admin | `/transcripts` | `blue` |
| Word Knowledge Training | Flashcard-based training program for scopists covering medical, legal, grammar, and Texas court rules. | Scopist, Reporter | `/wkt` | `violet` |
| Mock Certification Exam | Timed practice exam matching the CSR exam category distribution. Scored with pass/fail result. | Scopist, Reporter | `/wkt/mock-exam` | `purple` |
| Deposition Notes | Real-time timestamped notes during a recording. Categorized by type — speaker correction, exhibit, objection, etc. | Reporter | `/jobs` | `teal` |
| Proper Nouns Manager | Capture names, places, and technical terms during a job. Prevents AI from mis-transcribing unfamiliar words. | Reporter, Admin | `/jobs` | `green` |
| Export Center | Generate and download DOCX, PDF, and text exports of finalized transcripts. | All roles | `/exports` | `emerald` |
| Medical Chronology | AI-powered extraction of medical events from records. Generates a structured chronological timeline. | Admin, Medical (Phase 2) | `/jobs/[id]/medical` | `rose` |
| Scheduling Calendar | Manage deposition events, availability, and assignments. View month and week calendar. | Reporter, Admin | `/calendar` | `teal` |
| Audit Log | Tamper-evident log of all platform actions. Search by user, date, and action type. | Admin | `/reports/audit-log` | `slate` |
| Feature Flags | Enable or disable platform features per firm or globally. Manage phased rollouts. | Admin | `/admin/features` | `amber` |
| System Health Monitor | Real-time status of all platform services: Deepgram, Supabase, storage, email. | Admin | `/admin` | `red` |
| Attorney Transcript Viewer | Clean legal-format transcript reader with annotation tools, search, and audio playback. | Attorney | `/attorney-dashboard` | `blue` |

**Filter bar logic:** `useState` for active role filter. When a role filter is selected, cards not matching that role are `opacity-40 pointer-events-none`. "Coming Soon" cards are always `opacity-50 pointer-events-none` with a `"Coming Soon"` badge.

---

## TASK 7 — NAVIGATION ENHANCEMENTS

**Files to modify:**
- `components/layouts/app-sidebar.tsx` (minor only)
- `components/layouts/public-header.tsx` (minor only)

### 7.1 — Sidebar: Role Identity Header

At the top of the sidebar (above nav items), add a compact identity block:
- User initials in a colored avatar circle (role accent color, `w-8 h-8 rounded-full`)
- User first name
- Role badge: pill with role name (`REPORTER` / `SCOPIST` / `ATTORNEY` / `ADMIN`)

Use the `userRole` and session data already available in the sidebar props. Do not add new data fetching.

### 7.2 — Sidebar: Active Job Indicator

On the nav item that links to `/jobs`, add a pulsing green dot:
```tsx
<span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
```
This is purely decorative (no live number, no API call). It renders only when the sidebar's `userRole` is REPORTER or SCOPIST.

### 7.3 — Public Header: "Your Role" Dropdown

Add a `"Your Role"` nav item between existing items. Pure CSS hover dropdown (`group`/`group-hover:visible`):
- `z-50`, white background `bg-white dark:bg-slate-800`, `rounded-xl shadow-xl`
- 4 rows: icon + role name + one-line description + link text → `#roles` anchor
- Disappears on mouse leave
- Opens on hover (`opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200`)

---

## TASK 8 — POLISH PASS

After completing Tasks 1–7, perform a polish pass:

### 8.1 — Loading States
Every `useEffect` + `fetch` component must show skeleton loading. Use the existing `Skeleton` component from `components/ui/skeleton.tsx`. Skeleton shapes must match content shapes exactly.

### 8.2 — Empty States
Every list/table must have a proper empty state: icon + heading + body text + action button.

### 8.3 — Error Boundaries
All new data-fetching components must be wrapped in the existing `ErrorBoundary` component.

### 8.4 — Dark Mode
All new Tailwind classes must include `dark:` variants following the existing pattern.

### 8.5 — Accessibility
- All interactive elements: `aria-label`, `focus:ring-2 focus:ring-{accent}-500`
- Decorative icons: `aria-hidden="true"`
- Color alone never conveys meaning — always pair with text or icon

---

## TASK 9 — VERIFICATION & COMMIT SEQUENCE

Run after each task before committing:

```bash
# TypeScript — must not exceed baseline
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Build — must pass
npm run build 2>&1 | tail -20

# Lint — no new errors
npm run lint 2>&1 | grep "error" | head -20

# Protected files — THIS MUST PRODUCE NO OUTPUT
git diff --name-only | grep -E "middleware|session|server\.ts|schema\.prisma|migrations|app/api"
```

### Commit Sequence (one commit per task)

```
feat(home): add interactive role discovery section with tool popouts and phase-2 previews
feat(dashboard): overhaul court reporter dashboard — stats bar, priority jobs, tool launcher
feat(dashboard): overhaul scopist dashboard — assigned jobs panel and WKT progress widget
feat(dashboard): overhaul attorney dashboard — case-grouped transcripts and annotation summary
feat(dashboard): overhaul admin dashboard — KPI header and 9-tool admin grid
feat(tools): create /tools directory page with role filter and full tool catalog
feat(nav): role identity header, active job indicator, and public header role dropdown
chore(ui): polish pass — loading states, empty states, dark mode, accessibility
```

### Final Step

Update `ai_logs/change_log.md`:
- Date/time · Files created · Files modified · TypeScript error count before + after · Build status: PASS

---

## APPENDIX A — DATA AVAILABILITY

| Dashboard | Data Needed | Source |
|-----------|------------|--------|
| Reporter | Job counts by status | `jobCounts` in `reporter/page.tsx` |
| Reporter | Recent jobs list | `recentJobs` in `reporter/page.tsx` |
| Reporter | First name | `getCurrentUser()` → `user.firstName` |
| Scopist | Assigned jobs | Filter `recentJobs` by `assignedScopistId` |
| Scopist | WKT progress | Fetch `/api/wkt/progress` (existing endpoint) |
| Attorney | Shared transcripts | `recentTranscripts` in attorney dashboard |
| Attorney | Annotation counts | `stats.annotations` in attorney state |
| Admin | KPI numbers | `totalUsers`, `totalJobs`, `totalFirms`, `activeJobs` |
| Admin | Recent jobs | `recentJobs` in `admin/page.tsx` |

---

## APPENDIX B — COMPONENT FILE LOCATIONS

```
components/
  home/
    role-discovery-section.tsx       (Task 1)
  dashboard/
    reporter/
      reporter-stats-bar.tsx         (Task 2)
      active-jobs-panel.tsx          (Task 2)
      reporter-tool-launcher.tsx     (Task 2)
    scopist/
      scopist-stats-bar.tsx          (Task 3)
      assigned-jobs-panel.tsx        (Task 3)
      wkt-progress-widget.tsx        (Task 3)
      scopist-tool-launcher.tsx      (Task 3)
    attorney/
      attorney-tool-launcher.tsx     (Task 4)
      shared-transcripts-panel.tsx   (Task 4)
      annotation-summary.tsx         (Task 4)
    admin/
      admin-kpi-header.tsx           (Task 5)
      admin-tool-grid.tsx            (Task 5)
  tools/
    tool-directory.tsx               (Task 6)
app/(dashboard)/
  tools/
    page.tsx                         (Task 6)
```

---

## APPENDIX C — HARD STOPS (OUT OF SCOPE)

Stop immediately if you find yourself doing any of these:

- ❌ New database tables, columns, or migrations
- ❌ Changes to auth, session, or middleware
- ❌ New API routes
- ❌ New npm packages
- ❌ Changes to Prisma schema
- ❌ Creating dashboards for Phase 2 roles (Videographer, Interpreter, Manager, Paralegal, Medical)
- ❌ Billing or invoice UI
- ❌ Live transcription UI
- ❌ Transcript version compare UI
- ❌ Real-time WebSocket features
- ❌ Changes to Supabase storage bucket configuration

---

*Depo-Pro UI/UX Overhaul Mega-Prompt  ·  Version 2.0*  
*Updated with full role set including Medical roles under Law Firms*  
*Prepared for Claude Code autonomous execution*

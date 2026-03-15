# ═══════════════════════════════════════════════════════════════════════════════
# DEPO-PRO — PHASE 1A: REPOSITORY BASELINE VERIFICATION
# Autonomous Pre-Flight Prompt for Codex CLI / Claude Code
#
# Save to:  ai_prompts/phases/phase_01a_preflight_verification.md
# Session:  claude code --no-resume
# Run:      BEFORE phase_01_formatter_implementation.md
# Version:  1.0 — Self-Contained
#
# This prompt verifies the repository is in a known-good state before any
# Phase 1 code generation begins. It creates missing directories, writes
# missing architecture files from embedded content, and confirms that the
# Phase A database migrations have been applied to Supabase.
#
# Exit criterion: All checks pass and report is written to ai_logs/preflight.md
# ═══════════════════════════════════════════════════════════════════════════════

---

## MISSION

Verify and prepare the Depo-Pro repository for Phase 1 formatter
implementation. This is a read-and-create task only — no application
code is written. No commits are made unless a missing file is created.

This prompt does four things:

1. Creates any missing repository directories
2. Verifies or creates all required architecture reference files
3. Confirms Phase A database tables exist in Supabase
4. Writes a pre-flight report to `ai_logs/preflight.md`

Do not proceed to Phase 1 formatter implementation until this report
shows all checks passing.

---

## EMBEDDED PLATFORM CONTEXT

You are working inside the Depo-Pro repository.

**Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS · Supabase
(PostgreSQL + RLS + Storage) · Deepgram Nova-3 · Anthropic Claude API · Vercel

**Auth:** Supabase SSR only — `createSupabaseServerClient()` from
`lib/supabase/server.ts`. Profiles table: `profiles` — never `users`.
Env key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Frozen files — never modify:**
```
lib/supabase/server.ts
lib/supabase/client.ts
lib/auth/session.ts
middleware.ts
supabase/migrations/**  (existing files — new files may be added)
```

---

## STEP 1 — CREATE MISSING DIRECTORIES

Check for each directory. Create any that are missing.
Do not delete or modify existing directories.

```
ai_prompts/
ai_prompts/architecture/
ai_prompts/phases/
ai_prompts/governance/
docs/
docs/specs/
docs/architecture/
docs/guides/
lib/transcription/
lib/transcription/formatter/
lib/transcription/hydration/
tests/
tests/unit/
tests/unit/formatter/
tests/integration/
tests/fixtures/
ai_logs/
scripts/
```

Log each directory: `[CREATED]` or `[EXISTS]`.

---

## STEP 2 — VERIFY ARCHITECTURE FILES

Check each file below. If it exists, log `[EXISTS]` and move on.
If it is missing or empty (< 50 bytes), create it with the embedded
content provided.

### FILE: ai_prompts/architecture/CORE_ARCHITECTURE_RULES.md

```markdown
# Depo-Pro — Core Architecture Rules
# These rules apply to every AI coding session without exception.
# Version: 1.0

---

## RULE 1 — Authentication Architecture (IMMUTABLE)

Supabase SSR auth only. No NextAuth. No JWT rolling your own.

- Server client: `createSupabaseServerClient()` from `lib/supabase/server.ts`
- Client component: `createSupabaseBrowserClient()` from `lib/supabase/client.ts`
- Session helper: `lib/auth/session.ts`
- Auth failures → `/unauthorized?reason=missing_profile` — NEVER redirect to `/login`

## RULE 2 — Database Key

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — this is the Supabase anon key
in new publishable format. NEVER use `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## RULE 3 — Profiles, Not Users

User data lives in `profiles` table. NEVER query `users` table.
`profiles.id` = `auth.users.id` (same UUID).

## RULE 4 — Multi-Tenant Isolation

Every query must include `firm_id` scoping.
Every new table must have `firm_id UUID NOT NULL REFERENCES firms(id)`.
RLS must be enabled on every new table.
Never return data across firm boundaries.

## RULE 5 — Verbatim Mandate

Legal transcripts are immutable records.
`transcript_words.original_word` — set once on Deepgram ingest, never changed.
`transcriptions.deepgram_raw_json` — set once, never changed.
Corrections go in `corrected_word` column only.
Hard DELETE is prohibited on `transcript_words`.

## RULE 6 — Route Protection

All API routes use `withRouteProtection()` from
`lib/middleware/withRouteProtection.ts`.
No inline role checks in route handlers.
Roles: ADMIN | COURT_REPORTER | SCOPIST | ATTORNEY

## RULE 7 — Job State Machine (One-Way)

```
PENDING → UPLOADING → PROCESSING → TRANSCRIBED → IN_REVIEW
       → SCOPIST_COMPLETE → REPORTER_REVIEW → COMPLETED → EXPORTED
```
Invalid transitions → HTTP 422.

## RULE 8 — Reporter Label

`THE COURT REPORTER` → `THE REPORTER` everywhere in output.
This applies to paragraph text AND speaker labels.

## RULE 9 — Em Dash Prohibition

`—` (U+2014) and `–` (U+2013) → `--` (double hyphen) in ALL transcript output.
No exceptions. The post-processor enforces this. The quality gate checks it.

## RULE 10 — No Breaking Changes

During beta stabilization:
- No Prisma schema modifications
- No new authentication architecture
- No Supabase storage configuration changes
- No new npm dependencies without explicit instruction
- No new pages or routes beyond what is specified in the active prompt
```

### FILE: ai_prompts/architecture/AI_CONTEXT.md

```markdown
# Depo-Pro — AI Agent Context
# Read this file at the start of every coding session.
# Version: 1.0

---

## Project

Depo-Pro — multi-tenant legal deposition transcription SaaS

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router · React · TypeScript · Tailwind CSS |
| Backend | Next.js API Routes · Supabase PostgreSQL |
| Auth | Supabase SSR (cookie-based) |
| Storage | Supabase Storage (3 buckets: depo-audio, depo-files, depo-exports) |
| Transcription | Deepgram Nova-3 |
| AI | Anthropic Claude API |
| Deployment | Vercel (auto-deploy on git push) |
| Email | Resend via notifications@depo-pro.com |

## Environment Variables (Required)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   ← new publishable format, NOT anon key
SUPABASE_SERVICE_ROLE_KEY
DEEPGRAM_API_KEY
USE_DEEPGRAM
ANTHROPIC_API_KEY
CRON_SECRET
NEXT_PUBLIC_APP_URL
```

Deprecated (delete, do not use):
```
NEXTAUTH_SECRET
NEXTAUTH_URL
DATABASE_URL
DIRECT_URL
```

## User Roles

| Role | Description |
|---|---|
| ADMIN | Full system access, firm management |
| COURT_REPORTER | Creates jobs, uploads audio, reviews transcripts |
| SCOPIST | Reviews and corrects flagged words |
| ATTORNEY | Read-only access to finalized transcripts |

## Core Table Groups

**Job lifecycle:** firms · profiles · cases · depositions · jobs
**Transcript data:** transcriptions · transcript_words · transcript_paragraphs
**Correction layer:** flagged_words · transcription_edits · transcript_flags
**Speaker system:** speaker_assignments · participants
**Export system:** exports · export_certifications
**AI layer:** ai_suggestions · ai_rules · vocabulary_terms

## Confidence Thresholds

| Class | Confidence | Action |
|---|---|---|
| HIGH | ≥ 0.90 | No review needed |
| MEDIUM | 0.80–0.89 | Listen recommended |
| LOW | 0.70–0.79 | Review required |
| CRITICAL | < 0.70 | Must correct before export |

## Known Misrecognition: Miah Bardot

Court reporter on Bourbois depositions: **Miah Bardot** (B-A-R-D-O-T)
CSR #12129 · SA Legal Solutions

Deepgram misrecognizes as:
- `"Miyamardeau"` (most common)
- `"Mia Bardeau"`

Response: Flag as CRITICAL, surface to scopist. Never auto-correct.

## Formatter Rules (Texas UFM)

- 25 lines per page
- Courier New 12pt
- Left margin: 1.0" · Right margin: 0.375"
- Tab 1 (Q./A. label): 5 spaces
- Tab 2 (Q./A. text): 10 spaces
- Tab 3 (colloquy): 15 spaces
- Em dash → double hyphen (always)
- THE COURT REPORTER → THE REPORTER (always)
- Time: 2:12 p.m. format (not PM, not pm)
```

### FILE: ai_prompts/governance/FROZEN_FILES.md

```markdown
# Depo-Pro — Frozen Files
# These files must NOT be modified by any AI coding agent.
# Version: 1.0

---

## Permanently Frozen

```
lib/supabase/server.ts
lib/supabase/client.ts
lib/auth/session.ts
middleware.ts
```

## Migration Files (Append-Only)

```
supabase/migrations/**
```
Existing migration files are frozen.
New migrations must have incremental timestamps and must not modify
existing migrations.

## Package Configuration

```
package.json         — no new dependencies without explicit instruction
next.config.*        — no changes
tsconfig.json        — no changes
```
```

### FILE: CLAUDE.md (repo root)

```markdown
# Depo-Pro — AI Agent Instructions

You are working inside the Depo-Pro repository.

## Rules

1. Read `ai_prompts/architecture/CORE_ARCHITECTURE_RULES.md` before writing any code.
2. Read `ai_prompts/architecture/AI_CONTEXT.md` for stack and context.
3. Never modify frozen files listed in `ai_prompts/governance/FROZEN_FILES.md`.
4. Never modify existing Supabase migrations.
5. Use `profiles` table — never `users`.
6. Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — never `ANON_KEY`.
7. Auth failures → `/unauthorized?reason=missing_profile` — never `/login`.
8. Every new table must have `firm_id` for multi-tenant isolation.
9. All new API routes must use `withRouteProtection()`.
10. One commit per implementation step with descriptive commit message.

## Pre-Flight Checklist (Every Session)

- [ ] `npx tsc --noEmit` passes before first commit
- [ ] `npm run build` passes before first commit
- [ ] No `@ts-ignore` in any new file
- [ ] No new pages or routes outside current prompt scope
- [ ] No new npm dependencies without explicit instruction
```

### FILE: BETA_FREEZE.md (repo root)

```markdown
# Depo-Pro — Beta Stabilization Freeze

**Status: ACTIVE**

The following constraints apply to all development work until beta
testing is complete and feedback has been incorporated.

## Frozen Architecture

- Database schema: no new tables, no column changes without migration
- Authentication: Supabase SSR only — no changes
- Storage buckets: existing configuration only
- Multi-tenant RLS: no policy changes

## Prohibited Actions

- No new npm packages without explicit approval
- No Prisma schema modifications
- No API route restructuring
- No dashboard redesigns during active testing

## Permitted Actions

- Bug fixes to existing functionality
- Adding unit and integration tests
- Phase 1 formatter implementation (explicitly approved)
- Phase 2 editor implementation (after Phase 1 exit criterion passes)
- Documentation updates

## Active Phases

- Phase 1: Transcript Formatter Pipeline — IN PROGRESS
- Phase 2: Transcript Editor — PENDING Phase 1 completion
```

---

## STEP 3 — VERIFY PHASE A DATABASE TABLES

Connect to Supabase using the service role key from environment.

Run the following check against the database. If the Supabase CLI is
available, use `supabase db diff`. Otherwise, read the migration files
to confirm the tables below were created.

Required tables for Phase 1 to proceed:

```
firms
profiles
cases
depositions
jobs
transcriptions
transcript_words
transcript_paragraphs
speaker_assignments
participants
vocabulary_terms
flagged_words
transcript_flags
ai_suggestions
jurisdiction_configs
exports
```

For each table, log: `[EXISTS]` or `[MISSING]`.

If any of the following are missing:
`transcript_words`, `transcript_paragraphs`, `speaker_assignments`,
`flagged_words`, `jurisdiction_configs`

→ Log `[BLOCKER]` and include in the preflight report.
→ These are genuine blockers for Phase 1. Do not proceed.
→ The migrations must be applied via `supabase db push` before running
  the Phase 1 formatter prompt.

If only non-critical tables are missing (e.g., `calendar_events`,
`exhibit_markers`), log `[WARNING — NON-BLOCKING]` but do not stop.

---

## STEP 4 — CHECK PHASE 1 PROMPT VERSION

Verify the Phase 1 formatter prompt is v3.0:

```bash
grep -i "Self-Contained\|Version.*3\|v3" \
  ai_prompts/phases/phase_01_formatter_implementation.md | head -3
```

If the match is found → log `[OK] Phase 1 prompt is v3.0`.
If not found → log `[WARNING] Phase 1 prompt may be outdated — verify before running`.

---

## STEP 5 — CHECK BASELINE BUILD

Run the baseline build. Document results — do NOT fix errors in this session.
This is a read-only health check.

```bash
npx tsc --noEmit 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

Log:
- TypeScript error count (0 = clean, N = errors present)
- Build status (PASSING / FAILING)

If errors exist, document them in the pre-flight report. They must be
resolved before Phase 1 begins.

---

## STEP 6 — WRITE PRE-FLIGHT REPORT

Create: `ai_logs/preflight.md`

```markdown
# Depo-Pro — Phase 1 Pre-Flight Report
Generated: [TIMESTAMP]

## Directory Check
[list each directory with EXISTS / CREATED]

## Architecture Files
[list each file with EXISTS / CREATED / CONTENT_EMBEDDED]

## Database Tables
[list each table with EXISTS / MISSING / BLOCKER / WARNING]

## Phase 1 Prompt Version
[OK / WARNING]

## Baseline Build
TypeScript errors: [count]
Build status: [PASSING / FAILING]

## Overall Status
[READY — proceed to Phase 1] 
OR
[BLOCKED — resolve items above before proceeding]

## Blockers (if any)
[list each blocker with resolution steps]
```

---

## COMPLETION

When the report is written, output this summary:

```
╔═══════════════════════════════════════════════════════════════╗
║         DEPO-PRO — PHASE 1A PRE-FLIGHT COMPLETE              ║
╠═══════════════════════════════════════════════════════════════╣
║  Directories created/verified:   __                          ║
║  Architecture files created:     __                          ║
║  Database tables confirmed:      __ / 16                     ║
║  Baseline build status:          PASSING / FAILING           ║
║  Phase 1 prompt version:         v3.0 / UNKNOWN              ║
╠═══════════════════════════════════════════════════════════════╣
║  OVERALL: READY / BLOCKED                                     ║
║                                                               ║
║  Next step:                                                   ║
║  claude code --no-resume                                      ║
║  → Execute phase_01_formatter_implementation.md              ║
╚═══════════════════════════════════════════════════════════════╝
```

Do not begin Phase 1 implementation in this session.
This session is verification only.

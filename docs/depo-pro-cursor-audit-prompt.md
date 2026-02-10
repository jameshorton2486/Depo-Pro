# DEPO-PRO FULL CODEBASE AUDIT

## YOUR ROLE

You are a senior full-stack architect performing a comprehensive audit of the Depo-Pro codebase. This project is undergoing a major database migration from an old Prisma-era schema to a new Supabase-native schema (v1.3). Your job is to produce a structured report that identifies every file that is KEEP, REPLACE, or DELETE — and every broken reference, wrong enum, wrong table name, or dead code.

## CRITICAL CONTEXT

### Schema Migration

The deployed database is about to change from the OLD schema to the NEW v1.3 schema. These are completely different data models:

**OLD SCHEMA (what's currently deployed / what the codebase was built against):**
- Tables: `users`, `profiles`, `firms`, `cases`, `jobs`, `transcripts`, `transcript_revisions`, `calendar_events`, `google_tokens`, `audit_logs`, `user_sessions`, `incidents`, `transcript_ai_scores`, `transcription_edits`
- Roles: `ADMIN`, `REPORTER`, `SCOPIST`, `ATTORNEY`, `AGENCY`, `AGENCY_ADMIN`, `FIRM_ADMIN`
- Jobs use `created_by_id` for the reporter
- Job statuses: `CREATED`, `FILES_UPLOADED`, `ENHANCING_AUDIO`, `TRANSCRIBING`, `AI_REVIEWING`, `READY_FOR_EDIT`, `ASSIGNED`, `IN_EDIT`, `SUBMITTED_FOR_REVIEW`, `IN_REVIEW`, `SCOPIST_COMPLETE`, `REVIEW_COMPLETE`, `COMPLETED`, `CANCELLED`
- Transcription status: `PENDING`, `PROCESSING`, `COMPLETED`, `ERROR`, `CANCELLED`

**NEW v1.3 SCHEMA (what will be deployed):**
- Tables: `profiles`, `firms`, `jobs`, `custom_vocabularies`, `firm_vocabularies`, `transcriptions`, `transcription_chunks`, `flagged_words`, `silent_segments`, `transcription_edits`, `transcript_integrity_chain`, `processing_errors`, `audit_log`, `transcript_shares`
- Roles: `ADMIN`, `COURT_REPORTER`, `SCOPIST`, `ATTORNEY` (only 4 roles, no AGENCY/FIRM_ADMIN)
- Jobs use `reporter_id` and `scopist_id` (not `created_by_id`)
- Job statuses: `PENDING`, `PROCESSING`, `AI_COMPLETE`, `ASSIGNED_TO_SCOPIST`, `SCOPIST_IN_REVIEW`, `SCOPIST_COMPLETE`, `REPORTER_REVIEW`, `COMPLETED`, `ARCHIVED`, `FAILED`
- Transcription status (pipeline): `AWAITING_AUDIO`, `VALIDATING`, `CHUNKING`, `TRANSCRIBING`, `REASSEMBLING`, `EXTRACTING_FLAGS`, `COMPLETE`, `PIPELINE_FAILED`
- NEW tables with no old equivalent: `flagged_words`, `transcription_chunks`, `transcript_integrity_chain`, `custom_vocabularies`, `firm_vocabularies`, `transcript_shares`, `processing_errors`, `silent_segments`
- REMOVED tables: `users` (merged into `profiles`), `cases` (merged into `jobs`), `transcripts` (replaced by `transcriptions`), `transcript_revisions`, `calendar_events`, `google_tokens`, `user_sessions`, `incidents`, `transcript_ai_scores`
- The table `audit_logs` is renamed to `audit_log` (singular)
- `transcription_edits` exists in both but has different columns in v1.3

### Supabase Client Pattern

The project uses Supabase (NOT Prisma) with these client files that are CORRECT and should be KEPT:
- `lib/supabase/browser.ts` — `getSupabaseBrowserClient()` using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_ format)
- `lib/supabase/server.ts` — `createSupabaseServerClient()` using SSR cookies
- `lib/supabase/admin.ts` — `getSupabaseAdmin()` using `SUPABASE_SERVICE_ROLE_KEY` (sb_secret_ format)
- `lib/supabase/middleware.ts` — middleware client
- `middleware.ts` — route protection (needs role name updates only)

### Deepgram Integration

The Deepgram client at `lib/deepgram/client.ts` is CORRECT and should be KEPT:
- Uses `@deepgram/sdk` with Nova-3 model
- Has `LEGAL_TRANSCRIPTION_OPTIONS` and `LEGAL_VOCABULARY`
- Uses `keyterm` parameter (Nova-3 format, not `keywords`)

## AUDIT INSTRUCTIONS

Scan every file in the project (excluding `node_modules/`, `.next/`, `.git/`). For each category below, list every relevant file with its verdict.

### SECTION 1: FILE INVENTORY BY VERDICT

For every `.ts` and `.tsx` file, classify as one of:

**KEEP** — File is correct for v1.3, or is infrastructure that doesn't reference the schema (e.g., Tailwind config, shadcn/ui components, utility functions with no DB references)

**KEEP + UPDATE** — File is mostly correct but has specific references that need updating (list exactly what needs to change, e.g., "line 45: 'REPORTER' should be 'COURT_REPORTER'")

**REPLACE** — File's core logic targets the old schema and must be rewritten. Cannot be fixed with find-and-replace.

**DELETE** — File serves no purpose in v1.3 (references removed tables, removed features, or is dead code)

**UNKNOWN** — Cannot determine without deeper analysis

Organize by directory:
- `types/`
- `lib/supabase/`
- `lib/transcription/`
- `lib/deepgram/`
- `lib/services/`
- `lib/auth/`
- `lib/permissions/`
- `lib/` (other)
- `app/api/` (every route file)
- `app/(dashboard)/`
- `app/(auth)/`
- `app/(attorney)/`
- `app/` (other pages)
- `components/`
- `hooks/`
- `tests/`
- `scripts/`

### SECTION 2: BROKEN REFERENCES

Find every instance of these patterns and list file + line number:

**Wrong table names:**
- `.from('transcripts')` → should be `.from('transcriptions')`
- `.from('users')` → should be `.from('profiles')`
- `.from('cases')` → table removed, data merged into `jobs`
- `.from('audit_logs')` → should be `.from('audit_log')`
- `.from('transcript_revisions')` → table removed
- `.from('transcript_ai_scores')` → table removed
- `.from('calendar_events')` → table removed from v1.3 scope
- `.from('user_sessions')` → table removed
- `.from('incidents')` → table removed
- `.from('google_tokens')` → table removed

**Wrong field names:**
- `created_by_id` → should be `reporter_id`
- `assigned_to` or `assigned_to_id` → should be `scopist_id`
- `rawText` or `raw_text` → should be `original_transcript`
- `formattedText` or `formatted_text` → should be `full_transcript`
- `fullTranscript` column (if referencing old transcripts table)

**Wrong role values:**
- `'REPORTER'` → should be `'COURT_REPORTER'`
- `'AGENCY'` → removed in v1.3
- `'AGENCY_ADMIN'` → removed in v1.3
- `'FIRM_ADMIN'` → removed in v1.3
- `'PARALEGAL'` → removed in v1.3

**Wrong status values:**
- `'CREATED'` → should be `'PENDING'`
- `'FILES_UPLOADED'` → removed
- `'ENHANCING_AUDIO'` → removed
- `'TRANSCRIBING'` → should be `'PROCESSING'`
- `'AI_REVIEWING'` → removed
- `'READY_FOR_EDIT'` → removed
- `'ASSIGNED'` → should be `'ASSIGNED_TO_SCOPIST'`
- `'IN_EDIT'` → should be `'SCOPIST_IN_REVIEW'`
- `'SUBMITTED_FOR_REVIEW'` → removed
- `'IN_REVIEW'` → should be `'REPORTER_REVIEW'`
- `'REVIEW_COMPLETE'` → removed
- `'CANCELLED'` → removed (use `'ARCHIVED'`)

**Wrong transcription status values:**
- `'PENDING'` as TranscriptionStatus → should be `'AWAITING_AUDIO'`
- `'PROCESSING'` as TranscriptionStatus → should be `'TRANSCRIBING'` (or other pipeline step)
- `'COMPLETED'` as TranscriptionStatus → should be `'COMPLETE'`
- `'ERROR'` as TranscriptionStatus → should be `'PIPELINE_FAILED'`

**Dead imports:**
- Any import from `@prisma/client`
- Any import from `lib/db.ts` (Prisma client)
- Any import referencing removed files

### SECTION 3: ENUM & CONSTANTS AUDIT

List every file that defines or re-exports enums/constants and identify conflicts:
- `types/database.ts` — defines UserRole, JobStatus, TranscriptionStatus etc. (ALL WRONG for v1.3)
- `lib/enums.ts` — defines enums with Prisma reference (WRONG)
- `lib/enums/calendar.ts` — calendar enums (not in v1.3 scope)
- `lib/enums/roles.ts` — check values
- `lib/constants.ts` — defines Role, JobStatus etc. (WRONG values)

Identify: How many different locations define the same enum? Which one wins at runtime? Are there conflicts?

### SECTION 4: AUTH SYSTEM AUDIT

Trace the full authentication flow:
1. `middleware.ts` — What roles does it reference? Do they match v1.3?
2. `lib/auth.ts` — Does it query `users` table or `profiles` table?
3. `lib/auth/*.ts` — What table does each auth helper query?
4. `lib/permissions/*.ts` — What roles/statuses does it reference?
5. API routes — How do they get the current user? Do they query `users` or `profiles`?

Flag every auth-related file that queries the wrong table or uses wrong role values.

### SECTION 5: COMPONENT DEPENDENCY MAP

For each component directory, list:
- What data types it imports (old or new?)
- What API routes it calls
- Whether those API routes will exist after migration

Key directories:
- `components/transcripts/` — What transcript data structure do they expect?
- `components/review/` — What review data structure?
- `components/jobs/` — What job fields?
- `components/dashboard/` — What stats/views?
- `components/attorney/` — What data source?
- `components/audio/` — Likely reusable, verify
- `components/calendar/` — Not in v1.3 MVP scope
- `components/billing/` — Not in v1.3 MVP scope
- `components/exhibits/` — Not in v1.3 MVP scope

### SECTION 6: FEATURES OUT OF v1.3 SCOPE

Identify all code that implements features NOT in the v1.3 schema. These should be marked for archive (not delete — they may return in v2):
- Calendar/scheduling system
- Google calendar integration
- Billing/invoicing
- Exhibit management
- AI quality scoring
- Incident monitoring
- Audio enhancement (Dolby.io integration)
- Case intake
- Booking requests
- Attorney annotations/exhibits
- Rate limiting system

### SECTION 7: REUSABLE INFRASTRUCTURE

Identify files that are schema-independent and definitely reusable:
- UI components (`components/ui/*`) — shadcn/ui
- Layout components
- Tailwind configuration
- Next.js configuration
- Toast/notification setup (sonner)
- Error boundary
- Loading/skeleton components
- Theme/styling utilities
- Package.json dependencies
- Environment variable validation
- Logger setup

### SECTION 8: SUMMARY STATISTICS

Provide counts:
- Total .ts/.tsx files
- Files to KEEP (no changes)
- Files to KEEP + UPDATE (minor fixes)
- Files to REPLACE (full rewrite)
- Files to DELETE (dead code)
- Files to ARCHIVE (out of v1.3 scope)
- Files with broken table references
- Files with wrong role values
- Files with wrong status values
- Files with Prisma imports

### SECTION 9: RECOMMENDED EXECUTION ORDER

Based on the audit findings, suggest the safest order to make changes:
1. What to create first (new types/enums)
2. What to delete first (clearly dead code)
3. What order to replace files (dependency chain)
4. What can be done in parallel

## OUTPUT FORMAT

Produce the report as a structured markdown document with clear tables. For each file, include the full path relative to project root. For broken references, include line numbers when possible.

Be exhaustive. Every .ts and .tsx file must appear somewhere in the report. Do not skip files or summarize with "and X others."

# Depo-Pro v1.3 Implementation Plan
**Based on:** depo-pro-mega-prompts-v1.3.docx
**Schema Version:** 1.3.0 (Production-Safe)
**Date:** 2026-02-09

---

## 📋 Implementation Overview

This document tracks the implementation of Depo-Pro based on the v1.3 schema and mega-prompt library.

**Total Scope:** 7 Phases | 10 Mega Prompts | ~28 Days

---

## Phase Status

| Phase | Description | Status | Days | Priority |
|-------|-------------|--------|------|----------|
| **0** | Prerequisites (Manual) | ⏸️ Pending | Manual | 🔴 BLOCKING |
| **1** | TypeScript Foundation | ✅ Complete | 1-2 | 🔴 BLOCKING |
| **2** | API Routes | ⏸️ Pending | 3-5 | 🔴 BLOCKING |
| **3** | Transcription Pipeline | ⏸️ Pending | 6-10 | 🟡 Core |
| **4** | Review UI (Core Differentiator) | ⏸️ Pending | 11-16 | 🟡 Core |
| **5** | Dashboards & Export | ⏸️ Pending | 17-20 | 🟢 Polish |
| **6** | Integration Testing | ⏸️ Pending | 21-24 | 🟢 QA |
| **7** | Deployment (Vercel) | ⏸️ Pending | 25-28 | 🟢 Ops |

---

## 📌 Phase 0: Prerequisites (Manual Steps)

**Status:** ⏸️ **PENDING USER COMPLETION**

### Checklist

- [ ] **Deploy v1.3 Schema to Supabase**
  - Open Supabase SQL Editor
  - Execute `depo-pro-schema-v1.3.sql`
  - Verify all tables, functions, RLS policies created

- [ ] **Configure Storage Buckets**
  - Create `depo-audio` (2GB max, MIME: audio/*, video/*)
  - Create `depo-exports` (50MB max)
  - Create `depo-chunks` (100MB max, service role only)

- [ ] **Enable pg_cron**
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  SELECT cron.schedule(
    'cleanup-locks',
    '*/5 * * * *',
    'SELECT cleanup_expired_locks()'
  );
  ```

- [ ] **Generate TypeScript Types**
  ```bash
  npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase-generated.ts
  ```

- [ ] **Install Dependencies**
  ```bash
  npm install @supabase/supabase-js @supabase/ssr @deepgram/sdk docx fluent-ffmpeg @ffmpeg-installer/ffmpeg
  npm install -D @types/fluent-ffmpeg
  ```

- [ ] **Environment Variables**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DEEPGRAM_API_KEY`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`

---

## 🏗️ Phase 1: TypeScript Foundation (Days 1-2)

**Goal:** Typed interfaces, query helpers, audit service
**Tool:** Codex CLI or Claude Code
**Dependencies:** Phase 0 complete

### Tasks

#### 1A: Core Type Definitions & Enums
- [x] Create `types/schema-enums.ts`
  - UserRole, JobStatus, TranscriptionStatus, FlaggedWordStatus
  - EditType, AuditAction, ChunkStatus, TranscriptionSource
- [x] Create `types/transcription.ts`
  - TranscriptionWord, TranscriptionSegment, SpeakerInfo
  - ChunkingConfig, PipelineProgress, FlaggedWordRow, AudioChunk
- [x] Delete old `lib/enums.ts` (not needed - kept old constants as backup)
- [x] Update `lib/constants.ts` to re-export from schema-enums

#### 1B: Query Layer & Audit Service
- [x] Create `lib/supabase/queries/jobs.ts`
  - getJobById, getJobsForReporter, getJobsForScopist, getJobsForFirm
  - createJob, updateJob, updateJobStatus
- [x] Create `lib/supabase/queries/transcriptions.ts`
  - getTranscription, getTranscriptionStatus, createTranscription, updateTranscription
- [x] Create `lib/supabase/queries/flagged-words.ts`
  - getFlaggedWords, getFlaggedWordById, updateFlaggedWord, getFlaggedWordStats
- [x] Create `lib/supabase/queries/locks.ts`
  - acquireJobLock, releaseJobLock, getJobLockStatus
- [x] Create `lib/supabase/queries/shares.ts`
  - createShare, getSharesForJob, getSharesForAttorney, revokeShare
- [x] Create `lib/supabase/queries/vocabulary.ts`
  - getJobVocabulary, addJobTerm, getFirmVocabulary, addFirmTerm
- [x] Create `lib/services/audit.ts`
  - AuditService static class with all audit methods
- [x] Create `lib/supabase/queries/index.ts` (re-exports)
- [x] Delete old query files (backed up to old-prisma-backup/)

### Verification
- [x] TypeScript compiles clean - **PARTIAL**: New files are correct, old API routes need Phase 2 updates
- [x] No import errors in new query files
- [x] All query functions return `{ data, error }` pattern

---

## 🛣️ Phase 2: API Routes (Days 3-5)

**Goal:** Complete REST API surface
**Tool:** Codex CLI
**Dependencies:** Phase 1 complete

### Route Groups

#### Group 1: Job Management
- [ ] `app/api/jobs/route.ts` (GET list, POST create)
- [ ] `app/api/jobs/[id]/route.ts` (GET detail, PATCH update, DELETE archive)
- [ ] `app/api/jobs/[id]/assign/route.ts` (POST assign scopist)
- [ ] `app/api/jobs/[id]/lock/route.ts` (POST acquire, DELETE release, GET status)
- [ ] `app/api/jobs/[id]/status/route.ts` (PATCH update status)

#### Group 2: Transcription
- [ ] `app/api/jobs/[id]/transcribe/route.ts` (POST start pipeline)
- [ ] `app/api/transcriptions/[id]/route.ts` (GET full transcription)
- [ ] `app/api/transcriptions/[id]/status/route.ts` (GET progress)
- [ ] `app/api/transcriptions/[id]/flagged-words/route.ts` (GET paginated list)
- [ ] `app/api/transcriptions/[id]/flagged-words/[wordId]/route.ts` (PATCH correction)

#### Group 3: Export
- [ ] `app/api/transcriptions/[id]/export/route.ts` (GET generate document)

#### Group 4: Vocabulary
- [ ] `app/api/jobs/[id]/vocabulary/route.ts` (GET merged, POST add term)

#### Group 5: Attorney Sharing
- [ ] `app/api/jobs/[id]/share/route.ts` (POST create share, GET list)
- [ ] `app/api/jobs/[id]/share/[shareId]/route.ts` (DELETE revoke)
- [ ] `app/api/attorney/shared/route.ts` (GET attorney's shared transcripts)

#### Group 6: Health
- [ ] `app/api/health/route.ts` (GET system health)

### Standards Checklist
- [ ] All routes return `{ data, error? }` JSON
- [ ] HTTP status codes: 200, 201, 400, 401, 403, 404, 500
- [ ] Zod validation for request bodies
- [ ] Audit logging on all mutations
- [ ] Consistent error handling with try/catch

---

## ⚙️ Phase 3: Transcription Pipeline (Days 6-10)

**Goal:** Audio → Transcription → Flagged Words
**Tool:** Codex CLI + Claude Code
**Dependencies:** Phase 2 complete

### 3A: Pipeline Services
- [ ] `lib/transcription/validate.ts`
  - validateAudio() using ffprobe
  - Check format, duration, size, channels
- [ ] `lib/transcription/chunking.ts`
  - chunkAudio() splits audio into 30-min chunks with 5s overlap
  - Uses fluent-ffmpeg
- [ ] `lib/transcription/deepgram.ts`
  - transcribeChunk() calls Deepgram Nova-3
  - Handles keywords, retry logic
- [ ] `lib/transcription/reassemble.ts`
  - reassembleChunks() merges chunks
  - Deduplicates overlaps, merges speakers

### 3B: Pipeline Orchestrator
- [ ] `lib/transcription/pipeline.ts`
  - processTranscriptionJob() orchestrates full pipeline
  - RESUMABLE: picks up from last incomplete step
  - Sequence: VALIDATING → CHUNKING → TRANSCRIBING → REASSEMBLING → EXTRACTING_FLAGS → COMPLETE
  - Error handling with log_processing_error RPC
  - Temp file cleanup in finally block

### Verification
- [ ] Test with 10-second audio file
- [ ] Test with 2-minute audio file (multi-chunk)
- [ ] Verify chunking creates proper boundaries
- [ ] Verify Deepgram calls succeed
- [ ] Verify flagged_words extracted correctly

---

## 🎨 Phase 4: Flagged Word Review UI (Days 11-16)

**Goal:** Core differentiator - scopist reviews low-confidence words
**Tool:** Cursor
**Dependencies:** Phases 1-3 complete

### Components
- [ ] `components/transcripts/AudioPlayer.tsx`
  - Play/pause, seek, speed control, volume
  - Keyboard shortcuts (Space, arrows)
  - Exposes seekTo() method via ref
- [ ] `components/transcripts/FlaggedWordPanel.tsx`
  - List of flagged words with confidence badges
  - Context display, alternatives
  - Correction input, action buttons
  - Progress bar, filters, sorting
  - Auto-highlight current word, keyboard nav
- [ ] `components/transcripts/TranscriptPanel.tsx`
  - Full transcript with word-level spans
  - Speaker labels, line numbers
  - Highlight current word, flagged words, corrections
  - Click-to-seek functionality
- [ ] `app/(dashboard)/jobs/[id]/review/page.tsx`
  - 3-panel layout (Audio top, Transcript left, Flagged right)
  - Lock acquisition on load
  - Optimistic updates on correction
  - Submit review / Save & continue buttons

### Features Checklist
- [ ] Audio playback syncs with transcript
- [ ] Click word → seek audio
- [ ] Corrections save via API
- [ ] Progress tracking (X of Y reviewed)
- [ ] Keyboard shortcuts functional
- [ ] Lock prevents concurrent editing
- [ ] Read-only mode if locked by other user

---

## 📊 Phase 5: Dashboards & Export (Days 17-20)

**Goal:** Role-based dashboards and DOCX export
**Tool:** Cursor (UI) + Codex CLI (export)

### 5A: Dashboards
- [ ] `app/(dashboard)/reporter/page.tsx`
  - Stats cards, job table, status filters
  - Uses reporter_job_dashboard view
- [ ] `app/(dashboard)/scopist/page.tsx`
  - Review queue with progress bars
  - Uses scopist_review_queue view
- [ ] `app/(dashboard)/attorney/page.tsx`
  - Read-only shared transcripts
  - Uses attorney_shared_transcripts view
- [ ] `app/(dashboard)/admin/page.tsx`
  - Firm-wide overview
  - Tabs: Jobs | Users | Audit Log
- [ ] `components/jobs/CreateJobModal.tsx`
  - Multi-step: Case info → Audio upload → Vocabulary → Submit
  - Triggers transcription on completion

### 5B: Export Service
- [ ] `lib/services/export.ts`
  - exportToDOCX() generates legal transcript format
  - Title page, Appearance page, 25 lines/page, line numbers
  - Certification page with reporter signature
  - exportToTXT() plain text version

---

## 🧪 Phase 6: Integration Testing (Days 21-24)

**Goal:** Verify end-to-end correctness and security
**Tool:** Claude Code (Vitest)

### Test Suites
- [ ] `tests/e2e/full-pipeline.test.ts`
  - Complete workflow: create job → upload → transcribe → review → export → share
  - Verify integrity chain, audit log
- [ ] `tests/security/rls.test.ts`
  - Cross-firm isolation (C-1 verification)
  - Attorney restrictions (C-2 verification)
  - Scopist access controls
- [ ] `tests/security/integrity.test.ts`
  - Hash chain verification
  - Immutability trigger tests
  - Race condition test (C-3 verification)
- [ ] `tests/performance/flagged-words.test.ts`
  - 72K words extraction < 10s (C-4 verification)
  - Query performance benchmarks
  - Re-extraction preserves reviewed words

### Test Coverage Goals
- [ ] All API routes tested
- [ ] All RLS policies verified
- [ ] All critical functions tested
- [ ] Performance benchmarks pass

---

## 🚀 Phase 7: Deployment (Days 25-28)

**Goal:** Production deployment on Vercel with serverless timeout handling
**Tool:** Codex CLI

### Serverless Strategy
- [ ] `app/api/jobs/[id]/transcribe/process-chunk/route.ts`
  - Process one chunk at a time (< 60s each)
  - Chain to next chunk on completion
- [ ] `app/api/jobs/[id]/transcribe/reassemble/route.ts`
  - Final reassembly after all chunks complete
- [ ] `app/api/jobs/[id]/transcribe/resume/route.ts`
  - Resume failed pipeline from last checkpoint
- [ ] Update `lib/transcription/pipeline.ts` for chunk chain
- [ ] Configure `next.config.ts` and `vercel.json`
  - maxDuration per route
  - serverExternalPackages
- [ ] Update `middleware.ts` for v1.3 role names
- [ ] Update `app/api/health/route.ts` to verify all services

### Production Checklist
- [ ] Environment variables set in Vercel
- [ ] Database schema deployed
- [ ] Storage buckets configured
- [ ] pg_cron scheduled job active
- [ ] Health check passing
- [ ] Monitor first production transcription

---

## 📝 Implementation Notes

### What to KEEP from Current Codebase
- ✅ `lib/supabase/browser.ts` (browser client)
- ✅ `lib/supabase/server.ts` (server client)
- ✅ `lib/supabase/admin.ts` (service role client)
- ✅ `lib/supabase/middleware.ts`
- ✅ `lib/deepgram/client.ts` (Deepgram singleton)
- ✅ `middleware.ts` (needs role name updates)
- ✅ Tailwind config
- ✅ shadcn/ui components
- ✅ `package.json` dependencies

### What to REPLACE Entirely
- ❌ `types/database.ts` (wrong enums/tables)
- ❌ `lib/enums.ts` (old schema)
- ❌ `lib/constants.ts` (old enums)
- ❌ `lib/supabase/queries/*.ts` (all query files)
- ❌ All `app/api/*` routes (old data models)
- ❌ `lib/transcription/*.ts` (partially reusable but needs restructuring)
- ❌ `components/transcripts/*.tsx` (old structures)
- ❌ Dashboard pages (old schema)

---

## 🎯 Current Status

**Phase:** 1 (TypeScript Foundation)
**Status:** ✅ **COMPLETE** (2026-02-09)
**Next Phase:** Deploy v1.3 Schema → Phase 2

### Phase 1 Deliverables
- ✅ Created `types/schema-enums.ts` with all v1.3 enums
- ✅ Created `types/transcription.ts` with JSONB interfaces
- ✅ Created new query layer (jobs, transcriptions, flagged-words, locks, shares, vocabulary)
- ✅ Created `lib/services/audit.ts` with AuditService class
- ✅ Created new `lib/constants.ts` with v1.3 enums and UI metadata
- ✅ Backed up old Prisma-era query files to `old-prisma-backup/`
- ✅ Created deployment checklists and documentation

### 🚨 BLOCKING ISSUE
- ❌ **Supabase database still has OLD Prisma schema**
- ❌ **v1.3 schema not deployed yet**
- ✅ **v1.3 schema SQL file found:** `depo-pro-schema-v1.2.sql` (misnamed but correct)

### 🚀 IMMEDIATE NEXT ACTIONS (Before Phase 2)

**See:** `QUICK_START.md` for copy/paste commands

1. ✅ **Commit Phase 1 to git** (ready to execute)
2. ⏸️ **Deploy v1.3 schema to Supabase** (manual step - 5 min)
3. ⏸️ **Regenerate types from v1.3 schema** (run after schema deploy)
4. ⏸️ **Verify TypeScript errors reduced** (~150 → ~90)

**THEN:** Ready for Phase 2 (API Routes)

**Files Created:**
- 📄 `QUICK_START.md` - Copy/paste commands
- 📄 `DEPLOY_V13_CHECKLIST.md` - Detailed checklist
- 📄 `EXECUTE_NOW.sh` - Bash script (manual execution)
- 📄 `SCHEMA_MIGRATION_REQUIRED.md` - Full context

---

## 📞 Ready to Implement?

To begin implementation, confirm:
1. Which phase to start with (recommend Phase 1)
2. Whether Phase 0 is complete
3. Any specific requirements or constraints

Each phase can be implemented with a single mega-prompt invocation.

# lib/db.ts Migration Progress

**Started:** January 9, 2025  
**Status:** 🟡 IN PROGRESS

---

## Migration Strategy

Migrating from `lib/db.ts` Prisma-compatible wrapper to Supabase query modules in `lib/supabase/queries/`.

**Why:** 
- ❌ `lib/db.ts` uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS - security risk)
- ❌ Creates unnecessary abstraction layer
- ❌ Violates Supabase-only architecture

**Goal:** All 80 files migrated to use query modules with RLS-enforced Supabase clients.

---

## Query Module Enhancements

### ✅ Enhanced Query Modules

**`lib/supabase/queries/files.ts`**
- Added `getFileWithJob()` - Returns file with job.id, job.createdById, and job.assignments[]
- Includes camelCase aliases for backward compatibility (fileName, storagePath, mimeType)

**`lib/supabase/queries/transcripts.ts`**
- Added `getTranscriptWithTokensAndJob()` - Returns transcript with tokens (ordered), job details, files, and assignments
- Enhanced `createTranscript()` - Supports both `content` and `full_transcript` fields
- Enhanced `updateTranscript()` - Supports both `content` and `full_transcript` fields, plus `content_json`
- Added `getTranscriptNotes()` / `createTranscriptNote()` - For transcript notes
- Added `getTranscriptHighlights()` / `createTranscriptHighlight()` - For highlights
- Added `getTranscriptBookmarks()` / `createTranscriptBookmark()` - For bookmarks
- Added `getTranscriptAnnotations()` / `createTranscriptAnnotation()` / `updateTranscriptAnnotation()` / `deleteTranscriptAnnotation()` - For annotations

---

## Migration Status

### ✅ Completed (23 files)

**Files Domain (2 files)**
1. **`app/api/files/[id]/route.ts`** ✅
   - Migrated DELETE handler: `db.jobFile.findUnique()` → `getFileWithJob()`
   - Migrated GET handler: `db.jobFile.findUnique()` → `getFileWithJob()`
   - Migrated DELETE: `db.jobFile.delete()` → `deleteFile()`
   - Field names: `file.fileName` → `file.file_name` (with camelCase alias)

2. **`app/api/files/[id]/download/route.ts`** ✅
   - Migrated: `db.jobFile.findUnique()` → `getFileWithJob()`
   - Field names: `file.storagePath` → `file.storage_path`, `file.mimeType` → `file.mime_type`

**Transcripts Domain (11 files)**
3. **`app/api/transcripts/[id]/route.ts`** ✅
   - Migrated GET handler: `db.transcript.findUnique()` → `getTranscriptWithTokensAndJob()`
   - Migrated POST handler: `db.transcript.findFirst()` → `getTranscriptWithTokensAndJob()`, `db.transcript.create()` → `createTranscript()`
   - Migrated PATCH handler: `db.transcript.findUnique()` → `getTranscriptWithTokensAndJob()`, `db.transcript.update()` → `updateTranscript()`

4. **`app/api/transcripts/[id]/notes/route.ts`** ✅
   - Migrated POST: `db.transcriptNote.create()` → `createTranscriptNote()`
   - Migrated GET: `db.transcriptNote.findMany()` → `getTranscriptNotes()`

5. **`app/api/transcripts/[id]/highlights/route.ts`** ✅
   - Migrated POST: `db.transcriptHighlight.create()` → `createTranscriptHighlight()`
   - Migrated GET: `db.transcriptHighlight.findMany()` → `getTranscriptHighlights()`

6. **`app/api/transcripts/[id]/bookmarks/route.ts`** ✅
   - Migrated POST: `db.transcriptBookmark.create()` → `createTranscriptBookmark()`
   - Migrated GET: `db.transcriptBookmark.findMany()` → `getTranscriptBookmarks()`

7. **`app/api/transcripts/[id]/shares/route.ts`** ✅
   - Migrated POST: `db.transcript.findUnique()` → `getTranscriptWithTokensAndJob()`, `db.transcriptShare.create()` → `createTranscriptShare()`
   - Migrated GET: `db.transcriptShare.findMany()` → `getTranscriptShares()`

8. **`app/api/transcripts/[id]/annotations/route.ts`** ✅
   - Migrated POST: `db.transcription.findUnique()` → `getTranscriptById()`, `db.transcriptAnnotation.create()` → `createTranscriptAnnotation()`
   - Migrated GET: `db.transcriptAnnotation.findMany()` → `getTranscriptAnnotations()`

9. **`app/api/transcripts/[id]/annotations/[annotationId]/route.ts`** ✅
   - Migrated PATCH: `db.transcriptAnnotation.findFirst()` → `getTranscriptAnnotations()`, `db.transcriptAnnotation.update()` → `updateTranscriptAnnotation()`
   - Migrated DELETE: `db.transcriptAnnotation.findFirst()` → `getTranscriptAnnotations()`, `db.transcriptAnnotation.delete()` → `deleteTranscriptAnnotation()`

10. **`app/api/transcripts/[id]/finalize/route.ts`** ✅
    - Migrated: `db.job.findUnique()` → `getJobById()`, `db.transcription.findUnique()` → `getTranscriptById()`, `db.transcription.update()` → `updateTranscriptStatus()`

11. **`app/api/transcripts/[id]/exports/route.ts`** ✅
    - Migrated: `db.transcript.findUnique()` → `getTranscriptWithTokensAndJob()`, `db.auditLog.findMany()` → direct Supabase query

12. **`app/api/transcripts/[id]/words/route.ts`** ✅
    - Migrated: `db.transcription.findUnique()` → `getTranscriptWithTokensAndJob()`, `db.transcription.update()` → `updateTranscript()`, `db.transcriptionEdit.createMany()` → direct Supabase insert, `db.job.update()` → `updateJobStatus()`

13. **`app/api/transcripts/[id]/corrections/route.ts`** ✅
    - Migrated: `db.transcriptReviewSession.findUnique()` → review session from `flagged_segments`, `db.transcription.findUnique()` → `getTranscriptWithTokensAndJob()`, `db.transcription.update()` → `updateTranscript()`, `db.transcriptReviewSession.upsert()` → stored in `flagged_segments`, `db.transcriptionEdit.create()` → direct Supabase insert

**Jobs Domain (10 files)**
14. **`app/api/jobs/[id]/assign/route.ts`** ✅
    - Migrated POST: `db.user.findUnique()` → `getUserById()`, `db.job.findFirst()` → `getJobForAccessCheck()`, `db.user.findFirst()` → `getUsersByRole()`, `db.jobAssignment.findFirst()` → `getAssignmentByJobAndScopist()`, `db.jobAssignment.create()` → `createJobAssignment()`
    - Migrated DELETE: `db.user.findUnique()` → `getUserById()`, `db.job.findFirst()` → `getJobForAccessCheck()`, `db.jobAssignment.findFirst()` → `getAssignmentByJobAndScopist()`, `db.jobAssignment.delete()` → `deleteJobAssignment()`

15. **`app/api/jobs/[id]/assign-reporter/route.ts`** ✅
    - Migrated POST: `db.user.findUnique()` → `getUserById()`, `db.job.findUnique()` → `getJobById()`, `db.job.update()` → `updateJob()`, `db.calendarEvent.updateMany()` → direct Supabase update
    - Migrated DELETE: `db.user.findUnique()` → `getUserById()`, `db.job.findUnique()` → `getJobById()`, `db.job.update()` → `updateJob()`, `db.calendarEvent.updateMany()` → direct Supabase update

16. **`app/api/jobs/[id]/status/route.ts`** ✅
    - Already migrated (uses query modules)

17. **`app/api/jobs/[id]/notes/route.ts`** ✅
    - Already migrated (uses query modules)

18. **`app/api/jobs/[id]/notes/[noteId]/route.ts`** ✅
    - Already migrated (uses query modules)

19. **`app/api/jobs/route.ts`** ✅
    - Already migrated (uses query modules)

20. **`app/api/jobs/queue/route.ts`** ✅
    - No db imports (uses queue functions)

21. **`app/api/jobs/[id]/transcribe/route.ts`** ✅
    - Migrated: `db.job.findUnique()` → `getJobById()`, `db.job.update()` → `updateJobStatus()` / `updateJob()`

22. **`app/api/jobs/[id]/export/route.ts`** ✅
    - Migrated: `db.job.findUnique()` → `getJobById()`, `getTranscriptByJobId()`, `getUserById()`

23. **`app/api/jobs/[id]/invoice/route.ts`** ✅
    - Migrated: `db.job.findFirst()` → `getJobById()`

24. **`app/api/jobs/[id]/exhibits/[exhibitId]/route.ts`** ✅
    - Migrated GET: `db.exhibit.findUnique()` → direct Supabase query, `db.job.findUnique()` → `getJobById()`
    - Migrated PATCH: `db.exhibit.findUnique()` → direct Supabase query, `db.exhibit.update()` → direct Supabase update
    - Migrated DELETE: `db.exhibit.findUnique()` → direct Supabase query, `db.exhibit.delete()` → direct Supabase delete

**Assignments Domain (2 files)**
25. **`app/api/assignments/[id]/route.ts`** ✅
    - Migrated PATCH: `db.jobAssignment.findUnique()` → `getAssignmentById()`, `db.jobAssignment.update()` → `updateJobAssignment()`
    - Migrated DELETE: `db.jobAssignment.findUnique()` → `getAssignmentById()`, `db.jobAssignment.delete()` → `deleteJobAssignment()`

26. **`app/api/assignments/[id]/notify/route.ts`** ✅
    - Migrated: `db.jobAssignment.findFirst()` → `getAssignmentById()`, `getJobById()`, `getUserById()`

**Users Domain (2 files)**
27. **`app/api/users/reporters/route.ts`** ✅
    - Migrated: `db.user.findMany()` → `getUsersByRole()`

28. **`app/api/reporters/route.ts`** ✅
    - Migrated: `db.user.findUnique()` → `getUserById()`, `db.user.findMany()` → `getUsersByRole()`

### 🟡 In Progress

### ⏳ Pending (78 files)

**Files Domain (0 remaining)**
- ✅ `app/api/files/[id]/route.ts`
- ✅ `app/api/files/[id]/download/route.ts`

**Transcripts Domain (~25 files)**
- `app/api/transcripts/[id]/route.ts`
- `app/api/transcripts/[id]/notes/route.ts`
- `app/api/transcripts/[id]/annotations/route.ts`
- `app/api/transcripts/[id]/highlights/route.ts`
- `app/api/transcripts/[id]/bookmarks/route.ts`
- `app/api/transcripts/[id]/words/route.ts`
- `app/api/transcripts/[id]/corrections/route.ts`
- `app/api/transcripts/[id]/finalize/route.ts`
- `app/api/transcripts/[id]/shares/route.ts`
- `app/api/transcripts/[id]/exports/route.ts`
- `app/api/transcripts/[id]/annotations/[annotationId]/route.ts`
- `app/transcripts/page.tsx`
- `app/transcripts/[jobId]/page.tsx`
- `app/transcripts/[jobId]/edit/page.tsx`
- `app/exports/transcript/[jobId]/pdf/route.ts`
- `app/exports/transcript/[jobId]/docx/route.ts`
- `app/exports/json/[jobId]/route.ts`
- `app/exports/audio/[jobId]/route.ts`
- `app/(dashboard)/attorney/transcripts/[id]/page.tsx`
- `app/api/attorney/transcripts/route.ts`
- `app/api/attorney/transcripts/[id]/route.ts`
- `app/api/transcribe/status/[id]/route.ts`
- `app/api/transcribe/start/route.ts`
- `app/api/jobs/[id]/transcribe/route.ts`
- `app/api/webhooks/[provider]/route.ts`

**Jobs Domain (~15 files)**
- `app/(dashboard)/jobs/[id]/page.tsx`
- `app/(dashboard)/jobs/[id]/edit/page.tsx`
- `app/(dashboard)/jobs/[id]/review/page.tsx`
- `app/api/jobs/[id]/route.ts`
- `app/api/jobs/[id]/assign/route.ts`
- `app/api/jobs/[id]/assign-reporter/route.ts`
- `app/api/jobs/[id]/exhibits/[exhibitId]/route.ts`
- `app/api/jobs/[id]/export/route.ts`
- `app/api/jobs/[id]/invoice/route.ts`
- `app/api/jobs/[id]/status/route.ts`
- `app/api/jobs/[id]/files/route.ts` (already uses query modules, but may have db imports)
- `app/api/jobs/[id]/notes/route.ts`
- `app/api/jobs/[id]/notes/[noteId]/route.ts`
- `app/api/jobs/queue/route.ts`
- `app/api/jobs/route.ts`

**Attorney Domain (~10 files)**
- `app/(dashboard)/attorney/cases/[id]/page.tsx`
- `app/api/attorney/dashboard/route.ts`
- `app/api/attorney/cases/[id]/route.ts`
- `app/api/attorney/cases/route.ts`
- `app/api/attorney/profile/route.ts`
- `app/api/attorney/exhibits/route.ts`
- `app/api/attorney/exhibits/[id]/route.ts`
- `app/api/attorney/annotations/route.ts`
- `app/api/attorney/annotations/[id]/route.ts`
- `app/api/attorney/annotations/[id]/exhibits/route.ts`

**Calendar Domain (~10 files)**
- `app/api/calendar/route.ts`
- `app/api/calendar/[id]/route.ts`
- `app/api/calendar/events/[id]/reschedule/route.ts`
- `app/api/calendar/events/[id]/resize/route.ts`
- `app/api/calendar/events/[id]/validate-move/route.ts`
- `app/api/calendar/events/[id]/undo-reschedule/route.ts`
- `app/api/calendar/events/[id]/convert-to-job/route.ts`
- `app/api/calendar/events/check-conflicts/route.ts`
- `app/api/calendar/availability/route.ts`
- `app/api/calendar/availability/[id]/route.ts`
- `app/api/calendar/booking-requests/route.ts`
- `app/api/calendar/booking-requests/[id]/route.ts`
- `app/api/calendar/suggestions/route.ts`

**Other (~18 files)**
- `app/api/assignments/[id]/route.ts`
- `app/api/assignments/[id]/notify/route.ts`
- `app/api/users/reporters/route.ts`
- `app/api/reporters/route.ts`
- `app/api/admin/actions/route.ts`
- `app/api/admin/users/[id]/role-history/route.ts`
- `app/api/audit/export/route.ts`
- `app/api/billing/invoices/route.ts`
- `app/api/billing/invoices/[id]/pdf/route.ts`
- `app/api/contact/route.ts`
- `app/api/cron/cleanup/route.ts`
- `app/api/external-calendar/route.ts`
- `app/exports/page.tsx`
- `app/reports/audit-log/page.tsx`
- `app/settings/users/page.tsx`

---

## Common Patterns & Replacements

### File Queries
| Old | New |
|-----|-----|
| `db.jobFile.findUnique({ where: { id }, include: { job: {...} } })` | `getFileWithJob(supabase, id)` |
| `db.jobFile.delete({ where: { id } })` | `deleteFile(supabase, id)` |
| `db.jobFile.create({ data })` | `createFile(supabase, data)` |

### Field Name Conversions
| camelCase (db wrapper) | snake_case (Supabase) |
|------------------------|----------------------|
| `file.fileName` | `file.file_name` (with alias) |
| `file.storagePath` | `file.storage_path` (with alias) |
| `file.mimeType` | `file.mime_type` (with alias) |
| `job.createdById` | `job.created_by_id` (transformed in getFileWithJob) |

---

## Next Steps

1. **Continue with Transcripts Domain** - Most common pattern: `db.transcript.findUnique()`
2. **Enhance transcripts query module** - Add functions for common patterns
3. **Migrate Jobs Domain** - Many files use `db.job.*`
4. **Migrate Attorney Domain** - Smaller set, good for testing
5. **Final cleanup** - Remove `lib/db.ts` and verify no imports remain

---

## Verification Commands

```powershell
# Check remaining db imports
Select-String -Path "app\**\*.ts","app\**\*.tsx","lib\**\*.ts" -Pattern "from '@/lib/db'" -Recurse | Measure-Object

# TypeScript check
npm run typecheck

# Build check
npm run build
```

---

**Progress:** 23/80 files (28.75%) ✅

**Latest Batch 1:** Migrated 10 transcript-related files:
1. `app/api/transcripts/[id]/notes/route.ts` ✅
2. `app/api/transcripts/[id]/highlights/route.ts` ✅
3. `app/api/transcripts/[id]/bookmarks/route.ts` ✅
4. `app/api/transcripts/[id]/shares/route.ts` ✅
5. `app/api/transcripts/[id]/annotations/route.ts` ✅
6. `app/api/transcripts/[id]/annotations/[annotationId]/route.ts` ✅
7. `app/api/transcripts/[id]/finalize/route.ts` ✅
8. `app/api/transcripts/[id]/exports/route.ts` ✅
9. `app/api/transcripts/[id]/words/route.ts` ✅
10. `app/api/transcripts/[id]/corrections/route.ts` ✅

**Query Module Enhancements:**
- Added 8 new functions for notes, highlights, bookmarks, annotations
- Enhanced updateTranscript to support words and flagged_segments JSONB fields

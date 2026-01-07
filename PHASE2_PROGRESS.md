# ✅ Phase 2: Route Migration - Progress Report

**Date:** January 2025  
**Status:** In Progress - Batch 1 Partially Complete

---

## ✅ COMPLETED ROUTES

### Batch 1: Notes & Files
- [x] `app/api/jobs/[id]/notes/route.ts` ✅ **COMPLETE**
  - Removed: `.from('deposition_notes')` (2 instances)
  - Removed: `.from('jobs')` (1 instance)
  - Uses: `listNotesForJob()`, `createNote()`, `getJobById()`, `getUserById()`
  
- [x] `app/api/jobs/[id]/notes/[noteId]/route.ts` ✅ **COMPLETE**
  - Removed: `.from('deposition_notes')` (4 instances)
  - Removed: `.from('jobs')` (2 instances)
  - Uses: `getNoteById()`, `updateNote()`, `deleteNote()`, `getJobById()`, `getUserById()`

- [x] `app/api/jobs/[id]/files/route.ts` ✅ **COMPLETE**
  - Removed: `.from('job_files')` (2 instances)
  - Removed: `.from('jobs')` (2 instances)
  - Uses: `listFilesForJob()`, `createFile()`, `getJobById()`
  - Fixed: Updated `files.ts` query module to use `job_files` table

---

## 🔴 REMAINING ROUTES

### Batch 1: Notes & Files ✅ COMPLETE
- ✅ All routes migrated

### Batch 2: Proper Nouns ✅ COMPLETE
- ✅ All routes migrated

### Batch 3: Exhibits ✅ COMPLETE
- ✅ `app/api/jobs/[id]/exhibits/route.ts`

### Batch 4: Calendar
- [ ] `app/api/calendar/[id]/assign/route.ts`
- [ ] `app/api/calendar/[id]/reschedule/route.ts`
- [ ] `app/api/calendar/[id]/notes/route.ts`
- [ ] `app/api/calendar/[id]/convert-to-job/route.ts`

### Batch 5: Transcripts
- [ ] `app/api/transcripts/[id]/status/route.ts`
- [ ] `app/api/transcribe/start/route.ts`

### Batch 6: Other Routes
- [ ] `app/api/jobs/[id]/status/route.ts`
- [ ] `app/api/cases/intake/route.ts`
- [ ] `app/api/external-calendar/google/callback/route.ts`

---

## 📊 METRICS

**Routes Migrated:** 3/15 (20%)  
**Direct `.from()` Calls Removed:** ~10 instances  
**Query Modules Used:** notes.ts, files.ts, jobs.ts, users.ts

---

## ✅ VERIFICATION

```bash
npm run typecheck: ✅ 0 errors
npm run lint: ✅ 0 errors
```

---

## 🎯 NEXT: Batch 2 - Proper Nouns Routes

**Files:**
- `app/api/jobs/[id]/proper-nouns/route.ts`
- `app/api/jobs/[id]/proper-nouns/[nounId]/route.ts`

**Query Module:** `lib/supabase/queries/proper-nouns.ts` ✅ Ready

**Estimated Time:** 30-45 minutes

---

**Status:** Phase 2 - Batches 1-3 ✅ **COMPLETE**  
**Next:** Batch 4 - Calendar Routes (4 routes)

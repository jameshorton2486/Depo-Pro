# MVP Manual Test Checklist

**Purpose:** Verify end-to-end MVP functionality before release.

**Prerequisites:**
- Database connected and schema synced
- Dev server running (`npm run dev`)
- Test user account created

---

## Test Sequence (Execute in Order)

### ✅ Step 1: Login
- [ ] Navigate to `http://localhost:3000/login`
- [ ] Enter credentials
- [ ] Click "Login"
- [ ] **Expected:** Redirected to dashboard
- [ ] **If fails:** Check auth configuration

---

### ✅ Step 2: Create Job
- [ ] Navigate to "New Job" or `/jobs/new`
- [ ] Fill in required fields:
  - [ ] Case name
  - [ ] Deposition date
  - [ ] Other metadata
- [ ] Click "Create Job"
- [ ] **Expected:** Job created, redirected to job detail page
- [ ] **If fails:** Check job creation API

---

### ✅ Step 3: Upload Audio
- [ ] On job detail page, click "Upload Files"
- [ ] Select an audio file (MP3, WAV, M4A)
- [ ] Wait for upload to complete
- [ ] **Expected:** File appears in job files list
- [ ] **If fails:** Check file upload API and storage

---

### ✅ Step 4: Transcribe
- [ ] On job detail page, click "Start Transcription" or "Transcribe"
- [ ] Wait for transcription to complete (check job status)
- [ ] **Expected:** 
  - Job status changes to "READY_FOR_EDIT"
  - Transcription appears with word-level data
  - Flagged words (low confidence) are identified
- [ ] **If fails:** Check Deepgram integration and worker

---

### ✅ Step 5: Open Review Page
- [ ] Navigate to `/jobs/[id]/review` (replace [id] with actual job ID)
- [ ] **Expected:**
  - Page loads without errors
  - Audio player visible at top
  - Synced transcript visible on left
  - Low-confidence word review panel on right
- [ ] **If fails:** Check review page server and client components

---

### ✅ Step 6: Click Word → Audio Seeks
- [ ] In the synced transcript (left panel), click on any word
- [ ] **Expected:**
  - Audio player seeks to that word's timestamp
  - Audio starts playing
  - ~1.5 seconds of pre-roll context before the word
- [ ] **If fails:** Check `handleWordClick` and audio player ref

---

### ✅ Step 7: Edit Low-Confidence Word
- [ ] In the low-confidence review panel (right), find a flagged word
- [ ] Click "Edit" on a flagged word
- [ ] Enter a corrected word
- [ ] Click "Save" (on the word card)
- [ ] **Expected:**
  - Word is updated in local state immediately
  - "Save" button appears in header showing pending edit count
- [ ] **If fails:** Check `handleWordUpdate` and pending edits state

---

### ✅ Step 8: Save Edits
- [ ] Click "Save" button in header (if pending edits exist)
- [ ] Wait for save to complete
- [ ] **Expected:**
  - Toast notification: "Saved X edit(s)"
  - Pending edits counter resets
  - No errors in console
- [ ] **If fails:** Check PATCH `/api/transcripts/[id]/words` endpoint

---

### ✅ Step 9: Refresh → Edit Persists
- [ ] Refresh the page (F5 or Ctrl+R)
- [ ] **Expected:**
  - Page reloads
  - Previously edited word shows the correction
  - Review state (isReviewed) persists
- [ ] **If fails:** Check database persistence in words/flaggedSegments JSON

---

### ✅ Step 10: Mark Complete
- [ ] Review remaining flagged words (or mark all as reviewed)
- [ ] Click "Mark Complete" button
- [ ] **Expected:**
  - Job status updates to "SUBMITTED_FOR_REVIEW" or "IN_REVIEW"
  - Redirected to job detail page
  - Toast notification: "Review completed successfully!"
- [ ] **If fails:** Check PATCH `/api/jobs/[id]/status` endpoint

---

### ✅ Step 11: Export DOCX
- [ ] On job detail page, click "Export" or "Download Transcript"
- [ ] Select "DOCX" format
- [ ] Wait for download
- [ ] **Expected:**
  - DOCX file downloads
  - File opens in Word/LibreOffice
- [ ] **If fails:** Check export API and DOCX generation

---

### ✅ Step 12: Confirm Edit Appears in DOCX
- [ ] Open the downloaded DOCX file
- [ ] Search for the word you edited in Step 7
- [ ] **Expected:**
  - The corrected word appears (not the original)
  - Edit is reflected in the exported document
- [ ] **If fails:** Check export logic uses updated words array

---

## Test Results

**Date:** _______________

**Tester:** _______________

**Environment:** Development / Production

**Results:**
- [ ] All steps passed
- [ ] Issues found (document below)

**Issues Found:**
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

**Notes:**
_________________________________________________
_________________________________________________

---

## Critical Checks

Before marking MVP complete, verify:

- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No console errors in browser
- [ ] No network errors in browser DevTools
- [ ] Database queries succeed
- [ ] All API endpoints return 200/201 (not 500)
- [ ] Edits persist after page refresh
- [ ] Exports reflect edits
- [ ] Keyboard shortcuts work (Space, Arrow keys)
- [ ] Keyboard shortcuts ignore input fields

---

## Rollback Plan

If critical issues found:
1. Document exact error messages
2. Check browser console for stack traces
3. Check server logs for API errors
4. Verify database state
5. Fix issues one at a time
6. Re-run affected test steps

---

**MVP is complete when all steps pass and critical checks are satisfied.**


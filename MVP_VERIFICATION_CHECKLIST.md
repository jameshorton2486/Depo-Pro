# DEPO-PRO: MVP Verification Checklist

## How to Know Everything is Done

**Run through this checklist. If all items pass, your MVP is complete.**

---

## PART 1: Build Verification (5 minutes)

### 1.1 Does it Build?

```bash
npm run build
```

| Result | Status |
|--------|--------|
| ✅ Build succeeds | **MVP READY** |
| ⚠️ Warnings only | **MVP READY** (warnings are OK) |
| ❌ Errors | Fix before proceeding |

**Note:** Errors in `/archive/` or `/legacy/` folders don't count - those aren't part of MVP.

### 1.2 Does it Start?

```bash
npm run dev
```

| Result | Status |
|--------|--------|
| ✅ Server starts on localhost:3000 | **PASS** |
| ❌ Crashes or errors | Fix before proceeding |

---

## PART 2: Authentication Flow (10 minutes)

### 2.1 Registration
- [ ] Navigate to `/register`
- [ ] Create new account with email/password
- [ ] Select role (Court Reporter or Scopist)
- [ ] Registration succeeds, redirected to dashboard

### 2.2 Login
- [ ] Navigate to `/login`
- [ ] Login with credentials
- [ ] Redirected to appropriate dashboard based on role

### 2.3 Protected Routes
- [ ] Try to access `/jobs` without login → Redirected to login
- [ ] Login → Can access `/jobs`

**Auth Status:** ______ / 3 tests passed

---

## PART 3: Court Reporter Flow (20 minutes)

### 3.1 Create Job
- [ ] Click "New Job" or navigate to `/jobs/new`
- [ ] Fill in case name, case number, deposition date
- [ ] Submit form → Job created
- [ ] Redirected to job detail page

### 3.2 Upload Audio
- [ ] On job detail page, upload audio file (MP3, WAV, or M4A)
- [ ] Upload progress shows
- [ ] File appears in job files list

### 3.3 Trigger Transcription
- [ ] Click "Start Transcription" or similar button
- [ ] Job status changes to TRANSCRIBING
- [ ] Wait for transcription to complete (or mock it)
- [ ] Job status changes to READY_FOR_EDIT or AI_REVIEWING

### 3.4 View Transcript
- [ ] Transcript text appears on job detail page
- [ ] Can see full transcript content

**Court Reporter Status:** ______ / 4 tests passed

---

## PART 4: The Core Feature - Review Interface (30 minutes)

**This is THE critical test. If this works, your MVP works.**

### 4.1 Access Review Page
- [ ] Navigate to `/jobs/[id]/review` (for a job with transcription)
- [ ] Page loads without errors
- [ ] Three sections visible: header, audio player, main content

### 4.2 Audio Player
- [ ] Audio player visible at top
- [ ] Click Play → Audio plays
- [ ] Click Pause → Audio pauses
- [ ] Progress bar shows current position
- [ ] Can click progress bar to seek
- [ ] Playback speed control works (0.5x to 2x)
- [ ] Skip forward/backward buttons work (±5 seconds)

### 4.3 Transcript Display (Left Panel)
- [ ] Full transcript text visible
- [ ] Words are clickable
- [ ] Click a word → Audio seeks to that timestamp
- [ ] During playback, current word is highlighted (yellow/gold)
- [ ] Transcript auto-scrolls to follow audio

### 4.4 Low-Confidence Words (Right Panel)
- [ ] Flagged words panel visible
- [ ] Shows list of words with confidence < 85%
- [ ] Each word shows:
  - [ ] The uncertain word
  - [ ] Confidence percentage
  - [ ] Context (surrounding words)
- [ ] Progress bar shows X of Y reviewed

### 4.5 Review Workflow
- [ ] Click speaker icon on flagged word → Audio plays from that point
- [ ] Click "Edit" → Can type new word
- [ ] Click alternative suggestion → Word is corrected
- [ ] Click "Mark Done" → Word marked as reviewed
- [ ] Progress bar updates

### 4.6 Keyboard Shortcuts
- [ ] **Space** → Play/pause audio
- [ ] **← / →** → Skip back/forward 5 seconds
- [ ] **↑ / ↓** → Navigate between flagged words
- [ ] **Tab** → Jump to next unreviewed word
- [ ] **Enter** → Confirm edit

### 4.7 Save & Complete
- [ ] Click "Save" → Edits saved (toast notification)
- [ ] Click "Mark Complete" → Job status updates
- [ ] Redirected to job detail page

**Review Interface Status:** ______ / 7 sections passed

---

## PART 5: Export (10 minutes)

### 5.1 DOCX Export
- [ ] On job detail page, click "Export" or "Download DOCX"
- [ ] File downloads
- [ ] Open in Word:
  - [ ] Title page with case info
  - [ ] 25 lines per page
  - [ ] Line numbers visible
  - [ ] Courier New font
  - [ ] Q&A format visible

**Export Status:** ______ / 1 test passed

---

## PART 6: Scopist Flow (15 minutes)

### 6.1 Assignment
- [ ] As Court Reporter, assign job to Scopist
- [ ] Assignment appears in system

### 6.2 Scopist Dashboard
- [ ] Login as Scopist
- [ ] Dashboard shows assigned jobs
- [ ] Can see job details

### 6.3 Scopist Review
- [ ] Navigate to review page
- [ ] Same review interface works for Scopist
- [ ] Can edit words, mark as reviewed
- [ ] Can submit for final review

**Scopist Status:** ______ / 3 tests passed

---

## SCORING

### Minimum Viable Product (MVP)

| Section | Required to Pass | Your Score |
|---------|-----------------|------------|
| Build Verification | ✅ Must pass | |
| Authentication | 2/3 minimum | |
| Court Reporter Flow | 3/4 minimum | |
| **Review Interface** | **6/7 minimum** | |
| Export | 1/1 required | |
| Scopist Flow | 2/3 minimum | |

### MVP Complete Criteria

```
IF Build passes
AND Auth ≥ 2/3
AND Court Reporter ≥ 3/4
AND Review Interface ≥ 6/7  ← CRITICAL
AND Export = 1/1
AND Scopist ≥ 2/3

THEN → MVP IS COMPLETE ✅
```

---

## QUICK SMOKE TEST (5 minutes)

If you're short on time, run this abbreviated test:

1. **Build:** `npm run build` → Succeeds?
2. **Start:** `npm run dev` → Runs?
3. **Login:** Can you log in?
4. **Review Page:** Does `/jobs/[id]/review` load with audio + transcript + flagged words?
5. **Click Word:** Does clicking a word seek the audio?
6. **Edit Word:** Can you edit a flagged word?
7. **Export:** Does DOCX download?

**If all 7 pass → Your MVP works.**

---

## COMMON ISSUES & FIXES

### "Review page won't load"
- Check job has a transcription (status = READY_FOR_EDIT or AI_REVIEWING)
- Check job has an audio file
- Check browser console for errors
- Verify user has permission (owner, assigned scopist, or admin)

### "Audio won't play"
- Check audio file URL is accessible
- Check storage permissions (Supabase/local)
- Try different audio format (MP3 vs WAV)
- Check browser console for CORS errors

### "No flagged words showing"
- Transcription might have high confidence (>85% for all words)
- Check `flaggedSegments` field in database (should be JSON array)
- Try with lower-quality audio to generate more flags
- Verify confidence threshold is 0.85

### "Clicking word doesn't seek audio"
- Check browser console for errors
- Verify word has `start` timestamp
- Verify audio player ref is connected
- Check that `onWordClick` handler is wired correctly

### "Edits don't save"
- Check API route `/api/transcripts/[id]/words` exists
- Check network tab for error response
- Verify user is authenticated
- Check database connection
- Verify `flaggedSegments` JSON is being updated

### "Keyboard shortcuts don't work"
- Check that shortcuts ignore input/textarea fields
- Verify event listeners are attached
- Check for conflicting keyboard handlers
- Test in different browsers

---

## FINAL DECLARATION

When you complete this checklist with passing scores:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🎉 DEPO-PRO MVP IS COMPLETE 🎉                       │
│                                                         │
│   Ready for:                                            │
│   • Beta testing with real users                        │
│   • Production deployment to Vercel                     │
│   • Collecting feedback from court reporters            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## WHAT'S NEXT AFTER MVP

Once MVP is verified:

1. **Deploy to Vercel** - Push to production
   - See `DEPLOYMENT_GUIDE.md` for detailed steps
   - See `QUICK_START.md` for 5-minute guide

2. **Create test accounts** - For beta users
   ```bash
   npm run create-test-users
   ```

3. **Onboard 2-3 court reporters** - People you know
   - Send login credentials
   - Provide quick start guide
   - Set up support channel

4. **Collect feedback** - What's missing? What's confusing?
   - Use `FEEDBACK_TEMPLATE.md`
   - Track in spreadsheet or issue tracker

5. **Iterate** - Fix issues, add requested features
   - Focus on P0 (critical) and P1 (high priority) issues
   - Plan Phase 2 features based on real user needs

### Phase 2 Features (After MVP Validated)
- Waveform visualization (wavesurfer.js) - 2-3 weeks
- PDF export - 1-2 weeks
- Attorney role with annotations - 3-4 weeks
- Custom vocabulary/dictionary - 2-3 weeks
- Stripe billing integration - 4-6 weeks

---

## TESTING NOTES

### Test Data Setup
1. Create a test job with audio file
2. Trigger transcription (or use mock data)
3. Ensure transcription has some low-confidence words (<85%)
4. Verify job status allows review access

### Browser Testing
Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if Mac available)

### Mobile Testing (Optional for MVP)
- Review interface may not be mobile-optimized yet
- Focus on desktop experience for MVP

---

**Print this checklist. Run through it. When it passes, you're done.**

**Last Updated:** 2024-01-XX  
**MVP Version:** 1.0.0


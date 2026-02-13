# Workflow Intelligence - Testing Guide

Complete testing checklist for all 5 features. Test in order for best results.

---

## Prerequisites

✅ Database migration applied (`review_sessions` table exists)
✅ Next.js dev server running (`npm run dev`)
✅ User logged in with test account
✅ At least 2-3 jobs in database with transcriptions

---

## Feature 1: Risk-Based Dashboard Sorting

### Test 1.1: Default Sort Order
1. Navigate to `/jobs`
2. **Expected:** Jobs sorted by risk score (highest first)
3. **Verify:** Red/orange badges at top, green badges at bottom
4. **Pass/Fail:** ________

### Test 1.2: Sort Toggle
1. Click "Highest Risk" button (should be active/highlighted)
2. Click "Newest" button
3. **Expected:** Jobs reorder by creation date
4. Click back to "Highest Risk"
5. **Expected:** Jobs reorder by risk score again
6. **Pass/Fail:** ________

### Test 1.3: Scopist Queue Summary
1. Look at top section with summary cards
2. **Expected:** See counts for:
   - Critical jobs (risk ≥ 75)
   - High risk jobs (risk 50-74)
   - Total estimated minutes
   - Completed today
3. **Verify:** Numbers match job list
4. **Pass/Fail:** ________

### Test 1.4: Unscored Jobs
1. Create a job without transcription (no risk score)
2. Navigate to `/jobs`
3. **Expected:** Unscored job appears at bottom
4. **Pass/Fail:** ________

---

## Feature 2: Smart Review Shortcuts & Keyboard Navigation

### Test 2.1: Jump to Highest Risk (Shift+R)
1. Navigate to any job review page with flagged words
2. Press **Shift+R**
3. **Expected:**
   - Audio seeks to lowest confidence word
   - Word is highlighted in panel
   - Audio starts playing 2 seconds before word
4. **Pass/Fail:** ________

### Test 2.2: Filter Critical Words (Shift+1)
1. On review page, press **Shift+1**
2. **Expected:**
   - Only words with <0.5 confidence shown
   - "< 0.5" button is highlighted in blue
   - Count updates to show filtered amount
3. **Pass/Fail:** ________

### Test 2.3: Filter Medical Terms (Shift+M)
1. Press **Shift+M**
2. **Expected:**
   - Only medical terms shown (anatomy, medications, procedures)
   - "⚕ Medical" button highlighted in purple
   - Previous severity filter still active
3. **Pass/Fail:** ________

### Test 2.4: Filter Numbers/Dates (Shift+N)
1. Press **Shift+N**
2. **Expected:**
   - Only numbers and dates shown
   - "# Numbers" button highlighted
3. **Pass/Fail:** ________

### Test 2.5: Filter Proper Nouns (Shift+P)
1. Press **Shift+P**
2. **Expected:**
   - Only names/places shown (capitalized words)
   - "👤 Names" button highlighted
3. **Pass/Fail:** ________

### Test 2.6: Reset All Filters (Shift+A)
1. Press **Shift+A**
2. **Expected:**
   - All filters reset to "All"
   - Full word list shown again
   - All filter buttons back to gray
3. **Pass/Fail:** ________

### Test 2.7: Click Filter Buttons
1. Click "< 0.5" button with mouse
2. **Expected:** Same as Shift+1
3. Click "⚕ Medical" button
4. **Expected:** Same as Shift+M
5. **Pass/Fail:** ________

### Test 2.8: Filter Counts
1. Look at filter buttons
2. **Expected:**
   - "< 0.5 (X)" shows count of critical words
   - "0.5–0.7 (Y)" shows count of low confidence words
   - "0.7–0.85 (Z)" shows count of medium confidence words
3. **Verify:** Counts add up to total flagged words
4. **Pass/Fail:** ________

---

## Feature 3: Inline Confidence Heatmap

### Test 3.1: Heatmap Toggle OFF (Default)
1. Navigate to any job review page
2. Look at transcript viewer (left side, 2/3 width)
3. **Expected:**
   - Words have neutral colors (white/gray)
   - "Heatmap OFF" button in header
4. **Pass/Fail:** ________

### Test 3.2: Heatmap Toggle ON
1. Click "🎨 Heatmap OFF" button in header
2. **Expected:**
   - Button changes to "🎨 Heatmap ON"
   - Button turns yellow/highlighted
   - Words in transcript instantly change colors
3. **Pass/Fail:** ________

### Test 3.3: Color Scale Verification
Find or create words with different confidence levels and verify colors:

**Red Words (<50% confidence):**
1. Find a word with confidence <0.5 (check flagged words panel)
2. **Expected:**
   - Red background
   - Solid red underline
3. **Pass/Fail:** ________

**Orange Words (50-70% confidence):**
1. Find a word with confidence 0.5-0.7
2. **Expected:**
   - Orange background
   - Dashed orange underline
3. **Pass/Fail:** ________

**Yellow Words (70-85% confidence):**
1. Find a word with confidence 0.7-0.85
2. **Expected:**
   - Yellow background
   - No underline
3. **Pass/Fail:** ________

**Neutral Words (>85% confidence):**
1. Find a word with confidence >0.85
2. **Expected:**
   - No background color
   - No underline
   - Normal text (white/gray)
3. **Pass/Fail:** ________

### Test 3.4: Word Tooltips
1. Hover over any colored word in transcript
2. **Expected:** Tooltip appears showing:
   - "Confidence: XX%" (color-coded)
   - "Time: X.XXs - Y.YYs"
   - "Original: [word]" (if word was corrected)
   - "🚩 Flagged for review" (if flagged)
3. **Pass/Fail:** ________

### Test 3.5: Heatmap Toggle Persistence
1. Toggle heatmap ON
2. Click around transcript, correct some words
3. **Expected:** Heatmap stays ON (doesn't reset)
4. Toggle OFF
5. **Expected:** Colors disappear immediately
6. **Pass/Fail:** ________

---

## Feature 4: Estimated Review Effort Badge

### Test 4.1: Effort Badge Display
1. Navigate to `/jobs`
2. Look at job cards
3. **Expected:** Each job shows effort badge next to risk badge
   - Format: "~10 min", "~25 min", "60+ min"
   - Icon: Clock (⏱) for <45min, AlertCircle (⚠) for 60+min
4. **Pass/Fail:** ________

### Test 4.2: Color Coding
Find jobs with different effort estimates:

**Green Badge (≤10 min):**
1. Find a quick job (low flagged count, low risk)
2. **Expected:**
   - Green background
   - Green text
   - "~10 min" or less
3. **Pass/Fail:** ________

**Yellow Badge (11-30 min):**
1. Find a medium job
2. **Expected:**
   - Yellow background
   - Yellow text
   - "~15 min", "~20 min", "~25 min", or "~30 min"
3. **Pass/Fail:** ________

**Orange Badge (31-45 min):**
1. Find a longer job
2. **Expected:**
   - Orange background
   - Orange text
   - "~35 min", "~40 min", or "~45 min"
3. **Pass/Fail:** ________

**Red Badge (60+ min):**
1. Find a very long job (high risk + many flagged words)
2. **Expected:**
   - Red background
   - Red text
   - "60+ min"
   - AlertCircle icon (⚠) instead of Clock
3. **Pass/Fail:** ________

### Test 4.3: Badge Tooltip
1. Hover over any effort badge
2. **Expected:** Tooltip shows:
   - "Estimated (no review history yet)" OR
   - "Estimated" OR
   - "Based on your firm's review history" (Phase B)
3. **Pass/Fail:** ________

### Test 4.4: Total Estimated Minutes
1. Look at scopist queue summary at top
2. **Expected:**
   - Shows "Est. X minutes today" or similar
   - Number is sum of all job estimates
3. Calculate manually: Add up all effort badges
4. **Verify:** Totals match (±5 minutes due to rounding)
5. **Pass/Fail:** ________

---

## Feature 5: Review Session Duration Tracking

### Test 5.1: Session Start
1. Open browser DevTools (F12) → Console tab
2. Navigate to any job review page
3. **Expected:** Console shows no errors
4. Look at stats bar (below audio player)
5. **Expected:** See "⏱ Active: 0m 0s"
6. **Pass/Fail:** ________

### Test 5.2: Active Time Tracking
1. Stay on review page, move mouse occasionally
2. Watch active time counter
3. **Expected:**
   - Counter increases every second: 0s, 1s, 2s, 3s...
   - After 1 minute: "⏱ Active: 1m 0s"
4. **Pass/Fail:** ________

### Test 5.3: Idle Detection
1. Stop moving mouse/keyboard for 65 seconds
2. **Expected:**
   - After 60 seconds of inactivity, timer stops incrementing
   - Counter shows last active time (e.g., "⏱ Active: 2m 15s")
3. Move mouse again
4. **Expected:**
   - Counter resumes incrementing from where it stopped
5. **Pass/Fail:** ________

### Test 5.4: Word Review Tracking
1. Correct a flagged word (type new word, click checkmark)
2. **Expected:**
   - Word marked as corrected
   - `words_reviewed` and `words_corrected` increment in backend
3. Confirm a word (click checkmark without editing)
4. **Expected:**
   - Word marked as confirmed
   - `words_reviewed` increments (but not `words_corrected`)
5. Skip a word (click X)
6. **Expected:**
   - Word marked as skipped
   - `words_reviewed` increments
7. **Pass/Fail:** ________

### Test 5.5: Audio Replay Tracking
1. Click "Jump to Worst" button
2. **Expected:** `audio_replays` counter increments in backend
3. Click a word in flagged words panel to seek
4. **Expected:** `audio_replays` increments again
5. **Pass/Fail:** ________

### Test 5.6: Filter Usage Tracking
1. Press Shift+M (medical filter)
2. **Expected:** `filters_used` array includes "medical"
3. Press Shift+N (numbers filter)
4. **Expected:** `filters_used` includes both "medical" and "numbers_dates"
5. **Pass/Fail:** ________

### Test 5.7: Auto-Save (30 seconds)
1. Stay on review page for 35+ seconds
2. **Expected:**
   - After 30 seconds, API call to `/api/review-sessions/[id]` (check Network tab)
   - No visible UI change (silent background save)
   - Response: `{"success": true}`
3. **Pass/Fail:** ________

### Test 5.8: Database Verification
1. After completing a review session, close the tab
2. Open Supabase Dashboard → SQL Editor
3. Run query:
```sql
SELECT
  id,
  user_id,
  job_id,
  started_at,
  ended_at,
  active_duration_seconds,
  total_duration_seconds,
  words_reviewed,
  words_corrected,
  audio_replays,
  filters_used
FROM review_sessions
ORDER BY started_at DESC
LIMIT 1;
```
4. **Expected:**
   - One row with your session data
   - `active_duration_seconds` > 0
   - `total_duration_seconds` >= active_duration_seconds
   - `words_reviewed` matches actions taken
   - `filters_used` is JSONB array with filters you used
5. **Pass/Fail:** ________

---

## Integration Tests

### Test INT-1: Complete Review Workflow
1. Go to `/jobs`
2. See highest risk job at top (Feature 1)
3. Note effort badge "~25 min" (Feature 4)
4. Click "Review"
5. Press Shift+R to jump to worst word (Feature 2)
6. Toggle heatmap ON (Feature 3)
7. See red/orange/yellow words
8. Press Shift+M to filter medical terms (Feature 2)
9. Correct 2-3 words
10. Wait 35 seconds (Feature 5 auto-save)
11. Press Shift+A to reset filters (Feature 2)
12. Complete review
13. **Expected:** All features work together seamlessly
14. **Pass/Fail:** ________

### Test INT-2: Multi-Tab Behavior
1. Open review page in Tab 1
2. Open same review page in Tab 2
3. **Expected:**
   - Tab 2 shows "Read-only" badge (lock held by Tab 1)
   - Tab 1 session tracking continues
4. Close Tab 1
5. Refresh Tab 2
6. **Expected:**
   - Tab 2 acquires lock
   - New session starts
7. **Pass/Fail:** ________

---

## Performance Tests

### Test PERF-1: Dashboard Load Time
1. Clear browser cache
2. Navigate to `/jobs` with 50+ jobs
3. **Expected:**
   - Page loads in <2 seconds
   - Sort toggle responsive (<100ms)
4. **Pass/Fail:** ________

### Test PERF-2: Heatmap Toggle Performance
1. Open review page with 1000+ word transcript
2. Toggle heatmap ON
3. **Expected:**
   - Color change renders in <200ms
   - No visible lag or stuttering
4. Toggle OFF
5. **Expected:**
   - Colors disappear instantly
6. **Pass/Fail:** ________

### Test PERF-3: Keyboard Shortcut Response Time
1. Press Shift+R
2. **Expected:**
   - Audio seeks within <100ms
   - Panel scrolls to word within <200ms
3. Press Shift+M rapidly 5 times
4. **Expected:**
   - No lag, filters respond instantly
5. **Pass/Fail:** ________

---

## Browser Compatibility Tests

Test in at least 2 browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)

**Expected:** All features work identically across browsers.

---

## Test Results Summary

| Feature | Tests Passed | Tests Failed | Notes |
|---------|-------------|--------------|-------|
| Feature 1: Risk Sorting | __ / 4 | __ / 4 | |
| Feature 2: Shortcuts | __ / 8 | __ / 8 | |
| Feature 3: Heatmap | __ / 5 | __ / 5 | |
| Feature 4: Effort Badges | __ / 4 | __ / 4 | |
| Feature 5: Session Tracking | __ / 8 | __ / 8 | |
| Integration Tests | __ / 2 | __ / 2 | |
| Performance Tests | __ / 3 | __ / 3 | |
| **TOTAL** | __ / 34 | __ / 34 | |

**Overall Status:** _______________

**Blocker Issues:** _______________

**Nice-to-Have Issues:** _______________

**Ready for Production?** YES / NO

---

## Troubleshooting Common Issues

### Issue: Heatmap doesn't show colors
**Solution:**
- Verify heatmap toggle is ON (button should be yellow/highlighted)
- Check browser console for errors
- Verify words have confidence values in database

### Issue: Keyboard shortcuts don't work
**Solution:**
- Ensure you're not typing in an input field (shortcuts disabled in inputs)
- Check browser console for JavaScript errors
- Try refreshing the page

### Issue: Session tracking not saving
**Solution:**
- Check browser Network tab for API calls to `/api/review-sessions`
- Verify `review_sessions` table exists in database
- Check RLS policies allow user to insert/update

### Issue: Effort badges show "NaN min"
**Solution:**
- Verify job has risk_score in metadata
- Verify job has confidence_analytics in metadata
- Check flagged_count > 0

---

**Testing completed on:** _______________

**Tested by:** _______________

**Signature:** _______________

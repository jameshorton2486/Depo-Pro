# Transcript Engine — Integration Verification Sprint

Branch: sprint/transcript-engine-integration
Goal: Verify existing components connect end-to-end. Fix any broken handoffs.

## Pre-Flight (20 min)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] DEEPGRAM_API_KEY set in .env.local
- [ ] Supabase Storage bucket accessible
- [ ] transcriptions table has: words, segments, deepgram_raw_json columns
- [ ] flagged_words table exists
- [ ] transcription_locks table exists (create if missing)

## Data Flow Verification (30 min)
- [ ] Create test job via /transcription/upload
- [ ] Upload short audio file (30-60 seconds)
- [ ] Trigger transcription via UI or POST /api/jobs/{id}/transcribe
- [ ] Pipeline completes (console shows "Pipeline complete for job {id}")
- [ ] Verify transcriptions.words has data (check Supabase Table Editor)
- [ ] Verify flagged_words has entries
- [ ] Note: does the transcription have utterances data? (affects review page)

## Data Bridge Fix (40 min)
- [ ] Open /jobs/{id}/review — does the page load?
- [ ] If empty transcript: fix segment building in review page.tsx
  - Pipeline stores: flat words[] and segments[] (no nested words in segments)
  - Review page expects: segments with nested words[] arrays
  - Fix: rebuild segments from flat words, grouping by speaker changes
- [ ] If audio doesn't play: check audio URL format
  - Should be full HTTPS Supabase Storage URL
  - Not a local filesystem path
- [ ] If redirect to /login: check auth-compat.ts session shape

## Sync Verification (30 min)
- [ ] Audio plays with waveform visualization
- [ ] Words highlight in real-time as audio plays
- [ ] Highlight tracks correctly (not ahead or behind)
- [ ] Click any word -> audio seeks to ~1 second before that word
- [ ] Flagged words show red text with wavy underline
- [ ] Auto-scroll follows playback without jitter
- [ ] Playback speed control works (0.5x, 1x, 1.5x, 2x)

## Flagged Words Panel (20 min)
- [ ] Sidebar shows flagged word count
- [ ] Clicking flagged word in sidebar -> seeks audio
- [ ] Flagged words show context (surrounding words)
- [ ] Confidence percentage visible

## Final Verification (20 min)
- [ ] Full flow: create job -> upload -> transcribe -> review -> sync works
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build passes
- [ ] Commit: "Sprint: transcript engine integration verified"

## NOT in This Sprint
- No code rewrites (components already exist)
- No new npm packages
- No UI redesign
- No correction editing or persistence
- No export changes
- No scopist review panel build

## Known Integration Risk
The #1 most likely failure is the data format bridge between the pipeline
and the review page. The pipeline stores flat arrays; the review page's
SyncedTranscriptViewer needs segments with nested words. If the transcript
appears empty, this is the fix point.

## After This Sprint
If all boxes are checked:
- Depo-Pro has a working, verified transcript playback engine
- Next: correction persistence + scopist review panel

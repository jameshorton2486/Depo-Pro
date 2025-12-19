# DEPO-PRO: Quick Action Plan

## THE VERDICT: KEEP YOUR CODEBASE ✅

Your existing code is **55-60% complete** with a **solid foundation**. Don't start over.

---

## What You Already Have (Don't Rebuild)

| Component | Status | Keep? |
|-----------|--------|-------|
| Prisma Schema | ✅ Complete, well-designed | YES |
| Authentication | ✅ NextAuth v5 working | YES |
| User Roles | ✅ ADMIN, COURT_REPORTER, SCOPIST | YES |
| Job Management | ✅ Full CRUD | YES |
| File Upload | ✅ Infrastructure ready | YES |
| API Routes | ✅ All endpoints exist | YES |
| UI Components | ✅ Basic set complete | YES |
| Packages | ✅ All correct ones installed | YES |

---

## What You Need to Build (3-4 weeks)

| Component | Status | Priority | Time |
|-----------|--------|----------|------|
| Real Deepgram Integration | ❌ Mock only | 🔴 HIGH | 3-4 days |
| Audio Player | ❌ Doesn't exist | 🔴 HIGH | 2-3 days |
| Audio-Transcript Sync | ❌ Doesn't exist | 🔴 HIGH | 3-4 days |
| Low-Confidence Review UI | ❌ Doesn't exist | 🔴 HIGH | 4-5 days |
| Real DOCX Export | ❌ Mock only | 🟡 MED | 2-3 days |
| Testing & Polish | ❌ Not done | 🟡 MED | 3-5 days |

---

## Immediate Next Steps (This Week)

### Step 1: Fix TypeScript Errors (Day 1)
```powershell
cd depo-pro
npm install
npm run typecheck
```
Most errors will disappear. Fix remaining ~10 real issues.

### Step 2: Run Gemini Research (Day 1-2)
Use the **6 revised prompts** in order:
1. Deepgram Integration
2. Audio Player
3. Audio-Transcript Sync
4. Low-Confidence Review
5. DOCX Export
6. State Management

### Step 3: Implement Deepgram (Day 3-5)
Replace mock in `lib/transcription.ts` with real API calls.

### Step 4: Build Audio Components (Day 6-10)
- Create `components/transcripts/audio-player.tsx`
- Create `components/transcripts/synced-transcript.tsx`
- Create `components/transcripts/low-confidence-review.tsx`

### Step 5: Implement DOCX Export (Day 11-13)
Replace mock in `lib/export.ts` with real legal formatting.

### Step 6: Test & Deploy (Day 14-20)
- End-to-end testing
- Fix bugs
- Deploy to Vercel

---

## Files to Modify

```
lib/transcription.ts          ← Replace mock with Deepgram
lib/export.ts                 ← Implement real DOCX
components/transcripts/       ← Add new components
app/(dashboard)/jobs/[id]/    ← Add review page
```

## Files to Create

```
components/transcripts/audio-player.tsx
components/transcripts/synced-transcript.tsx
components/transcripts/low-confidence-review.tsx
components/transcripts/word-span.tsx
app/(dashboard)/jobs/[id]/review/page.tsx
```

---

## Key Schema Fields (Already Exist!)

Your Prisma schema already has everything needed:

```prisma
model Transcription {
  words           Json    // [{ word, start, end, confidence, speaker }]
  flaggedSegments Json    // Low-confidence words for review!
  speakerMapping  Json    // Speaker labels
  ...
}

model TranscriptionEdit {
  wordIndex    Int       // Track which word was edited
  originalText String
  newText      String
  ...
}
```

---

## Don't Build These (Yet)

| Feature | When | Why Wait |
|---------|------|----------|
| Live Streaming | Phase 2 | Complex, not MVP |
| Waveform Visualization | Phase 2 | Nice-to-have |
| Zoom Integration | Phase 3 | Very complex |
| AI Formatting Model | Phase 3 | Requires training |
| Attorney Portal | Phase 2 | Different user flow |

---

## Budget Reminder

| Service | Monthly Cost |
|---------|-------------|
| Deepgram | ~$50-100 (usage-based) |
| Supabase | Free tier |
| Vercel | Free tier |
| Domain | ~$12/year |
| **Total** | **~$65-115/month** |

---

## Success Metrics for MVP

- [ ] Upload audio file → Transcription completes
- [ ] View transcript with word-level data
- [ ] Click word → Audio plays from that point
- [ ] See list of low-confidence words
- [ ] Edit flagged word → Change persists
- [ ] Assign job to scopist → Scopist can review
- [ ] Export to DOCX → Proper legal format
- [ ] All user roles can log in and see appropriate dashboard

---

## One-Line Summary

**Your code is 60% done. Don't restart. Focus on: Deepgram → Audio Player → Sync → Review UI → DOCX Export. Ship in 3-4 weeks.**

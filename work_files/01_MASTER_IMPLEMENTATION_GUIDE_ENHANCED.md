# DEPO-PRO: Enhanced Master Implementation Guide

**Document 1 of 5 (ENHANCED)** | **Incorporates all Google Drive research**

---

## EXECUTIVE SUMMARY

Your codebase is **55-60% complete**. This guide consolidates findings from:
- ✅ Your Scope Document v2
- ✅ Deepgram Integration research
- ✅ Open Source Strategy document
- ✅ Open Source projects/libraries research
- ✅ Gemini Research Prompts
- ✅ Your existing codebase analysis

---

## CRITICAL UPDATES FROM YOUR RESEARCH

### 1. Use Nova-3, Not Nova-2
Your Deepgram Integration document specifies:
> **"Nova-3 (Highest accuracy for multi-speaker depositions)"**

The 85% confidence threshold is more reliable on Nova-3.

### 2. Keyboard Shortcuts (From Scope v2)
| Key | Action |
|-----|--------|
| **Space** | Play/Pause audio |
| **↑ / ↓** | Navigate to previous/next flagged word |
| **← / →** | Skip back/forward 5 seconds |
| **Enter** | Confirm edit and mark as reviewed |
| **R** | Replay current word (seeks to timestamp - 2 sec) |

### 3. Recommended Audio Player
From your Open Source Strategy:
- **MVP:** `react-h5-audio-player` (simple, works immediately)
- **Phase 2:** `wavesurfer.js` (waveform visualization)

### 4. Transcript Editor Library
Your research recommends:
- **pmacom-react-transcript-editor** (MIT, React 18/19 compatible)
- Fork of BBC react-transcript-editor with TimedTextEditor component

### 5. Time Savings Target
From Scope v2:
> **"ESTIMATED TIME SAVINGS: 50-75% REDUCTION IN REVIEW TIME"**
> - Traditional: 120 minutes for 2-hour deposition
> - Depo-Pro: 15-30 minutes (flagged words only)

---

## PART 1: WHAT TO BUILD (Enhanced Order)

### BUILD #1: Real Deepgram Integration (Nova-3)
**File:** `lib/transcription.ts`  
**Time:** 3-4 days  
**Priority:** 🔴 CRITICAL

**Configuration (from your Deepgram research):**
```typescript
{
  model: 'nova-3',           // CHANGED: Nova-3 for highest legal accuracy
  language: 'en-US',
  smart_format: true,        // Handles punctuation/capitalization
  diarize: true,             // CRITICAL for speaker identification
  utterances: true,          // Groups words into logical sentences
  filler_words: true,        // IMPORTANT: Required for "verbatim" legal transcripts
  punctuate: true,
}
```

**Webhook Pattern (from your research):**
Your Deepgram Integration doc recommends webhook-driven processing to avoid Vercel timeout limits:
1. Client uploads file to Supabase Storage
2. Server Action generates Signed URL → sends to Deepgram with callback URL
3. Deepgram POSTs result to your webhook when complete
4. Webhook handler stores result in PostgreSQL via Prisma

---

### BUILD #2: Audio Player Component
**File:** `components/transcripts/audio-player.tsx`  
**Time:** 2-3 days  

**Your research recommends:**
```bash
npm install react-h5-audio-player  # MVP - simple, works immediately
```

**Or build custom with these controls (from Scope v2):**
- Play/Pause, Skip ±5 seconds
- Speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- Keyboard: Space=play, arrows=navigate, R=replay

**Interface from your research:**
```typescript
// From transcript-tracer-js pattern
interface AudioPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}
```

---

### BUILD #3: Audio-Transcript Synchronization
**File:** `components/transcripts/synced-transcript.tsx`  
**Time:** 3-4 days  

**Libraries from your Open Source research:**
- `transcript-tracer-js` - Lightweight sync utility
- `audio-sync-with-text` - NPM package for word-level sync
- `react-highlight-words` - For highlighting current word

**Implementation Pattern (from your research):**
```typescript
// Click-to-Seek Logic
function handleWordClick(word: { start: number }) {
  audioRef.current.currentTime = word.start;
  audioRef.current.play();
}

// Karaoke Highlighting
audioElement.addEventListener('timeupdate', () => {
  const currentTime = audioElement.currentTime;
  // Binary search to find active word
  // Apply CSS class to active word
});
```

**Performance Tip from your research:**
> "Use textContent instead of innerHTML when updating the highlighted word to avoid expensive DOM reflows and XSS vulnerabilities."

---

### BUILD #4: Low-Confidence Word Review UI
**File:** `components/transcripts/low-confidence-review.tsx`  
**Time:** 4-5 days  

**From your Scope v2 - Interface Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Top Panel: Audio player with playback controls                 │
├─────────────────────────────┬───────────────────────────────────┤
│  Left Panel:                │  Right Panel:                     │
│  Full transcript with       │  List of flagged words only       │
│  highlighted flagged words  │  (confidence < 85%)               │
└─────────────────────────────┴───────────────────────────────────┘
```

**Flagged Words Features (from Scope v2):**
- [MVP] Word List: All words with confidence <85%
- [MVP] Context Display: Surrounding words shown
- [MVP] Click-to-Play: Click word to hear audio at timestamp
- [MVP] Edit Inline: Correct without leaving panel
- [MVP] Mark as Reviewed: Checkbox to track progress
- [MVP] Keyboard Navigation: Arrow keys between words

**Keyboard Shortcuts (exact from Scope v2):**
| Key | Action |
|-----|--------|
| Space | Play/Pause audio |
| ↑ / ↓ | Navigate to previous/next flagged word |
| ← / → | Skip back/forward 5 seconds |
| Enter | Confirm edit and mark as reviewed |
| R | Replay current word (seeks to timestamp - 2 sec) |

---

### BUILD #5: DOCX Export with Legal Formatting
**File:** `lib/export.ts`  
**Time:** 2-3 days  

**From your research - Legal Format Requirements:**
- 25 lines per page (legal transcript standard)
- Line numbers in left margin
- Page numbers in footer
- Title page with case information
- Q&A format with speaker labels
- Header/footer with case name

**Package:** `docx` (MIT license, already installed)

---

## PART 2: DATABASE SCHEMA (Enhanced from Research)

Your Deepgram Integration doc suggests this Word model:
```prisma
model Word {
  id           String  @id @default(cuid())
  transcriptId String
  text         String
  start        Float   // For click-to-seek
  end          Float
  confidence   Float   // Flag if < 0.85
  speaker      Int?    // For diarization
  isEdited     Boolean @default(false)
  
  transcript Transcript @relation(fields: [transcriptId], references: [id])
}
```

**Your existing schema already has this as JSON - which is fine for MVP:**
```prisma
model Transcription {
  words           Json  // [{ word, start, end, confidence, speaker }]
  flaggedSegments Json  // Low-confidence words for review
}
```

---

## PART 3: OPEN SOURCE PACKAGES TO INSTALL

### MVP Install (from your Open Source Strategy):
```bash
npm install @deepgram/sdk react-h5-audio-player react-highlight-words docx react-hook-form zod sonner date-fns react-dropzone
```

### Phase 2 Install:
```bash
npm install wavesurfer.js @tiptap/react @tiptap/starter-kit pdf-lib inngest
```

### Package Purposes:
| Package | Purpose | License |
|---------|---------|---------|
| @deepgram/sdk | AI transcription | MIT |
| react-h5-audio-player | Simple audio player | MIT |
| react-highlight-words | Highlight current word | MIT |
| docx | DOCX generation | MIT |
| wavesurfer.js | Waveform (Phase 2) | BSD-3 |
| @tiptap/react | Rich editor (Phase 2) | MIT |

---

## PART 4: USER ROLES (From Scope v2)

| Role | Primary Function | MVP Status |
|------|------------------|------------|
| **Court Reporter** | Upload, transcribe, review, export | ✅ FULL MVP |
| **Scopist** | Edit and refine transcripts | ✅ FULL MVP |
| **Administrator** | Manage users, settings | ✅ BASIC MVP |
| **Attorney** | Review, search, annotate | ◐ PHASE 2 |
| **Interpreter** | View schedule, availability | ○ PHASE 3 |
| **Videographer** | Upload video, deliverables | ○ PHASE 3 |

---

## PART 5: MONTHLY COST ESTIMATE (From Scope v2)

| Service | MVP | Growth |
|---------|-----|--------|
| Vercel (Hosting) | $0 | $20 |
| Supabase (DB + Storage) | $0 | $25 |
| Deepgram (Transcription) | $50-100 | $200+ |
| Domain + Email | $15 | $15 |
| **TOTAL** | **$65-115/mo** | **$260+/mo** |

---

## PART 6: IMPLEMENTATION CHECKLIST (Enhanced)

### Week 1: Core Infrastructure
- [ ] Run `npm install` to fix TypeScript errors
- [ ] Install recommended packages (see Part 3)
- [ ] Implement real Deepgram integration with **Nova-3**
- [ ] Set up webhook handler for batch transcription
- [ ] Test with actual audio file

### Week 2: Audio & Sync
- [ ] Install react-h5-audio-player OR build custom
- [ ] Implement click-to-seek functionality
- [ ] Implement karaoke-style word highlighting
- [ ] Add keyboard shortcuts (Space, arrows, R, Enter)
- [ ] Test with 30-minute audio file

### Week 3: Review UI
- [ ] Build LowConfidenceReview component
- [ ] Implement inline word editing
- [ ] Add "Mark as Reviewed" checkbox
- [ ] Add progress tracking (X of Y reviewed)
- [ ] Create review page at `/jobs/[id]/review`

### Week 4: Export & Polish
- [ ] Implement DOCX export with legal formatting
- [ ] 25 lines per page, line numbers
- [ ] Title page with case info
- [ ] End-to-end testing
- [ ] Deploy to Vercel

---

## PART 7: KEY DIFFERENCES FROM ORIGINAL DOCUMENTS

| Topic | Original | Enhanced |
|-------|----------|----------|
| Deepgram Model | nova-2 | **nova-3** (higher accuracy) |
| Keyboard Shortcuts | Generic | Specific: Space, ↑↓, ←→, Enter, R |
| Audio Player | Custom build | **react-h5-audio-player** for MVP |
| Transcript Sync | Custom | Reference **transcript-tracer-js** patterns |
| Time Savings | Not specified | **50-75% reduction** in review time |
| Filler Words | Not mentioned | **filler_words: true** for verbatim legal |

---

## PART 8: NEXT CURSOR PROMPTS

Use these prompts in order:

1. **02_CURSOR_PROMPT_DEEPGRAM.md** - Now uses Nova-3, webhook pattern
2. **03_CURSOR_PROMPT_AUDIO_PLAYER.md** - Uses react-h5-audio-player or custom
3. **04_CURSOR_PROMPT_TRANSCRIPT_SYNC.md** - Includes binary search, karaoke highlighting
4. **05_CURSOR_PROMPT_LOW_CONFIDENCE_REVIEW.md** - All keyboard shortcuts from Scope v2

---

## APPENDIX: YOUR RESEARCH DOCUMENTS INTEGRATED

| Document | Key Takeaways Incorporated |
|----------|---------------------------|
| Depo-Pro-Scope-v2.docx | User roles, MVP features, keyboard shortcuts, time savings |
| Deepgram Integration.docx | Nova-3 model, webhook pattern, filler_words setting |
| Open Source Strategy.md | Package recommendations, install commands, license checks |
| Open Source Projects.docx | pmacom-react-transcript-editor, transcript-tracer-js |
| GEMINI_RESEARCH_PROMPTS.md | Research structure, priority order |

---

**Your codebase is 55-60% complete. With this enhanced guide and 3-4 weeks of focused work, you'll have an MVP ready for beta users.**

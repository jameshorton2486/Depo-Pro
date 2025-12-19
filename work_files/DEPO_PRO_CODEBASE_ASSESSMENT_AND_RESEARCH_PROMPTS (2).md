# DEPO-PRO: Codebase Assessment & Improved Research Prompts

**Date:** December 2024  
**Purpose:** Assess existing codebase and provide targeted research prompts

---

## PART 1: CODEBASE ASSESSMENT

### Executive Summary

| Metric | Status |
|--------|--------|
| **Overall Completion** | ~55-60% |
| **Foundation Quality** | ✅ SOLID - Keep it |
| **TypeScript Errors** | ⚠️ 100+ (mostly missing node_modules, not code bugs) |
| **Recommendation** | **CONTINUE with existing code** - don't start over |

---

### What You Have (KEEP ✅)

#### 1. Prisma Schema - EXCELLENT (Keep 100%)
```
✅ User model with roles (ADMIN, COURT_REPORTER, SCOPIST)
✅ Firm model (multi-tenant)
✅ Job model with comprehensive fields
✅ JobFile model (audio, video, documents)
✅ JobAssignment model (scopist assignments)
✅ Transcription model with:
   - Word-level data (words JSON field)
   - flaggedSegments (for low-confidence review!)
   - Speaker mapping
   - Confidence scores
   - Edit history (TranscriptionEdit)
✅ TranscriptionExport model (DOCX, PDF, TXT)
✅ Custom dictionary support
✅ Background job tracking
```
**Verdict:** Your schema already supports ALL MVP features. Don't change it.

#### 2. Authentication - SOLID (Keep)
```
✅ NextAuth.js v5 configured
✅ Credentials provider with bcrypt
✅ Role-based session
✅ Protected routes via middleware
```

#### 3. API Routes - GOOD FOUNDATION (Keep, enhance)
```
✅ /api/auth/* - Authentication
✅ /api/jobs/* - Job CRUD
✅ /api/jobs/[id]/files - File upload
✅ /api/jobs/[id]/transcribe - Transcription trigger
✅ /api/jobs/[id]/assign - Scopist assignment
✅ /api/transcripts/[id] - Transcript CRUD
✅ /api/transcripts/[id]/export - Export endpoint
✅ /api/transcripts/[id]/status - Status check
```

#### 4. Components - BASIC (Keep, enhance)
```
✅ Job list, job card, job form
✅ File upload component
✅ Transcript viewer (basic)
✅ Transcript editor (basic)
✅ Assignment management
✅ UI components (button, card, input, etc.)
```

#### 5. Libraries - CORRECT CHOICES (Keep)
```
✅ @deepgram/sdk - Installed, ready to use
✅ docx - For DOCX export
✅ pdfkit - For PDF export
✅ react-hook-form + zod - Form validation
✅ sonner - Toast notifications
✅ lucide-react - Icons
✅ tailwind + shadcn/ui patterns
```

---

### What's Missing (BUILD 🔨)

#### 1. Deepgram Integration - MOCK ONLY
**Status:** Transcription service exists but returns fake data
**File:** `lib/transcription.ts`
```typescript
// Currently returns mock data like:
"This is a mock transcription of the deposition audio..."
```
**Need:** Real Deepgram API calls with word-level timestamps

#### 2. Audio Player Component - DOES NOT EXIST
**Status:** No audio player in codebase
**Need:** 
- HTML5 audio player with custom controls
- Accept `currentTime` prop for external seeking
- `onTimeUpdate` callback for sync
- Playback speed control

#### 3. Audio-Transcript Synchronization - DOES NOT EXIST
**Status:** No implementation
**Need:**
- Click word → seek audio to timestamp
- Highlight current word during playback
- Scroll transcript to follow audio

#### 4. Low-Confidence Review Component - DOES NOT EXIST
**Status:** Schema supports it (`flaggedSegments`), but no UI
**Need:**
- List of flagged words with context
- Click to play audio
- Inline editing
- Mark as reviewed
- Progress tracking

#### 5. DOCX Export - MOCK ONLY
**Status:** `lib/export.ts` exists but returns placeholder
**Need:** Real legal formatting with `docx` package

---

### TypeScript Errors Analysis

**Root Cause:** The errors are from running `tsc` without `node_modules` installed. The code itself is mostly correct.

```
Error: Cannot find module 'react'
Error: Cannot find module 'next-auth/react'
Error: Cannot find module '@prisma/client'
```

**Fix:** Run `npm install` in the project directory. Most errors will disappear.

**Real Issues (few):**
- Some API routes have field mapping mismatches with Prisma schema
- A few component prop types need updating

---

### Recommendation: CONTINUE, DON'T RESTART

| Approach | Effort | Risk |
|----------|--------|------|
| Start over | 6-8 weeks | High (lose working code) |
| Continue existing | 3-4 weeks | Low (foundation is solid) |

**Recommended Path:**
1. Fix TypeScript errors (1-2 days)
2. Implement real Deepgram integration (3-4 days)
3. Build Audio Player component (2-3 days)
4. Build Low-Confidence Review UI (4-5 days)
5. Implement real DOCX export (2-3 days)
6. Testing & polish (3-5 days)

**Total: ~3-4 weeks to MVP**

---

## PART 2: IMPROVED GEMINI RESEARCH PROMPTS

Based on what you already have, here are **revised prompts** that focus only on what you actually need.

---

### PROMPT 1: Audio-Transcript Click-to-Seek (HIGHEST PRIORITY)

```
I need to implement audio-transcript synchronization in a React/Next.js application. My backend already provides word-level timestamps from Deepgram in this format:

{
  "words": [
    { "word": "The", "start": 0.12, "end": 0.32, "confidence": 0.98, "speaker": 0 },
    { "word": "witness", "start": 0.35, "end": 0.72, "confidence": 0.95, "speaker": 0 },
    { "word": "stated", "start": 0.75, "end": 1.12, "confidence": 0.87, "speaker": 0 }
  ]
}

WHAT I NEED TO BUILD:
1. Click any word in the transcript → audio seeks to that word's start time (minus 1-2 seconds for context)
2. During audio playback → currently-playing word is highlighted
3. Transcript auto-scrolls to keep current word visible

FIND:
1. Simple React implementations of word-by-word transcript sync (NOT full karaoke/subtitle editors)
2. How to efficiently find "current word" given audio currentTime (binary search?)
3. React hooks or patterns for audio-text synchronization
4. Any Deepgram-specific examples that show this workflow

I already have an HTML5 audio element. I need the React logic for:
- Rendering clickable word spans with timestamps
- Handling click → audio.currentTime = word.start
- onTimeUpdate handler to find and highlight current word
- Smooth scrolling to current word

TECH STACK: React 18+, TypeScript, Next.js 15
LICENSE: MIT, BSD, or Apache 2.0 only

Provide: Code snippets I can adapt, not just package recommendations.
```

---

### PROMPT 2: Low-Confidence Word Review UI Pattern

```
I'm building a review interface where users correct AI-transcribed words that have low confidence scores. I need UI patterns and implementation examples.

MY DATA STRUCTURE (already in database):
{
  "flaggedSegments": [
    {
      "wordIndex": 45,
      "word": "juristiction",
      "confidence": 0.72,
      "start": 23.45,
      "end": 24.12,
      "context": "within the juristiction of this court",
      "alternatives": ["jurisdiction", "jurisdictions"]
    }
  ]
}

UI REQUIREMENTS:
1. List view showing all flagged words with:
   - The uncertain word (highlighted)
   - Surrounding context (5 words before/after)
   - Confidence percentage
   - Play button to hear that segment

2. Inline editing:
   - Click word to edit
   - Show alternatives as suggestions
   - Save correction

3. Progress tracking:
   - "23 of 47 words reviewed"
   - Mark as reviewed checkbox
   - Skip/defer option

4. Keyboard navigation:
   - Arrow keys: navigate between words
   - Space: play audio
   - Enter: confirm edit
   - Tab: next word

FIND:
1. React implementations of inline-edit lists
2. Keyboard navigation patterns for review workflows
3. Progress tracking UI patterns
4. Any annotation/correction interface examples

NOT looking for: Full document editors, collaborative editing, or complex annotation systems.

TECH STACK: React 18+, TypeScript, Tailwind CSS
LICENSE: MIT only

Provide: Component structure examples, state management patterns, and keyboard handling code.
```

---

### PROMPT 3: Deepgram Pre-Recorded Transcription with Word Timestamps

```
I need to implement Deepgram pre-recorded transcription in a Next.js API route. I already have @deepgram/sdk installed.

SPECIFIC REQUIREMENTS:
1. Transcribe uploaded audio file (MP3, WAV, M4A)
2. Get word-level timestamps with confidence scores
3. Enable speaker diarization (multiple speakers)
4. Support custom vocabulary (legal terms)
5. Handle files up to 2 hours long

WHAT I NEED:
1. Correct Deepgram SDK v4 API usage (NOT v3)
2. Optimal model selection for legal/court audio (nova-2?)
3. Configuration for maximum accuracy on legal terminology
4. Error handling patterns (rate limits, timeouts, failures)
5. How to pass custom vocabulary (keywords)

MY CURRENT MOCK CODE:
```typescript
// This is what I need to replace with real Deepgram calls
async function transcribeWithDeepgram(audioBuffer: Buffer) {
  // TODO: Implement actual Deepgram API call
  console.log('Deepgram requested but not configured - using mock');
  return mockTranscription();
}
```

FIND:
1. Deepgram SDK v4 examples for pre-recorded transcription
2. How to structure the API response for storage
3. Best practices for processing the word-level data
4. Custom vocabulary configuration examples

OUTPUT FORMAT I NEED:
```typescript
{
  text: "Full transcript...",
  confidence: 0.94,
  duration: 3847.5,
  words: [{ word, start, end, confidence, speaker }],
  speakers: { count: 4, labels: {} }
}
```

Provide: Working code I can drop into my Next.js API route.
```

---

### PROMPT 4: Legal DOCX Generation with Line Numbers

```
I need to generate court-standard legal transcripts in DOCX format using the 'docx' npm package (already installed).

LEGAL TRANSCRIPT FORMAT REQUIREMENTS:
1. Title page with:
   - Case name and number
   - Court name
   - Deponent name
   - Date of deposition
   - Court reporter name

2. Transcript body:
   - 25 lines per page (legal standard)
   - Line numbers in left margin (1-25 per page)
   - 1-inch margins
   - Fixed-width font (Courier New, 12pt)

3. Q&A formatting:
   - "Q." and "A." labels in margin
   - Speaker identification (BY MR. SMITH:)
   - Proper indentation

4. Page elements:
   - Page numbers in footer
   - Case name in header
   - "Page X of Y" format

FIND:
1. 'docx' package examples for complex documents
2. How to create tables for line numbers (or alternative approach)
3. Header/footer implementation
4. Page break control for 25-line pages
5. Any legal document templates using 'docx'

MY CURRENT CODE:
```typescript
import { Document, Packer, Paragraph } from 'docx';

export async function exportToDOCX(transcript: Transcription) {
  // TODO: Implement legal formatting
  return Buffer.from('mock');
}
```

Provide: Complete code structure for legal transcript generation with docx package.
```

---

### PROMPT 5: Simple Audio Player React Component

```
I need a simple but professional audio player component for React/Next.js. NOT a waveform visualizer - just clean controls.

REQUIREMENTS:
1. Play/Pause button
2. Current time / Duration display (mm:ss format)
3. Seekable progress bar (click to seek)
4. Playback speed selector (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
5. Volume control (optional)
6. Loading state indicator

EXTERNAL CONTROL (for transcript sync):
- Accept `src` prop (audio URL)
- Accept `currentTime` prop to seek externally
- Provide `onTimeUpdate` callback with current time
- Expose `seekTo(seconds)` method via ref

STYLING:
- Tailwind CSS compatible
- Dark theme friendly
- Compact/minimal design
- Accessible (keyboard navigation)

FIND:
1. Simple React audio player implementations (NOT complex libraries)
2. How to control HTML5 Audio element from React
3. Custom hook patterns for audio state
4. Progress bar with click-to-seek

I want to understand and control the code, not use a black-box library.

Provide: Component code with TypeScript types, useAudioPlayer hook if helpful.
```

---

### PROMPT 6: React State Management for Transcript Editor

```
I need to manage state for a transcript editing interface where:
- Hundreds of words are displayed
- Each word can be edited
- Edits need to be tracked for audit trail
- Performance must be good (no lag on 10,000+ words)

STATE STRUCTURE:
```typescript
interface TranscriptState {
  words: Word[];           // Array of 5,000-15,000 words
  editedWords: Map<number, Edit>;  // Sparse edits by index
  flaggedWords: number[];  // Indices of low-confidence words
  currentWordIndex: number | null;
  audioTime: number;
}
```

OPERATIONS NEEDED:
1. Update single word (without re-rendering all words)
2. Find word by timestamp (binary search)
3. Track edit history (original → new value)
4. Batch save edits to server
5. Undo/redo support (optional)

FIND:
1. Efficient React patterns for large lists with sparse updates
2. When to use useMemo, useCallback, React.memo
3. Virtualization for large word lists (react-window?)
4. Optimistic updates pattern
5. Edit tracking data structures

NOT looking for: Full state management libraries (Redux, Zustand) unless clearly better.

Provide: Code patterns and performance optimization strategies.
```

---

## PROMPT EXECUTION ORDER

Based on your current codebase, here's the optimal order:

| Order | Prompt | Reason | Time |
|-------|--------|--------|------|
| 1 | Deepgram Integration (#3) | Unblocks everything else | 15 min |
| 2 | Audio Player (#5) | Simple, quick win | 10 min |
| 3 | Audio-Transcript Sync (#1) | Core differentiator | 15 min |
| 4 | Low-Confidence Review (#2) | Core differentiator | 15 min |
| 5 | DOCX Export (#4) | Required for delivery | 15 min |
| 6 | State Management (#6) | Performance optimization | 10 min |

**Total Research Time: ~1.5 hours**

---

## PROMPTS YOU DON'T NEED

These were in the original document but you don't need them:

| Original Prompt | Why Skip |
|-----------------|----------|
| SaaS Boilerplate | You already have auth, roles, multi-tenant |
| Waveform Visualization | Phase 2 feature, not MVP |
| Legal Annotation Systems | Phase 2/3 reference, not actionable |
| Rich Text Editor | Your transcript isn't "rich text" - it's structured word data |

---

## CONTEXT PREAMBLE (Use Before Any Prompt)

```
CONTEXT: I am completing Depo-Pro, a legal transcription SaaS.

WHAT I ALREADY HAVE:
- Next.js 15 app with App Router
- Supabase PostgreSQL database
- Prisma ORM with complete schema (users, jobs, transcriptions)
- NextAuth.js v5 authentication with roles
- @deepgram/sdk installed (but using mock data)
- 'docx' and 'pdfkit' packages installed
- Basic UI components with Tailwind CSS + shadcn/ui patterns
- API routes for jobs, transcripts, exports

WHAT I'M BUILDING NOW:
- Real Deepgram transcription integration
- Audio player with transcript synchronization
- Low-confidence word review interface
- Legal DOCX export with proper formatting

CONSTRAINTS:
- TypeScript required
- MIT/BSD/Apache 2.0 licenses only
- Must work with existing Prisma schema
- Next.js 15 App Router patterns

[INSERT SPECIFIC PROMPT HERE]
```

---

## AFTER RESEARCH: IMPLEMENTATION PLAN

Once you have Gemini results, create these files:

```
📁 docs/research/
├── deepgram-integration.md
├── audio-transcript-sync.md
├── low-confidence-review.md
├── docx-legal-export.md
└── audio-player-component.md

📁 components/transcripts/ (new components)
├── audio-player.tsx
├── low-confidence-review.tsx
├── word-span.tsx
└── synced-transcript.tsx

📁 lib/ (enhanced services)
├── transcription.ts (replace mock with real Deepgram)
└── export.ts (implement real DOCX generation)
```

---

## SUMMARY

| Decision | Recommendation |
|----------|----------------|
| Start over? | **NO** - Foundation is solid |
| Fix TypeScript errors? | **YES** - Run npm install, then fix ~10 real issues |
| Use original Gemini prompts? | **NO** - Use revised prompts above |
| Research priority? | Deepgram → Audio Player → Sync → Review → Export |

**Your codebase is 55-60% complete. With focused research and 3-4 weeks of development, you can ship the MVP.**

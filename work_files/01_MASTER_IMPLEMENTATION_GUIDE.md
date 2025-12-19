# DEPO-PRO: Master Implementation Guide

**Document 1 of 5** | **Purpose:** Single source of truth for completing the MVP

---

## EXECUTIVE SUMMARY

Your codebase is **55-60% complete**. This guide tells you exactly what to build to reach MVP.

| What You Have | What You Need |
|---------------|---------------|
| ✅ Prisma schema (complete) | ❌ Real Deepgram integration |
| ✅ NextAuth v5 authentication | ❌ Audio player component |
| ✅ User roles (Admin, Reporter, Scopist) | ❌ Audio-transcript sync |
| ✅ Job CRUD operations | ❌ Low-confidence review UI |
| ✅ File upload infrastructure | ❌ Real DOCX export |
| ✅ API routes (20+ endpoints) | ❌ End-to-end testing |
| ✅ Basic UI components | |

**Timeline:** 3-4 weeks to MVP  
**Budget:** ~$65-115/month operating costs

---

## PART 1: SYSTEM ARCHITECTURE

### Core Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEPO-PRO WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────┘

   COURT REPORTER                    SYSTEM                      SCOPIST
        │                              │                            │
        ▼                              │                            │
  ┌──────────┐                         │                            │
  │ Upload   │                         │                            │
  │ Audio    │────────────────────────▶│                            │
  └──────────┘                         │                            │
                                       ▼                            │
                               ┌───────────────┐                    │
                               │   Deepgram    │                    │
                               │ Transcription │                    │
                               │   (nova-2)    │                    │
                               └───────┬───────┘                    │
                                       │                            │
                                       ▼                            │
                               ┌───────────────┐                    │
                               │ Store Result  │                    │
                               │ • Full text   │                    │
                               │ • Word data   │                    │
                               │ • Confidence  │                    │
                               │ • Speakers    │                    │
                               └───────┬───────┘                    │
                                       │                            │
                                       ▼                            │
                               ┌───────────────┐                    │
                               │ Flag Words    │                    │
                               │ confidence    │                    │
                               │    < 0.85     │                    │
                               └───────┬───────┘                    │
                                       │                            │
                                       ▼                            ▼
                               ┌───────────────┐            ┌──────────────┐
                               │ Assign to     │───────────▶│ Review UI    │
                               │ Scopist       │            │ • Audio sync │
                               └───────────────┘            │ • Edit words │
                                                            │ • Mark done  │
                                                            └──────┬───────┘
                                                                   │
                                                                   ▼
                                                            ┌──────────────┐
                                                            │ Export DOCX  │
                                                            │ Legal format │
                                                            └──────────────┘
```

### Database Schema (Already Complete ✅)

Your Prisma schema already has everything. Key models:

```prisma
# USER & TENANT
User          → id, email, role (ADMIN|COURT_REPORTER|SCOPIST), firmId
Firm          → id, name, type

# JOB MANAGEMENT  
Job           → id, status, stage, caseNumber, caseName, createdById
JobFile       → id, jobId, fileType, originalFileUrl, duration
JobAssignment → id, jobId, userId, role, status

# TRANSCRIPTION (THE CORE)
Transcription → id, jobId, status, fullTranscript, confidence
              → words (JSON): [{ word, start, end, confidence, speaker }]
              → flaggedSegments (JSON): low-confidence words for review
              → speakerMapping (JSON): { "0": "Attorney Smith" }

TranscriptionEdit → id, transcriptionId, wordIndex, originalText, newText
TranscriptionExport → id, transcriptionId, format (PDF|DOCX|TXT), fileUrl
```

### API Routes (Already Built ✅)

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/auth/*` | ALL | NextAuth handlers | ✅ Working |
| `/api/jobs` | GET/POST | List/create jobs | ✅ Working |
| `/api/jobs/[id]` | GET/PATCH/DELETE | Job CRUD | ✅ Working |
| `/api/jobs/[id]/files` | POST | Upload files | ✅ Working |
| `/api/jobs/[id]/transcribe` | POST | Trigger transcription | ⚠️ Uses mock |
| `/api/jobs/[id]/assign` | POST | Assign scopist | ✅ Working |
| `/api/transcripts/[id]` | GET/PATCH | Get/update transcript | ⚠️ Field mapping issues |
| `/api/transcripts/[id]/export` | GET | Export document | ⚠️ Uses mock |
| `/api/transcripts/[id]/status` | GET | Check progress | ✅ Working |
| `/api/transcripts/[id]/words` | PATCH | Save word edits | ❌ Not implemented |

---

## PART 2: WHAT TO BUILD (In Order)

### BUILD #1: Real Deepgram Integration
**File:** `lib/transcription.ts`  
**Time:** 3-4 days  
**Priority:** 🔴 CRITICAL (blocks everything)

**Current state:** Returns mock data
**Target state:** Real Deepgram API with word-level timestamps

```typescript
// REPLACE THIS (current mock):
async function transcribeWithDeepgram(audioBuffer: Buffer) {
  console.log('Deepgram requested but not configured - using mock');
  return transcribeLocal(audioBuffer, options);
}

// WITH THIS (real implementation):
async function transcribeWithDeepgram(audioBuffer: Buffer, options: TranscriptionOptions) {
  const { createClient } = await import('@deepgram/sdk');
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
  
  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-2',
      language: 'en-US',
      punctuate: true,
      diarize: true,
      smart_format: true,
      utterances: true,
    }
  );
  // ... process and return
}
```

**Deepgram Configuration for Legal Audio:**
- Model: `nova-2` (best accuracy)
- `diarize: true` (speaker identification)
- `smart_format: true` (punctuation, capitalization)
- `utterances: true` (sentence grouping)
- Custom vocabulary: Pass legal terms as keywords

---

### BUILD #2: Audio Player Component
**File:** `components/transcripts/audio-player.tsx` (NEW)  
**Time:** 2-3 days  
**Priority:** 🔴 CRITICAL

**Requirements:**
- Play/Pause button
- Seek bar (click to jump)
- Current time / Duration display
- Playback speed (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- External control props for transcript sync

**Interface:**
```typescript
interface AudioPlayerProps {
  src: string;                          // Audio file URL
  currentTime?: number;                 // External time control
  onTimeUpdate?: (time: number) => void; // Callback for sync
}

// Expose ref for external control:
interface AudioPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}
```

---

### BUILD #3: Audio-Transcript Synchronization
**File:** `components/transcripts/synced-transcript.tsx` (NEW)  
**Time:** 3-4 days  
**Priority:** 🔴 CRITICAL (core differentiator)

**Features:**
1. Click any word → audio seeks to that timestamp
2. During playback → current word is highlighted
3. Transcript auto-scrolls to follow audio

**Data structure (already in your schema):**
```typescript
interface Word {
  word: string;
  start: number;  // seconds
  end: number;    // seconds
  confidence: number;
  speaker?: number;
}
```

**Implementation approach:**
1. Render each word as clickable `<span>` with `data-start` attribute
2. On click: `audioRef.current.seekTo(word.start - 1.5)` // 1.5s context
3. On `timeupdate`: Binary search to find current word, add highlight class
4. Use `scrollIntoView({ behavior: 'smooth', block: 'center' })`

---

### BUILD #4: Low-Confidence Word Review UI
**File:** `components/transcripts/low-confidence-review.tsx` (NEW)  
**Time:** 4-5 days  
**Priority:** 🔴 CRITICAL (core differentiator)

**This is your product's unique value proposition.**

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Audio Player                                            [1.0x] │
│  ▶ ━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━  02:34 / 45:12            │
├─────────────────────────────────┬───────────────────────────────┤
│                                 │  Flagged Words (23 of 47)     │
│  Full Transcript                │  ┌───────────────────────────┐│
│  (scrollable, synced)           │  │ 🔊 "juristiction" (72%)   ││
│                                 │  │    "...within the         ││
│  The witness stated their       │  │    [juristiction] of..."  ││
│  name for the record. When      │  │    ○ jurisdiction         ││
│  asked about the events,        │  │    ○ jurisdictions        ││
│  they provided detailed         │  │    [Edit] [✓ Done]        ││
│  testimony regarding the        │  └───────────────────────────┘│
│  [jurisdiction] of the court... │  ┌───────────────────────────┐│
│                                 │  │ 🔊 "plainiff" (68%)       ││
│                                 │  │    "...the [plainiff]     ││
│                                 │  │    filed a motion..."     ││
│                                 │  │    ○ plaintiff            ││
│                                 │  │    [Edit] [✓ Done]        ││
│                                 │  └───────────────────────────┘│
└─────────────────────────────────┴───────────────────────────────┘
```

**Features:**
- List of words with confidence < 0.85
- Show context (5 words before/after)
- Click speaker icon → play audio from that timestamp
- Show alternatives from Deepgram
- Inline edit capability
- Mark as reviewed checkbox
- Progress bar (X of Y reviewed)

**Keyboard shortcuts:**
- `↑/↓` - Navigate between flagged words
- `Space` - Play/pause audio
- `Enter` - Confirm edit
- `Tab` - Next word
- `Escape` - Cancel edit

---

### BUILD #5: Real DOCX Export
**File:** `lib/export.ts`  
**Time:** 2-3 days  
**Priority:** 🟡 MEDIUM (needed for delivery)

**Legal transcript format requirements:**
- 25 lines per page (court standard)
- Line numbers in left margin
- 1-inch margins
- Courier New, 12pt font
- Q/A formatting with speaker labels
- Case info header on each page
- Page numbers in footer

**Using `docx` package (already installed):**
```typescript
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';

export async function exportToDOCX(transcript: Transcription, job: Job): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch = 1440 twips
        },
      },
      children: [
        createTitlePage(job),
        ...createTranscriptBody(transcript),
      ],
    }],
  });
  
  return await Packer.toBuffer(doc);
}
```

---

## PART 3: USER ROLES & PERMISSIONS

### Role Matrix (Already in Schema)

| Feature | ADMIN | COURT_REPORTER | SCOPIST |
|---------|-------|----------------|---------|
| Create jobs | ✅ | ✅ | ❌ |
| Upload audio | ✅ | ✅ | ❌ |
| View all jobs | ✅ | Own only | Assigned only |
| Assign scopist | ✅ | ✅ | ❌ |
| Review flagged words | ✅ | ✅ | ✅ |
| Edit transcript | ✅ | ✅ | ✅ |
| Export documents | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| View analytics | ✅ | Own only | ❌ |

### User Flows

**Court Reporter Flow:**
1. Login → Dashboard shows "My Jobs"
2. Click "New Job" → Enter case info, upload audio
3. System transcribes automatically
4. Assign to scopist OR review self
5. Export final transcript

**Scopist Flow:**
1. Login → Dashboard shows "Assigned Jobs"
2. Click job → Opens review interface
3. Review flagged words with audio sync
4. Mark job complete
5. Reporter gets notified

---

## PART 4: IMPLEMENTATION CHECKLIST

### Week 1: Core Infrastructure
- [ ] Run `npm install` to fix TypeScript errors
- [ ] Fix remaining ~10 real type errors
- [ ] Implement real Deepgram integration
- [ ] Test with actual audio file
- [ ] Verify word-level timestamps stored correctly

### Week 2: Audio & Sync
- [ ] Build AudioPlayer component
- [ ] Build SyncedTranscript component
- [ ] Implement click-to-seek
- [ ] Implement highlight-during-playback
- [ ] Test with 30-minute audio file

### Week 3: Review UI
- [ ] Build LowConfidenceReview component
- [ ] Implement word editing
- [ ] Implement mark-as-reviewed
- [ ] Add keyboard shortcuts
- [ ] Create review page at `/jobs/[id]/review`

### Week 4: Export & Polish
- [ ] Implement real DOCX export
- [ ] Add PDF export (optional)
- [ ] End-to-end testing
- [ ] Fix bugs
- [ ] Deploy to Vercel

---

## PART 5: ENVIRONMENT VARIABLES

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Authentication
NEXTAUTH_URL="http://localhost:3000"  # Change for production
NEXTAUTH_SECRET="[generate with: openssl rand -base64 32]"

# Deepgram
DEEPGRAM_API_KEY="[from console.deepgram.com]"
USE_DEEPGRAM="true"

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[from Supabase dashboard]"
SUPABASE_SERVICE_ROLE_KEY="[from Supabase dashboard]"

# Redis (for background jobs - optional for MVP)
REDIS_URL="redis://localhost:6379"
```

---

## PART 6: FILE STRUCTURE (What to Create)

```
depo-pro/
├── components/
│   └── transcripts/
│       ├── audio-player.tsx        ← CREATE
│       ├── synced-transcript.tsx   ← CREATE
│       ├── low-confidence-review.tsx ← CREATE
│       ├── word-span.tsx           ← CREATE
│       ├── transcript-viewer.tsx   ← EXISTS (enhance)
│       └── transcript-editor.tsx   ← EXISTS (enhance)
├── app/
│   └── (dashboard)/
│       └── jobs/
│           └── [id]/
│               └── review/
│                   └── page.tsx    ← CREATE
├── lib/
│   ├── transcription.ts            ← EXISTS (replace mock)
│   └── export.ts                   ← EXISTS (replace mock)
└── hooks/
    ├── useAudioPlayer.ts           ← CREATE
    └── useTranscriptSync.ts        ← CREATE
```

---

## NEXT STEPS

1. **Read Document 2:** Deepgram Integration Cursor Prompt
2. **Read Document 3:** Audio Player Cursor Prompt
3. **Read Document 4:** Audio-Transcript Sync Cursor Prompt
4. **Read Document 5:** Low-Confidence Review Cursor Prompt

Each document contains a complete, copy-paste-ready prompt for Cursor AI.

---

**Remember:** Your codebase is solid. Don't rebuild what works. Focus on the 5 missing pieces.

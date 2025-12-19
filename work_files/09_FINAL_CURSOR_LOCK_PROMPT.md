# 🔒 CURSOR LOCK PROMPT — DEPO-PRO MVP FINAL INTEGRATION (FINAL)

@workspace You are completing the FINAL MVP integration for Depo-Pro, a legal transcription SaaS.

⚠️ **THIS IS A LOCKED SCOPE TASK.**
Do not redesign, refactor, or add features.
Only wire, fix, and stabilize what already exists.

════════════════════════════════════
SOURCE OF TRUTH (READ-ONLY)
════════════════════════════════════
The following documents define intent and MUST NOT be rewritten, summarized, or reinterpreted:

/work_files/
- 00_README_START_HERE.md
- 01_MASTER_IMPLEMENTATION_GUIDE_ENHANCED.md
- 02_CURSOR_PROMPT_DEEPGRAM.md
- 03_CURSOR_PROMPT_AUDIO_PLAYER.md
- 04_CURSOR_PROMPT_TRANSCRIPT_SYNC.md
- 05_CURSOR_PROMPT_LOW_CONFIDENCE_REVIEW.md
- 08_FINAL_INTEGRATION_GUIDE.md

════════════════════════════════════
GLOBAL CONSTRAINTS (NON-NEGOTIABLE)
════════════════════════════════════
- ❌ Do NOT add Phase 2 features (waveform, TipTap, PDF, streaming)
- ❌ Do NOT change Prisma schema shape
- ❌ Do NOT rename existing API routes
- ❌ Do NOT add new dependencies unless already listed
- ❌ Do NOT refactor architecture
- ❌ Do NOT invent data fields
- ❌ Do NOT perform stylistic or structural refactors while fixing types

- ✅ Use Deepgram model: **nova-3** (everywhere, no exceptions)
- ✅ Confidence threshold: **0.85**
- ✅ JSON word storage (no normalization)
- ✅ Direct transcription calls (NO webhooks for MVP)

════════════════════════════════════
CANONICAL DATA CONTRACTS (MUST MATCH)
════════════════════════════════════

**Word object:**
```typescript
{
  word: string
  start: number
  end: number
  confidence: number
  speaker?: number
  punctuated_word?: string
  isEdited?: boolean
}
```

**FlaggedSegment object:**
```typescript
{
  wordIndex: number
  word: string
  confidence: number
  start: number
  end: number
  context: string
  alternatives: string[]
  isReviewed?: boolean
  correctedWord?: string
  reviewedAt?: string
  reviewedById?: string
}
```

════════════════════════════════════
TASKS (EXECUTE IN THIS ORDER ONLY)
════════════════════════════════════

## 1️⃣ FIX TYPESCRIPT ERRORS
- Run `npm run typecheck`
- Fix errors WITHOUT:
  • changing Prisma schema
  • changing runtime behavior
  • renaming exports
  • reorganizing files
- Allowed fixes ONLY:
  • import corrections (NextAuth v5)
  • enum mismatches
  • explicit typing / narrowing
- Continue until ZERO TypeScript errors remain

## 2️⃣ REVIEW PAGE (SERVER)
Create:
`app/(dashboard)/jobs/[id]/review/page.tsx`

Requirements:
- Auth guard (NextAuth v5)
- Load job, transcription, and audio file metadata
- Redirect if unauthenticated or transcription missing
- Pass data to client component only
- No UI or browser logic here

## 3️⃣ REVIEW PAGE (CLIENT)
Create:
`app/(dashboard)/jobs/[id]/review/client.tsx`

Wire together:
- AudioPlayer (top)
- SyncedTranscript (left panel)
- LowConfidenceReview (right panel)

**Rules:**
- **A SINGLE shared audio element / ref must be used for all playback and syncing**
- Keyboard shortcuts MUST ignore input, textarea, and contentEditable fields
- Transcript sync MUST use binary search (not linear scan)
- Review state must persist to flaggedSegments (isReviewed, correctedWord)
- Audio seek includes ~1.5s pre-roll context

**Persistence rule:**
- Edits and review state are saved ONLY when the user clicks "Save" or "Mark Complete"
- Do NOT autosave on every keystroke

## 4️⃣ SAVE WORD EDITS API
Create:
`app/api/transcripts/[id]/words/route.ts`

Behavior:
- Validate session
- Accept batch edits
- Update:
  • words JSON
  • flaggedSegments JSON
- Create TranscriptionEdit records
- No schema changes
- No background jobs

## 5️⃣ JOB STATUS UPDATE API
Create:
`app/api/jobs/[id]/status/route.ts`

Behavior:
- Validate session
- Update job.status ONLY using valid enum values
- No side effects
- No cascading updates

════════════════════════════════════
KEY IMPLEMENTATION RULES
════════════════════════════════════
- Audio keyboard shortcuts must NOT fire while typing
- Transcript sync must use binary search
- Review progress must survive page refresh
- Deepgram modelUsed must always be "nova-3"
- No webhook logic for MVP
- **No performance optimizations beyond correctness**

════════════════════════════════════
DELIVERABLES
════════════════════════════════════
- Working review page at `/jobs/[id]/review`
- `npm run typecheck` passes
- End-to-end flow works:
  upload → transcribe → review → save → complete → export

**Proceed step-by-step and show file diffs as you go.**

---

## Final Confidence Check

If you run this exact prompt:

✅ Cursor will not drift  
✅ Cursor will not overbuild  
✅ Cursor will not refactor away working code  
✅ You'll end up with a true MVP, not a half-platform

---

## What to Do Next (Exact)

1. Paste the FINAL REFINED PROMPT into Cursor
2. Let it run to completion
3. Come back and say exactly one of these:
   - "TypeScript errors remain"
   - "Review page loads but X is broken"
   - "Cursor finished — please audit"

I'll do the final production-grade audit and sign off on beta readiness.


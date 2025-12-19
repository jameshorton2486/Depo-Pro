# DEPO-PRO: Final Integration Guide

**You're at 85% → This guide gets you to 100% MVP**

---

## PHASE 1: Fix Pre-Existing TypeScript Errors (1-2 hours)

### Common Issues & Fixes

#### Issue 1: Auth Import Errors
```typescript
// OLD (broken)
import { auth } from "@/lib/auth"

// NEW (NextAuth v5 pattern)
import { auth } from "@/auth"
// OR
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
```

#### Issue 2: Job Status Enum Mismatches
```typescript
// Check your Prisma schema for the actual enum values
enum JobStatus {
  PENDING
  PROCESSING
  AI_COMPLETE
  SCOPIST_ASSIGNED
  SCOPIST_COMPLETE
  FINAL_REVIEW
  COMPLETED
  FAILED
}

// Make sure API routes use exact enum values
status: 'AI_COMPLETE'  // Not 'ai_complete' or 'AiComplete'
```

#### Issue 3: Missing Prisma Properties
```bash
# Regenerate Prisma client after schema changes
npx prisma generate

# If schema changed, push to database
npx prisma db push
```

### Cursor Prompt to Fix All TypeScript Errors

```
@workspace Run `npm run typecheck` and fix ALL TypeScript errors. 

Common patterns to look for:
1. Auth imports - update to NextAuth v5 patterns
2. Job status enums - ensure they match Prisma schema exactly
3. Missing Prisma properties - check if schema needs updating
4. Type mismatches between API responses and components

For each error:
1. Show the file and line
2. Explain the issue
3. Apply the fix

Continue until `npm run typecheck` shows zero errors.
```

---

## PHASE 2: Wire Up the Review Page (2-3 hours)

### Create the Full Review Page

**File:** `app/(dashboard)/jobs/[id]/review/page.tsx`

```typescript
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ReviewPageClient } from './client';

interface Props {
  params: { id: string };
}

export default async function ReviewPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      transcription: true,
      files: {
        where: { fileType: 'AUDIO' },
        take: 1,
      },
    },
  });

  if (!job) {
    notFound();
  }

  if (!job.transcription) {
    // Redirect to job detail if no transcription yet
    redirect(`/jobs/${params.id}`);
  }

  const audioFile = job.files[0];
  const audioUrl = audioFile?.originalFileUrl || audioFile?.processedFileUrl || '';

  return (
    <div className="h-screen flex flex-col">
      <Suspense fallback={<ReviewPageSkeleton />}>
        <ReviewPageClient
          jobId={job.id}
          caseName={job.caseName || 'Untitled Deposition'}
          caseNumber={job.caseNumber || ''}
          audioUrl={audioUrl}
          transcription={{
            id: job.transcription.id,
            words: job.transcription.words as any[],
            flaggedSegments: job.transcription.flaggedSegments as any[],
            speakerMapping: job.transcription.speakerMapping as Record<string, string> || {},
            fullTranscript: job.transcription.fullTranscript || '',
          }}
        />
      </Suspense>
    </div>
  );
}

function ReviewPageSkeleton() {
  return (
    <div className="h-screen flex flex-col animate-pulse">
      <div className="h-16 bg-slate-200 dark:bg-slate-800" />
      <div className="h-20 bg-slate-100 dark:bg-slate-900" />
      <div className="flex-1 grid grid-cols-[1fr,400px]">
        <div className="bg-slate-50 dark:bg-slate-950" />
        <div className="bg-slate-100 dark:bg-slate-900 border-l" />
      </div>
    </div>
  );
}
```

### Create the Client Component

**File:** `app/(dashboard)/jobs/[id]/review/client.tsx`

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { AudioPlayer, AudioPlayerRef } from '@/components/transcripts/audio-player';
import { SyncedTranscript } from '@/components/transcripts/synced-transcript';
import { LowConfidenceReview } from '@/components/transcripts/low-confidence-review';
import { Button } from '@/components/ui/button';

interface TranscriptionData {
  id: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: number;
    punctuated_word?: string;
  }>;
  flaggedSegments: Array<{
    wordIndex: number;
    word: string;
    confidence: number;
    start: number;
    end: number;
    context: string;
    alternatives: string[];
  }>;
  speakerMapping: Record<string, string>;
  fullTranscript: string;
}

interface Props {
  jobId: string;
  caseName: string;
  caseNumber: string;
  audioUrl: string;
  transcription: TranscriptionData;
}

export function ReviewPageClient({
  jobId,
  caseName,
  caseNumber,
  audioUrl,
  transcription,
}: Props) {
  const router = useRouter();
  const audioRef = useRef<AudioPlayerRef>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [reviewedWords, setReviewedWords] = useState<Set<number>>(new Set());
  const [editedWords, setEditedWords] = useState<Map<number, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);

  // Convert speaker mapping to labels
  const speakerLabels = Object.entries(transcription.speakerMapping || {}).reduce(
    (acc, [key, value]) => {
      acc[parseInt(key)] = value;
      return acc;
    },
    {} as Record<number, string>
  );

  // Handle word click in transcript
  const handleWordClick = useCallback((index: number, startTime: number) => {
    audioRef.current?.seekTo(Math.max(0, startTime - 1.5));
    audioRef.current?.play();
  }, []);

  // Handle play from flagged word
  const handlePlayAudio = useCallback((startTime: number) => {
    audioRef.current?.seekTo(startTime);
    audioRef.current?.play();
    
    // Find which flagged segment this corresponds to
    const segment = transcription.flaggedSegments.find(
      (s) => Math.abs(s.start - startTime - 1.5) < 0.1 || Math.abs(s.start - startTime) < 0.1
    );
    if (segment) {
      setCurrentlyPlayingIndex(segment.wordIndex);
    }
  }, [transcription.flaggedSegments]);

  // Handle word edit
  const handleEditWord = useCallback(async (wordIndex: number, newWord: string) => {
    setEditedWords((prev) => new Map(prev).set(wordIndex, newWord));
    setReviewedWords((prev) => new Set([...prev, wordIndex]));
  }, []);

  // Handle mark as reviewed
  const handleMarkReviewed = useCallback((wordIndex: number) => {
    setReviewedWords((prev) => new Set([...prev, wordIndex]));
  }, []);

  // Save all edits
  const handleSaveEdits = async () => {
    if (editedWords.size === 0) {
      toast.info('No edits to save');
      return;
    }

    setIsSaving(true);
    
    try {
      const edits = Array.from(editedWords.entries()).map(([wordIndex, newWord]) => ({
        wordIndex,
        originalWord: transcription.words[wordIndex]?.word || '',
        newWord,
        reviewedAt: new Date().toISOString(),
      }));

      const response = await fetch(`/api/transcripts/${transcription.id}/words`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits }),
      });

      if (!response.ok) {
        throw new Error('Failed to save edits');
      }

      toast.success(`Saved ${edits.length} word corrections`);
      setEditedWords(new Map()); // Clear pending edits
    } catch (error) {
      toast.error('Failed to save edits. Please try again.');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Mark job as complete
  const handleMarkComplete = async () => {
    const pendingCount = transcription.flaggedSegments.length - reviewedWords.size;
    
    if (pendingCount > 0) {
      const confirmed = window.confirm(
        `You have ${pendingCount} unreviewed words. Are you sure you want to mark this job as complete?`
      );
      if (!confirmed) return;
    }

    // Save any pending edits first
    if (editedWords.size > 0) {
      await handleSaveEdits();
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SCOPIST_COMPLETE' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update job status');
      }

      toast.success('Job marked as complete!');
      router.push(`/jobs/${jobId}`);
    } catch (error) {
      toast.error('Failed to mark job complete');
      console.error('Status update error:', error);
    }
  };

  const totalFlagged = transcription.flaggedSegments.length;
  const totalReviewed = reviewedWords.size;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <Link
            href={`/jobs/${jobId}`}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Job
          </Link>
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-white">{caseName}</h1>
            {caseNumber && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Case #{caseNumber}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveEdits}
            disabled={isSaving || editedWords.size === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : `Save (${editedWords.size})`}
          </Button>
          <Button
            size="sm"
            onClick={handleMarkComplete}
            disabled={isSaving}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>
        </div>
      </header>

      {/* Audio Player */}
      <div className="px-4 py-3 border-b dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
        <AudioPlayer
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={setCurrentTime}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-[1fr,400px] overflow-hidden">
        {/* Left: Transcript */}
        <div className="overflow-auto p-6">
          <SyncedTranscript
            words={transcription.words}
            currentTime={currentTime}
            onWordClick={handleWordClick}
            speakerLabels={speakerLabels}
            lowConfidenceThreshold={0.85}
          />
        </div>

        {/* Right: Review Panel */}
        <div className="border-l dark:border-slate-800 overflow-hidden">
          <LowConfidenceReview
            flaggedSegments={transcription.flaggedSegments}
            onPlayAudio={handlePlayAudio}
            onEditWord={handleEditWord}
            onMarkReviewed={handleMarkReviewed}
            reviewedWords={reviewedWords}
            currentlyPlayingIndex={currentlyPlayingIndex}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## PHASE 3: Create Missing API Routes (1-2 hours)

### PATCH /api/transcripts/[id]/words

**File:** `app/api/transcripts/[id]/words/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

interface WordEdit {
  wordIndex: number;
  originalWord: string;
  newWord: string;
  reviewedAt: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { edits } = await request.json() as { edits: WordEdit[] };

    if (!edits || !Array.isArray(edits)) {
      return NextResponse.json({ error: 'Invalid edits format' }, { status: 400 });
    }

    // Get current transcription
    const transcription = await prisma.transcription.findUnique({
      where: { id: params.id },
    });

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Update words array
    const words = transcription.words as any[];
    const flaggedSegments = transcription.flaggedSegments as any[];

    for (const edit of edits) {
      // Update word in words array
      if (words[edit.wordIndex]) {
        words[edit.wordIndex] = {
          ...words[edit.wordIndex],
          word: edit.newWord,
          punctuated_word: edit.newWord,
          isEdited: true,
        };
      }

      // Mark as reviewed in flaggedSegments
      const flaggedIndex = flaggedSegments.findIndex(
        (s: any) => s.wordIndex === edit.wordIndex
      );
      if (flaggedIndex !== -1) {
        flaggedSegments[flaggedIndex] = {
          ...flaggedSegments[flaggedIndex],
          isReviewed: true,
          correctedWord: edit.newWord,
        };
      }

      // Create edit record
      await prisma.transcriptionEdit.create({
        data: {
          transcriptionId: params.id,
          wordIndex: edit.wordIndex,
          originalText: edit.originalWord,
          newText: edit.newWord,
          editedById: session.user.id,
        },
      });
    }

    // Update transcription
    await prisma.transcription.update({
      where: { id: params.id },
      data: {
        words,
        flaggedSegments,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      editCount: edits.length 
    });
  } catch (error) {
    console.error('Word edit error:', error);
    return NextResponse.json(
      { error: 'Failed to save word edits' },
      { status: 500 }
    );
  }
}
```

### PATCH /api/jobs/[id]/status

**File:** `app/api/jobs/[id]/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();

    const job = await prisma.job.update({
      where: { id: params.id },
      data: { 
        status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 }
    );
  }
}
```

---

## PHASE 4: End-to-End Testing Checklist

### Test 1: Basic Flow
- [ ] Login as Court Reporter
- [ ] Create new job with case info
- [ ] Upload audio file (MP3 or WAV)
- [ ] Trigger transcription
- [ ] Wait for AI_COMPLETE status

### Test 2: Review Interface
- [ ] Navigate to `/jobs/[id]/review`
- [ ] Audio player loads and plays
- [ ] Transcript displays with words
- [ ] Low-confidence words highlighted in transcript
- [ ] Flagged words panel shows items

### Test 3: Core Features
- [ ] Click word in transcript → audio seeks
- [ ] Audio plays → current word highlights
- [ ] Click speaker icon in flagged panel → audio plays
- [ ] Edit word inline → save works
- [ ] Mark as reviewed → progress updates
- [ ] Keyboard shortcuts work (Space, arrows, R, Enter)

### Test 4: Export
- [ ] Export to DOCX
- [ ] Check 25 lines per page
- [ ] Check line numbers
- [ ] Check case info header

---

## Quick Reference: File Structure After Integration

```
app/
├── (dashboard)/
│   └── jobs/
│       └── [id]/
│           ├── page.tsx              # Job detail
│           └── review/
│               ├── page.tsx          # Server component ← CREATE
│               └── client.tsx        # Client component ← CREATE
├── api/
│   ├── jobs/
│   │   └── [id]/
│   │       └── status/
│   │           └── route.ts          # Update job status ← CREATE
│   └── transcripts/
│       └── [id]/
│           └── words/
│               └── route.ts          # Save word edits ← CREATE

components/transcripts/
├── audio-player.tsx                   # ✅ Enhanced
├── synced-transcript.tsx              # ✅ Created
├── word-span.tsx                      # ✅ Created
├── low-confidence-review.tsx          # ✅ Enhanced
└── flagged-word-card.tsx              # ✅ Created

hooks/
└── useTranscriptSync.ts               # ✅ Created
```

---

## Cursor Prompt for Final Integration

```
@workspace I need to complete the Depo-Pro MVP integration. Please:

1. Create `app/(dashboard)/jobs/[id]/review/page.tsx` - Server component that:
   - Checks authentication
   - Loads job with transcription and audio file
   - Renders ReviewPageClient

2. Create `app/(dashboard)/jobs/[id]/review/client.tsx` - Client component that:
   - Uses AudioPlayer, SyncedTranscript, and LowConfidenceReview components
   - Handles state for currentTime, reviewedWords, editedWords
   - Implements save and mark complete functionality

3. Create `app/api/transcripts/[id]/words/route.ts` - API to save word edits

4. Create `app/api/jobs/[id]/status/route.ts` - API to update job status

Use the existing components from:
- components/transcripts/audio-player.tsx
- components/transcripts/synced-transcript.tsx
- components/transcripts/low-confidence-review.tsx

The review page layout should be:
- Header with back button, case name, save/complete buttons
- Audio player below header
- Two-column layout: transcript on left, flagged words panel on right
```

---

## You're Almost There! 🎉

| Task | Time | Status |
|------|------|--------|
| Fix TypeScript errors | 1-2 hours | ⬜ |
| Create review page | 2-3 hours | ⬜ |
| Create API routes | 1-2 hours | ⬜ |
| End-to-end testing | 1-2 hours | ⬜ |
| **Total remaining** | **5-9 hours** | |

After these tasks, you'll have a fully functional MVP ready for beta testing!

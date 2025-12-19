# DEPO-PRO: Starter Code Files

**Copy these files directly into your project to save Cursor tokens.**

These are skeleton files with the correct structure. Cursor will fill in the implementation details.

---

## File 1: components/transcripts/audio-player.tsx

```tsx
'use client';

import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  className?: string;
}

export interface AudioPlayerRef {
  seekTo: (timeInSeconds: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  getCurrentTime: () => number;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  function AudioPlayer({ src, onTimeUpdate, onDurationChange, onEnded, className }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    // TODO: Implement useImperativeHandle for external control
    // TODO: Implement event handlers (play, pause, timeupdate, etc.)
    // TODO: Implement progress bar click-to-seek
    // TODO: Implement playback speed control
    // TODO: Implement volume control

    return (
      <div className={cn('flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg', className)}>
        <audio ref={audioRef} src={src} />
        
        {/* TODO: Add controls */}
        <button onClick={() => audioRef.current?.play()}>
          <Play className="w-5 h-5" />
        </button>
        
        <span className="font-mono text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        
        {/* TODO: Add progress bar, speed control, volume */}
      </div>
    );
  }
);

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default AudioPlayer;
```

---

## File 2: components/transcripts/word-span.tsx

```tsx
'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

export interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

interface WordSpanProps {
  word: Word;
  index: number;
  isCurrentWord: boolean;
  isLowConfidence: boolean;
  onClick: (index: number, start: number) => void;
}

export const WordSpan = memo(function WordSpan({
  word,
  index,
  isCurrentWord,
  isLowConfidence,
  onClick,
}: WordSpanProps) {
  const displayText = word.punctuated_word || word.word;

  return (
    <span
      onClick={() => onClick(index, word.start)}
      className={cn(
        'cursor-pointer px-0.5 rounded transition-colors',
        'hover:bg-slate-200 dark:hover:bg-slate-700',
        isCurrentWord && 'bg-yellow-300 dark:bg-yellow-600 font-medium',
        isLowConfidence && !isCurrentWord && 'underline decoration-red-500 decoration-wavy'
      )}
    >
      {displayText}
    </span>
  );
});

export default WordSpan;
```

---

## File 3: components/transcripts/synced-transcript.tsx

```tsx
'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { WordSpan, Word } from './word-span';
import { cn } from '@/lib/utils';

interface SyncedTranscriptProps {
  words: Word[];
  currentTime: number;
  onWordClick: (index: number, startTime: number) => void;
  lowConfidenceThreshold?: number;
  speakerLabels?: Record<number, string>;
  className?: string;
}

// Binary search to find word at current time
function findWordAtTime(words: Word[], time: number): number | null {
  // TODO: Implement binary search
  // Return index of word where time >= start && time <= end
  return null;
}

export function SyncedTranscript({
  words,
  currentTime,
  onWordClick,
  lowConfidenceThreshold = 0.85,
  speakerLabels = {},
  className,
}: SyncedTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentWordIndex = useMemo(() => {
    return findWordAtTime(words, currentTime);
  }, [words, currentTime]);

  // TODO: Implement auto-scroll to current word
  // TODO: Group words by speaker
  // TODO: Render words with WordSpan component

  return (
    <div ref={containerRef} className={cn('prose dark:prose-invert max-w-none', className)}>
      {words.map((word, index) => (
        <React.Fragment key={index}>
          <WordSpan
            word={word}
            index={index}
            isCurrentWord={index === currentWordIndex}
            isLowConfidence={word.confidence < lowConfidenceThreshold}
            onClick={onWordClick}
          />
          {' '}
        </React.Fragment>
      ))}
    </div>
  );
}

export default SyncedTranscript;
```

---

## File 4: components/transcripts/flagged-word-card.tsx

```tsx
'use client';

import React, { useState } from 'react';
import { Volume2, Check, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FlaggedSegment {
  wordIndex: number;
  word: string;
  confidence: number;
  start: number;
  end: number;
  context: string;
  alternatives: string[];
}

interface FlaggedWordCardProps {
  segment: FlaggedSegment;
  isReviewed: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onEdit: (newWord: string) => void;
  onMarkReviewed: () => void;
}

export function FlaggedWordCard({
  segment,
  isReviewed,
  isPlaying,
  onPlay,
  onEdit,
  onMarkReviewed,
}: FlaggedWordCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(segment.word);

  // TODO: Implement edit mode toggle
  // TODO: Implement keyboard handlers (Enter to confirm, Escape to cancel)
  // TODO: Implement alternative selection

  return (
    <div className={cn(
      'rounded-lg p-4 border-l-4',
      isReviewed ? 'border-l-green-500 opacity-75' : 'border-l-amber-500',
      isPlaying && 'ring-2 ring-blue-500'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onPlay}>
          <Volume2 className="w-4 h-4" />
        </button>
        <span className="font-medium">"{segment.word}"</span>
        <span className="text-xs bg-yellow-100 px-2 py-0.5 rounded">
          {Math.round(segment.confidence * 100)}%
        </span>
      </div>
      
      <div className="text-sm text-slate-600 mb-2">
        {segment.context}
      </div>
      
      {/* TODO: Add alternatives, edit button, mark done button */}
    </div>
  );
}

export default FlaggedWordCard;
```

---

## File 5: components/transcripts/low-confidence-review.tsx

```tsx
'use client';

import React, { useState } from 'react';
import { FlaggedWordCard, FlaggedSegment } from './flagged-word-card';
import { cn } from '@/lib/utils';

interface LowConfidenceReviewProps {
  flaggedSegments: FlaggedSegment[];
  onPlayAudio: (startTime: number) => void;
  onEditWord: (wordIndex: number, newWord: string) => void;
  onMarkReviewed: (wordIndex: number) => void;
  reviewedWords: Set<number>;
  className?: string;
}

export function LowConfidenceReview({
  flaggedSegments,
  onPlayAudio,
  onEditWord,
  onMarkReviewed,
  reviewedWords,
  className,
}: LowConfidenceReviewProps) {
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

  const totalFlagged = flaggedSegments.length;
  const totalReviewed = reviewedWords.size;
  const progress = totalFlagged > 0 ? (totalReviewed / totalFlagged) * 100 : 0;

  const filteredSegments = flaggedSegments.filter(
    (seg) => filter === 'all' || !reviewedWords.has(seg.wordIndex)
  );

  // TODO: Implement keyboard navigation
  // TODO: Implement filter toggle

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with progress */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">📋 Flagged Words</h2>
        <div className="text-sm text-slate-600">
          {totalReviewed} of {totalFlagged} reviewed ({Math.round(progress)}%)
        </div>
        <div className="h-2 bg-slate-200 rounded-full mt-2">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredSegments.map((segment) => (
          <FlaggedWordCard
            key={segment.wordIndex}
            segment={segment}
            isReviewed={reviewedWords.has(segment.wordIndex)}
            isPlaying={false}
            onPlay={() => onPlayAudio(segment.start - 1.5)}
            onEdit={(newWord) => {
              onEditWord(segment.wordIndex, newWord);
              onMarkReviewed(segment.wordIndex);
            }}
            onMarkReviewed={() => onMarkReviewed(segment.wordIndex)}
          />
        ))}
      </div>
    </div>
  );
}

export default LowConfidenceReview;
```

---

## File 6: app/(dashboard)/jobs/[id]/review/page.tsx

```tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ReviewPageClient } from './client';

interface Props {
  params: { id: string };
}

export default async function ReviewPage({ params }: Props) {
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

  if (!job || !job.transcription) {
    notFound();
  }

  const audioUrl = job.files[0]?.originalFileUrl || '';

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewPageClient
        jobId={job.id}
        caseName={job.caseName || 'Untitled'}
        audioUrl={audioUrl}
        transcription={job.transcription}
      />
    </Suspense>
  );
}
```

---

## File 7: app/(dashboard)/jobs/[id]/review/client.tsx

```tsx
'use client';

import { useState, useRef } from 'react';
import { AudioPlayer, AudioPlayerRef } from '@/components/transcripts/audio-player';
import { SyncedTranscript } from '@/components/transcripts/synced-transcript';
import { LowConfidenceReview } from '@/components/transcripts/low-confidence-review';
import type { Transcription } from '@prisma/client';

interface Props {
  jobId: string;
  caseName: string;
  audioUrl: string;
  transcription: Transcription;
}

export function ReviewPageClient({ jobId, caseName, audioUrl, transcription }: Props) {
  const audioRef = useRef<AudioPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [reviewedWords, setReviewedWords] = useState<Set<number>>(new Set());

  const words = (transcription.words as any[]) || [];
  const flaggedSegments = (transcription.flaggedSegments as any[]) || [];

  const handleWordClick = (index: number, startTime: number) => {
    audioRef.current?.seekTo(Math.max(0, startTime - 1.5));
    audioRef.current?.play();
  };

  const handlePlayAudio = (startTime: number) => {
    audioRef.current?.seekTo(startTime);
    audioRef.current?.play();
  };

  const handleEditWord = async (wordIndex: number, newWord: string) => {
    // TODO: Implement API call to save edit
    console.log('Edit word:', wordIndex, newWord);
  };

  const handleMarkReviewed = (wordIndex: number) => {
    setReviewedWords((prev) => new Set([...prev, wordIndex]));
    // TODO: Implement API call to persist
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">{caseName}</h1>
      </div>

      {/* Audio Player */}
      <div className="p-4 border-b">
        <AudioPlayer
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={setCurrentTime}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-[1fr,400px] overflow-hidden">
        {/* Transcript */}
        <div className="overflow-auto p-6">
          <SyncedTranscript
            words={words}
            currentTime={currentTime}
            onWordClick={handleWordClick}
          />
        </div>

        {/* Review panel */}
        <div className="border-l overflow-hidden">
          <LowConfidenceReview
            flaggedSegments={flaggedSegments}
            onPlayAudio={handlePlayAudio}
            onEditWord={handleEditWord}
            onMarkReviewed={handleMarkReviewed}
            reviewedWords={reviewedWords}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Usage Instructions

1. Create each file in your project at the specified path
2. Run `npm run typecheck` - you'll see errors for incomplete implementations
3. Open Cursor, reference the file, and ask it to complete the TODO items
4. Use the corresponding Cursor Prompt document for detailed requirements

**Example Cursor command:**
```
@audio-player.tsx Please complete this component. Implement the useImperativeHandle, event handlers, progress bar, and playback speed control. See the requirements in 03_CURSOR_PROMPT_AUDIO_PLAYER.md
```

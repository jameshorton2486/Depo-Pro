# CURSOR PROMPT: Low-Confidence Word Review UI (ENHANCED)

**Document 5 of 5** | **Copy this entire file into Cursor**  
**Updated with exact keyboard shortcuts and layout from Depo-Pro Scope v2**

---

## FROM SCOPE v2: TIME SAVINGS TARGET

> **"ESTIMATED TIME SAVINGS: 50-75% REDUCTION IN REVIEW TIME"**
> - Traditional Review: 2-hour deposition = 120 minutes of listening
> - Depo-Pro Review: Only 15-30 minutes (flagged words only)
> - Deepgram accuracy: ~95% (Nova-3 model)
> - Words below 85% confidence: ~5-10% = 900-1,800 words per deposition

---

## KEYBOARD SHORTCUTS (EXACT FROM SCOPE v2)

| Key | Action |
|-----|--------|
| **Space** | Play/Pause audio |
| **↑ / ↓** | Navigate to previous/next flagged word |
| **← / →** | Skip back/forward 5 seconds |
| **Enter** | Confirm edit and mark as reviewed |
| **R** | Replay current word (seeks to timestamp - 2 sec) |

---

## FROM SCOPE v2: INTERFACE LAYOUT

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [MVP] Top Panel: Audio player with playback controls                   │
├─────────────────────────────────┬───────────────────────────────────────┤
│                                 │                                       │
│  [MVP] Left Panel:              │  [MVP] Right Panel:                   │
│  Full transcript with           │  List of flagged words only           │
│  highlighted flagged words      │  (confidence < 85%)                   │
│                                 │                                       │
└─────────────────────────────────┴───────────────────────────────────────┘
```

---

## FROM SCOPE v2: MVP FEATURES

**Flagged Words Features:**
- [MVP] Word List: All words with confidence <85%
- [MVP] Context Display: Surrounding words shown
- [MVP] Click-to-Play: Click word to hear audio at timestamp
- [MVP] Edit Inline: Correct without leaving panel
- [MVP] Mark as Reviewed: Checkbox to track progress
- [MVP] Keyboard Navigation: Arrow keys between words

**Audio Controls:**
- [MVP] Play/Pause, Skip ±5 seconds
- [MVP] Speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- [MVP] Keyboard: Space=play, arrows=navigate, R=replay
- [PHASE 2] Waveform Visualization

**Job Completion:**
- [MVP] Submit for Review: Send back to reporter
- [MVP] Completion Notes: Add comments
- [MVP] Progress Indicator: X of Y words reviewed

---

## PROMPT FOR CURSOR AI

```
@workspace Create the low-confidence word review interface - this is the core differentiating feature of Depo-Pro. Scopists use this to efficiently review and correct words that AI transcription flagged as uncertain. This feature is what provides the 50-75% time savings.

## CONTEXT

This is Depo-Pro, a legal transcription SaaS. After Deepgram transcribes audio, words with confidence < 0.85 are flagged for human review. The data is stored as:

```typescript
// Transcription.flaggedSegments (JSON field in Prisma)
[
  {
    "wordIndex": 45,
    "word": "juristiction",
    "confidence": 0.72,
    "start": 23.45,
    "end": 24.12,
    "context": "within the [juristiction] of this court",
    "alternatives": ["jurisdiction", "jurisdictions"]
  },
  {
    "wordIndex": 128,
    "word": "plainiff",
    "confidence": 0.68,
    "start": 67.23,
    "end": 67.89,
    "context": "the [plainiff] filed a motion",
    "alternatives": ["plaintiff", "plaintiffs"]
  }
]
```

## FILES TO CREATE

### 1. components/transcripts/low-confidence-review.tsx

Main review panel component:

```typescript
interface LowConfidenceReviewProps {
  flaggedSegments: FlaggedSegment[];
  onPlayAudio: (startTime: number) => void;      // Seek audio to timestamp
  onEditWord: (wordIndex: number, newWord: string) => void;
  onMarkReviewed: (wordIndex: number) => void;
  reviewedWords: Set<number>;                     // Already reviewed word indices
  currentlyPlayingIndex?: number | null;          // Currently playing segment
  className?: string;
}

interface FlaggedSegment {
  wordIndex: number;
  word: string;
  confidence: number;
  start: number;
  end: number;
  context: string;
  alternatives: string[];
}
```

### 2. components/transcripts/flagged-word-card.tsx

Individual flagged word card:

```typescript
interface FlaggedWordCardProps {
  segment: FlaggedSegment;
  isReviewed: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onEdit: (newWord: string) => void;
  onMarkReviewed: () => void;
  isSelected: boolean;
  onSelect: () => void;
}
```

### 3. app/(dashboard)/jobs/[id]/review/page.tsx

Full review page that combines:
- AudioPlayer (top)
- SyncedTranscript (left panel)
- LowConfidenceReview (right panel)

## LAYOUT REQUIREMENTS

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ◀ Back to Job                              Job: Smith v. Jones Depo    │
├─────────────────────────────────────────────────────────────────────────┤
│  Audio Player                                                    [1.0x] │
│  ⏪  ▶  ⏩  │  02:34 / 45:12  │ ━━━━━━●━━━━━━━━━━━━━━━━━━━━  │   🔊━━━ │
├─────────────────────────────────┬───────────────────────────────────────┤
│                                 │  📋 Flagged Words                     │
│  Full Transcript                │  Progress: ████████░░ 23 of 47 (49%)  │
│  (scrollable, synced)           │                                       │
│                                 │  ┌─────────────────────────────────┐  │
│  ATTORNEY SMITH:                │  │ 🔊 "juristiction" (72%)         │  │
│  The witness stated their       │  │                                 │  │
│  name for the record. When      │  │ Context:                        │  │
│  asked about the events,        │  │ "...within the [juristiction]   │  │
│  they provided detailed         │  │  of this court..."              │  │
│  testimony regarding the        │  │                                 │  │
│  [jurisdiction] of the court... │  │ Suggestions:                    │  │
│                                 │  │  ○ jurisdiction                 │  │
│  WITNESS DOE:                   │  │  ○ jurisdictions                │  │
│  Yes, I understand. On that     │  │                                 │  │
│  day, I was at the office.      │  │ [Edit ✏️]  [✓ Mark Done]        │  │
│                                 │  └─────────────────────────────────┘  │
│                                 │                                       │
│                                 │  ┌─────────────────────────────────┐  │
│                                 │  │ 🔊 "plainiff" (68%)             │  │
│                                 │  │ Context: "the [plainiff]        │  │
│                                 │  │  filed a motion..."             │  │
│                                 │  │ ○ plaintiff  ○ plaintiffs       │  │
│                                 │  │ [Edit ✏️]  [✓ Mark Done]        │  │
│                                 │  └─────────────────────────────────┘  │
└─────────────────────────────────┴───────────────────────────────────────┘
```

## FEATURE REQUIREMENTS

### 1. Flagged Word Card Features

Each card should show:
- **Speaker icon** (🔊) - Click to play audio from that timestamp
- **The uncertain word** with confidence percentage
- **Context** - 5 words before and after, with the word highlighted in brackets
- **Alternatives** - Radio buttons or chips for Deepgram suggestions
- **Edit button** - Opens inline text input
- **Mark Done checkbox** - Marks as reviewed (persists)
- **Visual indicator** if already reviewed (green checkmark, grayed out)

### 2. Keyboard Navigation

```
↑ / ↓       Navigate between flagged words
Space       Play/pause audio from current word
Enter       Confirm edit and move to next
Tab         Move to next unreviewed word
Escape      Cancel edit mode
1-9         Quick select alternative (if numbered)
```

### 3. Progress Tracking

- Show "X of Y reviewed" with progress bar
- Calculate percentage
- Persist reviewed state (save to database)
- Filter options: "Show all" / "Show pending only"

### 4. Inline Editing

When user clicks Edit:
1. Text input replaces the word
2. Input is pre-filled with current word
3. Alternatives shown as quick-select chips
4. Enter confirms, Escape cancels
5. On confirm: 
   - Call `onEditWord(wordIndex, newWord)`
   - Mark as reviewed
   - Move focus to next unreviewed word

### 5. Audio Integration

When user clicks speaker icon:
1. Call `onPlayAudio(segment.start - 1.5)` (1.5s before for context)
2. Highlight the current card
3. Audio plays, transcript scrolls to that word

## API ENDPOINTS NEEDED

### PATCH /api/transcripts/[id]/words

Save word corrections:

```typescript
// Request body
{
  edits: [
    {
      wordIndex: 45,
      originalWord: "juristiction",
      newWord: "jurisdiction",
      reviewedAt: "2024-01-15T10:30:00Z"
    }
  ]
}

// Creates TranscriptionEdit records
// Updates Transcription.words array
// Updates Transcription.flaggedSegments (mark as reviewed)
```

### GET /api/transcripts/[id]/review-status

Get current review progress:

```typescript
// Response
{
  totalFlagged: 47,
  reviewed: 23,
  pending: 24,
  reviewedWordIndices: [12, 45, 67, 89, ...]
}
```

## STYLING

**Pending card:**
```tsx
"bg-white dark:bg-slate-800 border-l-4 border-l-amber-500 shadow-sm rounded-lg p-4"
```

**Reviewed card:**
```tsx
"bg-slate-50 dark:bg-slate-900 border-l-4 border-l-green-500 opacity-75"
```

**Currently playing card:**
```tsx
"ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
```

**Low confidence indicator:**
- < 50%: Red badge
- 50-70%: Orange badge
- 70-85%: Yellow badge

**Progress bar:**
```tsx
<div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
  <div 
    className="h-full bg-green-500 transition-all" 
    style={{ width: `${(reviewed / total) * 100}%` }}
  />
</div>
```

## PERSISTENCE

When user marks word as reviewed or edits a word:
1. Optimistically update UI
2. POST to API
3. If API fails, rollback and show error toast
4. On page reload, reviewed state is preserved

## USAGE IN REVIEW PAGE

```tsx
export default function ReviewPage({ params }: { params: { id: string } }) {
  const [transcript, setTranscript] = useState<Transcription | null>(null);
  const [reviewedWords, setReviewedWords] = useState<Set<number>>(new Set());
  const audioRef = useRef<AudioPlayerRef>(null);

  const handlePlayAudio = (startTime: number) => {
    audioRef.current?.seekTo(startTime - 1.5);
    audioRef.current?.play();
  };

  const handleEditWord = async (wordIndex: number, newWord: string) => {
    // Optimistic update
    setTranscript(prev => {
      const words = [...prev.words];
      words[wordIndex] = { ...words[wordIndex], word: newWord };
      return { ...prev, words };
    });
    
    // API call
    await fetch(`/api/transcripts/${params.id}/words`, {
      method: 'PATCH',
      body: JSON.stringify({ edits: [{ wordIndex, newWord }] }),
    });
    
    // Mark as reviewed
    setReviewedWords(prev => new Set([...prev, wordIndex]));
  };

  return (
    <div className="grid grid-cols-[1fr,400px] gap-4 h-screen">
      {/* Left: Transcript */}
      <div className="overflow-auto">
        <SyncedTranscript
          words={transcript.words}
          currentTime={currentTime}
          onWordClick={handleWordClick}
        />
      </div>
      
      {/* Right: Review Panel */}
      <div className="border-l overflow-auto">
        <LowConfidenceReview
          flaggedSegments={transcript.flaggedSegments}
          onPlayAudio={handlePlayAudio}
          onEditWord={handleEditWord}
          onMarkReviewed={handleMarkReviewed}
          reviewedWords={reviewedWords}
        />
      </div>
    </div>
  );
}
```

Please implement these components with full TypeScript types, keyboard navigation, and the persistence logic described.
```

---

## EXPECTED OUTPUT

### components/transcripts/flagged-word-card.tsx

```tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Check, Edit2, X } from 'lucide-react';
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
  isSelected: boolean;
  onPlay: () => void;
  onEdit: (newWord: string) => void;
  onMarkReviewed: () => void;
  onSelect: () => void;
}

function getConfidenceColor(confidence: number): string {
  if (confidence < 0.5) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (confidence < 0.7) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
}

export function FlaggedWordCard({
  segment,
  isReviewed,
  isPlaying,
  isSelected,
  onPlay,
  onEdit,
  onMarkReviewed,
  onSelect,
}: FlaggedWordCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(segment.word);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleConfirmEdit = () => {
    if (editValue.trim() && editValue !== segment.word) {
      onEdit(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(segment.word);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleAlternativeClick = (alt: string) => {
    onEdit(alt);
    onMarkReviewed();
  };

  // Highlight the flagged word in context
  const formattedContext = segment.context.replace(
    /\[([^\]]+)\]/,
    '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium">$1</mark>'
  );

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg p-4 transition-all cursor-pointer',
        'border-l-4',
        isReviewed
          ? 'bg-slate-50 dark:bg-slate-900 border-l-green-500 opacity-75'
          : 'bg-white dark:bg-slate-800 border-l-amber-500 shadow-sm hover:shadow-md',
        isPlaying && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20',
        isSelected && !isPlaying && 'ring-2 ring-slate-400'
      )}
    >
      {/* Header: Word and Confidence */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Play audio from this point"
          >
            <Volume2 className={cn('w-4 h-4', isPlaying ? 'text-blue-600' : 'text-slate-500')} />
          </button>
          
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCancelEdit}
              className="px-2 py-1 border rounded text-lg font-medium w-40 dark:bg-slate-700 dark:border-slate-600"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-lg font-medium text-slate-900 dark:text-slate-100">
              "{segment.word}"
            </span>
          )}
        </div>
        
        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getConfidenceColor(segment.confidence))}>
          {Math.round(segment.confidence * 100)}%
        </span>
      </div>

      {/* Context */}
      <div className="mb-3">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Context:</div>
        <div
          className="text-sm text-slate-700 dark:text-slate-300 italic"
          dangerouslySetInnerHTML={{ __html: formattedContext }}
        />
      </div>

      {/* Alternatives */}
      {segment.alternatives.length > 0 && !isReviewed && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Suggestions:</div>
          <div className="flex flex-wrap gap-2">
            {segment.alternatives.map((alt, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAlternativeClick(alt);
                }}
                className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t dark:border-slate-700">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmEdit();
              }}
              className="flex items-center gap-1 px-2 py-1 text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-200"
            >
              <Check className="w-3 h-3" /> Save
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
              className="flex items-center gap-1 px-2 py-1 text-sm bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded hover:bg-slate-200"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            disabled={isReviewed}
            className="flex items-center gap-1 px-2 py-1 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkReviewed();
          }}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors',
            isReviewed
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          <Check className="w-3 h-3" />
          {isReviewed ? 'Reviewed' : 'Mark Done'}
        </button>
      </div>
    </div>
  );
}

export default FlaggedWordCard;
```

### components/transcripts/low-confidence-review.tsx

```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FlaggedWordCard, FlaggedSegment } from './flagged-word-card';
import { cn } from '@/lib/utils';

interface LowConfidenceReviewProps {
  flaggedSegments: FlaggedSegment[];
  onPlayAudio: (startTime: number) => void;
  onEditWord: (wordIndex: number, newWord: string) => void;
  onMarkReviewed: (wordIndex: number) => void;
  reviewedWords: Set<number>;
  currentlyPlayingIndex?: number | null;
  className?: string;
}

type FilterMode = 'all' | 'pending' | 'reviewed';

export function LowConfidenceReview({
  flaggedSegments,
  onPlayAudio,
  onEditWord,
  onMarkReviewed,
  reviewedWords,
  currentlyPlayingIndex,
  className,
}: LowConfidenceReviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<FilterMode>('pending');

  const filteredSegments = flaggedSegments.filter((segment) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'pending') return !reviewedWords.has(segment.wordIndex);
    if (filterMode === 'reviewed') return reviewedWords.has(segment.wordIndex);
    return true;
  });

  const totalFlagged = flaggedSegments.length;
  const totalReviewed = reviewedWords.size;
  const progress = totalFlagged > 0 ? (totalReviewed / totalFlagged) * 100 : 0;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(filteredSegments.length - 1, prev + 1));
          break;
        case ' ':
          e.preventDefault();
          if (filteredSegments[selectedIndex]) {
            onPlayAudio(filteredSegments[selectedIndex].start - 1.5);
          }
          break;
        case 'Tab':
          if (!e.shiftKey) {
            e.preventDefault();
            // Jump to next unreviewed
            const nextUnreviewed = filteredSegments.findIndex(
              (seg, idx) => idx > selectedIndex && !reviewedWords.has(seg.wordIndex)
            );
            if (nextUnreviewed !== -1) {
              setSelectedIndex(nextUnreviewed);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredSegments, onPlayAudio, reviewedWords]);

  const handleEditWord = useCallback(
    (wordIndex: number, newWord: string) => {
      onEditWord(wordIndex, newWord);
      onMarkReviewed(wordIndex);
    },
    [onEditWord, onMarkReviewed]
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          📋 Flagged Words
        </h2>
        
        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
            <span>Progress</span>
            <span>{totalReviewed} of {totalFlagged} ({Math.round(progress)}%)</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1">
          {(['all', 'pending', 'reviewed'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={cn(
                'px-3 py-1 text-sm rounded-full transition-colors capitalize',
                filterMode === mode
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
              )}
            >
              {mode} ({mode === 'all' ? totalFlagged : mode === 'pending' ? totalFlagged - totalReviewed : totalReviewed})
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 border-b dark:border-slate-700">
        <span className="mr-3">↑↓ Navigate</span>
        <span className="mr-3">Space: Play</span>
        <span className="mr-3">Tab: Next pending</span>
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredSegments.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
            {filterMode === 'pending' ? (
              <>
                <div className="text-4xl mb-2">🎉</div>
                <div>All words reviewed!</div>
              </>
            ) : (
              <div>No words to display</div>
            )}
          </div>
        ) : (
          filteredSegments.map((segment, idx) => (
            <FlaggedWordCard
              key={segment.wordIndex}
              segment={segment}
              isReviewed={reviewedWords.has(segment.wordIndex)}
              isPlaying={currentlyPlayingIndex === segment.wordIndex}
              isSelected={selectedIndex === idx}
              onPlay={() => onPlayAudio(segment.start - 1.5)}
              onEdit={(newWord) => handleEditWord(segment.wordIndex, newWord)}
              onMarkReviewed={() => onMarkReviewed(segment.wordIndex)}
              onSelect={() => setSelectedIndex(idx)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {totalReviewed === totalFlagged && totalFlagged > 0 && (
        <div className="p-4 border-t dark:border-slate-700 bg-green-50 dark:bg-green-900/20">
          <div className="text-center text-green-700 dark:text-green-300 font-medium">
            ✓ All {totalFlagged} flagged words have been reviewed!
          </div>
        </div>
      )}
    </div>
  );
}

export default LowConfidenceReview;
```

---

## VERIFICATION CHECKLIST

After implementation, verify:

- [ ] `npm run typecheck` passes
- [ ] Flagged words display with confidence badges
- [ ] Context shows word highlighted in brackets
- [ ] Click speaker icon → audio plays from that point
- [ ] Alternatives show as clickable chips
- [ ] Clicking alternative → word updated, marked reviewed
- [ ] Edit button → inline input appears
- [ ] Enter confirms edit, Escape cancels
- [ ] Mark Done button toggles reviewed state
- [ ] Progress bar updates correctly
- [ ] Filter buttons work (All/Pending/Reviewed)
- [ ] Keyboard navigation works (↑↓ Space Tab)
- [ ] Reviewed words appear grayed out
- [ ] Currently playing card has blue ring
- [ ] Dark mode looks correct
- [ ] "All words reviewed" message appears when done

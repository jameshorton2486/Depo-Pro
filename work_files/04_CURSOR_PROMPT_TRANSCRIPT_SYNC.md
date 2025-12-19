# CURSOR PROMPT: Audio-Transcript Synchronization (ENHANCED)

**Document 4 of 5** | **Copy this entire file into Cursor**  
**Updated with transcript-tracer-js patterns and performance tips from research**

---

## OPEN SOURCE REFERENCES (From Your Research)

Before implementing, study these:
1. **pmacom-react-transcript-editor** - React 18/19 compatible TimedTextEditor
2. **transcript-tracer-js** - Lightweight sync utility with alignmentFuzziness
3. **audio-sync-with-text** - NPM package for word-level sync
4. **react-highlight-words** - For highlighting current word

**Key Pattern from research:**
```typescript
// Click-to-Seek Logic
audioRef.current.currentTime = word.start;
audioRef.current.play();

// Karaoke Highlighting - listen to timeupdate
audioElement.addEventListener('timeupdate', () => {
  const currentTime = audioElement.currentTime;
  // Binary search to find active word
  // Apply CSS class to active word
});
```

**Performance Tip from your research:**
> "Use textContent instead of innerHTML when updating highlighted word to avoid expensive DOM reflows and XSS vulnerabilities."

---

## PROMPT FOR CURSOR AI

```
@workspace Create the audio-transcript synchronization system for this legal transcription app. This is a core differentiator - users need to click words to hear the audio and see words highlight during playback.

## CONTEXT

This is Depo-Pro, a legal transcription SaaS. The transcription data comes from Deepgram and is stored in the database as:

```typescript
// Transcription.words (JSON field in Prisma)
[
  { "word": "The", "start": 0.12, "end": 0.32, "confidence": 0.98, "speaker": 0 },
  { "word": "witness", "start": 0.35, "end": 0.72, "confidence": 0.95, "speaker": 0 },
  { "word": "stated", "start": 0.75, "end": 1.12, "confidence": 0.87, "speaker": 0 },
  // ... thousands of words
]
```

## FILES TO CREATE

### 1. components/transcripts/word-span.tsx

A memoized component for rendering individual words:

```typescript
interface WordSpanProps {
  word: {
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: number;
    punctuated_word?: string;
  };
  index: number;
  isCurrentWord: boolean;
  isLowConfidence: boolean;
  onClick: (index: number, start: number) => void;
}
```

Features:
- Clickable (calls onClick with word index and start time)
- Highlighted when `isCurrentWord` is true
- Styled differently if `isLowConfidence` (confidence < 0.85)
- Uses `React.memo` to prevent unnecessary re-renders
- Shows speaker change indicators (when speaker changes from previous word)

### 2. components/transcripts/synced-transcript.tsx

Main transcript component that syncs with audio:

```typescript
interface SyncedTranscriptProps {
  words: Word[];
  currentTime: number;                    // From audio player onTimeUpdate
  onWordClick: (index: number, startTime: number) => void;  // Seek audio
  highlightedWordIndex?: number | null;   // Currently playing word
  lowConfidenceThreshold?: number;        // Default 0.85
  speakerLabels?: Record<number, string>; // { 0: "Attorney", 1: "Witness" }
  className?: string;
}
```

Features:
1. **Click-to-Seek**: Clicking any word calls `onWordClick(index, word.start)`
2. **Current Word Highlight**: Word at `currentTime` is highlighted
3. **Auto-Scroll**: Transcript scrolls to keep current word visible
4. **Speaker Labels**: Show speaker name when speaker changes
5. **Performance**: Handle 10,000+ words without lag

### 3. hooks/useTranscriptSync.ts

Custom hook for finding current word:

```typescript
interface UseTranscriptSyncReturn {
  currentWordIndex: number | null;
  findWordAtTime: (time: number) => number | null;
}

function useTranscriptSync(words: Word[], currentTime: number): UseTranscriptSyncReturn
```

Use binary search for efficiency (O(log n) instead of O(n)).

## IMPLEMENTATION REQUIREMENTS

### 1. Binary Search for Current Word

```typescript
function findWordAtTime(words: Word[], time: number): number | null {
  if (!words.length) return null;
  
  let left = 0;
  let right = words.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const word = words[mid];
    
    if (time >= word.start && time <= word.end) {
      return mid;
    }
    
    if (time < word.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  // If not exactly in a word, find nearest
  // (time might be in gap between words)
  return left < words.length ? left : words.length - 1;
}
```

### 2. Auto-Scroll Logic

```typescript
// Scroll current word into view, but not too aggressively
useEffect(() => {
  if (currentWordIndex !== null && wordRefs.current[currentWordIndex]) {
    const element = wordRefs.current[currentWordIndex];
    const container = containerRef.current;
    
    if (element && container) {
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Only scroll if word is outside visible area
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}, [currentWordIndex]);
```

### 3. Performance Optimizations

- Use `React.memo` for WordSpan
- Debounce/throttle auto-scroll to prevent jitter
- Use `useCallback` for click handlers
- Consider virtualization for very long transcripts (react-window)
- Only update currentWordIndex when it actually changes

### 4. Styling

**Current word highlight:**
```tsx
// Yellow background, slightly larger
"bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded transition-colors duration-150"
```

**Low confidence word:**
```tsx
// Red underline, slightly dimmed
"underline decoration-red-500 decoration-wavy text-slate-700 dark:text-slate-300"
```

**Speaker change indicator:**
```tsx
// Bold label before first word of new speaker
<span className="font-bold text-blue-600 dark:text-blue-400 mr-2">
  {speakerLabel}:
</span>
```

**Regular word:**
```tsx
"cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 rounded px-0.5 transition-colors"
```

## LAYOUT EXAMPLE

```
┌─────────────────────────────────────────────────────────────────┐
│  ATTORNEY SMITH:                                                │
│  The witness stated their full name for the [record]. When      │
│  asked about the events, they provided detailed testimony       │
│  regarding the [jurisdiction] of the court.                     │
│                                                                 │
│  WITNESS DOE:                                                   │
│  Yes, I understand. On that day, I was at the [plaintiff's]     │
│  office located at 123 Main Street.                             │
│                                                                 │
│  ATTORNEY SMITH:                                                │
│  And what time did you arrive?                                  │
│                                                                 │
│  WITNESS DOE:                                                   │
│  I arrived at approximately 9:30 in the [morning].              │
└─────────────────────────────────────────────────────────────────┘

Legend:
- [bracketed words] = low confidence, red wavy underline
- Currently playing word would have yellow highlight
- Speaker names are bold blue
```

## USAGE EXAMPLE

```tsx
// In review page:
import { useState, useRef } from 'react';
import { AudioPlayer, AudioPlayerRef } from '@/components/transcripts/audio-player';
import { SyncedTranscript } from '@/components/transcripts/synced-transcript';

export default function ReviewPage({ transcript }) {
  const audioRef = useRef<AudioPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handleWordClick = (index: number, startTime: number) => {
    // Seek to 1.5 seconds before the word for context
    audioRef.current?.seekTo(Math.max(0, startTime - 1.5));
    audioRef.current?.play();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Audio Player - Fixed at top */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 p-4 border-b">
        <AudioPlayer
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={setCurrentTime}
        />
      </div>

      {/* Transcript - Scrollable */}
      <div className="flex-1 overflow-auto p-6">
        <SyncedTranscript
          words={transcript.words}
          currentTime={currentTime}
          onWordClick={handleWordClick}
          speakerLabels={{
            0: 'ATTORNEY SMITH',
            1: 'WITNESS DOE',
            2: 'THE COURT',
          }}
        />
      </div>
    </div>
  );
}
```

Please implement these components with full TypeScript types and the performance optimizations described.
```

---

## EXPECTED OUTPUT

### components/transcripts/word-span.tsx

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
  
  const handleClick = () => {
    onClick(index, word.start);
  };

  return (
    <span
      onClick={handleClick}
      data-index={index}
      data-start={word.start}
      data-end={word.end}
      className={cn(
        'cursor-pointer px-0.5 rounded transition-colors duration-150',
        'hover:bg-slate-200 dark:hover:bg-slate-700',
        isCurrentWord && 'bg-yellow-300 dark:bg-yellow-600 font-medium',
        isLowConfidence && !isCurrentWord && 'underline decoration-red-500 decoration-wavy'
      )}
      title={isLowConfidence ? `Confidence: ${Math.round(word.confidence * 100)}%` : undefined}
    >
      {displayText}
    </span>
  );
});

export default WordSpan;
```

### components/transcripts/synced-transcript.tsx

```tsx
'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
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
  if (!words.length) return null;
  
  let left = 0;
  let right = words.length - 1;
  
  // Binary search for word containing the time
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const word = words[mid];
    
    if (time >= word.start && time <= word.end) {
      return mid;
    }
    
    if (time < word.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  // If between words, return the next word (or last if past end)
  if (left >= words.length) return words.length - 1;
  if (left === 0) return 0;
  
  // Return the word we're closest to
  const prevWord = words[left - 1];
  const nextWord = words[left];
  
  // If we're past the previous word's end, return next word
  if (time > prevWord.end) {
    return left;
  }
  
  return left - 1;
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
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const lastScrolledIndex = useRef<number | null>(null);

  // Find current word using binary search
  const currentWordIndex = useMemo(() => {
    return findWordAtTime(words, currentTime);
  }, [words, currentTime]);

  // Auto-scroll to current word (debounced)
  useEffect(() => {
    if (currentWordIndex === null) return;
    if (currentWordIndex === lastScrolledIndex.current) return;
    
    const element = wordRefs.current.get(currentWordIndex);
    const container = containerRef.current;
    
    if (element && container) {
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Only scroll if word is outside the middle 60% of visible area
      const visibleTop = containerRect.top + containerRect.height * 0.2;
      const visibleBottom = containerRect.bottom - containerRect.height * 0.2;
      
      if (elementRect.top < visibleTop || elementRect.bottom > visibleBottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastScrolledIndex.current = currentWordIndex;
      }
    }
  }, [currentWordIndex]);

  // Handle word click
  const handleWordClick = useCallback((index: number, startTime: number) => {
    onWordClick(index, startTime);
  }, [onWordClick]);

  // Set ref for word element
  const setWordRef = useCallback((index: number, el: HTMLSpanElement | null) => {
    if (el) {
      wordRefs.current.set(index, el);
    } else {
      wordRefs.current.delete(index);
    }
  }, []);

  // Group words by speaker for display
  const wordGroups = useMemo(() => {
    const groups: Array<{ speaker: number | undefined; startIndex: number; words: Word[] }> = [];
    let currentSpeaker: number | undefined = undefined;
    let currentGroup: Word[] = [];
    let startIndex = 0;

    words.forEach((word, index) => {
      if (word.speaker !== currentSpeaker && currentGroup.length > 0) {
        groups.push({ speaker: currentSpeaker, startIndex, words: currentGroup });
        currentGroup = [];
        startIndex = index;
      }
      currentSpeaker = word.speaker;
      currentGroup.push(word);
    });

    if (currentGroup.length > 0) {
      groups.push({ speaker: currentSpeaker, startIndex, words: currentGroup });
    }

    return groups;
  }, [words]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'prose dark:prose-invert max-w-none',
        'leading-relaxed text-lg',
        className
      )}
    >
      {wordGroups.map((group, groupIndex) => {
        const speakerLabel = group.speaker !== undefined
          ? speakerLabels[group.speaker] || `SPEAKER ${group.speaker + 1}`
          : null;

        return (
          <p key={groupIndex} className="mb-4">
            {speakerLabel && (
              <span className="font-bold text-blue-600 dark:text-blue-400 mr-2 block mb-1">
                {speakerLabel}:
              </span>
            )}
            {group.words.map((word, wordIndex) => {
              const globalIndex = group.startIndex + wordIndex;
              const isLowConfidence = word.confidence < lowConfidenceThreshold;
              const isCurrentWord = globalIndex === currentWordIndex;

              return (
                <React.Fragment key={globalIndex}>
                  <span
                    ref={(el) => setWordRef(globalIndex, el)}
                  >
                    <WordSpan
                      word={word}
                      index={globalIndex}
                      isCurrentWord={isCurrentWord}
                      isLowConfidence={isLowConfidence}
                      onClick={handleWordClick}
                    />
                  </span>
                  {' '}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

export default SyncedTranscript;
```

### hooks/useTranscriptSync.ts

```typescript
import { useMemo } from 'react';
import type { Word } from '@/components/transcripts/word-span';

interface UseTranscriptSyncReturn {
  currentWordIndex: number | null;
  findWordAtTime: (time: number) => number | null;
}

export function useTranscriptSync(
  words: Word[],
  currentTime: number
): UseTranscriptSyncReturn {
  
  const findWordAtTime = useMemo(() => {
    return (time: number): number | null => {
      if (!words.length) return null;
      
      let left = 0;
      let right = words.length - 1;
      
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const word = words[mid];
        
        if (time >= word.start && time <= word.end) {
          return mid;
        }
        
        if (time < word.start) {
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }
      
      // Return closest word
      if (left >= words.length) return words.length - 1;
      return left;
    };
  }, [words]);

  const currentWordIndex = useMemo(() => {
    return findWordAtTime(currentTime);
  }, [findWordAtTime, currentTime]);

  return {
    currentWordIndex,
    findWordAtTime,
  };
}

export default useTranscriptSync;
```

---

## VERIFICATION CHECKLIST

After implementation, verify:

- [ ] `npm run typecheck` passes
- [ ] Words render correctly with punctuation
- [ ] Clicking a word triggers `onWordClick`
- [ ] Current word highlights yellow during playback
- [ ] Low-confidence words have red wavy underline
- [ ] Speaker labels appear when speaker changes
- [ ] Transcript auto-scrolls to follow current word
- [ ] Auto-scroll is smooth, not jarring
- [ ] Performance is good with 5000+ words
- [ ] No unnecessary re-renders (check React DevTools)
- [ ] Works correctly in dark mode

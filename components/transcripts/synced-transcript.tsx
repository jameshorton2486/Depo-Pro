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
        className,
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


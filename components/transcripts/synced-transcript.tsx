'use client';

// ═══════════════════════════════════════════════════════════════
// SYNCED TRANSCRIPT - Bi-directional audio-text synchronization
// ═══════════════════════════════════════════════════════════════
// Features:
// - Audio → Text: Highlights current word as audio plays
// - Text → Audio: Click any word to seek audio
// - Auto-scroll to keep active word visible (only when outside viewport)
// - Red text for low-confidence words
// - Binary search for O(log n) active word lookup

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { WordSpan } from './word-span';
import type { ReviewWord } from '@/types/review';

// Configurable: Break paragraphs on pauses longer than this (seconds)
const PARAGRAPH_PAUSE_SECONDS = 2;

interface SyncedTranscriptProps {
  words: ReviewWord[];
  currentTime: number;
  confidenceThreshold: number;
  reviewedIndices: Set<number>;
  correctedIndices: Set<number>;
  onWordClick: (time: number, wordIndex: number) => void;
  className?: string;
}

export function SyncedTranscript({
  words,
  currentTime,
  confidenceThreshold,
  reviewedIndices,
  correctedIndices,
  onWordClick,
  className = '',
}: SyncedTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Binary search to find the active word index based on current time
  // O(log n) performance for large transcripts
  const activeWordIndex = useMemo(() => {
    if (words.length === 0 || currentTime < 0) return -1;

    let left = 0;
    let right = words.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const word = words[mid];

      if (currentTime >= word.start && currentTime <= word.end) {
        return mid;
      } else if (currentTime < word.start) {
        right = mid - 1;
      } else {
        result = mid; // Keep track of the last word we passed
        left = mid + 1;
      }
    }

    return result;
  }, [words, currentTime]);

  // Auto-scroll to keep active word visible (only when outside viewport)
  useEffect(() => {
    if (activeWordIndex < 0) return;

    const container = containerRef.current;
    if (!container) return;

    const activeElement = container.querySelector(
      `[data-word-index="${activeWordIndex}"]`,
    ) as HTMLElement;

    if (!activeElement) return;

    // Check if element is visible within the container viewport
    const containerRect = container.getBoundingClientRect();
    const elementRect = activeElement.getBoundingClientRect();

    const isVisible =
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom;

    // Only scroll if the active word is outside the visible area
    // This prevents "scroll jitter" during playback
    if (!isVisible) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [activeWordIndex]);

  // Memoized click handler
  const handleWordClick = useCallback(
    (time: number, wordIndex: number) => {
      onWordClick(time, wordIndex);
    },
    [onWordClick],
  );

  // Group words into paragraphs based on speaker changes or long pauses
  const paragraphs = useMemo(() => {
    if (words.length === 0) return [];

    const result: ReviewWord[][] = [];
    let currentParagraph: ReviewWord[] = [];
    let lastSpeaker: number | undefined = undefined;
    let lastEnd = 0;

    words.forEach((word, index) => {
      // Start new paragraph on speaker change or pause > threshold
      const speakerChanged = lastSpeaker !== undefined && word.speaker !== lastSpeaker;
      const longPause = lastEnd > 0 && word.start - lastEnd > PARAGRAPH_PAUSE_SECONDS;

      if ((speakerChanged || longPause) && currentParagraph.length > 0) {
        result.push(currentParagraph);
        currentParagraph = [];
      }

      currentParagraph.push({ ...word, index });
      lastSpeaker = word.speaker;
      lastEnd = word.end;
    });

    if (currentParagraph.length > 0) {
      result.push(currentParagraph);
    }

    return result;
  }, [words]);

  if (words.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-500 ${className}`}>
        No transcript available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`h-full overflow-y-auto p-6 bg-white rounded-lg border border-gray-200 ${className}`}
    >
      <div className="text-lg leading-relaxed space-y-4">
        {paragraphs.map((paragraph, pIndex) => (
          <p key={pIndex} className="mb-4">
            {paragraph.map((word, wIndex) => {
              const isFlagged = word.confidence < confidenceThreshold;
              const isActive = word.index === activeWordIndex;
              const isReviewed = reviewedIndices.has(word.index);
              const isCorrected = correctedIndices.has(word.index);

              return (
                <React.Fragment key={word.index}>
                  <WordSpan
                    word={word.correctedWord || word.word}
                    index={word.index}
                    start={word.start}
                    end={word.end}
                    confidence={word.confidence}
                    isActive={isActive}
                    isFlagged={isFlagged}
                    isReviewed={isReviewed}
                    isCorrected={isCorrected}
                    onClick={handleWordClick}
                  />
                  {/* Add space after word unless it's the last in paragraph */}
                  {wIndex < paragraph.length - 1 && ' '}
                </React.Fragment>
              );
            })}
          </p>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-blue-500 rounded"></span>
            Currently playing
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-b-2 border-red-400 border-wavy text-red-600">abc</span>
            Needs review
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-green-100 text-green-600 rounded px-1">abc</span>
            Corrected
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-gray-100 rounded"></span>
            Reviewed (OK)
          </span>
        </div>
      </div>
    </div>
  );
}

export default SyncedTranscript;

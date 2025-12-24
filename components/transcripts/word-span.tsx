'use client';

// ═══════════════════════════════════════════════════════════════
// WORD SPAN - Individual word in synchronized transcript
// ═══════════════════════════════════════════════════════════════
// Features:
// - Red text for low-confidence words
// - Blue highlight for currently playing word
// - Click to seek audio to this word
// - Hover tooltip shows confidence percentage
// - Accessible with aria-label
// - Performance optimized with React.memo (includes index for safety)

import React, { memo } from 'react';

interface WordSpanProps {
  word: string;
  index: number;
  start: number;
  end: number;
  confidence: number;
  isActive: boolean;
  isFlagged: boolean;
  isReviewed: boolean;
  isCorrected: boolean;
  onClick: (start: number, index: number) => void;
}

function WordSpanComponent({
  word,
  index,
  start,
  confidence,
  isActive,
  isFlagged,
  isReviewed,
  isCorrected,
  onClick,
}: WordSpanProps) {
  const confidencePercent = Math.round(confidence * 100);

  // Build class names based on state
  const getClassName = (): string => {
    // Increased padding (px-1) for better click targets - legal reviewers click fast
    const baseClasses = 'cursor-pointer px-1 rounded transition-all duration-150 inline';

    // Active word (currently playing) - highest priority
    if (isActive) {
      return `${baseClasses} bg-blue-500 text-white`;
    }

    // Corrected word - show in green
    if (isCorrected) {
      return `${baseClasses} text-green-600 font-medium bg-green-50 hover:bg-green-100`;
    }

    // Reviewed but not corrected - subtle indicator
    if (isReviewed && isFlagged) {
      return `${baseClasses} text-gray-700 bg-gray-100 hover:bg-gray-200`;
    }

    // Flagged (low confidence) - RED text with wavy underline
    if (isFlagged) {
      return `${baseClasses} text-red-600 font-medium underline decoration-red-400 decoration-wavy decoration-2 hover:bg-red-50`;
    }

    // Normal word
    return `${baseClasses} hover:bg-gray-100`;
  };

  // Format tooltip text
  const tooltipText = isFlagged
    ? `Confidence: ${confidencePercent}% (needs review)`
    : `Confidence: ${confidencePercent}%`;

  // Accessible label for screen readers
  const ariaLabel = isFlagged
    ? `Word "${word}", confidence ${confidencePercent}%, needs review`
    : `Word "${word}", confidence ${confidencePercent}%`;

  const handleClick = () => {
    // Seek to 1 second before the word for context
    const seekTime = Math.max(0, start - 1);
    onClick(seekTime, index);
  };

  return (
    <span
      className={getClassName()}
      onClick={handleClick}
      title={tooltipText}
      aria-label={ariaLabel}
      data-word-index={index}
      data-start={start}
      data-confidence={confidence}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {word}
    </span>
  );
}

// Memoize to prevent unnecessary re-renders
// Includes index in comparison for safety with reordering/virtualization
export const WordSpan = memo(WordSpanComponent, (prevProps, nextProps) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.word === nextProps.word &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isFlagged === nextProps.isFlagged &&
    prevProps.isReviewed === nextProps.isReviewed &&
    prevProps.isCorrected === nextProps.isCorrected &&
    prevProps.confidence === nextProps.confidence
  );
});

WordSpan.displayName = 'WordSpan';

export default WordSpan;

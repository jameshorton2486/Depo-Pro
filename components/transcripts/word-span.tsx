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


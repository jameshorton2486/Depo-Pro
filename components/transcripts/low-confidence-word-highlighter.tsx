'use client';

import { ConfidenceWord } from '@/components/transcripts/confidence-word';
import type { TranscriptWord } from '@/components/transcripts/synced-transcript-viewer';

interface LowConfidenceWordHighlighterProps {
  word: TranscriptWord;
  isActive?: boolean;
  showHeatmap?: boolean;
  isFlagged?: boolean;
  originalWord?: string;
  onClick?: () => void;
}

export function LowConfidenceWordHighlighter({
  word,
  isActive = false,
  showHeatmap = true,
  isFlagged = false,
  originalWord,
  onClick,
}: LowConfidenceWordHighlighterProps) {
  return (
    <ConfidenceWord
      word={word}
      isActive={isActive}
      onClick={onClick}
      showHeatmap={showHeatmap}
      isFlagged={isFlagged}
      originalWord={originalWord}
    />
  );
}

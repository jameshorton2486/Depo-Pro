'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Word {
  word: string;
  punctuated_word?: string;
  punctuatedWord?: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

interface Props {
  words: Word[];
  currentTime?: number;
  onWordClick?: (word: Word, index: number) => void;
  onSeekAudio?: (timestamp: number) => void;
  highlightThreshold?: number;
  showSpeakerLabels?: boolean;
  className?: string;
}

const LEVELS = { HIGH: 0.95, MEDIUM: 0.85, LOW: 0.75 };

export function ConfidenceTranscriptViewer({
  words,
  currentTime = 0,
  onWordClick,
  onSeekAudio,
  highlightThreshold = 0.85,
  showSpeakerLabels = true,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  useEffect(() => {
    const idx = words.findIndex(w => currentTime >= w.start && currentTime <= w.end);
    if (idx !== -1 && idx !== activeWordIndex) {
      setActiveWordIndex(idx);
      containerRef.current?.querySelector(`[data-word-index="${idx}"]`)?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [currentTime, words, activeWordIndex]);

  const getStyles = (c: number) => {
    if (c >= LEVELS.HIGH) return { bg: '', border: '' };
    if (c >= LEVELS.MEDIUM) return { bg: 'bg-yellow-100', border: 'border-b-2 border-yellow-400' };
    if (c >= LEVELS.LOW) return { bg: 'bg-orange-100', border: 'border-b-2 border-orange-500' };
    return { bg: 'bg-red-100', border: 'border-b-2 border-red-500' };
  };

  const handleClick = (word: Word, i: number) => {
    onWordClick?.(word, i);
    onSeekAudio?.(Math.max(0, word.start - 1));
  };

  const grouped = groupBySpeaker(words, showSpeakerLabels);

  return (
    <div ref={containerRef} className={cn('font-mono text-sm leading-relaxed p-4 overflow-auto', className)}>
      <div className="flex items-center gap-4 mb-4 pb-3 border-b text-xs text-muted-foreground">
        <span className="font-medium">Confidence:</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />Med
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />Review
        </span>
      </div>

      <div className="space-y-4">
        {grouped.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {showSpeakerLabels && group.speaker !== undefined && (
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                Speaker {group.speaker + 1}
              </div>
            )}
            <p className="leading-7">
              {group.words.map((word, wi) => {
                const globalIdx = group.startIndex + wi;
                const styles = getStyles(word.confidence);
                const needsReview = word.confidence < highlightThreshold;
                const isActive = globalIdx === activeWordIndex;
                const displayWord = word.punctuated_word || word.punctuatedWord || word.word;

                return (
                  <span
                    key={globalIdx}
                    data-word-index={globalIdx}
                    onClick={() => handleClick(word, globalIdx)}
                    className={cn(
                      'cursor-pointer px-0.5 rounded transition-all hover:opacity-80',
                      needsReview && styles.bg,
                      needsReview && styles.border,
                      isActive && 'ring-2 ring-primary ring-offset-1'
                    )}
                    title={`${Math.round(word.confidence * 100)}%`}
                  >
                    {displayWord}
                  </span>
                );
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupBySpeaker(words: Word[], show: boolean): Array<{ speaker?: number; words: Word[]; startIndex: number }> {
  if (!show) return [{ words, startIndex: 0 }];
  
  const groups: Array<{ speaker?: number; words: Word[]; startIndex: number }> = [];
  let current: typeof groups[0] | null = null;
  let idx = 0;
  
  for (const word of words) {
    if (!current || current.speaker !== word.speaker) {
      if (current) groups.push(current);
      current = { speaker: word.speaker, words: [word], startIndex: idx };
    } else {
      current.words.push(word);
    }
    idx++;
  }
  
  if (current) groups.push(current);
  return groups;
}

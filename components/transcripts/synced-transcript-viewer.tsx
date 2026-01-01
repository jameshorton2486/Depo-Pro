'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Types matching Deepgram output
export interface TranscriptWord {
  word: string;
  start: number;      // seconds
  end: number;        // seconds
  confidence: number; // 0-1
  punctuated_word?: string;
  speaker?: number;
}

export interface TranscriptSegment {
  speaker: number;
  words: TranscriptWord[];
  start: number;
  end: number;
}

interface SyncedTranscriptViewerProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onWordClick: (word: TranscriptWord) => void;
  confidenceThreshold?: number;
  isEditable?: boolean;
  onWordEdit?: (wordIndex: number, segmentIndex: number, newText: string) => void;
  highlightLowConfidence?: boolean;
}

export function SyncedTranscriptViewer({
  segments,
  currentTime,
  onWordClick,
  confidenceThreshold = 0.85,
  isEditable = false,
  onWordEdit,
  highlightLowConfidence = true,
}: SyncedTranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const [editingWord, setEditingWord] = useState<{
    segmentIndex: number;
    wordIndex: number;
  } | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Find the currently active word based on audio time
  const activeWordPosition = useMemo(() => {
    for (let sIdx = 0; sIdx < segments.length; sIdx++) {
      const segment = segments[sIdx];
      for (let wIdx = 0; wIdx < segment.words.length; wIdx++) {
        const word = segment.words[wIdx];
        if (currentTime >= word.start && currentTime <= word.end) {
          return { segmentIndex: sIdx, wordIndex: wIdx };
        }
      }
    }
    return null;
  }, [segments, currentTime]);

  // Auto-scroll to active word
  useEffect(() => {
    if (!autoScroll) return;
    if (activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const word = activeWordRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const wordRect = word.getBoundingClientRect();
      
      // Check if word is outside visible area
      if (wordRect.top < containerRect.top + 50 || wordRect.bottom > containerRect.bottom - 50) {
        word.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeWordPosition, autoScroll]);

  // Handle manual scroll - disable auto-scroll temporarily
  const handleScroll = useCallback(() => {
    // User scrolled manually, disable auto-scroll for 3 seconds
    setAutoScroll(false);
    const timer = setTimeout(() => setAutoScroll(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Handle word click
  const handleWordClick = (word: TranscriptWord, segmentIndex: number, wordIndex: number) => {
    if (isEditable) {
      setEditingWord({ segmentIndex, wordIndex });
    } else {
      onWordClick(word);
    }
  };

  // Handle inline edit
  const handleEditComplete = (newText: string, segmentIndex: number, wordIndex: number) => {
    if (newText.trim()) {
      onWordEdit?.(wordIndex, segmentIndex, newText.trim());
    }
    setEditingWord(null);
  };

  // Get confidence class
  const getConfidenceClass = (confidence: number) => {
    if (!highlightLowConfidence) return 'text-slate-200';
    if (confidence >= 0.95) return 'text-slate-200';
    if (confidence >= confidenceThreshold) return 'text-slate-300';
    if (confidence >= 0.70) return 'bg-yellow-500/20 text-yellow-200 rounded px-0.5';
    return 'bg-red-500/30 text-red-200 rounded px-0.5 font-medium';
  };

  // Speaker colors
  const speakerColors = [
    'border-l-blue-500',
    'border-l-green-500',
    'border-l-purple-500',
    'border-l-orange-500',
    'border-l-pink-500',
    'border-l-cyan-500',
  ];

  // Speaker labels for legal transcripts
  const getSpeakerLabel = (speaker: number) => {
    // Common pattern: speaker 0 = attorney asking questions, speaker 1 = witness
    if (speaker === 0) return 'Q';
    if (speaker === 1) return 'A';
    return `Speaker ${speaker + 1}`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 rounded-lg">
        <div className="text-slate-500">No transcript available</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto bg-slate-900 rounded-lg p-4 scroll-smooth"
    >
      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <div className="sticky top-0 left-0 right-0 bg-slate-800/90 text-slate-400 text-xs px-2 py-1 rounded mb-2 text-center z-10">
          Auto-scroll paused (will resume automatically)
        </div>
      )}

      {segments.map((segment, segmentIndex) => (
        <div
          key={`segment-${segmentIndex}`}
          className={cn(
            'mb-4 pl-3 border-l-2',
            speakerColors[segment.speaker % speakerColors.length]
          )}
        >
          {/* Speaker Label */}
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
            <span className="font-medium">{getSpeakerLabel(segment.speaker)}</span>
            <span>•</span>
            <span>{formatTime(segment.start)}</span>
          </div>
          
          {/* Words */}
          <div className="text-lg leading-relaxed">
            {segment.words.map((word, wordIndex) => {
              const isActive = 
                activeWordPosition?.segmentIndex === segmentIndex &&
                activeWordPosition?.wordIndex === wordIndex;
              
              const isEditing = 
                editingWord?.segmentIndex === segmentIndex &&
                editingWord?.wordIndex === wordIndex;
              
              const isLowConfidence = word.confidence < confidenceThreshold;

              if (isEditing) {
                return (
                  <InlineWordEditor
                    key={`word-${segmentIndex}-${wordIndex}`}
                    initialValue={word.punctuated_word || word.word}
                    onComplete={(text) => handleEditComplete(text, segmentIndex, wordIndex)}
                    onCancel={() => setEditingWord(null)}
                  />
                );
              }

              return (
                <span key={`word-${segmentIndex}-${wordIndex}`}>
                  <span
                    ref={isActive ? activeWordRef : undefined}
                    onClick={() => handleWordClick(word, segmentIndex, wordIndex)}
                    className={cn(
                      'cursor-pointer transition-all duration-150 hover:bg-slate-700/50 rounded',
                      getConfidenceClass(word.confidence),
                      isActive && 'bg-blue-600/40 ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900',
                      isLowConfidence && highlightLowConfidence && 'underline decoration-wavy decoration-yellow-500/50'
                    )}
                    title={`Confidence: ${Math.round(word.confidence * 100)}% | Time: ${word.start.toFixed(2)}s`}
                  >
                    {word.punctuated_word || word.word}
                  </span>
                  {wordIndex < segment.words.length - 1 && ' '}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Inline word editor component
function InlineWordEditor({
  initialValue,
  onComplete,
  onCancel,
}: {
  initialValue: string;
  onComplete: (text: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onComplete(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onComplete(value)}
      className="bg-blue-600/30 text-blue-200 rounded px-1 py-0.5 outline-none ring-2 ring-blue-500 text-lg"
      style={{ width: `${Math.max(60, value.length * 12)}px` }}
    />
  );
}

'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
  speaker?: number;
}

interface FlaggedWord extends TranscriptWord {
  originalIndex: number;
}

interface LowConfidencePanelProps {
  allWords: TranscriptWord[];
  confidenceThreshold?: number;
  onWordSelect: (word: TranscriptWord) => void;
  onWordCorrect: (wordIndex: number, correction: string) => void;
  reviewedWords: Set<number>;
  onMarkReviewed: (wordIndex: number) => void;
}

export function LowConfidencePanel({
  allWords,
  confidenceThreshold = 0.85,
  onWordSelect,
  onWordCorrect,
  reviewedWords,
  onMarkReviewed,
}: LowConfidencePanelProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [sortBy, setSortBy] = useState<'confidence' | 'time'>('confidence');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get flagged words with their original indices
  const flaggedWords = useMemo((): FlaggedWord[] => {
    return allWords
      .map((word, index) => ({ ...word, originalIndex: index }))
      .filter(word => word.confidence < confidenceThreshold)
      .sort((a, b) => {
        if (sortBy === 'confidence') return a.confidence - b.confidence;
        return a.start - b.start;
      });
  }, [allWords, confidenceThreshold, sortBy]);

  // Apply filter
  const displayedWords = useMemo(() => {
    return flaggedWords.filter(word => {
      if (filter === 'all') return true;
      if (filter === 'pending') return !reviewedWords.has(word.originalIndex);
      return reviewedWords.has(word.originalIndex);
    });
  }, [flaggedWords, filter, reviewedWords]);

  // Compute context words for each displayed word
  const wordsWithContext = useMemo(() => {
    return displayedWords.map(flaggedWord => {
      const idx = flaggedWord.originalIndex;

      // Get 3 words before (if available)
      const contextBefore: string[] = [];
      for (let i = Math.max(0, idx - 3); i < idx; i++) {
        contextBefore.push(allWords[i]?.punctuated_word || allWords[i]?.word || '');
      }

      // Get 3 words after (if available)
      const contextAfter: string[] = [];
      for (let i = idx + 1; i <= Math.min(allWords.length - 1, idx + 3); i++) {
        contextAfter.push(allWords[i]?.punctuated_word || allWords[i]?.word || '');
      }

      return {
        ...flaggedWord,
        contextBefore,
        contextAfter,
      };
    });
  }, [displayedWords, allWords]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (wordsWithContext.length === 0) return;

    // Don't handle if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
      case 'j': // vim-style
        e.preventDefault();
        setSelectedIndex(prev => {
          if (prev === null) return 0;
          return Math.min(prev + 1, wordsWithContext.length - 1);
        });
        break;

      case 'ArrowUp':
      case 'k': // vim-style
        e.preventDefault();
        setSelectedIndex(prev => {
          if (prev === null) return 0;
          return Math.max(prev - 1, 0);
        });
        break;

      case 'Tab': {
        // Jump to next unreviewed word
        e.preventDefault();
        const nextUnreviewed = wordsWithContext.findIndex(
          (w, i) => i > (selectedIndex ?? -1) && !reviewedWords.has(w.originalIndex)
        );
        if (nextUnreviewed !== -1) {
          setSelectedIndex(nextUnreviewed);
        }
        break;
      }

      case ' ': // Space - play audio
        e.preventDefault();
        if (selectedIndex !== null && wordsWithContext[selectedIndex]) {
          onWordSelect(wordsWithContext[selectedIndex]);
        }
        break;

      case 'Enter':
        // Enter is handled by individual cards for edit mode
        break;

      case 'Escape':
        setSelectedIndex(null);
        break;
    }
  }, [wordsWithContext, selectedIndex, reviewedWords, onWordSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-scroll selected card into view
  useEffect(() => {
    if (selectedIndex !== null && containerRef.current) {
      const selectedCard = containerRef.current.querySelector(`[data-word-index="${selectedIndex}"]`);
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Progress stats
  const totalFlagged = flaggedWords.length;
  const reviewedCount = flaggedWords.filter(w => reviewedWords.has(w.originalIndex)).length;
  const progressPercent = totalFlagged > 0 ? (reviewedCount / totalFlagged) * 100 : 100;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 shrink-0">
        <h3 className="font-semibold text-slate-200 mb-1">
          Low Confidence Words
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          ↑↓ navigate • Space play • Enter edit • Tab next
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{reviewedCount} of {totalFlagged} reviewed</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                progressPercent === 100 ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent === 100 && totalFlagged > 0 && (
            <div className="text-xs text-green-400 mt-1 text-center">
              🎉 All words reviewed!
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1 mb-3">
          {(['all', 'pending', 'reviewed'] as const).map((f) => {
            const count = f === 'all'
              ? totalFlagged
              : f === 'pending'
                ? totalFlagged - reviewedCount
                : reviewedCount;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs rounded transition-colors',
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <label htmlFor="sortSelect" className="sr-only">
          Sort words
        </label>
        <select
          id="sortSelect"
          aria-label="Sort words"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'confidence' | 'time')}
          className="w-full text-sm bg-slate-800 text-slate-300 rounded px-2 py-1.5 border border-slate-700"
        >
          <option value="confidence">Sort by Confidence (lowest first)</option>
          <option value="time">Sort by Time</option>
        </select>
      </div>

      {/* Word List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {wordsWithContext.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            {totalFlagged === 0 ? (
              <div>
                <div className="text-2xl mb-2">✨</div>
                <div>No low-confidence words found!</div>
                <div className="text-xs mt-1">Confidence threshold: {Math.round(confidenceThreshold * 100)}%</div>
              </div>
            ) : filter === 'pending' ? (
              <div>
                <div className="text-2xl mb-2">🎉</div>
                <div>All words reviewed!</div>
              </div>
            ) : (
              <div>No words to display</div>
            )}
          </div>
        ) : (
          wordsWithContext.map((word, index) => (
            <LowConfidenceWordCard
              key={word.originalIndex}
              word={word}
              contextBefore={word.contextBefore}
              contextAfter={word.contextAfter}
              isReviewed={reviewedWords.has(word.originalIndex)}
              isSelected={selectedIndex === index}
              onSelect={() => {
                setSelectedIndex(index);
                onWordSelect(word);
              }}
              onCorrect={(correction) => onWordCorrect(word.originalIndex, correction)}
              onMarkReviewed={() => onMarkReviewed(word.originalIndex)}
              data-word-index={index}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Individual word card
function LowConfidenceWordCard({
  word,
  contextBefore,
  contextAfter,
  isReviewed,
  isSelected,
  onSelect,
  onCorrect,
  onMarkReviewed,
  ...rest // for data-word-index
}: {
  word: FlaggedWord;
  contextBefore: string[];
  contextAfter: string[];
  isReviewed: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onCorrect: (correction: string) => void;
  onMarkReviewed: () => void;
  'data-word-index'?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(word.punctuated_word || word.word);

  const confidencePercent = Math.round(word.confidence * 100);
  const confidenceColor =
    word.confidence < 0.5 ? 'text-red-400 bg-red-500/20 border-red-500/30' :
    word.confidence < 0.7 ? 'text-orange-400 bg-orange-500/20 border-orange-500/30' :
    'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== (word.punctuated_word || word.word)) {
      onCorrect(trimmedValue);
    }
    setIsEditing(false);
    onMarkReviewed();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(word.punctuated_word || word.word);
      setIsEditing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      {...rest}
      className={cn(
        'p-3 rounded-lg border transition-all',
        isReviewed
          ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
          : 'bg-slate-800 border-slate-600 hover:border-slate-500',
        isSelected && 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900'
      )}
    >
      {/* Context Display */}
      {(contextBefore.length > 0 || contextAfter.length > 0) && (
        <div className="text-xs text-slate-500 mb-2 font-mono leading-relaxed">
          <span className="text-slate-600">{contextBefore.join(' ')}</span>
          {contextBefore.length > 0 && ' '}
          <span className="text-white font-semibold bg-blue-500/30 px-1 rounded">
            {word.punctuated_word || word.word}
          </span>
          {contextAfter.length > 0 && ' '}
          <span className="text-slate-600">{contextAfter.join(' ')}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        {/* Word Display / Edit */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full bg-slate-700 text-white rounded px-2 py-1 text-lg outline-none ring-2 ring-blue-500"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsEditing(true)}
                className="text-lg font-medium text-slate-200 hover:text-white text-left truncate"
                title="Click to edit"
              >
                "{word.punctuated_word || word.word}"
              </button>

              {/* Confidence Badge */}
              <span className={cn(
                'inline-flex items-center text-xs rounded px-1.5 py-0.5 border',
                confidenceColor
              )}>
                {confidencePercent}%
              </span>

              {isReviewed && (
                <span className="text-xs text-green-400">✓</span>
              )}
            </div>
          )}

          {/* Time */}
          <div className="text-xs text-slate-500 mt-1">
            at {formatTime(word.start)}
            {word.speaker !== undefined && ` • Speaker ${word.speaker + 1}`}
          </div>
        </div>

        {/* Play Button */}
        <button
          onClick={onSelect}
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 transition-colors"
          title="Jump to audio (plays 2s before)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      </div>

      {/* Actions */}
      {!isReviewed && !isEditing && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700/50">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 text-xs px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onMarkReviewed}
            className="flex-1 text-xs px-2 py-1.5 bg-green-700/50 hover:bg-green-700 text-green-200 rounded transition-colors"
          >
            ✓ OK as-is
          </button>
        </div>
      )}

      {isEditing && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700/50">
          <button
            onClick={handleSave}
            className="flex-1 text-xs px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditValue(word.punctuated_word || word.word);
              setIsEditing(false);
            }}
            className="flex-1 text-xs px-2 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

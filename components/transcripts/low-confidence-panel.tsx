'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { FlaggedWordCategory } from '@/types/analytics';
import type { ConfidenceSeverity } from '@/types/review-filters';
import { SEVERITY_THRESHOLDS } from '@/types/review-filters';
import { categorizeWord } from '@/lib/services/confidence-analytics';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

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

// Support for database-backed flagged words
interface FlaggedWordRowCompat {
  id: string;
  original_word: string;
  confidence: number;
  start_time: number;
  end_time: number;
  context_before: string;
  context_after: string;
  status: string;
  corrected_word?: string | null;
  alternatives?: unknown; // Json from DB — cast at point of use as {word:string,confidence:number}[]
}

interface DeepgramAlternative {
  word: string;
  confidence: number;
}

interface FlaggedWordStatsCompat {
  total: number;
  corrected: number;
  skipped: number;
  pending: number;
}

// Legacy props (word-based)
interface LowConfidencePanelLegacyProps {
  allWords: TranscriptWord[];
  confidenceThreshold?: number;
  onWordSelect: (word: TranscriptWord) => void;
  onWordCorrect: (wordIndex: number, correction: string) => void;
  reviewedWords: Set<number>;
  onMarkReviewed: (wordIndex: number) => void;
}

// New props (database-backed)
interface LowConfidencePanelNewProps {
  flaggedWords: FlaggedWordRowCompat[];
  stats: FlaggedWordStatsCompat;
  currentAudioTime: number;
  onSeekAudio: (timestamp: number) => void;
  onCorrection: (wordId: string, action: 'correct' | 'confirm' | 'skip', correctedWord?: string) => Promise<void>;
  isReadOnly: boolean;
  isLoading: boolean;
  onFilterUsed?: (filterType: string) => void; // Feature 5: Track filter usage
}

type LowConfidencePanelProps = LowConfidencePanelLegacyProps | LowConfidencePanelNewProps;

// Type guard
function isNewProps(props: LowConfidencePanelProps): props is LowConfidencePanelNewProps {
  return 'flaggedWords' in props;
}

export function LowConfidencePanel(props: LowConfidencePanelProps) {
  // Handle new database-backed mode
  if (isNewProps(props)) {
    return <LowConfidencePanelNew {...props} />;
  }

  // Handle legacy word-based mode
  const {
    allWords,
    confidenceThreshold = 0.85,
    onWordSelect,
    onWordCorrect,
    reviewedWords,
    onMarkReviewed,
  } = props;
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
              <div className="space-y-2">
                <div className="text-2xl mb-2">✨</div>
                <div className="font-medium">No low-confidence words found!</div>
                <div className="text-xs text-slate-400">
                  AI confidence was above {Math.round(confidenceThreshold * 100)}% for all words.
                </div>
                <div className="text-xs text-slate-500 mt-3 border-t border-slate-700 pt-3">
                  You can still review the full transcript manually. When ready, export using the buttons above.
                </div>
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

// New database-backed flagged words component
function LowConfidencePanelNew({
  flaggedWords,
  stats,
  currentAudioTime: _currentAudioTime,
  onSeekAudio,
  onCorrection,
  isReadOnly,
  isLoading,
  onFilterUsed,
}: LowConfidencePanelNewProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'corrected' | 'skipped'>('pending');
  const [severityFilter, setSeverityFilter] = useState<ConfidenceSeverity>('all');
  const [categoryFilter, setCategoryFilter] = useState<FlaggedWordCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const hasUnsavedChangesRef = useRef(false);

  // Filter flagged words (Feature 2.2 & 2.3)
  const filteredWords = useMemo(() => {
    return flaggedWords.filter(word => {
      // Status filter
      if (filter === 'pending' && word.status !== 'PENDING') return false;
      if (filter === 'corrected' && word.status !== 'CORRECTED') return false;
      if (filter === 'skipped' && word.status !== 'SKIPPED') return false;

      // Severity filter (Feature 2: NEW)
      if (severityFilter !== 'all') {
        const [min, max] = SEVERITY_THRESHOLDS[severityFilter];
        if (word.confidence < min || word.confidence >= max) return false;
      }

      // Category filter (Enhancement 2A: Actionable Filters)
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'very_low') {
          return word.confidence < 0.5;
        }
        const category = categorizeWord(word.original_word);
        if (categoryFilter === 'medical' && category !== 'medical') return false;
        if (categoryFilter === 'proper_nouns' && category !== 'proper_nouns') return false;
        if (categoryFilter === 'numbers_dates' && category !== 'numbers_dates') return false;
        if (categoryFilter === 'general' && category !== 'general') return false;
      }

      return true;
    });
  }, [flaggedWords, filter, severityFilter, categoryFilter]);

  // Count words by severity for filter buttons
  const countBySeverity = useMemo(() => {
    const counts: Record<ConfidenceSeverity, number> = {
      all: flaggedWords.length,
      critical: 0,
      low: 0,
      medium: 0,
    };

    flaggedWords.forEach(word => {
      if (word.confidence < 0.5) counts.critical++;
      else if (word.confidence < 0.7) counts.low++;
      else if (word.confidence < 0.85) counts.medium++;
    });

    return counts;
  }, [flaggedWords]);

  // Jump to highest risk word (Feature 2.5)
  const jumpToHighestRisk = useCallback(() => {
    const pendingWords = flaggedWords.filter(w => w.status === 'PENDING');
    if (pendingWords.length === 0) return;

    const lowestConf = [...pendingWords].sort((a, b) => a.confidence - b.confidence)[0];
    if (lowestConf) {
      onSeekAudio(Math.max(0, lowestConf.start_time - 2)); // Start 2 seconds before
    }
  }, [flaggedWords, onSeekAudio]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.shiftKey) {
        switch (e.key) {
          case 'R':
            jumpToHighestRisk();
            break;
          case '!': // Shift+1
            setSeverityFilter('critical');
            onFilterUsed?.('critical'); // Feature 5: Track filter usage
            break;
          case 'M':
            setCategoryFilter('medical');
            onFilterUsed?.('medical'); // Feature 5: Track filter usage
            break;
          case 'N':
            setCategoryFilter('numbers_dates');
            onFilterUsed?.('numbers_dates'); // Feature 5: Track filter usage
            break;
          case 'P':
            setCategoryFilter('proper_nouns');
            onFilterUsed?.('proper_nouns'); // Feature 5: Track filter usage
            break;
          case 'A':
            // Reset all filters
            setSeverityFilter('all');
            setCategoryFilter('all');
            setFilter('all');
            break;
        }
        return;
      }

      if (filteredWords.length === 0) return;

      const selectAndSeek = (idx: number) => {
        setSelectedIndex(idx);
        const target = filteredWords[idx];
        if (target) {
          onSeekAudio(Math.max(0, target.start_time - 2));
        }
      };

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = selectedIndex === null ? 0 : Math.min(selectedIndex + 1, filteredWords.length - 1);
          selectAndSeek(next);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = selectedIndex === null ? 0 : Math.max(selectedIndex - 1, 0);
          selectAndSeek(prev);
          break;
        }
        case 'Tab': {
          e.preventDefault();
          if (e.shiftKey) {
            const prevPending = filteredWords
              .map((w, idx) => ({ w, idx }))
              .reverse()
              .find(({ w, idx }) => w.status === 'PENDING' && idx < (selectedIndex ?? filteredWords.length));
            if (prevPending) selectAndSeek(prevPending.idx);
          } else {
            const nextPending = filteredWords.findIndex(
              (w, idx) => w.status === 'PENDING' && idx > (selectedIndex ?? -1),
            );
            if (nextPending >= 0) selectAndSeek(nextPending);
          }
          break;
        }
        case ' ': {
          e.preventDefault();
          if (selectedIndex !== null && filteredWords[selectedIndex]) {
            onSeekAudio(Math.max(0, filteredWords[selectedIndex].start_time - 2));
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (selectedIndex !== null && filteredWords[selectedIndex]) {
            setEditingId(filteredWords[selectedIndex].id);
            setCorrectionText(filteredWords[selectedIndex].corrected_word || '');
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setEditingId(null);
          setSelectedIndex(null);
          break;
        }
        case 'c':
        case 'C': {
          if (selectedIndex !== null && filteredWords[selectedIndex]) {
            e.preventDefault();
            void onCorrection(filteredWords[selectedIndex].id, 'confirm');
          }
          break;
        }
        case 's':
        case 'S': {
          if (selectedIndex !== null && filteredWords[selectedIndex]) {
            e.preventDefault();
            void onCorrection(filteredWords[selectedIndex].id, 'skip');
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredWords, jumpToHighestRisk, onCorrection, onFilterUsed, onSeekAudio, selectedIndex]);

  // Auto-scroll selected word into view when keyboard navigation changes the selection
  useEffect(() => {
    if (selectedIndex !== null && containerRef.current) {
      const el = containerRef.current.querySelector<HTMLElement>(`[data-word-index="${selectedIndex}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  // Track unsaved changes: set dirty when editing, clear after successful save
  useEffect(() => {
    if (editingId && correctionText.trim()) {
      hasUnsavedChangesRef.current = true;
    }
  }, [editingId, correctionText]);

  // Warn user before navigating away with unsaved corrections
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleCorrect = async (wordId: string) => {
    if (!correctionText.trim()) return;
    try {
      setActionErrors((current) => ({ ...current, [wordId]: '' }));
      await onCorrection(wordId, 'correct', correctionText);
      hasUnsavedChangesRef.current = false;
      setEditingId(null);
      setCorrectionText('');
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      setActionErrors((current) => ({
        ...current,
        [wordId]:
          code === 'CONFLICT'
            ? 'Another reviewer updated this word. Refreshing...'
            : 'Failed to save this correction. Please try again.',
      }));
      console.error('Failed to correct word:', error);
    }
  };

  const handleSkip = async (wordId: string) => {
    try {
      setActionErrors((current) => ({ ...current, [wordId]: '' }));
      await onCorrection(wordId, 'skip');
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      setActionErrors((current) => ({
        ...current,
        [wordId]:
          code === 'CONFLICT'
            ? 'Another reviewer updated this word. Refreshing...'
            : 'Failed to save this correction. Please try again.',
      }));
      console.error('Failed to skip word:', error);
    }
  };

  const handleConfirm = async (wordId: string) => {
    try {
      setActionErrors((current) => ({ ...current, [wordId]: '' }));
      await onCorrection(wordId, 'confirm');
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      setActionErrors((current) => ({
        ...current,
        [wordId]:
          code === 'CONFLICT'
            ? 'Another reviewer updated this word. Refreshing...'
            : 'Failed to save this correction. Please try again.',
      }));
      console.error('Failed to confirm word:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading flagged words...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header with stats */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-200">Low Confidence Words</h3>
          <div className="flex items-center gap-2">
            {/* Jump to Highest Risk Button (Feature 2.5) */}
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-6 gap-1 text-yellow-400 border-yellow-600 hover:bg-yellow-900/20"
              onClick={jumpToHighestRisk}
              title="Shift+R"
            >
              <ArrowUp className="h-3 w-3" />
              Jump to Worst
            </Button>
            <div className="text-xs text-slate-400">
              {stats.corrected + stats.skipped} / {stats.total} reviewed
            </div>
          </div>
        </div>

        {/* Status filter buttons */}
        <div className="flex gap-1 mb-2">
          {([
            ['all', stats.total],
            ['pending', stats.pending],
            ['corrected', stats.corrected],
            ['skipped', stats.skipped],
          ] as const).map(([f, count]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 px-2 py-1 text-xs rounded',
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          ))}
        </div>

        {/* Severity filter buttons (Feature 2.2) */}
        <div className="flex gap-1 mb-2">
          <span className="text-xs text-slate-400 w-12 pt-1">Risk:</span>
          {([
            ['all', 'All', null],
            ['critical', '< 0.5', 'text-red-400'],
            ['low', '0.5–0.7', 'text-orange-400'],
            ['medium', '0.7–0.85', 'text-yellow-400'],
          ] as const).map(([sev, label, color]) => (
            <button
              key={sev}
              onClick={() => {
                setSeverityFilter(sev as ConfidenceSeverity);
                if (sev !== 'all') onFilterUsed?.(sev as string); // Feature 5: Track filter usage
              }}
              className={cn(
                'px-2 py-1 text-xs rounded',
                severityFilter === sev
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                color
              )}
              title={sev === 'critical' ? 'Shift+1' : undefined}
            >
              {label} {sev !== 'all' && `(${countBySeverity[sev as ConfidenceSeverity]})`}
            </button>
          ))}
        </div>

        {/* Category filter buttons (Enhancement 2A) */}
        <div className="flex gap-1 flex-wrap">
          <span className="text-xs text-slate-400 w-12 pt-1">Type:</span>
          {([
            ['all', 'All', null],
            ['medical', '⚕ Medical', 'M'],
            ['proper_nouns', '👤 Names', 'P'],
            ['numbers_dates', '# Numbers', 'N'],
          ] as const).map(([cat, label, shortcut]) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                if (cat !== 'all') onFilterUsed?.(cat as string); // Feature 5: Track filter usage
              }}
              className={cn(
                'px-2 py-1 text-xs rounded',
                categoryFilter === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
              title={shortcut ? `Shift+${shortcut}` : undefined}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-2 text-xs text-slate-500 text-center">
          Tip: Arrows/Tab navigate, Space play, Enter edit, C confirm, S skip
        </div>
      </div>

      {/* Word list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredWords.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            {flaggedWords.length === 0 ? (
              <div className="space-y-2">
                <div className="text-2xl mb-2">✨</div>
                <div className="font-medium">No low-confidence words found!</div>
                <div className="text-xs text-slate-400">
                  AI confidence was above {Math.round(0.85 * 100)}% for all words.
                </div>
                <div className="text-xs text-slate-500 mt-3 border-t border-slate-700 pt-3">
                  You can still review the full transcript manually. When ready, export using the buttons above.
                </div>
              </div>
            ) : (
              <div>No {filter === 'all' ? '' : filter} words to show</div>
            )}
          </div>
        ) : (
          filteredWords.map((word, index) => (
            <div
              key={word.id}
              data-word-index={index}
              className={cn(
                'bg-slate-900 rounded p-3 space-y-2 border border-slate-800 cursor-pointer border-l-4',
                word.status === 'CORRECTED' ? 'border-l-green-500' :
                word.status === 'CONFIRMED' ? 'border-l-blue-500' :
                word.status === 'SKIPPED' ? 'border-l-slate-600' :
                'border-l-yellow-500',
                selectedIndex === index && 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-950'
              )}
              onClick={() => {
                setSelectedIndex(index);
                onSeekAudio(Math.max(0, word.start_time - 2));
              }}
            >
              {/* Context and word */}
              <div className="text-sm">
                <span className="text-slate-400">{word.context_before} </span>
                <span className="text-yellow-400 font-semibold bg-yellow-400/10 px-1 rounded">
                  {word.original_word}
                </span>
                <span className="text-slate-400"> {word.context_after}</span>
              </div>

              {/* Confidence and timestamp */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Confidence: {Math.round(word.confidence * 100)}%</span>
                <button
                  onClick={() => {
                    setSelectedIndex(index);
                    onSeekAudio(word.start_time);
                  }}
                  className="hover:text-blue-400"
                >
                  {Math.floor(word.start_time / 60)}:{String(Math.floor(word.start_time % 60)).padStart(2, '0')}
                </button>
              </div>

              {/* Actions */}
              {!isReadOnly && (word.status === 'PENDING' || editingId === word.id) && (
                <div className="flex flex-col gap-2">
                  {editingId === word.id ? (
                    <>
                      {/* Deepgram alternatives as clickable chips */}
                      {Array.isArray(word.alternatives) && (word.alternatives as DeepgramAlternative[]).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-slate-500 w-full">Alternatives:</span>
                          {(word.alternatives as DeepgramAlternative[]).slice(0, 5).map((alt, i) => (
                            <button
                              key={i}
                              onClick={() => setCorrectionText(alt.word)}
                              className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-blue-700 text-slate-300 hover:text-white rounded border border-slate-600 transition-colors"
                              title={`${Math.round(alt.confidence * 100)}% confidence`}
                            >
                              {alt.word} <span className="opacity-60">{Math.round(alt.confidence * 100)}%</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={correctionText}
                          onChange={(e) => setCorrectionText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); void handleCorrect(word.id); }
                            if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); setCorrectionText(''); }
                          }}
                          placeholder="Enter correction"
                          className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded"
                          autoFocus
                        />
                        <button
                          onClick={() => handleCorrect(word.id)}
                          className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setCorrectionText('');
                          }}
                          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(word.id);
                          setCorrectionText(word.original_word);
                        }}
                        className="flex-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        Correct
                      </button>
                      <button
                        onClick={() => handleConfirm(word.id)}
                        className="flex-1 px-3 py-1 text-xs bg-green-700/70 hover:bg-green-700 rounded"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleSkip(word.id)}
                        className="flex-1 px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                  {actionErrors[word.id] && (
                    <p className="text-xs text-amber-400" role="status">
                      {actionErrors[word.id]}
                    </p>
                  )}
                </div>
              )}

              {/* Show status if not pending */}
              {word.status !== 'PENDING' && editingId !== word.id && (
                <div className={cn(
                  'text-xs px-2 py-1 rounded text-center',
                  word.status === 'CORRECTED' && 'bg-green-900/30 text-green-400',
                  word.status === 'CONFIRMED' && 'bg-blue-900/30 text-blue-400',
                  word.status === 'SKIPPED' && 'bg-slate-800 text-slate-400'
                )}>
                  {word.status === 'CORRECTED' && word.corrected_word
                    ? `✓ Corrected to: "${word.corrected_word}"`
                    : word.status === 'CONFIRMED' ? '✓ Confirmed as correct'
                    : 'Skipped'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

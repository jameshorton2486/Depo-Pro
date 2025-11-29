"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Check, X, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FlaggedWord } from '@/types/transcript';

interface LowConfidenceReviewProps {
  flaggedWords: FlaggedWord[];
  onSeekAudio: (timestamp: number) => void;
  onWordUpdate: (wordId: string, correctedWord: string) => Promise<void>;
  onMarkReviewed: (wordId: string, reviewed: boolean) => Promise<void>;
  currentAudioTime?: number;
  isLoading?: boolean;
}

type FilterType = 'all' | 'pending' | 'reviewed';
type SortType = 'confidence' | 'timestamp';

export function LowConfidenceReview({
  flaggedWords,
  onSeekAudio,
  onWordUpdate,
  onMarkReviewed,
  currentAudioTime = 0,
  isLoading = false,
}: LowConfidenceReviewProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('confidence');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const displayedWords = useMemo(() => {
    let filtered = [...flaggedWords];
    if (filter === 'pending') {
      filtered = filtered.filter((word) => !word.isReviewed);
    } else if (filter === 'reviewed') {
      filtered = filtered.filter((word) => word.isReviewed);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'confidence') {
        return a.confidence - b.confidence;
      }
      return a.startTime - b.startTime;
    });

    return filtered;
  }, [flaggedWords, filter, sortBy]);

  const reviewedCount = flaggedWords.filter((word) => word.isReviewed).length;
  const totalCount = flaggedWords.length;
  const progressPercent = totalCount ? Math.round((reviewedCount / totalCount) * 100) : 0;

  const playingWordId = useMemo(() => {
    return flaggedWords.find(
      (word) => currentAudioTime >= word.startTime && currentAudioTime <= word.endTime
    )?.id;
  }, [flaggedWords, currentAudioTime]);

  useEffect(() => {
    if (playingWordId) {
      const element = itemRefs.current.get(playingWordId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [playingWordId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editingId) {
        if (event.key === 'Escape') {
          setEditingId(null);
          setEditValue('');
        }
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(displayedWords.length - 1, prev + 1));
          break;
        case ' ':
          event.preventDefault();
          if (displayedWords[selectedIndex]) {
            const word = displayedWords[selectedIndex];
            onSeekAudio(Math.max(0, word.startTime - 2));
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (displayedWords[selectedIndex]) {
            startEditing(displayedWords[selectedIndex]);
          }
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          if (displayedWords[selectedIndex]) {
            const word = displayedWords[selectedIndex];
            toggleReviewed(word);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedWords, selectedIndex, editingId, onSeekAudio, toggleReviewed]);

  useEffect(() => {
    if (selectedIndex > displayedWords.length - 1) {
      setSelectedIndex(Math.max(0, displayedWords.length - 1));
    }
  }, [displayedWords, selectedIndex]);

  const startEditing = (word: FlaggedWord) => {
    setEditingId(word.id);
    setEditValue(word.correctedWord || word.word);
  };

  const saveEdit = async (word: FlaggedWord) => {
    const value = editValue.trim();
    if (!value) {
      setEditingId(null);
      setEditValue('');
      return;
    }

    setSavingId(word.id);
    try {
      await onWordUpdate(word.id, value);
    } finally {
      setSavingId(null);
      setEditingId(null);
      setEditValue('');
    }
  };

  const toggleReviewed = useCallback(
    async (word: FlaggedWord) => {
      setSavingId(word.id);
      try {
        await onMarkReviewed(word.id, !word.isReviewed);
      } finally {
        setSavingId(null);
      }
    },
    [onMarkReviewed]
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence < 0.5) return 'text-red-500';
    if (confidence < 0.7) return 'text-orange-500';
    return 'text-yellow-500';
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="relative flex h-full flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Flagged Words</h3>
          <span className="text-xs text-slate-400">
            {reviewedCount} of {totalCount} reviewed
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">{progressPercent}%</p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-sm text-slate-400">
        <Filter className="h-4 w-4" />
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as FilterType)}
          className="rounded border-none bg-slate-800 px-2 py-1 text-xs text-slate-200"
        >
          <option value="all">All ({totalCount})</option>
          <option value="pending">Pending ({totalCount - reviewedCount})</option>
          <option value="reviewed">Reviewed ({reviewedCount})</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortType)}
          className="rounded border-none bg-slate-800 px-2 py-1 text-xs text-slate-200"
        >
          <option value="confidence">By Confidence</option>
          <option value="timestamp">By Time</option>
        </select>
        <span className="ml-auto text-xs">↑↓ Navigate • Space Play • Enter Edit • R Review</span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {displayedWords.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            {filter === 'pending' ? 'All words reviewed' : 'No flagged words'}
          </div>
        ) : (
          displayedWords.map((word, index) => (
            <div
              key={word.id}
              ref={(element) => {
                if (element) {
                  itemRefs.current.set(word.id, element);
                }
              }}
              className={cn(
                'border-b border-slate-800 p-4 text-sm transition-colors',
                selectedIndex === index && 'bg-slate-800',
                playingWordId === word.id && 'border-l-2 border-l-blue-500 bg-blue-900/30',
                word.isReviewed && 'opacity-70'
              )}
              onClick={() => setSelectedIndex(index)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {editingId === word.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            saveEdit(word);
                          }
                          if (event.key === 'Escape') {
                            setEditingId(null);
                            setEditValue('');
                          }
                        }}
                        autoFocus
                        className="h-8 bg-slate-800 text-white"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-green-400"
                        onClick={() => saveEdit(word)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400"
                        onClick={() => {
                          setEditingId(null);
                          setEditValue('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-text text-base font-semibold"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEditing(word);
                      }}
                    >
                      {word.correctedWord || word.word}
                      {word.correctedWord && (
                        <span className="ml-2 text-xs text-slate-500 line-through">{word.word}</span>
                      )}
                    </div>
                  )}

                  <p className="mt-1 text-xs text-slate-400">
                    ...{word.context.before}{' '}
                    <span className="text-white">{word.word}</span>{' '}
                    {word.context.after}...
                  </p>

                  {word.alternatives && word.alternatives.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {word.alternatives.slice(0, 3).map((alt, altIndex) => (
                        <button
                          key={`${word.id}-alt-${altIndex}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingId(word.id);
                            setEditValue(alt);
                            saveEdit({ ...word, correctedWord: alt });
                          }}
                          className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-700"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
                  <span className={cn('font-mono', getConfidenceColor(word.confidence))}>
                    {Math.round(word.confidence * 100)}%
                  </span>
                  <button
                    className="flex items-center gap-1 text-slate-300 hover:text-blue-400"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSeekAudio(Math.max(0, word.startTime - 2));
                    }}
                  >
                    <Play className="h-3 w-3" />
                    {formatTimestamp(word.startTime)}
                  </button>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600 bg-slate-800 text-green-500"
                      checked={word.isReviewed}
                      onChange={(event) => {
                        event.stopPropagation();
                        toggleReviewed(word);
                      }}
                    />
                    Reviewed
                  </label>
                </div>
              </div>

              {savingId === word.id && (
                <p className="mt-2 text-xs text-slate-500">Saving…</p>
              )}
            </div>
          ))
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-sm text-white">
          Saving changes…
        </div>
      )}
    </div>
  );
}

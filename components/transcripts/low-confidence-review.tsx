'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import type { FlaggedWord } from '@/types/transcript';

interface LowConfidenceReviewProps {
  flaggedWords: FlaggedWord[];
  onSeekAudio: (timestamp: number) => void;
  onWordUpdate: (wordId: string, correctedWord: string) => void;
  onMarkReviewed: (wordId: string, reviewed: boolean) => void;
  currentAudioTime?: number;
}

export function LowConfidenceReview({
  flaggedWords,
  onSeekAudio,
  onWordUpdate,
  onMarkReviewed,
  currentAudioTime = 0,
}: LowConfidenceReviewProps) {
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'timestamp'>('confidence');

  const filteredWords = flaggedWords
    .filter((word) => {
      if (filter === 'pending') return !word.isReviewed;
      if (filter === 'reviewed') return word.isReviewed;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'confidence') return a.confidence - b.confidence;
      return a.startTime - b.startTime;
    });

  const totalCount = flaggedWords.length;
  const reviewedCount = flaggedWords.filter((w) => w.isReviewed).length;
  const pendingCount = totalCount - reviewedCount;
  const progressPercent = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  const handleWordClick = useCallback(
    (word: FlaggedWord) => {
      setSelectedWordId(word.id);
      const seekTime = Math.max(0, word.startTime - 2);
      onSeekAudio(seekTime);
    },
    [onSeekAudio]
  );

  const handleStartEdit = (word: FlaggedWord) => {
    setEditingWordId(word.id);
    setEditValue(word.correctedWord || word.word);
  };

  const handleSaveEdit = (wordId: string) => {
    if (editValue.trim()) {
      onWordUpdate(wordId, editValue.trim());
    }
    setEditingWordId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingWordId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, word: FlaggedWord, index: number) => {
    if (editingWordId) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveEdit(word.id);
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < filteredWords.length - 1) {
          handleWordClick(filteredWords[index + 1]);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          handleWordClick(filteredWords[index - 1]);
        }
        break;
      case ' ':
        e.preventDefault();
        onSeekAudio(word.startTime - 2);
        break;
      case 'Enter':
        e.preventDefault();
        handleStartEdit(word);
        break;
      case 'r':
        e.preventDefault();
        onMarkReviewed(word.id, !word.isReviewed);
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence < 0.5) return 'text-red-600 bg-red-50';
    if (confidence < 0.7) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <div className="flex h-full flex-col rounded-lg border bg-white shadow-sm">
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold text-gray-900">Low-Confidence Words</h3>
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            {reviewedCount} / {totalCount} reviewed ({progressPercent}%)
          </span>
          <div className="flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-2 bg-green-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b p-3">
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as typeof filter)}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="all">All ({totalCount})</option>
        <option value="pending">Pending ({pendingCount})</option>
        <option value="reviewed">Reviewed ({reviewedCount})</option>
      </select>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="confidence">Sort by Confidence</option>
        <option value="timestamp">Sort by Timestamp</option>
      </select>
      </div>

      <div className="border-b bg-gray-50 px-3 py-2 text-xs text-gray-500">
        <span className="font-semibold">Shortcuts:</span> ↑↓ Navigate • Space Play • Enter Edit • R Toggle Reviewed
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredWords.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {filter === 'pending' ? 'All words reviewed!' : 'No flagged words found.'}
          </div>
        ) : (
          <ul className="divide-y">
            {filteredWords.map((word, index) => (
              <li
                key={word.id}
                tabIndex={0}
                onClick={() => handleWordClick(word)}
                onKeyDown={(e) => handleKeyDown(e, word, index)}
                className={cn(
                  'cursor-pointer p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
                  selectedWordId === word.id ? 'bg-blue-50' : 'hover:bg-gray-50',
                  word.isReviewed && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {editingWordId === word.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSaveEdit(word.id)}
                          autoFocus
                          className="rounded border px-2 py-1 text-sm font-medium"
                        />
                      ) : (
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-sm font-medium',
                            getConfidenceColor(word.confidence)
                          )}
                        >
                          {word.correctedWord || word.word}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {Math.round(word.confidence * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-600">
                      <span className="text-gray-400">...</span>
                      {word.context.before}{' '}
                      <span className="font-semibold underline">{word.word}</span>{' '}
                      {word.context.after}
                      <span className="text-gray-400">...</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatTime(word.startTime)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkReviewed(word.id, !word.isReviewed);
                      }}
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border text-xs',
                        word.isReviewed
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      )}
                    >
                      {word.isReviewed ? '✓' : ''}
                    </button>
                  </div>
                </div>
                {word.alternatives && word.alternatives.length > 0 && selectedWordId === word.id && (
                  <div className="mt-2 flex flex-wrap gap-1 text-xs">
                    <span className="text-gray-500">Suggestions:</span>
                    {word.alternatives.map((alt, idx) => (
                      <button
                        key={`${word.id}-alt-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onWordUpdate(word.id, alt);
                        }}
                        className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LowConfidenceReview;

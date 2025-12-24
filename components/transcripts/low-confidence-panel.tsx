'use client';

// ═══════════════════════════════════════════════════════════════
// LOW CONFIDENCE PANEL - Sidebar for reviewing flagged words
// ═══════════════════════════════════════════════════════════════
// Features:
// - Progress bar showing review completion
// - Filter tabs: All | Pending | Reviewed | Corrected
// - Sort options: By timestamp | By confidence
// - List of flagged word cards
// - Keyboard navigation (arrows, Enter, R key)
// - Next/Previous flagged word buttons
// - Keyboard shortcuts help

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FlaggedWordCard } from './flagged-word-card';
import { FlaggedWordWithContext, FilterOption, SortOption } from '@/types/review';

interface LowConfidencePanelProps {
  flaggedWords: FlaggedWordWithContext[];
  currentWordIndex: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onCorrect: (wordIndex: number, newWord: string) => void;
  onMarkReviewed: (wordIndex: number) => void;
  onNavigateToWord: (wordIndex: number) => void;
  className?: string;
}

export function LowConfidencePanel({
  flaggedWords,
  currentWordIndex,
  isPlaying,
  onSeek,
  onCorrect,
  onMarkReviewed,
  onNavigateToWord,
  className = '',
}: LowConfidencePanelProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('timestamp');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Calculate progress
  const progress = useMemo(() => {
    const total = flaggedWords.length;
    const reviewed = flaggedWords.filter((w) => w.reviewed).length;
    const corrected = flaggedWords.filter((w) => w.correctedWord).length;
    const pending = total - reviewed;
    const percentComplete = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    return { total, reviewed, corrected, pending, percentComplete };
  }, [flaggedWords]);

  // Filter and sort words
  const displayedWords = useMemo(() => {
    let filtered = [...flaggedWords];

    // Apply filter
    switch (filter) {
      case 'pending':
        filtered = filtered.filter((w) => !w.reviewed);
        break;
      case 'reviewed':
        filtered = filtered.filter((w) => w.reviewed && !w.correctedWord);
        break;
      case 'corrected':
        filtered = filtered.filter((w) => w.correctedWord);
        break;
    }

    // Apply sort
    switch (sort) {
      case 'confidence':
        filtered.sort((a, b) => a.confidence - b.confidence);
        break;
      case 'timestamp':
      default:
        filtered.sort((a, b) => a.start - b.start);
        break;
    }

    return filtered;
  }, [flaggedWords, filter, sort]);

  // Find current active word in displayed list
  const activeDisplayIndex = useMemo(() => {
    return displayedWords.findIndex((w) => w.wordIndex === currentWordIndex);
  }, [displayedWords, currentWordIndex]);

  // Navigate to next/previous flagged word
  const navigateToFlagged = useCallback(
    (direction: 'next' | 'prev') => {
      if (displayedWords.length === 0) return;

      let newIndex: number;
      if (direction === 'next') {
        newIndex = (selectedIndex + 1) % displayedWords.length;
      } else {
        newIndex = selectedIndex - 1 < 0 ? displayedWords.length - 1 : selectedIndex - 1;
      }

      setSelectedIndex(newIndex);
      const word = displayedWords[newIndex];
      if (word) {
        onNavigateToWord(word.wordIndex);
        onSeek(Math.max(0, word.start - 2));
      }
    },
    [displayedWords, selectedIndex, onNavigateToWord, onSeek],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          navigateToFlagged('next');
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          navigateToFlagged('prev');
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          if (displayedWords[selectedIndex]) {
            onMarkReviewed(displayedWords[selectedIndex].wordIndex);
          }
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToFlagged, displayedWords, selectedIndex, onMarkReviewed]);

  // Update selected index when active word changes
  useEffect(() => {
    if (activeDisplayIndex >= 0) {
      setSelectedIndex(activeDisplayIndex);
    }
  }, [activeDisplayIndex]);

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Words to Review</h2>
          <button
            onClick={() => setShowShortcuts((prev) => !prev)}
            className="text-gray-400 hover:text-gray-600"
            title="Keyboard shortcuts"
          >
            ⌨️
          </button>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">
              {progress.reviewed} of {progress.total} reviewed
            </span>
            <span className="font-medium text-blue-600">{progress.percentComplete}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
          {progress.corrected > 0 && (
            <p className="text-xs text-green-600 mt-1">
              {progress.corrected} words corrected
            </p>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-3">
          {[
            { value: 'all', label: 'All', count: progress.total },
            { value: 'pending', label: 'Pending', count: progress.pending },
            { value: 'reviewed', label: 'OK', count: progress.reviewed - progress.corrected },
            { value: 'corrected', label: 'Corrected', count: progress.corrected },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as FilterOption)}
              className={`flex-1 text-xs py-1.5 px-2 rounded transition-colors ${
                filter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-xs bg-white border border-gray-200 rounded px-2 py-1"
          >
            <option value="timestamp">By timestamp</option>
            <option value="confidence">By confidence (lowest first)</option>
          </select>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateToFlagged('prev')}
            disabled={displayedWords.length === 0}
            className="flex-1"
          >
            ← Previous (P)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigateToFlagged('next')}
            disabled={displayedWords.length === 0}
            className="flex-1"
          >
            Next (N) →
          </Button>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      {showShortcuts && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200 text-xs">
          <p className="font-medium text-yellow-800 mb-2">Keyboard Shortcuts:</p>
          <div className="grid grid-cols-2 gap-1 text-yellow-700">
            <span>N - Next word</span>
            <span>P - Previous word</span>
            <span>R - Mark as reviewed</span>
            <span>Space - Play/Pause</span>
            <span>← - Skip back 5s</span>
            <span>→ - Skip forward 5s</span>
          </div>
        </div>
      )}

      {/* Flagged words list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayedWords.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {filter === 'all' ? (
              <p>No flagged words found! 🎉</p>
            ) : (
              <p>No words match this filter.</p>
            )}
          </div>
        ) : (
          displayedWords.map((word, index) => (
            <FlaggedWordCard
              key={word.wordIndex}
              flaggedWord={word}
              isActive={index === selectedIndex}
              isPlaying={isPlaying && word.wordIndex === currentWordIndex}
              onSeek={onSeek}
              onCorrect={onCorrect}
              onMarkReviewed={onMarkReviewed}
            />
          ))
        )}
      </div>

      {/* Footer with stats */}
      <div className="p-3 bg-white border-t border-gray-200 text-xs text-gray-500 text-center">
        {progress.pending > 0
          ? `${progress.pending} words remaining to review`
          : 'All words reviewed! ✓'}
      </div>
    </div>
  );
}

export default LowConfidencePanel;

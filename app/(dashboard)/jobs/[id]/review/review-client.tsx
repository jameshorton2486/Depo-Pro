'use client';

// ═══════════════════════════════════════════════════════════════
// REVIEW CLIENT - Main orchestrator for transcript review
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SyncedTranscript } from '@/components/transcripts/synced-transcript';
import { LowConfidencePanel } from '@/components/transcripts/low-confidence-panel';
import { ConfidenceThresholdControl } from '@/components/transcripts/confidence-threshold-control';
import { ReviewProgress } from '@/components/transcripts/review-progress';
import type { AudioPlayerRef } from '@/components/transcripts/audio-player';
import { AudioPlayer } from '@/components/transcripts/audio-player';
import { useKeyboardShortcuts, REVIEW_SHORTCUTS } from '@/hooks/use-keyboard-shortcuts';
import type {
  ReviewWord,
  FlaggedWordWithContext,
  ReviewSession,
  ReviewState,
  SaveReviewRequest,
} from '@/types/review';

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;

interface ReviewClientProps {
  jobId: string;
  transcriptionId: string;
  audioUrl: string;
  words: ReviewWord[];
  savedSession?: ReviewSession;
}

const AUTO_SAVE_INTERVAL = 30000;

export function ReviewClient({
  jobId,
  transcriptionId,
  audioUrl,
  words: initialWords,
  savedSession,
}: ReviewClientProps) {
  const router = useRouter();
  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  // Core state
  const [words] = useState<ReviewWord[]>(initialWords);
  const [currentTime, setCurrentTime] = useState(savedSession?.audioPosition || 0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    savedSession?.confidenceThreshold || DEFAULT_CONFIDENCE_THRESHOLD,
  );

  // Review state tracking
  const [reviewState, setReviewState] = useState<ReviewState>(
    savedSession?.reviewState || 'PENDING',
  );
  const [reviewedIndices, setReviewedIndices] = useState<Set<number>>(
    new Set(savedSession?.reviewedIndices || []),
  );
  const [corrections, setCorrections] = useState<Map<number, string>>(
    new Map(savedSession?.corrections.map((c) => [c.wordIndex, c.correctedWord]) || []),
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    savedSession?.lastSavedAt ? new Date(savedSession.lastSavedAt) : null,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Transition to IN_PROGRESS when user starts reviewing
  useEffect(() => {
    if (reviewState === 'PENDING' && (reviewedIndices.size > 0 || corrections.size > 0)) {
      setReviewState('IN_PROGRESS');
    }
  }, [reviewState, reviewedIndices.size, corrections.size]);

  // Calculate flagged words
  const flaggedWords = useMemo(() => {
    const flagged: FlaggedWordWithContext[] = [];

    words.forEach((word, index) => {
      if (word.confidence < confidenceThreshold) {
        const contextBefore = words
          .slice(Math.max(0, index - 3), index)
          .map((w) => corrections.get(w.index) || w.word)
          .join(' ');

        const contextAfter = words
          .slice(index + 1, Math.min(words.length, index + 4))
          .map((w) => corrections.get(w.index) || w.word)
          .join(' ');

        flagged.push({
          wordIndex: index,
          word: word.word,
          start: word.start,
          end: word.end,
          confidence: word.confidence,
          speaker: word.speaker,
          reviewed: reviewedIndices.has(index),
          correctedWord: corrections.get(index),
          contextBefore,
          contextAfter,
        });
      }
    });

    return flagged;
  }, [words, confidenceThreshold, reviewedIndices, corrections]);

  const correctedIndices = useMemo(() => {
    return new Set(corrections.keys());
  }, [corrections]);

  // Find current word based on audio time
  useEffect(() => {
    if (words.length === 0) return;

    let left = 0;
    let right = words.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const word = words[mid];

      if (currentTime >= word.start && currentTime <= word.end) {
        result = mid;
        break;
      } else if (currentTime < word.start) {
        right = mid - 1;
      } else {
        result = mid;
        left = mid + 1;
      }
    }

    setCurrentWordIndex(result);
  }, [currentTime, words]);

  // Seek to time
  const seekTo = useCallback((time: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(time);
    }
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.toggle();
    }
  }, []);

  const handleWordClick = useCallback((time: number, wordIndex: number) => {
    seekTo(time);
    setCurrentWordIndex(wordIndex);
  }, [seekTo]);

  const handleSeek = useCallback((time: number) => {
    seekTo(time);
  }, [seekTo]);

  const handleCorrect = useCallback((wordIndex: number, newWord: string) => {
    setCorrections((prev) => {
      const updated = new Map(prev);
      updated.set(wordIndex, newWord);
      return updated;
    });
    setReviewedIndices((prev) => new Set(prev).add(wordIndex));
    setHasUnsavedChanges(true);
  }, []);

  const handleMarkReviewed = useCallback((wordIndex: number) => {
    setReviewedIndices((prev) => new Set(prev).add(wordIndex));
    setHasUnsavedChanges(true);
  }, []);

  const handleNavigateToWord = useCallback((wordIndex: number) => {
    const word = words[wordIndex];
    if (word) {
      seekTo(Math.max(0, word.start - 1));
      setCurrentWordIndex(wordIndex);
    }
  }, [words, seekTo]);

  // Save progress
  const saveProgress = useCallback(
    async (isComplete = false) => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const requestBody: SaveReviewRequest = {
          corrections: Array.from(corrections.entries()).map(([wordIndex, correctedWord]) => ({
            wordIndex,
            correctedWord,
          })),
          reviewedIndices: Array.from(reviewedIndices),
          lastReviewedIndex: currentWordIndex,
          audioPosition: currentTime,
          confidenceThreshold,
          complete: isComplete,
        };

        const response = await fetch(`/api/transcripts/${transcriptionId}/words`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error('Failed to save');

        const result = await response.json();
        setLastSavedAt(new Date(result.savedAt));
        setHasUnsavedChanges(false);

        if (isComplete) {
          setReviewState('COMPLETED');
          router.push(`/jobs/${jobId}?success=review_complete`);
        }
      } catch (error) {
        console.error('Save error:', error);
        setSaveError('Failed to save. Please try again.');
      } finally {
        setIsSaving(false);
      }
    },
    [corrections, reviewedIndices, currentWordIndex, currentTime, confidenceThreshold, transcriptionId, jobId, router],
  );

  // Auto-save
  useEffect(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }

    if (hasUnsavedChanges) {
      autoSaveRef.current = setInterval(() => {
        saveProgress(false);
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
        autoSaveRef.current = null;
      }
    };
  }, [hasUnsavedChanges, saveProgress]);

  // Warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const progress = useMemo(() => {
    const total = flaggedWords.length;
    const reviewed = flaggedWords.filter((w) => w.reviewed).length;
    return {
      total,
      reviewed,
      percentComplete: total > 0 ? Math.round((reviewed / total) * 100) : 100,
    };
  }, [flaggedWords]);

  const getReviewStateLabel = () => {
    switch (reviewState) {
      case 'PENDING': return { text: 'Not Started', color: 'text-gray-500' };
      case 'IN_PROGRESS': return { text: 'In Progress', color: 'text-blue-500' };
      case 'COMPLETED': return { text: 'Completed', color: 'text-green-500' };
    }
  };

  const stateLabel = getReviewStateLabel();

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        ...REVIEW_SHORTCUTS.PLAY_PAUSE,
        action: togglePlay,
      },
      {
        ...REVIEW_SHORTCUTS.SAVE,
        action: () => saveProgress(false),
      },
      {
        ...REVIEW_SHORTCUTS.NEXT_FLAGGED,
        action: () => {
          if (flaggedWords.length > 0) {
            const currentIndex = flaggedWords.findIndex((w) => w.wordIndex === currentWordIndex);
            const nextIndex = currentIndex < flaggedWords.length - 1 ? currentIndex + 1 : 0;
            const nextWord = flaggedWords[nextIndex];
            if (nextWord) {
              handleNavigateToWord(nextWord.wordIndex);
              seekTo(Math.max(0, nextWord.start - 2));
            }
          }
        },
      },
      {
        ...REVIEW_SHORTCUTS.PREV_FLAGGED,
        action: () => {
          if (flaggedWords.length > 0) {
            const currentIndex = flaggedWords.findIndex((w) => w.wordIndex === currentWordIndex);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : flaggedWords.length - 1;
            const prevWord = flaggedWords[prevIndex];
            if (prevWord) {
              handleNavigateToWord(prevWord.wordIndex);
              seekTo(Math.max(0, prevWord.start - 2));
            }
          }
        },
      },
      {
        ...REVIEW_SHORTCUTS.SEEK_BACK,
        action: () => {
          if (audioPlayerRef.current) {
            const newTime = Math.max(0, currentTime - 5);
            audioPlayerRef.current.seekTo(newTime);
          }
        },
      },
      {
        ...REVIEW_SHORTCUTS.SEEK_FORWARD,
        action: () => {
          if (audioPlayerRef.current) {
            const duration = audioPlayerRef.current.getDuration();
            const newTime = Math.min(duration, currentTime + 5);
            audioPlayerRef.current.seekTo(newTime);
          }
        },
      },
    ],
    true,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Audio Player */}
      <div className="shrink-0 px-6 py-4 bg-white border-b border-gray-200">
        <AudioPlayer
          ref={audioPlayerRef}
          src={audioUrl}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
        />
      </div>

      {/* Status bar */}
      <div className="shrink-0 px-6 py-2 bg-gray-50 border-y border-gray-200 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className={`font-medium ${stateLabel.color}`}>{stateLabel.text}</span>
          {saveError ? (
            <span className="text-red-600">{saveError}</span>
          ) : lastSavedAt ? (
            <span className="text-gray-500">Last saved: {lastSavedAt.toLocaleTimeString()}</span>
          ) : (
            <span className="text-gray-500">Not saved yet</span>
          )}
          {hasUnsavedChanges && <span className="text-orange-500">• Unsaved changes</span>}
          {isSaving && <span className="text-blue-500">Saving...</span>}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => saveProgress(false)}
            disabled={isSaving || !hasUnsavedChanges}
          >
            Save Progress
          </Button>
          <Button
            size="sm"
            onClick={() => saveProgress(true)}
            disabled={isSaving || progress.reviewed < progress.total}
          >
            Complete Review
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Transcript View */}
          <div className="flex-1 p-6 overflow-hidden">
            <SyncedTranscript
              words={words}
              currentTime={currentTime}
              confidenceThreshold={confidenceThreshold}
              reviewedIndices={reviewedIndices}
              correctedIndices={correctedIndices}
              onWordClick={handleWordClick}
              className="h-full"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 border-l border-gray-200 flex flex-col bg-white">
          {/* Confidence Threshold Control */}
          <div className="p-4 border-b border-gray-200">
            <ConfidenceThresholdControl
              threshold={confidenceThreshold}
              onChange={setConfidenceThreshold}
              totalWords={words.length}
              flaggedCount={flaggedWords.length}
            />
          </div>

          {/* Review Progress */}
          <div className="p-4 border-b border-gray-200">
            <ReviewProgress
              total={progress.total}
              reviewed={progress.reviewed}
              corrected={corrections.size}
              showDetails={true}
            />
          </div>

          {/* Low Confidence Panel */}
          <LowConfidencePanel
            allWords={words}
            confidenceThreshold={confidenceThreshold}
            onWordSelect={(word) => handleSeek(Math.max(0, word.start - 2))}
            onWordCorrect={handleCorrect}
            reviewedWords={reviewedIndices}
            onMarkReviewed={handleMarkReviewed}
          />
        </div>
      </div>
    </div>
  );
}

export default ReviewClient;

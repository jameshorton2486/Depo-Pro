'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WaveformPlayer } from '@/components/audio/waveform-player';
import { SyncedTranscriptViewer, TranscriptSegment, TranscriptWord } from '@/components/transcripts/synced-transcript-viewer';
import { LowConfidencePanel } from '@/components/transcripts/low-confidence-panel';
import { TranscriptSkeleton } from '@/components/transcripts/transcript-skeleton';
import { toast } from 'sonner';

interface ReviewClientNewProps {
  jobId: string;
  transcriptionId: string;
  audioUrl: string;
  segments: TranscriptSegment[];
  caseName: string;
  deponentName?: string;
}

export function ReviewClientNew({
  jobId,
  transcriptionId,
  audioUrl,
  segments,
  caseName,
  deponentName,
}: ReviewClientNewProps) {
  const router = useRouter();
  
  // State
  const [currentTime, setCurrentTime] = useState(0);
  const [reviewedWords, setReviewedWords] = useState<Set<number>>(new Set());
  const [corrections, setCorrections] = useState<Map<number, string>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Flatten all words from segments for LowConfidencePanel
  const allWords = segments.flatMap(s => s.words);

  // Load saved review progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem(`review-progress-${jobId}`);
    if (savedProgress) {
      try {
        const { reviewed, corrections: savedCorrections } = JSON.parse(savedProgress);
        setReviewedWords(new Set(reviewed));
        setCorrections(new Map(savedCorrections));
      } catch (err) {
        console.error('Failed to load saved progress:', err);
      }
    }
  }, [jobId]);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (reviewedWords.size > 0 || corrections.size > 0) {
        localStorage.setItem(`review-progress-${jobId}`, JSON.stringify({
          reviewed: Array.from(reviewedWords),
          corrections: Array.from(corrections.entries()),
        }));
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [jobId, reviewedWords, corrections]);

  // Handle word click - seek audio to 2 seconds before word
  const handleWordClick = useCallback((word: TranscriptWord) => {
    const seekTime = Math.max(0, word.start - 2);
    if (typeof window !== 'undefined' && (window as any).depoProSeekTo) {
      (window as any).depoProSeekTo(seekTime);
    }
  }, []);

  // Handle word correction
  const handleWordCorrect = useCallback((wordIndex: number, correction: string) => {
    setCorrections(prev => new Map(prev).set(wordIndex, correction));
    setReviewedWords(prev => new Set(prev).add(wordIndex));
  }, []);

  // Mark word as reviewed (no correction needed)
  const handleMarkReviewed = useCallback((wordIndex: number) => {
    setReviewedWords(prev => new Set(prev).add(wordIndex));
  }, []);

  // Save progress to server
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/transcripts/${transcriptionId}/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corrections: Array.from(corrections.entries()), // [wordIndex, correction] pairs
          reviewedWordIndices: Array.from(reviewedWords),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save');
      }
      
      setLastSaved(new Date());
      
      // Clear localStorage on successful server save
      localStorage.removeItem(`review-progress-${jobId}`);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save. Your progress is saved locally.');
    } finally {
      setIsSaving(false);
    }
  };

  // Complete review
  const handleCompleteReview = async () => {
    // Use toast confirm instead of browser confirm
    toast.loading('Completing review...', { id: 'complete-review' });
    
    await handleSave();
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SCOPIST_COMPLETE' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete review');
      }
      
      toast.success('Review completed', {
        id: 'complete-review',
        description: 'Transcript review has been finalized.',
      });
      
      setTimeout(() => {
        router.push(`/jobs/${jobId}`);
      }, 1000);
    } catch (err) {
      console.error('Complete failed:', err);
      toast.error('Failed to complete review', {
        id: 'complete-review',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  // Calculate stats
  const confidenceThreshold = 0.85;
  const lowConfidenceWords = allWords.filter(w => w.confidence < confidenceThreshold);

  // Show loading state if segments are empty
  const isLoading = segments.length === 0;

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="p-4">
          <TranscriptSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{caseName}</h1>
            <p className="text-sm text-muted-foreground">
              {deponentName || 'Review Mode'}
              {lastSaved && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Progress'}
          </button>
          <button
            onClick={handleCompleteReview}
            disabled={isSaving}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            Complete Review
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-4 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground flex gap-4 shrink-0">
        <span>Total Words: {allWords.length.toLocaleString()}</span>
        <span>Low Confidence: {lowConfidenceWords.length}</span>
        <span>Reviewed: {reviewedWords.size}</span>
        <span>Corrections: {corrections.size}</span>
      </div>

      {/* Audio Player */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        {audioUrl ? (
          <WaveformPlayer
            audioUrl={audioUrl}
            onTimeUpdate={setCurrentTime}
          />
        ) : (
          <div className="h-20 flex items-center justify-center text-muted-foreground bg-muted rounded-lg">
            No audio file available
          </div>
        )}
      </div>

      {/* Main Content: Transcript + Review Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript (2/3 width) */}
        <div className="w-2/3 border-r border-border overflow-hidden">
          <SyncedTranscriptViewer
            segments={segments}
            currentTime={currentTime}
            onWordClick={handleWordClick}
            confidenceThreshold={confidenceThreshold}
            highlightLowConfidence={true}
          />
        </div>

        {/* Review Panel (1/3 width) */}
        <div className="w-1/3 overflow-hidden bg-card">
          <LowConfidencePanel
            allWords={allWords}
            confidenceThreshold={confidenceThreshold}
            onWordSelect={handleWordClick}
            onWordCorrect={handleWordCorrect}
            reviewedWords={reviewedWords}
            onMarkReviewed={handleMarkReviewed}
          />
        </div>
      </div>
    </div>
  );
}

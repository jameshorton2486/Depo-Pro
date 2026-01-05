'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WaveformPlayer } from '@/components/audio/waveform-player';
import { SyncedTranscriptViewer, TranscriptSegment, TranscriptWord } from '@/components/transcripts/synced-transcript-viewer';
import { LowConfidencePanel } from '@/components/transcripts/low-confidence-panel';
import { TranscriptSkeleton } from '@/components/transcripts/transcript-skeleton';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

  // NEW STATE
  const [isLoading, setIsLoading] = useState(true);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Flatten all words from segments for LowConfidencePanel
  const allWords = segments.flatMap(s => s.words);

  // Load saved review progress from server
  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);
      try {
        // First try server
        const response = await fetch(`/api/transcripts/${transcriptionId}/corrections`);
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setReviewedWords(new Set(data.reviewedIndices || []));
            setCorrections(new Map(Object.entries(data.corrections || {}).map(
              ([k, v]) => [parseInt(k), v as string]
            )));
            setServerUpdatedAt(data.updatedAt);
            toast.success('Resuming saved session', {
              description: `Last saved ${new Date(data.updatedAt).toLocaleString()}`,
            });
          }
        }
        
        // Fallback to localStorage if no server session
        const savedProgress = localStorage.getItem(`review-progress-${jobId}`);
        if (savedProgress && reviewedWords.size === 0) {
          try {
            const { reviewed, corrections: savedCorrections } = JSON.parse(savedProgress);
            setReviewedWords(new Set(reviewed));
            setCorrections(new Map(savedCorrections));
          } catch (_err) {
            console.error('Failed to load localStorage progress:', _err);
          }
        }
      } catch (_err) {
        console.error('Failed to load session:', _err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSession();
  }, [transcriptionId, jobId]);

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

  // Save progress to server with optimistic locking
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/transcripts/${transcriptionId}/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corrections: Array.from(corrections.entries()),
          reviewedWordIndices: Array.from(reviewedWords),
          expectedUpdatedAt: serverUpdatedAt,
        }),
      });
      
      if (response.status === 409) {
        // Conflict detected
        const data = await response.json();
        setServerUpdatedAt(data.serverUpdatedAt);
        setShowConflictDialog(true);
        return false;
      }
      
      if (!response.ok) {
        throw new Error('Failed to save');
      }
      
      const data = await response.json();
      setLastSaved(new Date());
      setServerUpdatedAt(data.updatedAt);
      
      // Clear localStorage on successful server save
      localStorage.removeItem(`review-progress-${jobId}`);
      
      toast.success('Progress saved');
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save', {
        description: 'Your progress is saved locally. Try again.',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Open completion confirmation dialog
  const handleCompleteReviewClick = () => {
    setShowCompleteDialog(true);
  };

  // Actually complete the review
  const handleConfirmComplete = async () => {
    setShowCompleteDialog(false);
    
    // Save first
    const saveSuccess = await handleSave();
    if (!saveSuccess) return;
    
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
        description: 'Transcript review has been finalized.',
      });
      
      setTimeout(() => {
        router.push(`/jobs/${jobId}`);
      }, 1000);
    } catch (err) {
      console.error('Complete failed:', err);
      toast.error('Failed to complete review', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  // Handle export from review page
  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    setIsExporting(true);
    try {
      // Save current progress first
      await handleSave();
      
      const response = await fetch(
        `/api/transcripts/${transcriptionId}/export?format=${format}`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `transcript.${format}`;
      
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Export complete', {
        description: `Downloaded ${filename}`,
      });
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed', {
        description: 'Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate stats
  const confidenceThreshold = 0.85;
  const lowConfidenceWords = allWords.filter(w => w.confidence < confidenceThreshold);

  // Show loading state if segments are empty OR session is loading
  if (isLoading || segments.length === 0) {
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
        
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={isSaving || isExporting}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {isExporting ? 'Exporting...' : 'Export'} ▼
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => handleExport('docx')}
                disabled={isExporting}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors rounded-t-lg"
              >
                Word (.docx)
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              >
                PDF (.pdf)
              </button>
              <button
                onClick={() => handleExport('txt')}
                disabled={isExporting}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors rounded-b-lg"
              >
                Text (.txt)
              </button>
            </div>
          </div>
          
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Progress'}
          </button>
          
          {/* Complete Button */}
          <button
            onClick={handleCompleteReviewClick}
            disabled={isSaving || isExporting}
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

      {/* Completion Confirmation Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Review?</DialogTitle>
            <DialogDescription>
              You are about to mark this transcript review as complete.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total flagged words:</span>
              <span className="font-medium">{lowConfidenceWords.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Words reviewed:</span>
              <span className="font-medium">{reviewedWords.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Corrections made:</span>
              <span className="font-medium">{corrections.size}</span>
            </div>
            {reviewedWords.size < lowConfidenceWords.length && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-xs">
                ⚠️ {lowConfidenceWords.length - reviewedWords.size} flagged words have not been reviewed.
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmComplete}>
              Complete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Detection Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conflict Detected</DialogTitle>
            <DialogDescription>
              This transcript was modified by another user while you were editing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 text-sm text-muted-foreground">
            Your changes could not be saved because the transcript has been updated.
            Please refresh the page to load the latest version.
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflictDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

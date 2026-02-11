'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WaveformPlayer, type WaveformPlayerRef } from '@/components/audio/waveform-player';
import type { TranscriptSegment, TranscriptWord } from '@/components/transcripts/synced-transcript-viewer';
import { SyncedTranscriptViewer } from '@/components/transcripts/synced-transcript-viewer';
import { LowConfidencePanel } from '@/components/transcripts/low-confidence-panel';
import { TranscriptSkeleton } from '@/components/transcripts/transcript-skeleton';
import { ExhibitTimelinePanel } from '@/components/transcripts/ExhibitTimelinePanel';
import type { FlaggedWordRow, FlaggedWordStats } from '@/types/transcription';
import type { JobExhibitRow } from '@/lib/supabase/queries/exhibits';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  initialFlaggedWords: FlaggedWordRow[];
  initialStats: FlaggedWordStats;
  lockInfo: { locked: boolean; lockedByMe: boolean; lockedByName?: string } | null;
  userId: string;
}

export function ReviewClientNew({
  jobId,
  transcriptionId,
  audioUrl,
  segments,
  caseName,
  deponentName,
  initialFlaggedWords,
  initialStats,
  lockInfo,
  userId: _userId,
}: ReviewClientNewProps) {
  const router = useRouter();
  const audioRef = useRef<WaveformPlayerRef>(null);

  // State
  const [currentTime, setCurrentTime] = useState(0);
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWordRow[]>(initialFlaggedWords);
  const [stats, setStats] = useState<FlaggedWordStats>(initialStats);
  const [isLocked, setIsLocked] = useState(lockInfo?.lockedByMe || false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Exhibits state
  const [exhibits, setExhibits] = useState<JobExhibitRow[]>([]);
  const [_isLoadingExhibits, setIsLoadingExhibits] = useState(false);
  const [activeTab, setActiveTab] = useState<'flagged' | 'exhibits'>('flagged');

  // Flatten all words from segments for transcript viewer
  const allWords = segments.flatMap(s => s.words);

  // Fetch exhibits on mount
  useEffect(() => {
    const fetchExhibits = async () => {
      setIsLoadingExhibits(true);
      try {
        const response = await fetch(`/api/jobs/${jobId}/exhibits`);
        if (response.ok) {
          const data = await response.json();
          setExhibits(data.exhibits || []);
        }
      } catch (error) {
        console.error('Failed to fetch exhibits:', error);
      } finally {
        setIsLoadingExhibits(false);
      }
    };

    fetchExhibits();
  }, [jobId]);

  // Refresh exhibits handler
  const handleRefreshExhibits = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/exhibits`);
      if (response.ok) {
        const data = await response.json();
        setExhibits(data.exhibits || []);
      }
    } catch (error) {
      console.error('Failed to refresh exhibits:', error);
    }
  }, [jobId]);

  // Handle exhibit mark added
  const handleAddExhibitMark = useCallback((_timestamp: number) => {
    toast.success('Exhibit marker created');
  }, []);

  // Lock acquisition on mount
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const acquireLock = async () => {
      if (lockInfo?.lockedByMe) {
        // Already have lock from server
        setIsLocked(true);
        setIsReadOnly(false);
        startHeartbeat();
        return;
      }

      setIsAcquiringLock(true);
      try {
        const response = await fetch(`/api/jobs/${jobId}/lock`, { method: 'POST' });
        const data = await response.json();

        if (data.locked) {
          setIsLocked(true);
          setIsReadOnly(false);
          startHeartbeat();
          toast.success('Lock acquired - you can now edit');
        } else {
          setIsLocked(false);
          setIsReadOnly(true);
          toast.info(
            `This transcript is being reviewed by ${data.heldBy?.name || 'another user'}. View-only mode.`
          );
        }
      } catch (error) {
        console.error('Failed to acquire lock:', error);
        setIsLocked(false);
        setIsReadOnly(true);
        toast.error('Failed to acquire lock - view-only mode');
      } finally {
        setIsAcquiringLock(false);
      }
    };

    const startHeartbeat = () => {
      // Heartbeat every 5 minutes to keep lock alive
      heartbeatInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/jobs/${jobId}/lock`, { method: 'PATCH' });

          if (!response.ok) {
            // Heartbeat failed - lock likely expired or was stolen
            console.error('Heartbeat failed with status:', response.status);

            // Stop the interval
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }

            // Update state
            setIsLocked(false);
            setIsReadOnly(true);

            // Notify user
            toast.error('Lock expired', {
              description: 'Your editing session has ended. Please refresh to continue.',
            });
          }
        } catch (error) {
          console.error('Heartbeat failed:', error);

          // Network error - stop heartbeat and notify user
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }

          setIsLocked(false);
          setIsReadOnly(true);

          toast.error('Connection lost', {
            description: 'Unable to maintain lock. Please check your connection and refresh.',
          });
        }
      }, 5 * 60 * 1000);
    };

    acquireLock();

    // Cleanup: release lock on unmount
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      // Always try to release lock on unmount
      // Use sendBeacon for reliability during page unload
      navigator.sendBeacon(`/api/jobs/${jobId}/lock?_method=DELETE`);
    };
  }, [jobId, lockInfo?.lockedByMe]);

  // Release lock on beforeunload (page close/refresh)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLocked) {
        navigator.sendBeacon(`/api/jobs/${jobId}/lock?_method=DELETE`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLocked, jobId]);

  // Audio seek via ref
  const handleSeekAudio = useCallback((timestamp: number) => {
    audioRef.current?.seekTo(Math.max(0, timestamp - 2)); // 2 seconds before for context
  }, []);

  // Handle word click from transcript viewer
  const handleWordClick = useCallback((word: TranscriptWord) => {
    handleSeekAudio(word.start);
  }, [handleSeekAudio]);

  // Correction handler - calls API and updates local state
  const handleCorrection = useCallback(async (
    wordId: string,
    action: 'correct' | 'confirm' | 'skip',
    correctedWord?: string
  ) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId, action, correctedWord }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save correction');
      }

      const { flaggedWord: updated, stats: newStats } = await response.json();

      // Optimistic update
      setFlaggedWords(prev => prev.map(w => w.id === wordId ? updated : w));
      setStats(newStats);

      toast.success(
        action === 'correct' ? `Corrected to "${correctedWord}"` :
        action === 'confirm' ? 'Confirmed as correct' :
        'Skipped'
      );
    } catch (error) {
      console.error('Correction failed:', error);
      toast.error('Failed to save. Please try again.');
      throw error; // Re-throw so component can handle
    }
  }, [jobId]);

  // Submit review handler
  const handleSubmitReview = useCallback(async () => {
    if (stats.pending > 0) {
      toast.warning(`${stats.pending} words still need review.`);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/review/submit`, { method: 'POST' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      toast.success('Review submitted!');

      // Release lock before redirect
      if (isLocked) {
        await fetch(`/api/jobs/${jobId}/lock`, { method: 'DELETE' });
      }

      setTimeout(() => {
        router.push(`/jobs/${jobId}`);
      }, 1000);
    } catch (error) {
      console.error('Submit failed:', error);
      toast.error('Failed to submit review', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }, [jobId, stats, isLocked, router]);

  // Handle export from review page
  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    setIsExporting(true);
    try {
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
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', {
        description: 'Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Show loading state if segments are empty or acquiring lock
  if (isAcquiringLock || segments.length === 0) {
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
              {isReadOnly && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30">
                  🔒 Read-only
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={isExporting}
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

          {/* Complete Button */}
          <button
            onClick={() => setShowCompleteDialog(true)}
            disabled={isReadOnly || isExporting || stats.pending > 0}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            Complete Review
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-4 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground flex gap-4 shrink-0">
        <span>Total Words: {allWords.length.toLocaleString()}</span>
        <span>Flagged: {stats.total}</span>
        <span>Pending: {stats.pending}</span>
        <span>Corrected: {stats.corrected}</span>
        <span>Confirmed: {stats.confirmed}</span>
        <span>Skipped: {stats.skipped}</span>
      </div>

      {/* Audio Player */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        {audioUrl ? (
          <WaveformPlayer
            ref={audioRef}
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
            confidenceThreshold={0.85}
            highlightLowConfidence={true}
          />
        </div>

        {/* Review Panel (1/3 width) - Tabbed */}
        <div className="w-1/3 overflow-hidden bg-card">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'flagged' | 'exhibits')} className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-2 shrink-0">
              <TabsTrigger value="flagged" className="text-xs">
                Flagged Words ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="exhibits" className="text-xs">
                Exhibits ({exhibits.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="flagged" className="flex-1 overflow-hidden m-0">
              <LowConfidencePanel
                flaggedWords={flaggedWords}
                stats={stats}
                currentAudioTime={currentTime}
                onSeekAudio={handleSeekAudio}
                onCorrection={handleCorrection}
                isReadOnly={isReadOnly}
                isLoading={false}
              />
            </TabsContent>
            <TabsContent value="exhibits" className="flex-1 overflow-hidden m-0">
              <ExhibitTimelinePanel
                jobId={jobId}
                exhibits={exhibits}
                currentAudioTime={currentTime}
                onSeekAudio={handleSeekAudio}
                onAddExhibitMark={handleAddExhibitMark}
                canEdit={!isReadOnly}
                onRefresh={handleRefreshExhibits}
              />
            </TabsContent>
          </Tabs>
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
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-medium">{stats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Corrected:</span>
              <span className="font-medium">{stats.corrected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confirmed:</span>
              <span className="font-medium">{stats.confirmed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Skipped:</span>
              <span className="font-medium">{stats.skipped}</span>
            </div>
            {stats.pending > 0 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-xs">
                ⚠️ {stats.pending} words still need review. You cannot complete until all are reviewed.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={stats.pending > 0}>
              Complete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

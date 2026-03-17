'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useReviewSession } from '@/hooks/use-review-session';
import { WaveformPlayer, type WaveformPlayerRef } from '@/components/audio/waveform-player';
import type { TranscriptSegment, TranscriptWord } from '@/components/transcripts/synced-transcript-viewer';
import { SyncedTranscriptViewer } from '@/components/transcripts/synced-transcript-viewer';
import { LowConfidencePanel } from '@/components/transcripts/low-confidence-panel';
import { TranscriptSkeleton } from '@/components/transcripts/transcript-skeleton';
import { ExhibitTimelinePanel } from '@/components/transcripts/ExhibitTimelinePanel';
import { ConfidenceAnalyticsPanel } from '@/components/transcripts/confidence-analytics-panel';
import type { FlaggedWordRow, FlaggedWordStats } from '@/types/transcription';
import type { JobExhibitRow } from '@/lib/supabase/queries/exhibits';
import type { ConfidenceAnalytics, RiskScoreResult } from '@/types/analytics';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchWithRetry } from '@/lib/client/fetch-with-retry';
import { ConnectionStatus } from '@/components/review/connection-status';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { canExportFormat } from '@/lib/export/permissions';
import type { UserRole } from '@/lib/enums/roles';
import { CertificationPanel } from '@/components/transcript/CertificationPanel';
import { ChevronDown, Download, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  initialUpdatedAt: string | null;
  userId: string;
  userRole: UserRole;
  confidenceAnalytics?: ConfidenceAnalytics;
  riskScoreResult?: RiskScoreResult;
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
  initialUpdatedAt,
  userId: _userId,
  userRole,
  confidenceAnalytics,
  riskScoreResult,
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
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showCertifyDialog, setShowCertifyDialog] = useState(false);
  const [isCertified, setIsCertified] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatterMessage, setFormatterMessage] = useState<string | null>(null);
  const savesInFlightRef = useRef(0);
  const [latestUpdatedAt, setLatestUpdatedAt] = useState<string | null>(initialUpdatedAt);

  // Feature 3: Inline Confidence Heatmap toggle
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Feature 5: Review Session Duration Tracking
  const { metrics, trackWordReviewed, trackAudioReplay, trackFilterUsed } = useReviewSession({
    transcriptionId,
    jobId,
    userId: _userId,
    riskScore: riskScoreResult?.score,
    flaggedCount: stats.total,
  });

  // Exhibits state
  const [exhibits, setExhibits] = useState<JobExhibitRow[]>([]);
  const [_isLoadingExhibits, setIsLoadingExhibits] = useState(false);
  const [activeTab, setActiveTab] = useState<'flagged' | 'exhibits' | 'analytics'>('flagged');

  // Flatten all words from segments for transcript viewer
  const allWords = segments.flatMap(s => s.words);

  // Map global word index → corrected text for inline correction display in transcript
  const correctionsMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const fw of flaggedWords) {
      if (
        (fw.status === 'CORRECTED' || fw.status === 'CONFIRMED') &&
        fw.corrected_word &&
        typeof (fw as any).word_index === 'number'
      ) {
        map.set((fw as any).word_index, fw.corrected_word);
      }
    }
    return map;
  }, [flaggedWords]);

  // Session resume notification — show once on mount if work was already done
  useEffect(() => {
    const reviewed = initialStats.corrected + initialStats.confirmed + initialStats.skipped;
    if (reviewed > 0 && initialStats.pending > 0) {
      toast.info('Resuming review session', {
        description: `${reviewed} of ${initialStats.total} words already reviewed, ${initialStats.pending} remaining.`,
      });
    }
  }, []); // intentional: fire once on mount

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
    trackAudioReplay(); // Feature 5: Track audio replay
  }, [trackAudioReplay]);

  // Handle word click from transcript viewer
  const handleWordClick = useCallback((word: TranscriptWord) => {
    handleSeekAudio(word.start);
  }, [handleSeekAudio]);

  const refreshFlaggedWords = useCallback(async () => {
    const response = await fetchWithRetry(
      `/api/jobs/${jobId}/flagged-words?filter=all&sort=confidence`,
      { method: 'GET' },
      { maxRetries: 1, baseDelayMs: 500 },
    );

    if (!response.ok) {
      throw new Error('Failed to refresh flagged words');
    }

    const data = await response.json();
    setFlaggedWords(data.flaggedWords || []);
    if (data.stats) {
      setStats(data.stats);
    }
    if (data.updatedAt) {
      setLatestUpdatedAt(data.updatedAt);
    }
  }, [jobId]);

  // Correction handler - calls API and updates local state
  const handleCorrection = useCallback(async (
    wordId: string,
    action: 'correct' | 'confirm' | 'skip',
    correctedWord?: string
  ) => {
    savesInFlightRef.current++;
    try {
      const response = await fetchWithRetry(
        `/api/jobs/${jobId}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordId,
            action,
            correctedWord,
            expectedUpdatedAt: latestUpdatedAt,
          }),
        },
        { maxRetries: 2 }
      );

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 409) {
          if (errorData.serverUpdatedAt) {
            setLatestUpdatedAt(errorData.serverUpdatedAt);
          }
          await refreshFlaggedWords().catch((refreshError) => {
            console.error('Failed to refresh flagged words after conflict:', refreshError);
          });
          const conflictError = new Error('CONFLICT');
          (conflictError as Error & { code?: string }).code = 'CONFLICT';
          throw conflictError;
        }

        if (response.status === 423) {
          setIsLocked(false);
          setIsReadOnly(true);
          toast.error('Lock lost', {
            description: 'Another user is now reviewing this transcript. Switching to read-only.',
          });
          const lockError = new Error('LOCKED');
          (lockError as Error & { code?: string }).code = 'LOCKED';
          throw lockError;
        }

        throw new Error(errorData.error || 'Failed to save correction');
      }

      const { flaggedWord: updated, stats: newStats, updatedAt } = await response.json();

      // Optimistic update
      setFlaggedWords(prev => prev.map(w => w.id === wordId ? updated : w));
      setStats(newStats);
      if (updatedAt) {
        setLatestUpdatedAt(updatedAt);
      }

      // Feature 5: Track word review
      trackWordReviewed(action === 'correct');

      toast.success(
        action === 'correct' ? `Corrected to "${correctedWord}"` :
        action === 'confirm' ? 'Confirmed as correct' :
        'Skipped'
      );
    } catch (error) {
      console.error('Correction failed:', error);
      toast.error('Failed to save. Please try again.');
      throw error; // Re-throw so component can handle
    } finally {
      savesInFlightRef.current--;
    }
  }, [jobId, latestUpdatedAt, trackWordReviewed]);

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
    setExportError(null);
    if (savesInFlightRef.current > 0) {
      toast.info('Saving changes...', {
        description: 'Export will begin once save completes.',
      });

      const start = Date.now();
      while (savesInFlightRef.current > 0 && Date.now() - start < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (savesInFlightRef.current > 0) {
        toast.error('Save is taking too long. Please try exporting again.');
        return;
      }
    }

    setIsExporting(true);
    try {
      const response = await fetchWithRetry(
        `/api/transcripts/${transcriptionId}/export?format=${format}`,
        { method: 'GET' },
        { maxRetries: 1, baseDelayMs: 1000 }
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
      setExportError('Export failed. Please try again.');
      toast.error('Export failed', {
        description: 'Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRunFormatter = useCallback(async () => {
    setIsFormatting(true);
    setFormatterMessage(null);

    try {
      const response = await fetch(`/api/transcriptions/${transcriptionId}/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jurisdiction: 'TX', dryRun: false }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Formatter run failed');
      }

      const summary = `${data.paragraphCount} paragraphs • ${data.pageCount} pages`;
      setFormatterMessage(summary);
      toast.success('Formatter completed', {
        description: summary,
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Formatter run failed';
      setFormatterMessage(message);
      toast.error('Formatter failed', { description: message });
    } finally {
      setIsFormatting(false);
    }
  }, [router, transcriptionId]);

  const exportFormats = [
    { format: 'docx' as const, label: 'Word (.docx)' },
    { format: 'pdf' as const, label: 'PDF (.pdf)' },
    { format: 'txt' as const, label: 'ASCII/TXT (.txt)' },
  ].filter(({ format }) => canExportFormat(userRole, format));

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
    <>
      <ConnectionStatus pingIntervalMs={30000} />
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
          {(userRole === 'ADMIN' || userRole === 'COURT_REPORTER' || userRole === 'REPORTER') && (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="secondary"
                onClick={() => void handleRunFormatter()}
                disabled={isFormatting}
                className="gap-2"
              >
                {isFormatting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isFormatting ? 'Running Formatter...' : 'Run Formatter'}
              </Button>
              {formatterMessage ? (
                <p className="text-xs text-muted-foreground" role="status">
                  {formatterMessage}
                </p>
              ) : null}
            </div>
          )}

          {/* Feature 3: Confidence Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
              showHeatmap
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
            )}
            title="Toggle confidence heatmap - colors words by AI confidence"
          >
            <span className="text-xs">🎨</span>
            Heatmap {showHeatmap ? 'ON' : 'OFF'}
          </button>

          <div className="flex flex-col items-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  disabled={isExporting || exportFormats.length === 0}
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {exportFormats.map(({ format, label }) => (
                  <DropdownMenuItem
                    key={format}
                    onClick={() => void handleExport(format)}
                    disabled={isExporting}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {exportError && (
              <p className="text-xs text-red-400" role="status">
                {exportError}
              </p>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowShortcutsDialog(true)}
                  className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm transition-colors"
                  aria-label="Keyboard shortcuts"
                >
                  ?
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Keyboard shortcuts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Certify & Export — reporter/admin only */}
          {(userRole === 'ADMIN' || userRole === 'REPORTER' || userRole === 'COURT_REPORTER' || userRole === 'SUPER_ADMIN') && (
          <>
          {isCertified ? (
            <button
              onClick={() => handleExport('docx')}
              disabled={isExporting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {isExporting ? 'Downloading...' : 'Download Export'}
            </button>
          ) : (
            <button
              onClick={() => setShowCertifyDialog(true)}
              disabled={isReadOnly || isExporting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              Certify & Export
            </button>
          )}
          </>
          )}

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
        {/* Feature 5: Session tracking display */}
        <span className="ml-auto text-slate-500">
          ⏱ Active: {Math.floor(metrics.activeDuration / 60)}m {metrics.activeDuration % 60}s
        </span>
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
          <ErrorBoundary
            pageName="transcript-viewer"
            fallback={
              <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">Transcript viewer encountered an error</p>
                  <p className="text-sm mb-4">Your corrections are saved. Refresh to continue.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            }
          >
            <SyncedTranscriptViewer
              segments={segments}
              currentTime={currentTime}
              onWordClick={handleWordClick}
              confidenceThreshold={0.85}
              highlightLowConfidence={true}
              showHeatmap={showHeatmap}
              corrections={correctionsMap}
            />
          </ErrorBoundary>
        </div>

        {/* Review Panel (1/3 width) - Tabbed */}
        <div className="w-1/3 overflow-hidden bg-card">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'flagged' | 'exhibits' | 'analytics')} className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-3 shrink-0">
              <TabsTrigger value="flagged" className="text-xs">
                Flagged ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="exhibits" className="text-xs">
                Exhibits ({exhibits.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">
                Analytics
              </TabsTrigger>
            </TabsList>
            <TabsContent value="flagged" className="flex-1 overflow-hidden m-0">
              <ErrorBoundary
                pageName="flagged-words-panel"
                fallback={
                  <div className="flex items-center justify-center p-8 text-muted-foreground h-full">
                    <div className="text-center">
                      <p className="text-lg font-medium mb-2">Flagged words panel error</p>
                      <p className="text-sm mb-4">Corrections saved so far are safe.</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                }
              >
                <LowConfidencePanel
                  flaggedWords={flaggedWords}
                  stats={stats}
                  currentAudioTime={currentTime}
                  onSeekAudio={handleSeekAudio}
                  onCorrection={handleCorrection}
                  isReadOnly={isReadOnly}
                  isLoading={false}
                  onFilterUsed={trackFilterUsed}
                />
              </ErrorBoundary>
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
            <TabsContent value="analytics" className="flex-1 overflow-hidden m-0">
              <ConfidenceAnalyticsPanel
                analytics={confidenceAnalytics}
                riskScore={riskScoreResult}
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

      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Review faster with these shortcuts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Up/Down</span><span className="text-muted-foreground">Navigate flagged words</span></div>
            <div className="flex justify-between"><span>Space</span><span className="text-muted-foreground">Play audio at word</span></div>
            <div className="flex justify-between"><span>Enter</span><span className="text-muted-foreground">Edit word</span></div>
            <div className="flex justify-between"><span>C</span><span className="text-muted-foreground">Confirm word</span></div>
            <div className="flex justify-between"><span>S</span><span className="text-muted-foreground">Skip word</span></div>
            <div className="flex justify-between"><span>Escape</span><span className="text-muted-foreground">Close / deselect</span></div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShortcutsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certification Dialog */}
      <Dialog open={showCertifyDialog} onOpenChange={setShowCertifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certify Transcript</DialogTitle>
            <DialogDescription>
              Complete pre-flight checks and certify this transcript for export.
            </DialogDescription>
          </DialogHeader>
          <CertificationPanel
            transcriptId={transcriptionId}
            onCertified={() => {
              setIsCertified(true);
              setShowCertifyDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

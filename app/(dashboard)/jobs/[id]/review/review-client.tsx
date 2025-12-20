// app/(dashboard)/jobs/[id]/review/review-client.tsx
'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle, FileText } from 'lucide-react';
import { AudioPlayer, AudioPlayerRef } from '@/components/transcripts/audio-player';
import { SyncedTranscript } from '@/components/transcripts/synced-transcript';
import { LowConfidenceReview } from '@/components/transcripts/low-confidence-review';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FlaggedWord, TranscriptUtterance, TranscriptWord } from '@/types/transcript';

interface ReviewPageClientProps {
  job: {
    id: string;
    title: string;
    caseName: string;
    caseNumber?: string;
    depositionDate: Date;
    status: string;
  };
  transcription: {
    id: string;
    fullTranscript: string;
    words: any[];
    utterances: TranscriptUtterance[];
    flaggedSegments: FlaggedWord[];
    speakerAnalysis: any;
    duration: number;
    wordCount: number;
    flaggedWordCount: number;
    averageConfidence: number;
  };
  audioFile: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
  };
  user: {
    id: string;
    role: string;
    isOwner: boolean;
    isAssignedScopist: boolean;
  };
}

export function ReviewPageClient({
  job,
  transcription,
  audioFile,
  user,
}: ReviewPageClientProps) {
  const router = useRouter();
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWord[]>(transcription.flaggedSegments);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<Map<string, { correctedWord?: string; isReviewed?: boolean }>>(new Map());
  const [reviewProgress, setReviewProgress] = useState(() => {
    const reviewed = flaggedWords.filter(w => w.isReviewed).length;
    return {
      total: flaggedWords.length,
      reviewed,
      percentage: flaggedWords.length > 0 ? Math.round((reviewed / flaggedWords.length) * 100) : 0,
    };
  });

  // Convert words to format expected by SyncedTranscript
  const transcriptWords: TranscriptWord[] = transcription.words.map((w: any) => ({
    word: w.word || w.punctuated_word || '',
    start: w.start || w.startTime || 0,
    end: w.end || w.endTime || 0,
    confidence: w.confidence || 1,
    speaker: w.speaker,
    punctuated_word: w.punctuated_word || w.word,
  }));

  // Keyboard shortcuts (must ignore input/textarea/contentEditable)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      // Only handle if audio player ref is available
      if (!audioPlayerRef.current) return;

      switch (e.key) {
        case ' ': // Spacebar - play/pause
          e.preventDefault();
          audioPlayerRef.current.toggle();
          break;
        case 'ArrowLeft': // Rewind 5 seconds
          e.preventDefault();
          const currentTime = audioPlayerRef.current.getCurrentTime();
          audioPlayerRef.current.seekTo(Math.max(0, currentTime - 5));
          break;
        case 'ArrowRight': // Skip forward 5 seconds
          e.preventDefault();
          const currentTime2 = audioPlayerRef.current.getCurrentTime();
          const duration = audioPlayerRef.current.getDuration();
          audioPlayerRef.current.seekTo(Math.min(duration, currentTime2 + 5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle audio time updates
  const handleAudioTimeUpdate = useCallback((time: number) => {
    setCurrentAudioTime(time);
  }, []);

  // Handle seeking audio from flagged word (with 1.5s pre-roll)
  const handleSeekAudio = useCallback((timestamp: number) => {
    const seekTime = Math.max(0, timestamp - 1.5);
    audioPlayerRef.current?.seekTo(seekTime);
    audioPlayerRef.current?.play();
  }, []);

  // Handle word click in transcript
  const handleWordClick = useCallback((index: number, startTime: number) => {
    handleSeekAudio(startTime);
  }, [handleSeekAudio]);

  // Handle word update (stores in pending edits, doesn't save yet)
  const handleWordUpdate = useCallback(async (wordId: string, correctedWord: string) => {
    setPendingEdits(prev => {
      const updated = new Map(prev);
      const existing = updated.get(wordId) || {};
      updated.set(wordId, { ...existing, correctedWord });
      return updated;
    });

    // Update local state immediately for UI feedback
    setFlaggedWords(prev => 
      prev.map(w => w.id === wordId ? { ...w, correctedWord } : w)
    );
  }, []);

  // Handle mark as reviewed (stores in pending edits, doesn't save yet)
  const handleMarkReviewed = useCallback(async (wordId: string, reviewed: boolean) => {
    setPendingEdits(prev => {
      const updated = new Map(prev);
      const existing = updated.get(wordId) || {};
      updated.set(wordId, { ...existing, isReviewed: reviewed });
      return updated;
    });

    // Update local state immediately for UI feedback
    setFlaggedWords(prev => 
      prev.map(w => w.id === wordId ? { ...w, isReviewed: reviewed } : w)
    );

    // Update progress
    setReviewProgress(prev => ({
      total: prev.total,
      reviewed: reviewed ? prev.reviewed + 1 : prev.reviewed - 1,
      percentage: prev.total > 0 
        ? Math.round(((reviewed ? prev.reviewed + 1 : prev.reviewed - 1) / prev.total) * 100)
        : 0,
    }));
  }, []);

  // Handle save edits (saves all pending edits)
  const handleSaveEdits = useCallback(async () => {
    if (pendingEdits.size === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      // Convert pending edits to array format
      const updates = Array.from(pendingEdits.entries()).map(([wordId, edits]) => ({
        wordId,
        ...edits,
      }));

      const response = await fetch(`/api/transcripts/${transcription.id}/words`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to save edits');
      }

      const data = await response.json();

      // Clear pending edits
      setPendingEdits(new Map());

      // Update local state with server response
      if (data.words) {
        setFlaggedWords(prev => {
          const updated = [...prev];
          data.words.forEach((updatedWord: FlaggedWord) => {
            const index = updated.findIndex(w => w.id === updatedWord.id);
            if (index !== -1) {
              updated[index] = updatedWord;
            }
          });
          return updated;
        });
      }

      toast.success(`Saved ${updates.length} edit(s)`);
    } catch (error) {
      console.error('Error saving edits:', error);
      toast.error('Failed to save edits');
    } finally {
      setIsSaving(false);
    }
  }, [transcription.id, pendingEdits]);

  // Handle complete review (saves edits first, then updates job status)
  const handleCompleteReview = useCallback(async () => {
    // Save any pending edits first
    if (pendingEdits.size > 0) {
      await handleSaveEdits();
    }

    if (reviewProgress.reviewed < reviewProgress.total) {
      const confirm = window.confirm(
        `You have reviewed ${reviewProgress.reviewed} out of ${reviewProgress.total} flagged words. ` +
        `Are you sure you want to complete the review?`
      );
      if (!confirm) return;
    }

    setIsSaving(true);
    try {
      // Update job status
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: user.isAssignedScopist ? 'SUBMITTED_FOR_REVIEW' : 'IN_REVIEW' 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update job status');
      }

      toast.success('Review completed successfully!');
      router.push(`/jobs/${job.id}`);
    } catch (error) {
      console.error('Error completing review:', error);
      toast.error('Failed to complete review');
    } finally {
      setIsSaving(false);
    }
  }, [job.id, reviewProgress, router, user.isAssignedScopist, pendingEdits, handleSaveEdits]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/jobs/${job.id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Job
            </Button>
            
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Review Transcript
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {job.caseName} {job.caseNumber && `• ${job.caseNumber}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Review Progress */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div className="text-sm">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {reviewProgress.reviewed} / {reviewProgress.total}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {reviewProgress.percentage}% reviewed
                </div>
              </div>
            </div>

            {/* Save Button */}
            {pendingEdits.size > 0 && (
              <Button
                onClick={handleSaveEdits}
                disabled={isSaving}
                variant="outline"
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save ({pendingEdits.size})
              </Button>
            )}

            {/* Complete Review Button */}
            <Button
              onClick={handleCompleteReview}
              disabled={isSaving}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Complete
            </Button>

            {/* View Full Transcript */}
            <Button
              variant="outline"
              onClick={() => router.push(`/jobs/${job.id}/transcript`)}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              View Full Transcript
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Audio Player at Top */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <AudioPlayer
            ref={audioPlayerRef}
            src={audioFile.fileUrl}
            onTimeUpdate={handleAudioTimeUpdate}
            className="w-full"
          />
        </div>

        {/* Split View - Transcript and Review */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Synced Transcript */}
          <div className="w-1/2 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Transcript
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <SyncedTranscript
                words={transcriptWords}
                currentTime={currentAudioTime}
                onWordClick={handleWordClick}
                lowConfidenceThreshold={0.85}
                className="prose prose-slate dark:prose-invert max-w-none"
              />
            </div>
          </div>

          {/* Right Side - Low Confidence Word Review */}
          <div className="flex-1 bg-white dark:bg-slate-800 overflow-hidden">
          <LowConfidenceReview
            flaggedWords={flaggedWords}
            onSeekAudio={handleSeekAudio}
            onWordUpdate={handleWordUpdate}
            onMarkReviewed={handleMarkReviewed}
            currentAudioTime={currentAudioTime}
            isLoading={isSaving}
          />
          </div>
        </div>
      </div>
    </div>
  );
}

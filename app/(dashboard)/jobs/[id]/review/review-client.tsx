// app/(dashboard)/jobs/[id]/review/review-client.tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle, FileText } from 'lucide-react';
import { AudioPlayer, AudioPlayerRef } from '@/components/transcripts/audio-player';
import { LowConfidenceReview } from '@/components/transcripts/low-confidence-review';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FlaggedWord, TranscriptUtterance } from '@/types/transcript';

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
  const [reviewProgress, setReviewProgress] = useState(() => {
    const reviewed = flaggedWords.filter(w => w.isReviewed).length;
    return {
      total: flaggedWords.length,
      reviewed,
      percentage: flaggedWords.length > 0 ? Math.round((reviewed / flaggedWords.length) * 100) : 0,
    };
  });

  // Handle audio time updates
  const handleAudioTimeUpdate = useCallback((time: number) => {
    setCurrentAudioTime(time);
  }, []);

  // Handle seeking audio from flagged word
  const handleSeekAudio = useCallback((timestamp: number) => {
    audioPlayerRef.current?.seekTo(timestamp);
    audioPlayerRef.current?.play();
  }, []);

  // Handle word update
  const handleWordUpdate = useCallback(async (wordId: string, correctedWord: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/transcripts/${transcription.id}/words`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId, correctedWord }),
      });

      if (!response.ok) {
        throw new Error('Failed to update word');
      }

      const data = await response.json();

      // Update local state
      setFlaggedWords(prev => 
        prev.map(w => w.id === wordId ? data.word : w)
      );

      toast.success('Word updated successfully');
    } catch (error) {
      console.error('Error updating word:', error);
      toast.error('Failed to update word');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [transcription.id]);

  // Handle mark as reviewed
  const handleMarkReviewed = useCallback(async (wordId: string, reviewed: boolean) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/transcripts/${transcription.id}/words`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId, isReviewed: reviewed }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark word as reviewed');
      }

      const data = await response.json();

      // Update local state
      setFlaggedWords(prev => 
        prev.map(w => w.id === wordId ? data.word : w)
      );

      // Update progress
      setReviewProgress(prev => ({
        total: prev.total,
        reviewed: reviewed ? prev.reviewed + 1 : prev.reviewed - 1,
        percentage: prev.total > 0 
          ? Math.round(((reviewed ? prev.reviewed + 1 : prev.reviewed - 1) / prev.total) * 100)
          : 0,
      }));

      toast.success(reviewed ? 'Marked as reviewed' : 'Unmarked');
    } catch (error) {
      console.error('Error marking word as reviewed:', error);
      toast.error('Failed to update review status');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [transcription.id]);

  // Handle complete review
  const handleCompleteReview = useCallback(async () => {
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
      const response = await fetch(`/api/jobs/${job.id}`, {
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
  }, [job.id, reviewProgress, router, user.isAssignedScopist]);

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

            {/* Complete Review Button */}
            <Button
              onClick={handleCompleteReview}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Complete Review
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
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Audio Player & Transcript Info */}
        <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Audio Player */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Audio Player
              </h2>
              <AudioPlayer
                ref={audioPlayerRef}
                src={audioFile.fileUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                className="w-full"
              />
            </div>

            {/* Transcript Stats */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Transcript Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Duration</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {Math.floor(transcription.duration / 60)}:{String(Math.floor(transcription.duration % 60)).padStart(2, '0')}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Word Count</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {transcription.wordCount.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Flagged Words</div>
                  <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {transcription.flaggedWordCount}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Avg Confidence</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {Math.round(transcription.averageConfidence * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Speaker Info */}
            {transcription.speakerAnalysis?.guesses && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Detected Speakers
                </h3>
                <div className="space-y-2">
                  {transcription.speakerAnalysis.guesses.map((guess: any) => (
                    <div 
                      key={guess.speakerId}
                      className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Speaker {guess.speakerId}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {guess.suggestedType}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {Math.round(guess.confidence * 100)}% confidence
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
  );
}

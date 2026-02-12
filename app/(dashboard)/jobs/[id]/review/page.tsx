// Migrated from Prisma to Supabase queries — PASS 2A
// ═══════════════════════════════════════════════════════════════
// REVIEW PAGE - Server component for transcript review
// ═══════════════════════════════════════════════════════════════
// Access: Court reporters (own jobs) and assigned scopists
// Loads: Job data, transcription, audio file URL, saved session

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth-compat';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import { Role } from '@/lib/constants';
import type { TranscriptSegment } from '@/components/transcripts/synced-transcript-viewer';
import type { ConfidenceAnalytics, RiskScoreResult } from '@/types/analytics';
import { ReviewClientNew } from './review-client-new';

export const dynamic = 'force-dynamic';

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id: jobId } = await params;

  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // Fetch job with includes
  const job = await getJobById(supabase, jobId, {
    includeCreatedBy: true,
    includeFiles: true,
    includeAssignments: true,
    includeTranscripts: true,
  });

  // Check if job exists
  if (!job) {
    notFound();
  }

  // Check access: user must be the creator OR an assigned scopist OR admin
  const isCreator = job.reporter_id === session.user.id;
  const isAssignedScopist = (job.assignments || []).some((a: any) => a.scopist_id === session.user.id);
  const isAdmin = session.user.role === Role.ADMIN;

  if (!isCreator && !isAssignedScopist && !isAdmin) {
    redirect('/dashboard?error=unauthorized');
  }

  // Get transcription
  const transcription = await getTranscriptByJobId(supabase, jobId);

  if (!transcription) {
    redirect(`/jobs/${jobId}?error=no_transcription`);
  }

  // Get audio file URL from job files
  const audioFile = (job.files || []).find(
    (f: any) => f.type === 'AUDIO' || f.mime_type?.startsWith('audio/'),
  );

  if (!audioFile) {
    redirect(`/jobs/${jobId}?error=no_audio`);
  }

  // Parse transcript segments from transcription
  let segments: TranscriptSegment[] = [];
  try {
    // Try to get segments from utterances first
    if (transcription.utterances) {
      const utterances = Array.isArray(transcription.utterances)
        ? transcription.utterances
        : JSON.parse(transcription.utterances as string || '[]');

      segments = utterances.map((utt: any) => ({
        speaker: utt.speaker || 0,
        words: utt.words || [],
        start: utt.start || 0,
        end: utt.end || 0,
      }));
    } else if (transcription.words) {
      // Fallback: create segments from words grouped by speaker
      const words = Array.isArray(transcription.words)
        ? transcription.words
        : JSON.parse(transcription.words as string || '[]');

      // Group words by speaker to create segments
      const segmentsMap = new Map<number, any[]>();
      words.forEach((word: any) => {
        const speaker = word.speaker || 0;
        if (!segmentsMap.has(speaker)) {
          segmentsMap.set(speaker, []);
        }
        segmentsMap.get(speaker)!.push(word);
      });

      segments = Array.from(segmentsMap.entries()).map(([speaker, wordsArray]) => ({
        speaker,
        words: wordsArray,
        start: wordsArray[0]?.start || 0,
        end: wordsArray[wordsArray.length - 1]?.end || 0,
      }));
    }
  } catch (_error) {
    console.error('Error parsing transcription segments:', _error);
  }

  // Fetch flagged words for this transcription
  const { data: flaggedWords } = await supabase
    .from('flagged_words')
    .select('*')
    .eq('transcription_id', transcription.id)
    .order('timestamp', { ascending: true });

  // Calculate stats from flagged words
  const initialFlaggedWords = flaggedWords || [];
  const initialStats = {
    total: initialFlaggedWords.length,
    corrected: initialFlaggedWords.filter((w: any) => w.status === 'CORRECTED').length,
    skipped: initialFlaggedWords.filter((w: any) => w.status === 'SKIPPED').length,
    pending: initialFlaggedWords.filter((w: any) => w.status === 'PENDING').length,
    confirmed: initialFlaggedWords.filter((w: any) => w.is_confirmed === true).length,
  };

  // Check lock status
  const { data: lockData } = await supabase
    .from('transcription_locks')
    .select('*, locked_by:users(name)')
    .eq('transcription_id', transcription.id)
    .eq('is_active', true)
    .maybeSingle();

  const lockInfo = lockData
    ? {
        locked: true,
        lockedByMe: lockData.locked_by_id === session.user.id,
        lockedByName: lockData.locked_by?.name || 'Someone',
      }
    : { locked: false, lockedByMe: false };

  // Extract confidence analytics from transcription metadata (Feature Deep Dive Enhancement 1.2)
  const confidenceAnalytics = transcription.metadata?.confidence_analytics as ConfidenceAnalytics | undefined;
  const riskScoreResult = transcription.metadata?.risk_score_result as RiskScoreResult | undefined;

  return (
    <ReviewClientNew
      jobId={job.id}
      transcriptionId={transcription.id}
      audioUrl={audioFile.storage_url || audioFile.storageUrl}
      segments={segments}
      caseName={job.case_name || 'Untitled Case'}
      deponentName={job.deponent_name || undefined}
      initialFlaggedWords={initialFlaggedWords as any}
      initialStats={initialStats}
      lockInfo={lockInfo}
      userId={session.user.id}
      confidenceAnalytics={confidenceAnalytics}
      riskScoreResult={riskScoreResult}
    />
  );
}

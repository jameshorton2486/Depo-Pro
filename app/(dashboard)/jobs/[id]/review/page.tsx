// Migrated from Prisma to Supabase queries — PASS 2A
// ═══════════════════════════════════════════════════════════════
// REVIEW PAGE - Server component for transcript review
// ═══════════════════════════════════════════════════════════════
// Access: Court reporters (own jobs) and assigned scopists
// Loads: Job data, transcription, audio file URL, saved session

import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
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

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function normalizeSpeaker(speaker: unknown): number {
  if (typeof speaker === 'number' && Number.isFinite(speaker)) {
    return speaker;
  }

  if (typeof speaker === 'string') {
    const match = speaker.match(/\d+/);
    return match ? Number.parseInt(match[0], 10) : 0;
  }

  return 0;
}

function normalizeWord(raw: any): TranscriptSegment['words'][number] | null {
  const start = Number(raw?.start);
  const end = Number(raw?.end);
  const word = String(raw?.word ?? '').trim();

  if (!word || !Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }

  return {
    word,
    punctuated_word: raw?.punctuated_word ? String(raw.punctuated_word) : word,
    start,
    end,
    confidence: Number.isFinite(Number(raw?.confidence)) ? Number(raw.confidence) : 1,
    speaker: normalizeSpeaker(raw?.speaker),
  };
}

function buildSegmentsFromWords(words: TranscriptSegment['words'][number][]): TranscriptSegment[] {
  if (words.length === 0) {
    return [];
  }

  const sortedWords = [...words].sort((a, b) => a.start - b.start);
  const segments: TranscriptSegment[] = [];
  const maxGapSeconds = 2;
  let currentWords: TranscriptSegment['words'] = [];
  let currentSpeaker = sortedWords[0].speaker ?? 0;

  for (const word of sortedWords) {
    const wordSpeaker = word.speaker ?? 0;
    const previousWord = currentWords[currentWords.length - 1];
    const gap = previousWord ? word.start - previousWord.end : 0;
    const speakerChanged = wordSpeaker !== currentSpeaker;
    const shouldSplit = currentWords.length > 0 && (speakerChanged || gap > maxGapSeconds);

    if (shouldSplit) {
      segments.push({
        speaker: currentSpeaker,
        words: currentWords,
        start: currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
      });
      currentWords = [];
      currentSpeaker = wordSpeaker;
    }

    if (currentWords.length === 0) {
      currentSpeaker = wordSpeaker;
    }

    currentWords.push(word);
  }

  if (currentWords.length > 0) {
    segments.push({
      speaker: currentSpeaker,
      words: currentWords,
      start: currentWords[0].start,
      end: currentWords[currentWords.length - 1].end,
    });
  }

  return segments;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id: jobId } = await params;

  // Check authentication
  const currentUser = await getCurrentUser();
  if (!currentUser) {
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
  const isCreator = job.reporter_id === currentUser.id;
  const isAssignedScopist = (job.assignments || []).some((a: any) => a.scopist_id === currentUser.id);
  const isAdmin = currentUser.role === Role.ADMIN;

  if (!isCreator && !isAssignedScopist && !isAdmin) {
    redirect('/dashboard?error=unauthorized');
  }

  // Get transcription
  const transcription = await getTranscriptByJobId(supabase, jobId);

  if (!transcription) {
    redirect(`/jobs/${jobId}?error=no_transcription`);
  }

  // Get audio file URL from job_files table
  // Note: getJobById does not join job_files, so we query separately
  const { data: jobFiles } = await supabase
    .from('job_files')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  const audioFile = (jobFiles || []).find(
    (f: any) => f.type === 'AUDIO' || f.mime_type?.startsWith('audio/'),
  );

  if (!audioFile) {
    redirect(`/jobs/${jobId}?error=no_audio`);
  }

  // Parse transcript segments from transcription
  let segments: TranscriptSegment[] = [];
  try {
    // Normalize all possible payload shapes, then build chronological segments for the viewer.
    const words = parseJsonArray<any>(transcription.words)
      .map(normalizeWord)
      .filter((word): word is TranscriptSegment['words'][number] => word !== null);

    if (words.length > 0) {
      segments = buildSegmentsFromWords(words);
    } else {
      const utterances = parseJsonArray<any>(transcription.utterances);
      segments = utterances
        .map((utt: any) => {
          const uttWords = parseJsonArray<any>(utt?.words)
            .map(normalizeWord)
            .filter((word): word is TranscriptSegment['words'][number] => word !== null);

          if (uttWords.length === 0) {
            return null;
          }

          return {
            speaker: normalizeSpeaker(utt?.speaker),
            words: uttWords,
            start: Number.isFinite(Number(utt?.start)) ? Number(utt.start) : uttWords[0].start,
            end: Number.isFinite(Number(utt?.end)) ? Number(utt.end) : uttWords[uttWords.length - 1].end,
          } satisfies TranscriptSegment;
        })
        .filter((segment): segment is TranscriptSegment => segment !== null);
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

  // Check lock status (table may not exist yet — default to no lock on error)
  let lockInfo: { locked: boolean; lockedByMe: boolean; lockedByName?: string } = { locked: false, lockedByMe: false };
  try {
    const { data: lockData, error: lockError } = await supabase
      .from('transcription_locks')
      .select('locked_by_id, locked_by_name')
      .eq('transcription_id', transcription.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!lockError && lockData) {
      lockInfo = {
        locked: true,
        lockedByMe: lockData.locked_by_id === currentUser.id,
        lockedByName: lockData.locked_by_name || 'Someone',
      };
    }
  } catch {
    // Table doesn't exist yet — lock disabled
  }

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
      userId={currentUser.id}
      confidenceAnalytics={confidenceAnalytics}
      riskScoreResult={riskScoreResult}
    />
  );
}

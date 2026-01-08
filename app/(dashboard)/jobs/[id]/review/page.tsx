// ═══════════════════════════════════════════════════════════════
// REVIEW PAGE - Server component for transcript review
// ═══════════════════════════════════════════════════════════════
// Access: Court reporters (own jobs) and assigned scopists
// Loads: Job data, transcription, audio file URL, saved session

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth-compat';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';
import type { TranscriptSegment } from '@/components/transcripts/synced-transcript-viewer';
import { ReviewClientNew } from './review-client-new';

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

  // Fetch job with transcription and files
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      transcription: true,
      files: true,
      assignments: {
        where: {
          scopistId: session.user.id,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Check if job exists
  if (!job) {
    notFound();
  }

  // Check access: user must be the creator OR an assigned scopist OR admin
  const isCreator = job.createdById === session.user.id;
  const isAssignedScopist = job.assignments.length > 0;
  const isAdmin = session.user.role === Role.ADMIN;

  if (!isCreator && !isAssignedScopist && !isAdmin) {
    redirect('/dashboard?error=unauthorized');
  }

  // Check if transcription exists
  if (!job.transcription) {
    redirect(`/jobs/${jobId}?error=no_transcription`);
  }

  // Get audio file URL
  const audioFile = job.files.find(
    (f: any) => f.type === 'AUDIO' || f.mimeType?.startsWith('audio/'),
  );

  if (!audioFile) {
    redirect(`/jobs/${jobId}?error=no_audio`);
  }

  // Parse transcript segments from transcription
  let segments: TranscriptSegment[] = [];
  try {
    // Try to get segments from utterances first
    if (job.transcription.utterances) {
      const utterances = Array.isArray(job.transcription.utterances)
        ? job.transcription.utterances
        : JSON.parse(job.transcription.utterances as string || '[]');
      
      segments = utterances.map((utt: any) => ({
        speaker: utt.speaker || 0,
        words: utt.words || [],
        start: utt.start || 0,
        end: utt.end || 0,
      }));
    } else if (job.transcription.words) {
      // Fallback: create segments from words grouped by speaker
      const words = Array.isArray(job.transcription.words)
        ? job.transcription.words
        : JSON.parse(job.transcription.words as string || '[]');
      
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

  return (
    <ReviewClientNew
      jobId={job.id}
      transcriptionId={job.transcription.id}
      audioUrl={audioFile.storageUrl}
      segments={segments}
      caseName={job.caseName || 'Untitled Case'}
      deponentName={(job as any).deponentName || undefined}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// REVIEW PAGE - Server component for transcript review
// ═══════════════════════════════════════════════════════════════
// Access: Court reporters (own jobs) and assigned scopists
// Loads: Job data, transcription, audio file URL, saved session

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';
import { ReviewClient, DEFAULT_CONFIDENCE_THRESHOLD } from './review-client';
import { ReviewWord, ReviewSession } from '@/types/review';

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
    (f) => f.type === 'AUDIO' || f.mimeType?.startsWith('audio/'),
  );

  if (!audioFile) {
    redirect(`/jobs/${jobId}?error=no_audio`);
  }

  // Parse words from transcription
  let words: ReviewWord[] = [];
  try {
    const rawWords = job.transcription.words as any[];
    if (Array.isArray(rawWords)) {
      words = rawWords.map((w, index) => ({
        word: w.word || '',
        start: w.start || 0,
        end: w.end || 0,
        confidence: w.confidence || 0,
        speaker: w.speaker,
        index,
        reviewed: w.reviewed || false,
        correctedWord: w.correctedWord,
        originalWord: w.word,
        flagged: w.flagged || false,
        alternatives: w.alternatives,
      }));
    }
  } catch (error) {
    console.error('Error parsing transcription words:', error);
  }

  // Load saved session from flaggedSegments if exists
  let savedSession: ReviewSession | undefined;
  try {
    const flaggedSegments = job.transcription.flaggedSegments as any;
    if (flaggedSegments?.reviewSession) {
      savedSession = flaggedSegments.reviewSession as ReviewSession;
    }
  } catch (error) {
    console.error('Error loading saved session:', error);
  }

  // Use threshold from saved session, or fall back to default
  const threshold = savedSession?.confidenceThreshold || DEFAULT_CONFIDENCE_THRESHOLD;

  // Calculate flagged count for header display only
  const flaggedCount = words.filter((w) => w.confidence < threshold).length;

  // Determine review state for display
  const reviewState = savedSession?.reviewState || 'PENDING';
  const reviewStateLabels = {
    PENDING: { text: 'Not Started', color: 'bg-gray-100 text-gray-700' },
    IN_PROGRESS: { text: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    COMPLETED: { text: 'Completed', color: 'bg-green-100 text-green-700' },
  };
  const stateLabel = reviewStateLabels[reviewState];

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">
                {job.caseName || 'Untitled Case'}
              </h1>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${stateLabel.color}`}>
                {stateLabel.text}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              {job.caseNumber && <span>Case: {job.caseNumber}</span>}
              {job.depositionDate && (
                <span>
                  Date: {new Date(job.depositionDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium text-red-600">{flaggedCount}</span> words need review
          </div>
        </div>
      </header>

      {/* Main review interface */}
      <ReviewClient
        jobId={job.id}
        transcriptionId={job.transcription.id}
        audioUrl={audioFile.storageUrl}
        words={words}
        savedSession={savedSession}
      />
    </div>
  );
}

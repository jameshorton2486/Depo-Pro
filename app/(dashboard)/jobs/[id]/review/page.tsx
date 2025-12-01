// app/(dashboard)/jobs/[id]/review/page.tsx
// Scopist review page with split view: audio player + low-confidence word review

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { ReviewPageClient } from './review-client';

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const session = await auth();
  const { id: jobId } = await params;

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch job with transcription
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      files: {
        where: {
          type: 'AUDIO',
        },
      },
      transcription: true,
      assignments: {
        where: {
          scopistId: session.user.id,
        },
        include: {
          scopist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!job) {
    redirect('/dashboard');
  }

  // Check permissions
  const isOwner = job.createdById === session.user.id;
  const isAssignedScopist = job.assignments.length > 0;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isOwner && !isAssignedScopist && !isAdmin) {
    redirect('/dashboard');
  }

  // Check if transcription exists
  if (!job.transcription) {
    redirect(`/jobs/${jobId}`);
  }

  // Get audio file
  const audioFile = job.files[0];
  if (!audioFile) {
    redirect(`/jobs/${jobId}`);
  }

  return (
    <ReviewPageClient
      job={{
        id: job.id,
        title: job.title,
        caseName: job.caseName,
        caseNumber: job.caseNumber || undefined,
        depositionDate: job.depositionDate,
        status: job.status,
      }}
      transcription={{
        id: job.transcription.id,
        fullTranscript: job.transcription.fullTranscript || '',
        words: job.transcription.words ? JSON.parse(job.transcription.words as string) : [],
        utterances: job.transcription.utterances ? JSON.parse(job.transcription.utterances as string) : [],
        flaggedSegments: job.transcription.flaggedSegments ? JSON.parse(job.transcription.flaggedSegments as string) : [],
        speakerAnalysis: job.transcription.speakerAnalysis ? JSON.parse(job.transcription.speakerAnalysis as string) : null,
        duration: job.transcription.duration || 0,
        wordCount: job.transcription.wordCount || 0,
        flaggedWordCount: job.transcription.flaggedWordCount || 0,
        averageConfidence: job.transcription.averageConfidence || 0,
      }}
      audioFile={{
        id: audioFile.id,
        fileName: audioFile.fileName,
        fileUrl: audioFile.storageUrl || audioFile.storagePath,
        mimeType: audioFile.mimeType,
      }}
      user={{
        id: session.user.id,
        role: session.user.role,
        isOwner,
        isAssignedScopist,
      }}
    />
  );
}

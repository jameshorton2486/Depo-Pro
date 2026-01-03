// =============================================================================
// TRANSCRIPT EDIT PAGE
// app/transcripts/[jobId]/edit/page.tsx
//
// Full transcript editing interface
// =============================================================================

import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { TranscriptEditor } from '@/components/transcripts/transcript-editor';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function TranscriptEditPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { jobId } = await params;
  const user = session.user as { id: string; role: string };

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      transcription: true,
    },
  });

  if (!job) {
    notFound();
  }

  // Check access
  if (
    user.role !== 'ADMIN' &&
    job.createdById !== user.id &&
    job.scopistId !== user.id
  ) {
    redirect('/unauthorized');
  }

  const transcript = job.transcription;

  if (!transcript) {
    redirect(`/transcripts/${jobId}`);
  }

  // Check if finalized
  if (transcript.status === 'FINALIZED' || transcript.status === 'DELIVERED') {
    return (
      <div className="p-6 text-center max-w-2xl mx-auto">
        <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mt-4">Transcript Locked</h1>
        <p className="text-gray-600 mt-2">
          This transcript has been finalized and cannot be edited.
        </p>
        <Link
          href={`/transcripts/${jobId}`}
          className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          View Transcript
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Transcript</h1>
        <Link
          href={`/transcripts/${jobId}`}
          className="text-indigo-600 hover:underline"
        >
          Cancel
        </Link>
      </div>
      <TranscriptEditor
        transcriptId={transcript.id}
        initialContent={transcript.content || ''}
        jobId={jobId}
      />
    </div>
  );
}

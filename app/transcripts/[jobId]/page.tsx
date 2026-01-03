// =============================================================================
// TRANSCRIPT VIEW PAGE
// app/transcripts/[jobId]/page.tsx
//
// Display full transcript with audio player and export options
// =============================================================================

import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Download, Edit, Lock, CheckCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function TranscriptViewPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { jobId } = await params;
  const user = session.user as { id: string; role: string };

  // Fetch transcript with job
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      transcription: {
        select: {
          id: true,
          fullTranscript: true,
          status: true,
          wordCount: true,
          flaggedWordCount: true,
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      assignments: {
        where: { status: 'ACCEPTED' },
        include: {
          scopist: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!job) {
    notFound();
  }

  // Check access
  if (
    user.role !== 'ADMIN' &&
    user.role !== 'ATTORNEY' &&
    job.createdById !== user.id &&
    job.scopistId !== user.id
  ) {
    redirect('/unauthorized');
  }

  const transcript = job.transcription;
  const canEdit = 
    user.role === 'ADMIN' ||
    (user.role === 'REPORTER' && job.createdById === user.id) ||
    (user.role === 'SCOPIST' && job.scopistId === user.id);
  const canReview = 
    user.role === 'ADMIN' ||
    (user.role === 'REPORTER' && job.createdById === user.id) ||
    (user.role === 'SCOPIST' && job.scopistId === user.id);
  const isFinalized = transcript?.status === 'FINALIZED' || transcript?.status === 'DELIVERED';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{job.caseName || job.title}</h1>
          <p className="text-gray-600 mt-1">
            {job.createdBy && (
              <>Reporter: {job.createdBy.firstName} {job.createdBy.lastName}</>
            )}
            {job.scopist && (
              <> • Scopist: {job.scopist.firstName} {job.scopist.lastName}</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {canReview && !isFinalized && (
            <Link
              href={`/transcripts/${jobId}/review`}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Review
            </Link>
          )}
          {canEdit && !isFinalized && (
            <Link
              href={`/transcripts/${jobId}/edit`}
              className="bg-white hover:bg-gray-50 text-indigo-600 px-4 py-2 rounded-lg font-semibold border-2 border-indigo-600 transition-colors flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          )}
          {isFinalized && (
            <div className="flex items-center text-gray-500 px-4 py-2">
              <Lock className="w-4 h-4 mr-2" />
              Finalized
            </div>
          )}
          <Link
            href={`/api/transcripts/${transcript?.id || jobId}/export?format=docx`}
            className="bg-white hover:bg-gray-50 text-indigo-600 px-4 py-2 rounded-lg font-semibold border-2 border-indigo-600 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      {isFinalized && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            This transcript has been finalized and cannot be edited without admin approval.
          </p>
        </div>
      )}

      {/* Transcript Content */}
      {transcript ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Transcript</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Status: <span className="font-medium">{transcript.status}</span></p>
              {transcript.wordCount && (
                <p>Word Count: {transcript.wordCount.toLocaleString()}</p>
              )}
              {transcript.flaggedWordCount && (
                <p>Flagged Words: {transcript.flaggedWordCount}</p>
              )}
            </div>
          </div>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded">
              {transcript.content || 'No transcript content available.'}
            </pre>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No transcript available yet.</p>
          <Link
            href={`/jobs/${jobId}`}
            className="text-indigo-600 hover:underline mt-4 inline-block"
          >
            View Job Details
          </Link>
        </div>
      )}
    </div>
  );
}

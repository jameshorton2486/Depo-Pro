// Migrated from Prisma to Supabase queries — PASS 2A
// =============================================================================
// TRANSCRIPT VIEW PAGE
// app/transcripts/[jobId]/page.tsx
//
// Display full transcript with audio player and export options
// =============================================================================

import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import Link from 'next/link';
import { Download, Edit, Lock, CheckCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function TranscriptViewPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const { jobId } = await params;

  const supabase = await createSupabaseServerClient();

  // Fetch job with includes
  const job = await getJobById(supabase, jobId, {
    includeCreatedBy: true,
    includeAssignments: true,
  });

  if (!job) {
    notFound();
  }

  // Get transcription
  const transcription = await getTranscriptByJobId(supabase, jobId);

  // Check access
  if (
    currentUser.role !== 'ADMIN' &&
    currentUser.role !== 'ATTORNEY' &&
    job.created_by_id !== currentUser.id &&
    !(job.assignments || []).some((a: any) => a.scopist_id === currentUser.id)
  ) {
    redirect('/unauthorized');
  }

  const transcript = transcription;
  const canEdit =
    currentUser.role === 'ADMIN' ||
    (currentUser.role === 'REPORTER' && job.created_by_id === currentUser.id) ||
    (currentUser.role === 'SCOPIST' && (job.assignments || []).some((a: any) => a.scopist_id === currentUser.id));
  const canReview = canEdit;
  const isFinalized = transcript?.status === 'COMPLETED';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{job.case_name || job.title}</h1>
          <p className="text-gray-600 mt-1">
            {job.createdBy && (
              <>Reporter: {job.createdBy.firstName || ''} {job.createdBy.lastName || ''}</>
            )}
            {(job.assignments || []).length > 0 && job.assignments[0].scopist && (
              <> • Scopist: {job.assignments[0].scopist.firstName || ''} {job.assignments[0].scopist.lastName || ''}</>
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
              {transcript.word_count && (
                <p>Word Count: {transcript.word_count.toLocaleString()}</p>
              )}
              {transcript.flagged_word_count && (
                <p>Flagged Words: {transcript.flagged_word_count}</p>
              )}
            </div>
          </div>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded">
              {transcript.full_transcript || transcript.content || 'No transcript content available.'}
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

// Migrated from Prisma to Supabase queries — PASS 2A
// =============================================================================
// TRANSCRIPT EDIT PAGE
// app/transcripts/[jobId]/edit/page.tsx
//
// Full transcript editing interface
// =============================================================================

import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { TranscriptEditor } from '@/components/transcripts/transcript-editor';
import { isAdminRole } from '@/lib/admin';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function TranscriptEditPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const { jobId } = await params;

  const supabase = await createSupabaseServerClient();

  const job = await getJobById(supabase, jobId, {
    includeAssignments: true,
  });

  if (!job) {
    notFound();
  }

  // Check access
  if (
    !isAdminRole(currentUser.role) &&
    job.created_by_id !== currentUser.id &&
    !(job.assignments || []).some((a: any) => a.scopist_id === currentUser.id)
  ) {
    redirect('/unauthorized');
  }

  const transcript = await getTranscriptByJobId(supabase, jobId);

  if (!transcript) {
    redirect(`/transcripts/${jobId}`);
  }

  // Check if finalized
  if (transcript.status === 'COMPLETED') {
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
        initialContent={transcript.full_transcript || transcript.content || ''}
        jobId={jobId}
      />
    </div>
  );
}

// =============================================================================
// EXPORTS LIST PAGE
// app/exports/page.tsx
//
// List of exportable transcripts with quick export buttons
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import Link from 'next/link';
import { Download, FileText } from 'lucide-react';

export default async function ExportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };
  const supabase = await createSupabaseServerClient();

  // Build filters based on role
  let jobsQuery = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (user.role === 'REPORTER' || user.role === 'COURT_REPORTER') {
    jobsQuery = jobsQuery.eq('created_by_id', user.id);
  } else if (user.role === 'SCOPIST') {
    jobsQuery = jobsQuery.eq('scopist_id', user.id);
  }
  // Admin and Attorney can see all

  const { data: jobs, error: jobsError } = await jobsQuery;

  if (jobsError) {
    throw jobsError;
  }

  // Filter to only jobs with transcripts and enrich with transcript and user info
  const transcripts = await Promise.all(
    (jobs || []).map(async (job: any) => {
      const transcript = await getTranscriptByJobId(supabase, job.id);
      if (!transcript) return null;

      const createdBy = await getUserById(supabase, job.created_by_id);

      return {
        id: job.id,
        caseName: job.case_name || job.title,
        createdAt: job.created_at,
        transcription: {
          id: transcript.id,
          status: (transcript as any).status,
          wordCount: (transcript as any).word_count || (transcript as any).word_count || 0,
        },
        createdBy: createdBy ? {
          firstName: createdBy.user_metadata?.firstName || '',
          lastName: createdBy.user_metadata?.lastName || '',
        } : null,
      };
    })
  );

  // Filter out nulls (jobs without transcripts)
  const validTranscripts = transcripts.filter((t: any) => t !== null);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Exports</h1>
      
      <div className="bg-white rounded-lg shadow">
        {validTranscripts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No transcripts available for export.</p>
          </div>
        ) : (
          <div className="divide-y">
            {validTranscripts.map((job: any) => (
              <div
                key={job.id}
                className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="font-medium">{job.caseName || job.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {job.createdBy && (
                      <>Reporter: {job.createdBy.firstName} {job.createdBy.lastName} • </>
                    )}
                    {job.transcription?.wordCount && (
                      <>{job.transcription.wordCount.toLocaleString()} words • </>
                    )}
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/api/transcripts/${job.transcription?.id || job.id}/export?format=docx`}
                    className="bg-white hover:bg-gray-50 text-indigo-600 px-4 py-2 rounded-lg font-semibold border-2 border-indigo-600 transition-colors flex items-center text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    DOCX
                  </Link>
                  <Link
                    href={`/api/transcripts/${job.transcription?.id || job.id}/export?format=pdf`}
                    className="bg-white hover:bg-gray-50 text-indigo-600 px-4 py-2 rounded-lg font-semibold border-2 border-indigo-600 transition-colors flex items-center text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



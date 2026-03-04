import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import { getUserById } from '@/lib/supabase/queries/users';

/**
 * GET /exports/json/[jobId]
 * Export transcript as JSON.
 *
 * Guard: withRouteProtection — auth + firm_id tenant isolation enforced before handler.
 */
const GETHandler = async (
  _request: NextRequest,
  { user, supabase, params }: ProtectedContext,
): Promise<NextResponse> => {
  const { jobId } = params;

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, case_name, case_number, deposition_date, created_by_id, scopist_id')
    .eq('id', jobId)
    .eq('firm_id', user.firm_id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const transcript = await getTranscriptByJobId(supabase, jobId);

  if (!transcript) {
    return NextResponse.json(
      { error: 'Transcript not found for this job' },
      { status: 404 },
    );
  }

  const isCreator = job.created_by_id === user.id;
  const isAdmin = user.role === 'ADMIN';
  const isScopist = job.scopist_id === user.id;

  if (!isCreator && !isAdmin && !isScopist) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const createdBy = await getUserById(supabase, job.created_by_id);

  const jsonData = {
    jobId: job.id,
    caseName: job.case_name,
    caseNumber: job.case_number,
    depositionDate: job.deposition_date,
    transcript: {
      id: transcript.id,
      content: transcript.full_transcript ?? transcript.original_transcript ?? transcript.content,
      wordCount: transcript.word_count,
      flaggedWordCount: transcript.flagged_word_count ?? 0,
      status: transcript.status,
    },
    reporter: createdBy
      ? {
          id: createdBy.id,
          name: `${createdBy.user_metadata?.firstName ?? ''} ${createdBy.user_metadata?.lastName ?? ''}`.trim(),
        }
      : null,
    exportedAt: new Date().toISOString(),
  };

  return NextResponse.json(jsonData, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${job.case_name || 'transcript'}-${jobId}.json"`,
    },
  });
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    enforceTenant: true,
    rateLimit: { limit: 20, windowMs: 60_000 },
    auditAction: 'JSON_EXPORT',
  },
  GETHandler,
);

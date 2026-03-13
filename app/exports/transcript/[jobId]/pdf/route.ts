import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import { isAdminRole } from '@/lib/admin';

/**
 * GET /exports/transcript/[jobId]/pdf
 * Export transcript as PDF — redirects to the main export API with format parameter.
 *
 * Guard: withRouteProtection — auth + firm_id tenant isolation enforced before handler.
 */
const GETHandler = async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext,
): Promise<NextResponse> => {
  const { jobId } = params;

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, created_by_id, scopist_id')
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
  const isAdmin = isAdminRole(user.role);
  const isScopist = job.scopist_id === user.id;

  if (!isCreator && !isAdmin && !isScopist) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const exportUrl = `/api/transcripts/${transcript.id}/export?format=pdf&lineNumbers=true`;
  return NextResponse.redirect(new URL(exportUrl, request.url));
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    enforceTenant: true,
    rateLimit: { limit: 20, windowMs: 60_000 },
    auditAction: 'PDF_EXPORT',
  },
  GETHandler,
);

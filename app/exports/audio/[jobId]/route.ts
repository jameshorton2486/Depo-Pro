import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { listFilesForJob } from '@/lib/supabase/queries/files';

/**
 * GET /exports/audio/[jobId]
 * Download audio file for a job.
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

  const isCreator = job.created_by_id === user.id;
  const isAdmin = user.role === 'ADMIN';
  const isScopist = job.scopist_id === user.id;

  if (!isCreator && !isAdmin && !isScopist) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const files = await listFilesForJob(supabase, jobId);
  const audioFiles = (files as any[]).filter((f) => f.type === 'AUDIO');

  if (!audioFiles || audioFiles.length === 0) {
    return NextResponse.json(
      { error: 'Audio file not found for this job' },
      { status: 404 },
    );
  }

  return NextResponse.redirect(
    new URL(`/api/files/${audioFiles[0].id}/download`, request.url),
  );
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    enforceTenant: true,
    rateLimit: { limit: 20, windowMs: 60_000 },
    auditAction: 'AUDIO_DOWNLOAD',
  },
  GETHandler,
);

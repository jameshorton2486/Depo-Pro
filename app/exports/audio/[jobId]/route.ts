import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { isAdminRole } from '@/lib/admin';
/**
 * GET /exports/audio/[jobId]
 * Download audio file for a job.
 *
 * Guard: withRouteProtection — auth + firm_id tenant isolation enforced before handler.
 * Uses jobs.audio_file_url (set at upload time) to locate the Storage object.
 */
const GETHandler = async (
  _request: NextRequest,
  { user, supabase, params }: ProtectedContext,
): Promise<NextResponse> => {
  const { jobId } = params;

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, created_by_id, scopist_id, audio_file_url')
    .eq('id', jobId)
    .eq('firm_id', user.firm_id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const isCreator = job.created_by_id === user.id;
  const isAdmin = isAdminRole(user.role);
  const isScopist = job.scopist_id === user.id;

  if (!isCreator && !isAdmin && !isScopist) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const audioPath = job.audio_file_url as string | null;
  if (!audioPath) {
    return NextResponse.json(
      { error: 'Audio file not found for this job' },
      { status: 404 },
    );
  }

  // Generate a signed download URL from Supabase Storage
  const { data: signedUrl, error: signError } = await supabase
    .storage
    .from('depo-audio')
    .createSignedUrl(audioPath, 3600); // 1-hour expiry

  if (signError || !signedUrl?.signedUrl) {
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signedUrl.signedUrl);
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

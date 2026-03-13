import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { exportLegalDocx } from '@/lib/services/export';
import type { TranscriptFormatConfig } from '@/src/types/transcript-format';
import { isAdminRole } from '@/lib/admin';

/**
 * GET /exports/transcript/[jobId]/docx
 * Export transcript as DOCX using legal formatter when settings are configured.
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
    .select('id, case_name, created_by_id, scopist_id, format_settings')
    .eq('id', jobId)
    .eq('firm_id', user.firm_id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const { data: transcript } = await supabase
    .from('transcriptions')
    .select('id')
    .eq('job_id', jobId)
    .single();

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

  const formatConfig = (job.format_settings as TranscriptFormatConfig | null) ?? null;
  const buffer = await exportLegalDocx(jobId, formatConfig);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${job.case_name || 'transcript'}.docx"`,
      'Content-Length': buffer.length.toString(),
    },
  });
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    enforceTenant: true,
    rateLimit: { limit: 20, windowMs: 60_000 },
    auditAction: 'DOCX_EXPORT',
  },
  GETHandler,
);

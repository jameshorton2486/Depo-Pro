import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { exportLegalDocx } from '@/lib/services/export';
import type { TranscriptFormatConfig } from '@/src/types/transcript-format';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /exports/transcript/[jobId]/docx
 * Export transcript as DOCX using legal formatter when settings are configured.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;
    const supabase = await createSupabaseServerClient();

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, case_name, created_by_id, scopist_id, format_settings')
      .eq('id', jobId)
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

    const isCreator = job.created_by_id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    const isScopist = job.scopist_id === currentUser.id;

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
  } catch (error) {
    console.error('Error in DOCX export route:', error);
    return NextResponse.json(
      { error: 'Failed to export transcript' },
      { status: 500 },
    );
  }
}

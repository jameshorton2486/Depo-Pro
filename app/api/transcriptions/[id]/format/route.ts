import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { formatTranscript } from '@/lib/transcription/formatter';

async function handler(
  request: Request,
  context: { user: { firm_id: string }; params: Record<string, string> }
) {
  const body = await request.json().catch(() => ({}));
  const result = await formatTranscript(context.params.id, {
    jurisdiction:
      typeof body?.jurisdiction === 'string' && body.jurisdiction.trim()
        ? body.jurisdiction.trim().toUpperCase()
        : 'TX',
    dryRun: body?.dryRun === true,
  });

  return NextResponse.json({
    transcriptionId: context.params.id,
    pageCount: result.pageCount,
    paragraphCount: result.paragraphs.length,
    qualityGate: result.qualityGate,
    formatterRunAt: new Date().toISOString(),
  });
}

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ['COURT_REPORTER', 'ADMIN', 'SCOPIST'] as any,
    requireFirm: true,
    auditAction: 'FORMATTER_RUN',
  },
  handler as any
);

/**
 * EXP-01 — Legal-grade PDF Export
 *
 * GET /api/export/pdf?transcriptId=<uuid>
 *
 * Returns an application/pdf stream using the same legal formatting rules
 * as the DOCX export (Courier New, 25 lines/page, line numbers, Q/A format).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { exportLegalPdfWithMeta } from '@/lib/services/legal-pdf-export';

const getPdfHandler = async (
  request: NextRequest,
  { supabase }: ProtectedContext,
) => {
  const { searchParams } = new URL(request.url);
  const transcriptId = searchParams.get('transcriptId');

  if (!transcriptId) {
    return NextResponse.json({ error: 'transcriptId is required' }, { status: 400 });
  }

  // Verify the transcript exists (supabase RLS will enforce access)
  const { data: transcript, error: transcriptError } = await supabase
    .from('transcriptions')
    .select('id, job_id')
    .eq('id', transcriptId)
    .single();

  if (transcriptError || !transcript) {
    return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
  }

  try {
    const pdfBuffer = await exportLegalPdfWithMeta(transcriptId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="transcript-${transcriptId}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const GET = withRouteProtection(
  { requireAuth: true, enforceTenant: true },
  getPdfHandler,
);

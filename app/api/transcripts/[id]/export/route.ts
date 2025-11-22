import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { exportTranscript, type ExportOptions } from '@/lib/export';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// GET /api/transcripts/[id]/export - Export transcript
// ═══════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'txt') as ExportOptions['format'];
    const includeLineNumbers = searchParams.get('lineNumbers') === 'true';
    const includeHeader = searchParams.get('header') !== 'false'; // Default true

    // Get transcript with access check
    const transcript = await db.transcript.findFirst({
      where: {
        id: transcriptId,
        job: {
          createdById: session.user.id,
        },
      },
      include: {
        job: {
          select: {
            caseNumber: true,
            caseName: true,
            depositionDate: true,
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    const content = transcript.content || '';

    // Export with selected format
    const result = await exportTranscript(content, {
      format,
      includeLineNumbers,
      includeHeader,
      caseInfo: {
        caseNumber: transcript.job.caseNumber || undefined,
        caseName: transcript.job.caseName || undefined,
        depoDate: transcript.job.depositionDate || undefined,
      },
    });

    logger.info(`Transcript exported - transcriptId: ${transcriptId}, format: ${format}`);

    return new NextResponse(result.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      },
    });

  } catch (error) {
    const { id: transcriptId } = await params;
    logger.error(`Failed to export transcript - transcriptId: ${transcriptId}, error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to export transcript' },
      { status: 500 }
    );
  }
}

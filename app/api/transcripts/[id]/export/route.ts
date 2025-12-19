// app/api/transcripts/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { exportTranscript } from '@/lib/export';
import { ExportOptions, ExportMetadata } from '@/types/transcript';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; firmId?: string };
    const { id: transcriptId } = await context.params;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'docx') as 'docx' | 'pdf' | 'txt';
    const lineNumbering = searchParams.get('lineNumbers') !== 'false';

    // Fetch transcript with job details
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptId },
      include: {
        job: {
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            firm: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!transcription) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = transcription.job.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSameFirm = transcription.job.firmId === user.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!transcription.fullTranscript) {
      return NextResponse.json({ error: 'No transcript text available' }, { status: 400 });
    }

    // Build metadata
    const metadata: ExportMetadata = {
      caseName: transcription.job.title,
      caseNumber: transcription.job.caseNumber || undefined,
      depositionDate: transcription.job.depositionDate || new Date(),
      deponentName: transcription.job.title || 'Unknown',
      courtReporterName: `${transcription.job.createdBy.firstName} ${transcription.job.createdBy.lastName}` || undefined,
      firmName: transcription.job.firm?.name || undefined,
      location: transcription.job.location || undefined,
    };

    // Build options
    const options: ExportOptions = {
      format,
      includeTimestamps: false,
      includeSpeakerLabels: true,
      lineNumbering,
      useQAFormat: true,
    };

    // Generate export
    const { buffer, filename, contentType } = await exportTranscript(
      transcription.fullTranscript,
      metadata,
      options
    );

    // Return file
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export transcript' }, { status: 500 });
  }
}

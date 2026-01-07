// =============================================================================
// app/api/jobs/[id]/export/route.ts
// Universal Export API Route - Supports all export formats
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { ExportFormat, ExportOptions, TranscriptContent } from '@/lib/export/export-service';
import { exportDocument } from '@/lib/export/export-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; firmId?: string };
    const { id: jobId } = await context.params;

    // Get format from query params
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'docx') as ExportFormat;

    // Fetch job with transcript and related data
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        caseName: true,
        caseNumber: true,
        depositionDate: true,
        title: true,
        createdById: true,
        firmId: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        transcription: {
          select: {
            id: true,
            fullTranscript: true,
            words: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = job.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSameFirm = job.firmId === user.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!job.transcription?.fullTranscript) {
      return NextResponse.json({ error: 'No transcript available for export' }, { status: 400 });
    }

    // Build export options
    const options: ExportOptions = {
      format,
      includeLineNumbers: true,
      includePageNumbers: true,
      includeSpeakerLabels: true,
      caseName: job.caseName || undefined,
      caseNumber: job.caseNumber || undefined,
      deponentName: job.title || undefined, // Use title as deponent name fallback
      depositionDate: job.depositionDate || undefined,
      reporterName: job.createdBy
        ? `${job.createdBy.firstName || ''} ${job.createdBy.lastName || ''}`.trim() || undefined
        : undefined,
    };

    // Build transcript content
    const content: TranscriptContent = {
      fullText: job.transcription.fullTranscript,
      words: job.transcription.words ? (typeof job.transcription.words === 'string' 
        ? JSON.parse(job.transcription.words) 
        : job.transcription.words) : undefined,
    };

    // Handle Google Docs export separately (requires OAuth)
    if (format === 'google-docs') {
      // TODO: Use ExternalCalendarConnection to get Google OAuth tokens
      // For now, return not implemented
      return NextResponse.json(
        { error: 'Google Docs export requires Google account connection. Please connect your Google account in Settings.', code: 'GOOGLE_NOT_CONNECTED' },
        { status: 501 }
      );
    }

    // Handle standard file exports
    const result = await exportDocument(content, options);

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      );
    }

    // Return file download
    return new NextResponse(result.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.size?.toString() || result.buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export transcript' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role: string; firmId?: string };
    const { id: jobId } = await context.params;

    // Parse request body for custom options
    const body = await request.json().catch(() => ({}));
    const format = (body.format || 'docx') as ExportFormat;

    // Fetch job (same as GET)
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        caseName: true,
        caseNumber: true,
        depositionDate: true,
        title: true,
        createdById: true,
        firmId: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        transcription: {
          select: {
            id: true,
            fullTranscript: true,
            words: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = job.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSameFirm = job.firmId === user.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!job.transcription?.fullTranscript) {
      return NextResponse.json({ error: 'No transcript available for export' }, { status: 400 });
    }

    // Build export options from request body (override defaults)
    const options: ExportOptions = {
      format,
      includeLineNumbers: body.includeLineNumbers !== false,
      includePageNumbers: body.includePageNumbers !== false,
      includeSpeakerLabels: body.includeSpeakerLabels !== false,
      includeTimestamps: body.includeTimestamps === true,
      linesPerPage: body.linesPerPage || 25,
      lineNumberInterval: body.lineNumberInterval || 5,
      caseName: body.caseName || job.caseName || undefined,
      caseNumber: body.caseNumber || job.caseNumber || undefined,
      deponentName: body.deponentName || job.title || undefined,
      depositionDate: body.depositionDate ? new Date(body.depositionDate) : job.depositionDate || undefined,
      reporterName: body.reporterName || (job.createdBy
        ? `${job.createdBy.firstName || ''} ${job.createdBy.lastName || ''}`.trim() || undefined
        : undefined),
      googleFolderId: body.googleFolderId || undefined,
      googleDocTitle: body.googleDocTitle || undefined,
    };

    // Build transcript content
    const content: TranscriptContent = {
      fullText: job.transcription.fullTranscript,
      words: job.transcription.words ? (typeof job.transcription.words === 'string' 
        ? JSON.parse(job.transcription.words) 
        : job.transcription.words) : undefined,
    };

    // Handle Google Docs export
    if (format === 'google-docs') {
      // TODO: Use ExternalCalendarConnection to get Google OAuth tokens
      // For now, return not implemented
      return NextResponse.json(
        { error: 'Google Docs export requires Google account connection. Please connect your Google account in Settings.', code: 'GOOGLE_NOT_CONNECTED' },
        { status: 501 }
      );
    }

    // Handle standard file exports
    const result = await exportDocument(content, options);

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      );
    }

    // Return file download
    return new NextResponse(result.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.size?.toString() || result.buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export transcript' },
      { status: 500 }
    );
  }
}

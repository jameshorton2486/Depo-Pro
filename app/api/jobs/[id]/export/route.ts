// =============================================================================
// app/api/jobs/[id]/export/route.ts
// Universal Export API Route - Supports all export formats
// =============================================================================

import type { NextRequest} from 'next/server';
import { UserRole as GuardRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: jobId } = await context.params;

    // Get format from query params
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'docx') as ExportFormat;

    const supabase = await createSupabaseServerClient();

    // Fetch job
    const job = await getJobById(supabase, jobId, {
      includeCreatedBy: true,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = (job as any).created_by_id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    const jobFirmId = (job as any).firm_id || (job as any).firmId;
    const isSameFirm = jobFirmId === currentUser.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get transcript
    const transcription = await getTranscriptByJobId(supabase, jobId);

    if (!transcription || !transcription.full_transcript) {
      return NextResponse.json({ error: 'No transcript available for export' }, { status: 400 });
    }

    // Get reporter info
    const createdBy = (job as any).createdBy;
    const reporterName = createdBy
      ? `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim() || undefined
      : undefined;

    // Build export options
    const options: ExportOptions = {
      format,
      includeLineNumbers: true,
      includePageNumbers: true,
      includeSpeakerLabels: true,
      caseName: (job as any).case_name || (job as any).caseName || undefined,
      caseNumber: (job as any).case_number || (job as any).caseNumber || undefined,
      deponentName: (job as any).title || undefined,
      depositionDate: (job as any).deposition_date || (job as any).depositionDate || undefined,
      reporterName,
    };

    // Build transcript content
    const content: TranscriptContent = {
      fullText: transcription.full_transcript,
      words: transcription.words ? (typeof transcription.words === 'string'
        ? JSON.parse(transcription.words)
        : transcription.words) : undefined,
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

const POSTHandler = async (
  request: NextRequest,
  context: RouteContext,
) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: jobId } = await context.params;

    // Parse request body for custom options
    const body = await request.json().catch(() => ({}));
    const format = (body.format || 'docx') as ExportFormat;

    // Fetch job (same as GET)
    const supabase = await createSupabaseServerClient();
    const job = await getJobById(supabase, jobId, {
      includeCreatedBy: true,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = (job as any).created_by_id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    const jobFirmId = (job as any).firm_id || (job as any).firmId;
    const isSameFirm = jobFirmId === currentUser.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get transcript
    const transcription = await getTranscriptByJobId(supabase, jobId);

    if (!transcription || !((transcription as any).full_transcript || (transcription as any).fullTranscript)) {
      return NextResponse.json({ error: 'No transcript available for export' }, { status: 400 });
    }

    // Get reporter info
    const createdBy = (job as any).createdBy;
    const reporterName = createdBy
      ? `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim() || undefined
      : undefined;

    // Build export options from request body (override defaults)
    const options: ExportOptions = {
      format,
      includeLineNumbers: body.includeLineNumbers !== false,
      includePageNumbers: body.includePageNumbers !== false,
      includeSpeakerLabels: body.includeSpeakerLabels !== false,
      includeTimestamps: body.includeTimestamps === true,
      linesPerPage: body.linesPerPage || 25,
      lineNumberInterval: body.lineNumberInterval || 5,
      caseName: body.caseName || (job as any).case_name || (job as any).caseName || undefined,
      caseNumber: body.caseNumber || (job as any).case_number || (job as any).caseNumber || undefined,
      deponentName: body.deponentName || (job as any).title || undefined,
      depositionDate: body.depositionDate ? new Date(body.depositionDate) : ((job as any).deposition_date ? new Date((job as any).deposition_date) : (job as any).depositionDate || undefined),
      reporterName: body.reporterName || reporterName,
      googleFolderId: body.googleFolderId || undefined,
      googleDocTitle: body.googleDocTitle || undefined,
    };

    // Build transcript content
    const fullTranscript = (transcription as any).full_transcript || (transcription as any).fullTranscript || (transcription as any).content;
    const content: TranscriptContent = {
      fullText: fullTranscript,
      words: (transcription as any).words ? (typeof (transcription as any).words === 'string'
        ? JSON.parse((transcription as any).words)
        : (transcription as any).words) : undefined,
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


export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [GuardRole.ADMIN, GuardRole.REPORTER, GuardRole.COURT_REPORTER],
    rateLimit: { limit: 10, windowMs: 60_000 },
  },
  async (request, { params }) => ((POSTHandler) as any)(request, { params: Promise.resolve(params as any) })
);

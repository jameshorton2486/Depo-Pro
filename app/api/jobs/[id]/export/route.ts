// =============================================================================
// app/api/jobs/[id]/export/route.ts
// Job-level export endpoint backed by canonical lib/export.ts engine
// =============================================================================

import type { NextRequest } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { NextResponse } from 'next/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getTranscriptByJobId } from '@/lib/supabase/queries/transcripts';
import { exportTranscript } from '@/lib/export';
import { exportLegalDocx } from '@/lib/services/export';
import type { ExportOptions, ExportMetadata } from '@/types/transcript';
import type { TranscriptFormatConfig } from '@/src/types/transcript-format';
import { isAdminRole } from '@/lib/admin';

type ExportFormat = 'docx' | 'pdf' | 'txt' | 'google-docs';

function parseFormat(value: unknown): ExportFormat {
  if (value === 'pdf' || value === 'txt' || value === 'google-docs') {
    return value;
  }
  return 'docx';
}

function buildExportMetadata(job: any): ExportMetadata {
  const createdBy = job?.createdBy;
  const reporterName = createdBy
    ? `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim() || undefined
    : undefined;

  return {
    caseName: job?.case_name || job?.caseName || 'Deposition',
    caseNumber: job?.case_number || job?.caseNumber || undefined,
    depositionDate: job?.deposition_date ? new Date(job.deposition_date) : new Date(),
    deponentName: job?.title || 'Unknown',
    courtReporterName: reporterName,
    firmName: job?.firm?.name || undefined,
    location: job?.location || undefined,
  };
}

function parseWordData(words: unknown): Array<{ word: string; start: number; end: number }> | undefined {
  const parsed = typeof words === 'string' ? JSON.parse(words) : words;
  if (!Array.isArray(parsed)) {
    return undefined;
  }

  return parsed
    .filter((item) => item && typeof item === 'object')
    .map((item: any) => ({
      word: String(item.word || ''),
      start: Number(item.start || 0),
      end: Number(item.end || 0),
    }))
    .filter((item) => item.word.length > 0);
}

function hasJobExportAccess(job: any, currentUser: { id: string; role: string; firmId?: string | null }) {
  const isOwner = (job as any).created_by_id === currentUser.id;
  const isAdmin = isAdminRole(currentUser.role);
  const jobFirmId = (job as any).firm_id || (job as any).firmId;
  const isSameFirm = jobFirmId === currentUser.firmId;
  return isOwner || isAdmin || isSameFirm;
}

async function executeExport(
  jobId: string,
  format: ExportFormat,
  optionOverrides: Partial<ExportOptions>,
  currentUser: { id: string; role: string; firm_id: string },
  supabase: any
) {

  if (format === 'google-docs') {
    return NextResponse.json(
      {
        error: 'Google Docs export requires Google account connection. Please connect your Google account in Settings.',
        code: 'GOOGLE_NOT_CONNECTED',
      },
      { status: 501 },
    );
  }

  const job = await getJobById(supabase, jobId, { includeCreatedBy: true });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (!hasJobExportAccess(job, { ...currentUser, firmId: currentUser.firm_id })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const transcription = await getTranscriptByJobId(supabase, jobId);
  const transcriptText = transcription?.full_transcript || (transcription as any)?.fullTranscript || (transcription as any)?.content;
  if (!transcriptText) {
    return NextResponse.json({ error: 'No transcript available for export' }, { status: 400 });
  }

  const metadata = buildExportMetadata(job);
  const exportOptions: ExportOptions = {
    format,
    includeTimestamps: optionOverrides.includeTimestamps === true,
    includeSpeakerLabels: optionOverrides.includeSpeakerLabels !== false,
    lineNumbering: optionOverrides.lineNumbering !== false,
    useQAFormat: optionOverrides.useQAFormat !== false,
    linesPerPage: optionOverrides.linesPerPage || 25,
  };

  const wordData = parseWordData((transcription as any)?.words);

  if (format === 'docx') {
    const formatConfig = ((job as any).format_settings as TranscriptFormatConfig | null) ?? null;
    const buffer = await exportLegalDocx(jobId, formatConfig);
    const filename = `${(metadata.caseName || 'Transcript').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  }

  const result = await exportTranscript(transcriptText, metadata, exportOptions, wordData);

  return new NextResponse(result.buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.buffer.length.toString(),
    },
  });
}

const GETHandler = async (request: NextRequest, context: ProtectedContext) => {
  try {
    const { id: jobId } = context.params;
    const searchParams = request.nextUrl.searchParams;
    const format = parseFormat(searchParams.get('format'));
    const lineNumbering = searchParams.get('lineNumbers') !== 'false';

    return executeExport(jobId, format, {
      lineNumbering,
      includeSpeakerLabels: true,
      useQAFormat: true,
    }, context.user, context.supabase);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] job export GET failure', error);
    }
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export transcript' },
      { status: 500 },
    );
  }
};

const POSTHandler = async (
  request: NextRequest,
  context: ProtectedContext,
) => {
  try {
    const { id: jobId } = context.params;
    const body = await request.json().catch(() => ({}));
    const format = parseFormat(body.format);

    return executeExport(jobId, format, {
      includeTimestamps: body.includeTimestamps === true,
      includeSpeakerLabels: body.includeSpeakerLabels !== false,
      lineNumbering: body.includeLineNumbers !== false,
      useQAFormat: true,
      linesPerPage: body.linesPerPage || 25,
    }, context.user, context.supabase);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] job export POST failure', error);
    }
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export transcript' },
      { status: 500 },
    );
  }
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    requireFirm: true,
    rateLimit: { limit: 30, windowMs: 60_000 },
    auditAction: 'JOB_EXPORT_REQUESTED',
  },
  GETHandler
);

export const POST = withRouteProtection(
  {
    requireAuth: true,
    requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.COURT_REPORTER, UserRole.SCOPIST],
    requireFirm: true,
    rateLimit: { limit: 10, windowMs: 60_000 },
    auditAction: 'JOB_EXPORT_REQUESTED',
  },
  POSTHandler,
);

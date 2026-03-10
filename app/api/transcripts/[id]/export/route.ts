// app/api/transcripts/[id]/export/route.ts
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptForExport, getTranscriptEdits } from '@/lib/supabase/queries/transcripts';
import * as exportLib from '@/lib/export';
import { exportLegalDocx } from '@/lib/services/export';
import type { ExportOptions, ExportMetadata } from '@/types/transcript';
import type { TranscriptFormatConfig } from '@/src/types/transcript-format';
import { checkUserRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';
import { useQuota } from '@/lib/cost-control-service';
import { canExportFormat, canUseProfile } from '@/lib/export/permissions';
import { getExportProfile } from '@/lib/export/profiles';
import { createAuditLog, AuditAction, AuditTargetType } from '@/lib/audit-service';
import { logger } from '@/lib/logger';
import { captureError } from '@/lib/error-capture';
import { logRouteError, logSlowRequest } from '@/lib/monitoring';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];
const exportTranscript = exportLib.exportTranscript;
const runPreflightChecks = 'runPreflightChecks' in exportLib
  ? (exportLib.runPreflightChecks as ((transcriptId: string) => Promise<void>) | undefined)
  : undefined;

interface ExportWord {
  word: string;
  correctedWord?: string;
  isEdited?: boolean;
}

type RouteUser = {
  id: string;
  role: string;
  firm_id?: string | null;
  firmId?: string | null;
};

function parseUnknownJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function getWordsForExport(value: unknown): ExportWord[] {
  const parsed = parseUnknownJson<unknown>(value, []);
  return Array.isArray(parsed) ? (parsed as ExportWord[]) : [];
}

function getFlaggedCorrections(value: unknown): Map<number, string> {
  const parsed = parseUnknownJson<unknown>(value, null);
  const corrections = new Map<number, string>();

  if (Array.isArray(parsed)) {
    for (const segment of parsed) {
      if (
        segment &&
        typeof segment === 'object' &&
        typeof (segment as { wordIndex?: unknown }).wordIndex === 'number' &&
        Number.isInteger((segment as { wordIndex: number }).wordIndex) &&
        (segment as { wordIndex: number }).wordIndex >= 0 &&
        typeof (segment as { correctedWord?: unknown }).correctedWord === 'string' &&
        (segment as { correctedWord: string }).correctedWord.trim().length > 0
      ) {
        corrections.set(
          (segment as { wordIndex: number }).wordIndex,
          (segment as { correctedWord: string }).correctedWord,
        );
      }
    }
    return corrections;
  }

  if (!parsed || typeof parsed !== 'object') {
    return corrections;
  }

  const reviewSession = (parsed as { reviewSession?: { corrections?: Record<string, string> } }).reviewSession;
  const reviewCorrections = reviewSession?.corrections;

  if (!reviewCorrections || typeof reviewCorrections !== 'object') {
    return corrections;
  }

  for (const [indexRaw, correctedWord] of Object.entries(reviewCorrections)) {
    const index = Number(indexRaw);
    if (Number.isInteger(index) && index >= 0 && typeof correctedWord === 'string' && correctedWord.trim().length > 0) {
      corrections.set(index, correctedWord);
    }
  }

  return corrections;
}

const GETHandler = async (
  request: NextRequest,
  context?: ProtectedContext,
) => {
  const startTime = performance.now();
  let transcriptId = '';
  try {
    const user = (context?.user ?? await getCurrentUser()) as RouteUser | null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = context?.supabase ?? await createSupabaseServerClient();
    const params = context?.params;
    transcriptId = params?.id ?? '';
    if (!transcriptId) {
      return NextResponse.json({ error: 'Transcript ID is required' }, { status: 400 });
    }

    // Rate limit check
    const rateLimit = checkUserRateLimit(user.id, 'TRANSCRIPT_EXPORT');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    // Quota check
    const userFirmId = user.firm_id || user.firmId || null;
    if (userFirmId) {
      const _tier = 'FREE'; // TODO: Get from subscription
      const quotaCheck = await useQuota(userFirmId, 'exports', 1);
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          { error: 'Export quota exceeded', ...quotaCheck },
          { status: 429 }
        );
      }
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'docx') as 'docx' | 'pdf' | 'txt';
    const lineNumbering = searchParams.get('lineNumbers') !== 'false';

    // Fetch transcript with job details
    const transcription = await getTranscriptForExport(supabase, transcriptId);

    if (!transcription) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = transcription.job.created_by_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSameFirm = transcription.job.firm_id === userFirmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Phase 3C-2: Check export format permissions
    const userRole = user.role as any;
    if (!canExportFormat(userRole, format)) {
      return NextResponse.json(
        { error: `Export format ${format} not allowed for your role` },
        { status: 403 }
      );
    }

    // Check for profile if provided
    const profileId = searchParams.get('profileId');
    if (profileId && !canUseProfile(userRole, profileId)) {
      return NextResponse.json(
        { error: `Export profile ${profileId} not allowed for your role` },
        { status: 403 }
      );
    }

    // Run pre-flight checks (skip if explicitly bypassed for draft exports)
    const skipPreflight = searchParams.get('skipPreflight') === 'true';
    if (!skipPreflight && runPreflightChecks) {
      try {
        await runPreflightChecks(transcriptId);
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          (error as Error).name === 'PreflightError'
        ) {
          return NextResponse.json(
            { error: 'Pre-flight checks failed', checks: (error as { checks?: string[] }).checks ?? [] },
            { status: 422 }
          );
        }
        throw error;
      }
    }

    if (!transcription.full_transcript) {
      return NextResponse.json({ error: 'No transcript text available' }, { status: 400 });
    }

    // Apply edits before export (Phase 7 requirement)
    let exportText = transcription.full_transcript || '';

    // Fetch all edits for this transcription
    const edits = (await getTranscriptEdits(supabase, transcriptId)) || [];

    const words = getWordsForExport(transcription.words).map((word) => ({ ...word }));
    if (words.length > 0) {
      // Apply edit history oldest -> newest so the newest value wins deterministically.
      const chronologicalEdits = [...edits].reverse();
      for (const edit of chronologicalEdits) {
        if (!edit?.new_value) {
          continue;
        }

        // word_index is a direct column; fall back to metadata.wordIndex for legacy rows
        const rawWordIndex = typeof edit.word_index === 'number'
          ? edit.word_index
          : (edit.metadata as { wordIndex?: number } | null)?.wordIndex;
        if (typeof rawWordIndex !== 'number' || !Number.isInteger(rawWordIndex)) {
          continue;
        }
        const wordIndex = rawWordIndex;
        if (wordIndex < 0 || wordIndex >= words.length) {
          continue;
        }

        words[wordIndex].correctedWord = edit.new_value;
        words[wordIndex].isEdited = true;
      }

      // Apply in-record review corrections (legacy JSONB shape) — lower priority than flagged_words table.
      const flaggedCorrections = getFlaggedCorrections(transcription.flagged_segments);
      for (const [wordIndex, correctedWord] of flaggedCorrections.entries()) {
        if (wordIndex < 0 || wordIndex >= words.length) {
          continue;
        }
        words[wordIndex].correctedWord = correctedWord;
        words[wordIndex].isEdited = true;
      }

      // Apply flagged_words table corrections last — highest priority (final reviewer decisions).
      const { data: flaggedWordRows } = await supabase
        .from('flagged_words')
        .select('word_index, corrected_word')
        .eq('transcription_id', transcriptId)
        .in('status', ['CORRECTED', 'CONFIRMED'])
        .not('corrected_word', 'is', null);

      if (flaggedWordRows) {
        for (const fw of flaggedWordRows) {
          if (
            typeof fw.word_index !== 'number' ||
            fw.word_index < 0 ||
            fw.word_index >= words.length ||
            !fw.corrected_word
          ) {
            continue;
          }
          words[fw.word_index].correctedWord = fw.corrected_word;
          words[fw.word_index].isEdited = true;
        }
      }

      exportText = words.map((w) => w.correctedWord || w.word).join(' ').trim();
    }

    // Build metadata
    const metadata: ExportMetadata = {
      caseName: transcription.job.title || '',
      caseNumber: transcription.job.case_number || undefined,
      depositionDate: transcription.job.deposition_date ? new Date(transcription.job.deposition_date) : new Date(),
      deponentName: transcription.job.title || 'Unknown',
      courtReporterName: transcription.job.createdBy?.firstName && transcription.job.createdBy?.lastName
        ? `${transcription.job.createdBy.firstName} ${transcription.job.createdBy.lastName}`
        : undefined,
      firmName: transcription.job.firm?.name || undefined,
      location: transcription.job.location || undefined,
    };

    // Phase 3C-1: Apply export profile if provided
    let exportOptions: ExportOptions = {
      format,
      includeTimestamps: false,
      includeSpeakerLabels: true,
      lineNumbering,
      useQAFormat: true,
    };

    if (profileId) {
      const profile = getExportProfile(profileId);
      if (profile) {
        // Merge profile options with query options
        exportOptions = {
          ...exportOptions,
          ...profile.options,
          format: profile.format as any,
        };
      }
    }

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === 'docx' && transcription.job_id) {
      const { data: jobSettings } = await supabase
        .from('jobs')
        .select('format_settings, case_name')
        .eq('id', transcription.job_id)
        .single();

      const formatConfig =
        (jobSettings?.format_settings as TranscriptFormatConfig | null) ?? null;

      if (formatConfig?.speakerMappings?.length) {
        // Legal formatter with speaker mappings — uses segment-based formatting.
        // Corrections are applied via exportText for the fallback path inside exportLegalDocx.
        buffer = await exportLegalDocx(transcription.job_id, formatConfig);
      } else {
        // Standard DOCX: use exportText which has all corrections applied
        // (transcription_edits → flagged_segments → flagged_words).
        buffer = (await exportTranscript(exportText, metadata, { ...exportOptions, format: 'docx' })).buffer;
      }

      filename = `${(jobSettings?.case_name || metadata.caseName || 'transcript')
        .replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      // Generate export with corrected text (PDF, TXT)
      const result = await exportTranscript(
        exportText,
        metadata,
        exportOptions,
      );
      buffer = result.buffer;
      filename = result.filename;
      contentType = result.contentType;
    }

    // Phase 3C-3: Log export to audit trail
    await createAuditLog({
      actorUserId: user.id,
      firmId: transcription.job.firm_id || undefined,
      action: AuditAction.TRANSCRIPT_EXPORTED,
      targetType: AuditTargetType.TRANSCRIPT,
      targetId: transcriptId,
      metadata: {
        format,
        profileId: profileId || undefined,
        filename,
        contentType,
      },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch((error) => {
      logger.warn('Failed to write export audit log', {
        transcriptId,
        error: error instanceof Error ? error.message : String(error),
      });
    }); // Fire and forget

    // Return file
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    logRouteError('GET /api/transcripts/[id]/export', error, { transcriptId });
    captureError(error, { route: 'GET /api/transcripts/[id]/export' });
    return NextResponse.json({ error: 'Failed to export transcript' }, { status: 500 });
  } finally {
    const duration = Math.round(performance.now() - startTime);
    logSlowRequest('GET /api/transcripts/[id]/export', duration, 5000);
  }
};

export const GET = withRouteProtection(
  {
    requireAuth: true,
    requireRole: ALLOWED_ROLES,
    requireFirm: true,
    auditAction: 'TRANSCRIPT_EXPORTED',
  },
  GETHandler
);

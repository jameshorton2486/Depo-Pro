// app/api/transcripts/[id]/export/route.ts
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptForExport, getTranscriptEdits } from '@/lib/supabase/queries/transcripts';
import { exportTranscript } from '@/lib/export';
import type { ExportOptions, ExportMetadata } from '@/types/transcript';
import { checkUserRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';
import { useQuota } from '@/lib/cost-control-service';
import { canExportFormat, canUseProfile } from '@/lib/export/permissions';
import { getExportProfile } from '@/lib/export/profiles';
import { createAuditLog, AuditAction, AuditTargetType } from '@/lib/audit-service';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ExportWord {
  word: string;
  correctedWord?: string;
  isEdited?: boolean;
}

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

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: transcriptId } = await context.params;

    // Rate limit check
    const rateLimit = checkUserRateLimit(currentUser.id, 'TRANSCRIPT_EXPORT');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    // Quota check
    if (currentUser.firmId) {
      const _tier = 'FREE'; // TODO: Get from subscription
      const quotaCheck = await useQuota(currentUser.firmId, 'exports', 1);
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
    const supabase = await createSupabaseServerClient();
    const transcription = await getTranscriptForExport(supabase, transcriptId);

    if (!transcription) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = transcription.job.created_by_id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    const isSameFirm = transcription.job.firm_id === currentUser.firmId;

    if (!isOwner && !isAdmin && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Phase 3C-2: Check export format permissions
    const userRole = currentUser.role as any;
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
        if (!edit?.edited_text || !edit?.metadata) {
          continue;
        }

        const metadata = edit.metadata as { wordIndex?: number };
        if (typeof metadata.wordIndex !== 'number' || !Number.isInteger(metadata.wordIndex)) {
          continue;
        }
        const wordIndex = metadata.wordIndex;
        if (wordIndex < 0 || wordIndex >= words.length) {
          continue;
        }

        words[wordIndex].correctedWord = edit.edited_text;
        words[wordIndex].isEdited = true;
      }

      // Apply in-record review corrections (new shape and legacy array shape) last.
      const flaggedCorrections = getFlaggedCorrections(transcription.flagged_segments);
      for (const [wordIndex, correctedWord] of flaggedCorrections.entries()) {
        if (wordIndex < 0 || wordIndex >= words.length) {
          continue;
        }
        words[wordIndex].correctedWord = correctedWord;
        words[wordIndex].isEdited = true;
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

    // Generate export with corrected text
    const { buffer, filename, contentType } = await exportTranscript(
      exportText,
      metadata,
      exportOptions,
    );

    // Phase 3C-3: Log export to audit trail
    await createAuditLog({
      actorUserId: currentUser.id,
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
    if (process.env.NODE_ENV === 'production') {
      console.error('[CRITICAL] transcript export failure', error);
    }
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export transcript' }, { status: 500 });
  }
}

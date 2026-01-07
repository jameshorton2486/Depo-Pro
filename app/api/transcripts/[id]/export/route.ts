// app/api/transcripts/[id]/export/route.ts
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptForExport, getTranscriptEdits } from '@/lib/supabase/queries/transcripts';
import { exportTranscript } from '@/lib/export';
import type { ExportOptions, ExportMetadata } from '@/types/transcript';
import { checkUserRateLimit, rateLimitResponse } from '@/lib/rate-limit-service';
import { useQuota } from '@/lib/cost-control-service';
import { canExportFormat, canUseProfile } from '@/lib/export/permissions';
import { getExportProfile } from '@/lib/export/profiles';
import { createAuditLog, AuditAction, AuditTargetType } from '@/lib/audit-service';

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
    const { id: transcriptId } = await context.params;

    // Rate limit check
    const rateLimit = checkUserRateLimit(user.id, 'TRANSCRIPT_EXPORT');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    // Quota check
    if (user.firmId) {
      const _tier = 'FREE'; // TODO: Get from subscription
      const quotaCheck = await useQuota(user.firmId, 'exports', 1);
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
    const isOwner = transcription.job.created_by_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSameFirm = transcription.job.firm_id === user.firmId;

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

    if (!transcription.full_transcript) {
      return NextResponse.json({ error: 'No transcript text available' }, { status: 400 });
    }

    // Apply edits before export (Phase 7 requirement)
    let exportText = transcription.full_transcript || '';

    // Fetch all edits for this transcription
    const edits = await getTranscriptEdits(supabase, transcriptId);

    // If there are edits, apply them to the words array
    if (edits.length > 0 && transcription.words) {
      try {
        const words = JSON.parse(transcription.words as string) as Array<{
          word: string;
          correctedWord?: string;
          isEdited?: boolean;
        }>;

        // Apply corrections from TranscriptionEdit records
        // Edit metadata contains wordIndex and wordId
        edits.forEach(edit => {
          if (edit.edited_text && edit.metadata) {
            const metadata = edit.metadata as { wordIndex?: number; wordId?: string };
            const wordIndex = metadata.wordIndex;

            if (wordIndex !== undefined && wordIndex !== null && words[wordIndex]) {
              words[wordIndex].word = edit.edited_text;
              words[wordIndex].correctedWord = edit.edited_text;
              words[wordIndex].isEdited = true;
            }
          }
        });

        // Also check flaggedSegments for correctedWord values (may have been updated directly)
        if (transcription.flagged_segments) {
          const flaggedSegments = JSON.parse(transcription.flagged_segments as string) as Array<{
            wordIndex: number;
            correctedWord?: string;
            word: string;
          }>;

          flaggedSegments.forEach(segment => {
            if (segment.correctedWord && segment.wordIndex !== undefined) {
              const wordIndex = segment.wordIndex;
              if (words[wordIndex]) {
                words[wordIndex].word = segment.correctedWord;
                words[wordIndex].correctedWord = segment.correctedWord;
                words[wordIndex].isEdited = true;
              }
            }
          });
        }

        // Generate corrected text from words array
        exportText = words.map(w => w.correctedWord || w.word).join(' ');
      } catch (error) {
        console.error('Error applying edits to export:', error);
        // Fall back to original transcript if edit application fails
      }
    } else if (transcription.flagged_segments) {
      // Even without TranscriptionEdit records, check flaggedSegments for corrections
      try {
        const flaggedSegments = JSON.parse(transcription.flagged_segments as string) as Array<{
          wordIndex: number;
          correctedWord?: string;
          word: string;
        }>;

        const words = JSON.parse(transcription.words as string) as Array<{
          word: string;
          correctedWord?: string;
        }>;

        flaggedSegments.forEach(segment => {
          if (segment.correctedWord && segment.wordIndex !== undefined && words[segment.wordIndex]) {
            words[segment.wordIndex].word = segment.correctedWord;
            words[segment.wordIndex].correctedWord = segment.correctedWord;
          }
        });

        exportText = words.map(w => w.correctedWord || w.word).join(' ');
      } catch (error) {
        console.error('Error applying flagged segment corrections to export:', error);
      }
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
    }).catch(() => {}); // Fire and forget

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

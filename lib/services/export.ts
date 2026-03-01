import { createSupabaseServerClient } from '@/lib/supabase/server';
import { exportToDocx } from '@/lib/export';
import { generateLegalTranscriptDocx } from '@/src/lib/transcription/legal-formatter';
import { postProcessSegments } from '@/src/lib/transcription/post-process';
import {
  DEFAULT_FORMAT_OPTIONS,
  DEFAULT_PROCESSING_RULES,
  type TranscriptFormatConfig,
  type TranscriptSegment,
} from '@/src/types/transcript-format';

interface StoredSegment {
  speaker?: number;
  text?: string;
  start?: number;
  end?: number;
}

function toTranscriptSegments(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((seg): seg is StoredSegment => !!seg && typeof seg === 'object')
    .map((seg) => ({
      speakerId: `Speaker ${typeof seg.speaker === 'number' ? seg.speaker : 0}`,
      text: typeof seg.text === 'string' ? seg.text : '',
      startTime: typeof seg.start === 'number' ? seg.start : undefined,
      endTime: typeof seg.end === 'number' ? seg.end : undefined,
    }))
    .filter((seg) => seg.text.length > 0);
}

function normalizeFormatConfig(
  formatConfig: TranscriptFormatConfig,
): TranscriptFormatConfig {
  return {
    speakerMappings: Array.isArray(formatConfig.speakerMappings)
      ? formatConfig.speakerMappings
      : [],
    examinationSections: Array.isArray(formatConfig.examinationSections)
      ? formatConfig.examinationSections
      : [],
    formatOptions: {
      ...DEFAULT_FORMAT_OPTIONS,
      ...(formatConfig.formatOptions || {}),
    },
    processingRules: {
      ...DEFAULT_PROCESSING_RULES,
      ...(formatConfig.processingRules || {}),
    },
  };
}

/**
 * Generate a legal-formatted DOCX transcript using speaker mappings and Q/A format.
 * Falls back to the basic exportToDocx when no format settings are configured.
 */
export async function exportLegalDocx(
  jobId: string,
  formatConfig: TranscriptFormatConfig | null,
): Promise<Buffer> {
  const supabase = await createSupabaseServerClient();

  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('segments, full_transcript, original_transcript')
    .eq('job_id', jobId)
    .single();

  if (!transcription) {
    throw new Error('Transcription not found');
  }

  if (!formatConfig || formatConfig.speakerMappings.length === 0) {
    return exportToDocx(
      transcription.full_transcript || transcription.original_transcript || '',
      {
        caseName: 'Transcript',
        depositionDate: new Date(),
        deponentName: 'Unknown',
      },
      {
        format: 'docx',
        includeSpeakerLabels: true,
        lineNumbering: true,
        useQAFormat: false,
        includeTimestamps: false,
        linesPerPage: 25,
      },
    );
  }

  const resolvedConfig = normalizeFormatConfig(formatConfig);
  const rawSegments = toTranscriptSegments(transcription.segments);
  const processedSegments = postProcessSegments(
    rawSegments,
    resolvedConfig.processingRules,
    resolvedConfig.formatOptions.sentenceSpaces,
  );

  return generateLegalTranscriptDocx(processedSegments, resolvedConfig);
}

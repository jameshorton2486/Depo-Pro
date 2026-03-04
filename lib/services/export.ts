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

export function toTranscriptSegments(value: unknown): TranscriptSegment[] {
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

export function normalizeFormatConfig(
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
/**
 * Fetch corrections from transcription_edits and flagged_words tables,
 * then apply them to a flat transcript text in priority order:
 *   1. transcription_edits (oldest → newest, newest wins)
 *   2. flagged_words with status CORRECTED/CONFIRMED (highest priority)
 */
async function applyCorrections(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  transcriptionId: string,
  rawText: string,
): Promise<string> {
  // Split preserving whitespace so we can rejoin cleanly
  const tokens = rawText.split(/(\s+)/);
  const wordTokens: { index: number; tokenIndex: number }[] = [];
  tokens.forEach((tok, i) => {
    if (tok.trim().length > 0) {
      wordTokens.push({ index: wordTokens.length, tokenIndex: i });
    }
  });
  if (wordTokens.length === 0) return rawText;

  // Layer 1: transcription_edits (oldest → newest)
  const { data: edits } = await supabase
    .from('transcription_edits')
    .select('word_index, edited_text, new_value, metadata')
    .eq('transcription_id', transcriptionId)
    .order('created_at', { ascending: true });

  if (edits) {
    for (const edit of edits) {
      const correctedWord = edit.new_value || edit.edited_text;
      if (!correctedWord) continue;
      const wordIndex = typeof edit.word_index === 'number'
        ? edit.word_index
        : (edit.metadata as { wordIndex?: number } | null)?.wordIndex;
      if (typeof wordIndex !== 'number' || wordIndex < 0 || wordIndex >= wordTokens.length) continue;
      tokens[wordTokens[wordIndex].tokenIndex] = correctedWord;
    }
  }

  // Layer 2: flagged_words with CORRECTED/CONFIRMED status (highest priority)
  const { data: flaggedRows } = await supabase
    .from('flagged_words')
    .select('word_index, corrected_word')
    .eq('transcription_id', transcriptionId)
    .in('status', ['CORRECTED', 'CONFIRMED'])
    .not('corrected_word', 'is', null);

  if (flaggedRows) {
    for (const fw of flaggedRows) {
      if (typeof fw.word_index !== 'number' || fw.word_index < 0 || fw.word_index >= wordTokens.length) continue;
      if (!fw.corrected_word) continue;
      tokens[wordTokens[fw.word_index].tokenIndex] = fw.corrected_word;
    }
  }

  return tokens.join('');
}

export async function exportLegalDocx(
  jobId: string,
  formatConfig: TranscriptFormatConfig | null,
): Promise<Buffer> {
  const supabase = await createSupabaseServerClient();

  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('id, segments, full_transcript, original_transcript')
    .eq('job_id', jobId)
    .single();

  if (!transcription) {
    throw new Error('Transcription not found');
  }

  // Apply corrections from transcription_edits + flagged_words
  const correctedText = await applyCorrections(
    supabase,
    transcription.id,
    transcription.full_transcript || transcription.original_transcript || '',
  );

  if (!formatConfig || formatConfig.speakerMappings.length === 0) {
    return exportToDocx(
      correctedText,
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

  // TODO P1: apply flagged_words corrections to segment text
  const resolvedConfig = normalizeFormatConfig(formatConfig);
  const rawSegments = toTranscriptSegments(transcription.segments);
  const processedSegments = postProcessSegments(
    rawSegments,
    resolvedConfig.processingRules,
    resolvedConfig.formatOptions.sentenceSpaces,
  );

  return generateLegalTranscriptDocx(processedSegments, resolvedConfig);
}

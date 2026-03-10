import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildParagraphs } from './paragraph-builder';
import { paginateParagraphs } from './paginator';
import { postProcessParagraphs } from './post-processor';
import { runQualityGate } from './quality-gate';
import { detectSections } from './section-detector';
import type {
  FormatterOptions,
  FormatterResult,
  JurisdictionConfig,
  SpeakerAssignment,
  TranscriptWord,
} from './types';

export async function formatTranscript(
  transcriptionId: string,
  options: FormatterOptions = {}
): Promise<FormatterResult> {
  const supabase = await createSupabaseServerClient();
  const jurisdictionCode = options.jurisdiction ?? 'TX';

  const { data: words, error: wordsError } = await supabase
    .from('transcript_words')
    .select('*')
    .eq('transcription_id', transcriptionId)
    .eq('is_deleted', false)
    .order('position_index', { ascending: true });

  if (wordsError) {
    throw new Error(`Failed to load words: ${wordsError.message}`);
  }

  const { data: speakers } = await supabase
    .from('speaker_assignments')
    .select('*')
    .eq('transcription_id', transcriptionId);

  const { data: jurisdiction } = await supabase
    .from('jurisdiction_configs')
    .select('*')
    .eq('state_code', jurisdictionCode)
    .single();

  if (!jurisdiction) {
    throw new Error(`Jurisdiction config not found for: ${jurisdictionCode}`);
  }

  const typedWords = (words ?? []) as TranscriptWord[];
  const typedSpeakers = (speakers ?? []) as SpeakerAssignment[];
  const typedJurisdiction = jurisdiction as JurisdictionConfig;

  const sectionMap = detectSections(typedWords, typedSpeakers);
  const paragraphs = buildParagraphs(typedWords, typedSpeakers, sectionMap, typedJurisdiction);
  const processed = postProcessParagraphs(paragraphs);
  const paginated = paginateParagraphs(processed, typedJurisdiction);

  if (!options.dryRun) {
    const firmId = typedWords[0]?.firm_id;
    if (!firmId) {
      throw new Error('Cannot persist paragraphs without firm_id');
    }

    await supabase
      .from('transcript_paragraphs')
      .delete()
      .eq('transcription_id', transcriptionId)
      .eq('firm_id', firmId);

    const rows = paginated.map((paragraph, index) => ({
      transcription_id: transcriptionId,
      firm_id: firmId,
      paragraph_type: paragraph.paragraph_type,
      text: paragraph.raw_text ?? paragraph.text,
      formatted_text: paragraph.text,
      start_word_idx: paragraph.start_word_idx ?? null,
      end_word_idx: paragraph.end_word_idx ?? null,
      speaker_index: paragraph.speaker_index,
      speaker_label: paragraph.speaker_label,
      qa_label:
        paragraph.paragraph_type === 'QUESTION'
          ? 'Q'
          : paragraph.paragraph_type === 'ANSWER'
            ? 'A'
            : null,
      deposition_section: paragraph.section_type,
      requires_reentry_marker: paragraph.requires_reentry_marker ?? false,
      has_interruption: paragraph.has_interruption ?? false,
      paragraph_order: index,
      page_number: paragraph.page_number,
      line_number_start: paragraph.line_number_start,
      line_number_end: paragraph.line_number_end,
      line_count: paragraph.line_count,
    }));

    const { error: insertError } = await supabase
      .from('transcript_paragraphs')
      .insert(rows);

    if (insertError) {
      throw new Error(`Failed to persist paragraphs: ${insertError.message}`);
    }
  }

  const qualityGate = await runQualityGate(transcriptionId, {
    firmId: typedWords[0]?.firm_id,
    paragraphs: paginated,
  });

  return {
    paragraphs: paginated,
    pageCount: paginated.at(-1)?.page_number ?? 1,
    qualityGate,
  };
}

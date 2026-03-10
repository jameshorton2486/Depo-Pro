import { describe, expect, it } from 'vitest';
import { buildParagraphs } from '@/lib/transcription/formatter/paragraph-builder';
import type { JurisdictionConfig, SpeakerAssignment, TranscriptWord } from '@/lib/transcription/formatter/types';

const jurisdiction: JurisdictionConfig = {
  state_code: 'TX',
  lines_per_page: 25,
  font: 'Courier New',
  font_size_pt: 12,
  left_margin_inches: 1,
  right_margin_inches: 0.375,
  qa_signifier_spaces: 5,
  qa_text_offset_spaces: 10,
  colloquy_indent_spaces: 15,
  min_chars_per_line: 56,
  require_line_numbers: true,
  certification_language: null,
};

function makeWord(position_index: number, speaker_index: number, display_word: string): TranscriptWord {
  return {
    id: `${speaker_index}-${position_index}`,
    transcription_id: 't1',
    firm_id: 'f1',
    position_index,
    word: display_word,
    punctuated_word: display_word,
    display_word,
    original_word: display_word,
    start_time: position_index,
    end_time: position_index + 0.5,
    confidence: 0.99,
    confidence_class: 'HIGH',
    speaker_index,
    is_corrected: false,
    corrected_word: null,
    is_filler: false,
    is_deleted: false,
  };
}

describe('buildParagraphs', () => {
  it('uses Q/A labels in examination sections', () => {
    const words = [makeWord(0, 0, 'Question'), makeWord(1, 1, 'Answer')];
    const speakers: SpeakerAssignment[] = [
      { transcription_id: 't1', speaker_index: 0, role: 'examining_attorney', full_name: 'John Smith', last_name: 'Smith', colloquy_label: 'MR. SMITH:', qa_label: 'Q' },
      { transcription_id: 't1', speaker_index: 1, role: 'witness', full_name: 'Jane Doe', last_name: 'Doe', colloquy_label: 'THE WITNESS:', qa_label: 'A' },
    ];
    const sectionMap = new Map<number, any>([[0, 'DIRECT_EXAMINATION'], [1, 'DIRECT_EXAMINATION']]);
    const paragraphs = buildParagraphs(words, speakers, sectionMap, jurisdiction);
    expect(paragraphs.some((paragraph) => paragraph.speaker_label === 'Q.')).toBe(true);
    expect(paragraphs.some((paragraph) => paragraph.speaker_label === 'A.')).toBe(true);
  });

  it('uses THE REPORTER in colloquy', () => {
    const words = [makeWord(0, 2, 'Ready')];
    const speakers: SpeakerAssignment[] = [
      { transcription_id: 't1', speaker_index: 2, role: 'reporter', full_name: 'Miah Bardot', last_name: 'Bardot', colloquy_label: 'THE COURT REPORTER:', qa_label: null },
    ];
    const sectionMap = new Map<number, any>([[0, 'COLLOQUY']]);
    const paragraphs = buildParagraphs(words, speakers, sectionMap, jurisdiction);
    expect(paragraphs[0].speaker_label).toBe('THE REPORTER:');
  });
});

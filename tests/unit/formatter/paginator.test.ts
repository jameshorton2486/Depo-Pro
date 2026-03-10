import { describe, expect, it } from 'vitest';
import { paginateParagraphs } from '@/lib/transcription/formatter/paginator';
import type { JurisdictionConfig, Paragraph } from '@/lib/transcription/formatter/types';

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

function para(index: number, text: string): Paragraph {
  return {
    paragraph_index: index,
    paragraph_type: 'QUESTION',
    section_type: 'DIRECT_EXAMINATION',
    speaker_index: 0,
    speaker_label: 'Q.',
    text,
    word_ids: [],
    line_count: 1,
  };
}

describe('paginateParagraphs', () => {
  it('starts page numbering at 1', () => {
    const paginated = paginateParagraphs([para(0, 'First question.')], jurisdiction);
    expect(paginated[0].page_number).toBe(1);
    expect(paginated[0].line_number_start).toBe(1);
  });

  it('does not exceed 25 lines per page', () => {
    const paragraphs = Array.from({ length: 30 }, (_, index) => para(index, `Question ${index}`));
    const paginated = paginateParagraphs(paragraphs, jurisdiction);
    expect(paginated.every((paragraph) => paragraph.line_number_end <= 25)).toBe(true);
  });
});

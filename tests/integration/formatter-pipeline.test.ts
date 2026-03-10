import { describe, expect, it } from 'vitest';
import olivarezFixture from '../fixtures/olivarez-deepgram-output.json';
import { buildParagraphs } from '@/lib/transcription/formatter/paragraph-builder';
import { assembleDocx } from '@/lib/transcription/formatter/docx-assembler';
import { generateInclusionPages } from '@/lib/transcription/formatter/inclusion-pages';
import { paginateParagraphs } from '@/lib/transcription/formatter/paginator';
import { postProcessParagraphs, postProcessText } from '@/lib/transcription/formatter/post-processor';
import { detectSections } from '@/lib/transcription/formatter/section-detector';
import type {
  JurisdictionConfig,
  SpeakerAssignment,
  TranscriptWord,
} from '@/lib/transcription/formatter/types';

const DEFAULT_JURISDICTION: JurisdictionConfig = {
  state_code: 'TX',
  font: 'Courier New',
  font_size_pt: 12,
  lines_per_page: 25,
  left_margin_inches: 1.0,
  right_margin_inches: 0.375,
  qa_signifier_spaces: 5,
  qa_text_offset_spaces: 10,
  colloquy_indent_spaces: 15,
  min_chars_per_line: 56,
  require_line_numbers: true,
  certification_language: 'JBCC/UFM',
};

const SPEAKERS: SpeakerAssignment[] = [
  {
    transcription_id: 't1',
    firm_id: 'f1',
    speaker_index: 0,
    role: 'examining_attorney',
    full_name: 'John Smith',
    last_name: 'Smith',
    colloquy_label: 'MR. SMITH:',
    qa_label: 'Q',
  },
  {
    transcription_id: 't1',
    firm_id: 'f1',
    speaker_index: 1,
    role: 'witness',
    full_name: 'Maria Dolores Olivarez',
    last_name: 'Olivarez',
    colloquy_label: 'THE WITNESS:',
    qa_label: 'A',
  },
  {
    transcription_id: 't1',
    firm_id: 'f1',
    speaker_index: 2,
    role: 'reporter',
    full_name: 'Miah Bardot',
    last_name: 'Bardot',
    colloquy_label: 'THE REPORTER:',
    qa_label: null,
  },
];

function hydrateFixtureWords(): TranscriptWord[] {
  const words = olivarezFixture.results.channels[0].alternatives[0].words;
  return words.map((word, index) => ({
    id: `w-${index}`,
    transcription_id: 't1',
    firm_id: 'f1',
    position_index: index,
    original_word: word.word,
    word: word.word,
    punctuated_word: word.punctuated_word,
    display_word: word.punctuated_word ?? word.word,
    corrected_word: null,
    start_time: word.start,
    end_time: word.end,
    confidence: word.confidence,
    confidence_class:
      word.confidence >= 0.9
        ? 'HIGH'
        : word.confidence >= 0.8
          ? 'MEDIUM'
          : word.confidence >= 0.7
            ? 'LOW'
            : 'CRITICAL',
    speaker_index: word.speaker,
    is_corrected: false,
    is_deleted: false,
    is_filler: false,
  }));
}

describe('Phase 1 formatter pipeline', () => {
  it('loads a realistic fixture with 3 speakers and a known misrecognition', () => {
    const words = olivarezFixture.results.channels[0].alternatives[0].words;
    const speakers = new Set(words.map((word) => word.speaker));
    const miyamardeau = words.find((word) => word.word.toLowerCase() === 'miyamardeau');

    expect(words.length).toBeGreaterThan(50);
    expect(speakers.size).toBe(3);
    expect(miyamardeau?.confidence).toBeLessThan(0.5);
  });

  it('runs the pure formatter chain end to end and produces a DOCX buffer', async () => {
    const transcriptWords = hydrateFixtureWords();
    const sectionMap = detectSections(transcriptWords, SPEAKERS);
    const paragraphs = buildParagraphs(transcriptWords, SPEAKERS, sectionMap, DEFAULT_JURISDICTION);
    const processed = postProcessParagraphs(paragraphs);
    const paginated = paginateParagraphs(processed, DEFAULT_JURISDICTION);
    const inclusionPages = await generateInclusionPages({
      caseName: 'Houston v. Olivarez',
      causeNumber: 'C-3123-25-J',
      deponentName: 'Maria Dolores Olivarez',
      depositionDate: '2026-03-09',
      county: 'Harris',
      reporterName: 'Miah Bardot',
      reporterCsrNumber: '12129',
      participants: [
        { role: 'For the Plaintiff', full_name: 'John Smith', firm_name: 'Smith & Associates' },
        { role: 'Court Reporter', full_name: 'Miah Bardot', firm_name: 'SA Legal Solutions' },
      ],
      examinationIndex: [{ title: 'DIRECT EXAMINATION BY MR. SMITH', page_number: 1 }],
    });

    const buffer = await assembleDocx(paginated, inclusionPages, {
      transcriptionId: 't1',
      jurisdiction: DEFAULT_JURISDICTION,
      jobMetadata: {
        caseName: 'Houston v. Olivarez',
        deponentName: 'Maria Dolores Olivarez',
        depositionDate: '2026-03-09',
        reporterName: 'Miah Bardot',
        reporterCsrNumber: '12129',
      },
    });

    expect(paragraphs.length).toBeGreaterThan(0);
    expect(processed.some((paragraph) => paragraph.speaker_label === 'THE REPORTER:')).toBe(true);
    expect(processed.every((paragraph) => !paragraph.text.includes('THE COURT REPORTER'))).toBe(true);
    expect(processed.every((paragraph) => !/[\u2014\u2013—–]/.test(paragraph.text))).toBe(true);
    expect(paginated[0].page_number).toBe(1);
    expect(paginated.every((paragraph) => paragraph.line_number_end <= 25)).toBe(true);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('normalizes time, doctor titles, and em dash usage', () => {
    const text = postProcessText('THE COURT REPORTER noted the time is 2:12 PM and Doctor Salinas arrived—late.');
    expect(text).toContain('THE REPORTER');
    expect(text).toContain('2:12 p.m.');
    expect(text).toContain('Dr. Salinas');
    expect(text).not.toMatch(/[\u2014\u2013—–]/);
  });
});

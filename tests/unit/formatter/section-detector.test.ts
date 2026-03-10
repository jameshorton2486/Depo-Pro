import { describe, expect, it } from 'vitest';
import { detectSections } from '@/lib/transcription/formatter/section-detector';
import type { TranscriptWord } from '@/lib/transcription/formatter/types';

function makeWord(position_index: number, display_word: string): TranscriptWord {
  return {
    id: String(position_index),
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
    speaker_index: 0,
    is_corrected: false,
    corrected_word: null,
    is_filler: false,
    is_deleted: false,
  };
}

describe('detectSections', () => {
  it('detects DIRECT EXAMINATION', () => {
    const sections = detectSections([makeWord(0, 'DIRECT'), makeWord(1, 'EXAMINATION')], []);
    expect(sections.get(1)).toBe('DIRECT_EXAMINATION');
  });

  it('detects CROSS-EXAMINATION', () => {
    const sections = detectSections([makeWord(0, 'CROSS-EXAMINATION')], []);
    expect(sections.get(0)).toBe('CROSS_EXAMINATION');
  });

  it('detects OFF THE RECORD and resumes after BACK ON THE RECORD', () => {
    const sections = detectSections(
      [
        makeWord(0, 'DIRECT'),
        makeWord(1, 'EXAMINATION'),
        makeWord(2, 'OFF'),
        makeWord(3, 'THE'),
        makeWord(4, 'RECORD'),
        makeWord(5, 'BACK'),
        makeWord(6, 'ON'),
        makeWord(7, 'THE'),
        makeWord(8, 'RECORD'),
      ],
      []
    );

    expect(sections.get(4)).toBe('OFF_RECORD');
    expect(sections.get(8)).toBe('DIRECT_EXAMINATION');
  });

  it('defaults to PREAMBLE', () => {
    const sections = detectSections([makeWord(0, 'Hello')], []);
    expect(sections.get(0)).toBe('PREAMBLE');
  });
});

import { describe, expect, it } from 'vitest';
import { runQualityGate } from '@/lib/transcription/formatter/quality-gate';
import type { PaginatedParagraph } from '@/lib/transcription/formatter/types';

function createQuery(result: any) {
  return {
    eq() { return this; },
    select() { return Promise.resolve(result); },
    single() { return Promise.resolve(result); },
  };
}

const stubSupabase = {
  from(table: string) {
    switch (table) {
      case 'transcript_flags':
        return createQuery({ count: 1, data: [] });
      case 'transcript_words':
        return createQuery({ count: 1, data: [{ speaker_index: 1 }] });
      case 'speaker_assignments':
        return createQuery({ data: [] });
      case 'transcriptions':
        return createQuery({ data: { job_id: 'j1' } });
      case 'jobs':
        return createQuery({ data: { reporter_id: 'u1' } });
      case 'profiles':
        return createQuery({ data: null });
      case 'exhibit_markers':
        return createQuery({ data: [{ transcript_page: null }] });
      case 'flagged_words':
        return createQuery({ count: 1, data: [] });
      default:
        return createQuery({ count: 0, data: [] });
    }
  },
};

describe('runQualityGate', () => {
  it('returns errors and warnings when violations exist', async () => {
    const paragraphs: PaginatedParagraph[] = [
      {
        paragraph_index: 0,
        paragraph_type: 'COLLOQUY',
        section_type: 'COLLOQUY',
        speaker_index: 0,
        speaker_label: 'THE COURT REPORTER:',
        text: '[SCOPIST: check this] — note',
        word_ids: [],
        line_count: 1,
        page_number: 1,
        line_number_start: 1,
        line_number_end: 26,
      },
    ];

    const result = await runQualityGate('t1', { supabase: stubSupabase as any, paragraphs });
    expect(result.passed).toBe(false);
    expect(result.exportBlocked).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

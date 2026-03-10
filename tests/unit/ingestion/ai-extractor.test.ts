import { describe, expect, it } from 'vitest';
import { parseExtractionResponse, truncateExtractionText } from '@/lib/ingestion/ai-extractor';

describe('ai-extractor', () => {
  it('parses valid JSON into extraction result', () => {
    const result = parseExtractionResponse(JSON.stringify({
      document_type: 'notice_of_deposition',
      confidence: 0.9,
      case_information: { cause_number: 'C-1', case_style: 'A v. B', court_name: null, court_number: null, county: null, state: 'Texas' },
      parties: { plaintiffs: ['A'], defendants: ['B'], third_parties: [] },
      attorneys: [],
      deposition_sessions: [{ deponent_name: 'A', deposition_date: '2026-03-04', start_time: '10:00', location: 'Zoom', is_remote: true, remote_platform: 'zoom', zoom_link: null, is_videotaped: false, includes_duces_tecum: false }],
      court_reporter: { firm: null, name: null, phone: null },
      transcription_keywords: { names: ['A'], firms: [], locations: [], legal_terms: [], all_keywords: ['A'] },
      ordered_by: null,
      notes: null,
    }));

    expect(result.document_type).toBe('notice_of_deposition');
    expect(result.deposition_sessions).toHaveLength(1);
  });

  it('returns safe fallback for invalid JSON', () => {
    const result = parseExtractionResponse('{bad json');
    expect(result.confidence).toBe(0);
    expect(result.case_information.cause_number).toBeNull();
  });

  it('truncates text at 15000 chars', () => {
    const long = 'a'.repeat(20000);
    expect(truncateExtractionText(long)).toHaveLength(15000);
  });
});

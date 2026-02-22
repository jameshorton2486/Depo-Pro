import { describe, it, expect } from 'vitest';
import { exportToPdf, exportToDocx } from '@/lib/export';
import type { ExportMetadata, ExportOptions } from '@/types/transcript';

function generateMockTranscript(lineCount: number): string {
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const speaker = i % 2 === 0 ? 'Q.' : 'A.';
    lines.push(`${speaker} This is line ${i + 1} of the test transcript.`);
  }
  return lines.join(' ');
}

const mockMetadata: ExportMetadata = {
  caseName: 'Smith v. Jones',
  caseNumber: '2024-CV-12345',
  depositionDate: new Date('2026-01-15'),
  deponentName: 'John Smith',
  courtReporterName: 'Jane Reporter',
  firmName: 'Legal Transcription Services',
};

const opts: ExportOptions = {
  format: 'pdf',
  includeTimestamps: false,
  includeSpeakerLabels: true,
  lineNumbering: true,
  useQAFormat: true,
  linesPerPage: 25,
};

describe('PDF Export - Legal Formatting', () => {
  it('produces valid PDF (magic bytes)', async () => {
    const buf = await exportToPdf(generateMockTranscript(25), mockMetadata, opts);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('produces valid DOCX (ZIP magic bytes)', async () => {
    const buf = await exportToDocx(generateMockTranscript(25), mockMetadata, {
      ...opts,
      format: 'docx',
    });
    expect(buf.slice(0, 2).toString()).toBe('PK');
  });

  it('handles 75 lines (3 pages) without error', async () => {
    const buf = await exportToPdf(generateMockTranscript(75), mockMetadata, opts);
    expect(buf.length).toBeGreaterThan(1024);
  });

  it('handles empty transcript', async () => {
    const buf = await exportToPdf('', mockMetadata, opts);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('handles special characters', async () => {
    const text = 'Q. Did you see the "contract" - worth $1,000,000 & signed by O\'Brien?';
    const buf = await exportToPdf(text, mockMetadata, opts);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('handles very long answers', async () => {
    const long = 'A. ' + 'Long answer text testing word wrap. '.repeat(50);
    const buf = await exportToPdf(long, mockMetadata, opts);
    expect(buf.length).toBeGreaterThan(0);
  });
});

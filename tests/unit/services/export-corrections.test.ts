import { describe, expect, it } from 'vitest';
import { exportToDocx, exportToPdf, exportToText } from '@/lib/export';
import type { ExportMetadata, ExportOptions } from '@/types/transcript';

const metadata: ExportMetadata = {
  caseName: 'Smith v. Jones',
  caseNumber: 'CV-2026-001',
  depositionDate: new Date('2026-02-24'),
  deponentName: 'John Smith',
  courtReporterName: 'Jane Reporter',
  firmName: 'Legal Services Inc',
};

const baseOptions: ExportOptions = {
  format: 'docx',
  includeTimestamps: false,
  includeSpeakerLabels: true,
  lineNumbering: true,
  useQAFormat: true,
  linesPerPage: 25,
};

describe('Export with Pre-Applied Corrections', () => {
  const correctedText = 'Q. Please state your name for the record.';

  it('DOCX produces valid ZIP buffer (PK header)', async () => {
    const buffer = await exportToDocx(correctedText, metadata, {
      ...baseOptions,
      format: 'docx',
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 2).toString()).toBe('PK');
  });

  it('PDF produces valid buffer (%PDF- header)', async () => {
    const buffer = await exportToPdf(correctedText, metadata, {
      ...baseOptions,
      format: 'pdf',
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('TXT contains corrected text, not original typo', () => {
    const buffer = exportToText(correctedText, metadata, {
      ...baseOptions,
      format: 'txt',
    });
    const text = buffer.toString('utf-8');
    expect(text).toContain('name');
    expect(text).not.toContain('naem');
  });

  it('handles Q/A formatting in TXT', () => {
    const qaText = 'Q. What is your name? A. My name is John Smith.';
    const buffer = exportToText(qaText, metadata, {
      ...baseOptions,
      format: 'txt',
    });
    const text = buffer.toString('utf-8');
    expect(text).toContain('Q.');
    expect(text).toContain('A.');
  });

  it('handles empty transcript without crashing', async () => {
    const buffer = await exportToPdf('', metadata, {
      ...baseOptions,
      format: 'pdf',
    });
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('handles special characters', async () => {
    const text = 'Q. Did you see the "contract" - worth $1,000,000 & signed by O\'Brien?';
    const buffer = await exportToPdf(text, metadata, {
      ...baseOptions,
      format: 'pdf',
    });
    expect(buffer.length).toBeGreaterThan(0);
  });
});

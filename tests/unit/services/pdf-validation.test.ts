import { describe, it, expect } from 'vitest';
import { exportToPdf, exportToDocx } from '@/lib/export';
import type { ExportMetadata, ExportOptions } from '@/types/transcript';

function generateMockTranscript(lineCount: number): string {
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const speaker = i % 2 === 0 ? 'Q.' : 'A.';
    lines.push(`${speaker} This is line number ${i + 1} of the test transcript.`);
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

const defaultOptions: ExportOptions = {
  format: 'pdf',
  includeTimestamps: false,
  includeSpeakerLabels: true,
  lineNumbering: true,
  useQAFormat: true,
  linesPerPage: 25,
};

describe('PDF Export - Legal Formatting Validation', () => {
  it('should produce a non-empty PDF buffer', async () => {
    const text = generateMockTranscript(25);
    const buffer = await exportToPdf(text, mockMetadata, defaultOptions);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('should produce a non-empty DOCX buffer', async () => {
    const text = generateMockTranscript(25);
    const buffer = await exportToDocx(text, mockMetadata, {
      ...defaultOptions,
      format: 'docx',
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 2).toString()).toBe('PK');
  });

  it('should handle 75 lines (3 pages) without crashing', async () => {
    const text = generateMockTranscript(75);
    const pdfBuffer = await exportToPdf(text, mockMetadata, defaultOptions);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const docxBuffer = await exportToDocx(text, mockMetadata, {
      ...defaultOptions,
      format: 'docx',
    });
    expect(docxBuffer.length).toBeGreaterThan(0);
  });

  it('should handle empty transcript gracefully', async () => {
    const pdfBuffer = await exportToPdf('', mockMetadata, defaultOptions);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('should handle special characters', async () => {
    const text = `Q. Did you see the "contract" - worth $1,000,000 & signed by O'Brien?`;
    const pdfBuffer = await exportToPdf(text, mockMetadata, defaultOptions);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('should handle very long answers', async () => {
    const longAnswer = 'A. ' + 'This is a very long answer that tests word wrapping behavior across multiple lines in the legal transcript format. '.repeat(20);
    const pdfBuffer = await exportToPdf(longAnswer, mockMetadata, defaultOptions);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });
});

describe('Export Parity - PDF vs DOCX', () => {
  it('should produce files of similar scale for same input', async () => {
    const text = generateMockTranscript(50);

    const pdfBuffer = await exportToPdf(text, mockMetadata, defaultOptions);
    const docxBuffer = await exportToDocx(text, mockMetadata, {
      ...defaultOptions,
      format: 'docx',
    });

    expect(pdfBuffer.length).toBeGreaterThan(1024);
    expect(docxBuffer.length).toBeGreaterThan(1024);
  });
});

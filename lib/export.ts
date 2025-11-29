// lib/export.ts
// Document export service for legal transcripts

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
} from 'docx';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { ExportOptions, ExportMetadata } from '@/types/transcript';

// Legal formatting constants
const LINES_PER_PAGE = 25;
const CHARS_PER_LINE = 65;
const LINE_NUMBER_INTERVAL = 5;

// Helper: Split text into lines of max length
function splitIntoLines(text: string, maxChars: number = CHARS_PER_LINE): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// Helper: Format date for legal documents
function formatDate(date: Date): string {
  return format(date, 'MMMM d, yyyy');
}

// Helper: Generate line numbers
function getLineNumber(lineIndex: number): string {
  const lineNum = lineIndex + 1;
  if (lineNum % LINE_NUMBER_INTERVAL === 0) {
    return lineNum.toString().padStart(2, ' ');
  }
  return '  ';
}

// ============================================
// DOCX EXPORT
// ============================================

export async function exportToDocx(
  transcriptText: string,
  metadata: ExportMetadata,
  options: ExportOptions
): Promise<Buffer> {
  const lines = splitIntoLines(transcriptText);
  const pages: string[][] = [];

  // Split into pages
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }

  // Create document sections
  const sections: any[] = [];

  // Title Page
  sections.push({
    properties: {},
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 4000 },
        children: [
          new TextRun({
            text: 'DEPOSITION TRANSCRIPT',
            bold: true,
            size: 32,
            font: 'Courier New',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 },
        children: [
          new TextRun({
            text: metadata.caseName || 'Case Name',
            size: 28,
            font: 'Courier New',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: `Case No: ${metadata.caseNumber || 'N/A'}`,
            size: 24,
            font: 'Courier New',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 },
        children: [
          new TextRun({
            text: `Deposition of: ${metadata.deponentName || 'Deponent'}`,
            size: 24,
            font: 'Courier New',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: `Date: ${formatDate(metadata.depositionDate || new Date())}`,
            size: 24,
            font: 'Courier New',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 },
        children: [
          new TextRun({
            text: `Reported by: ${metadata.courtReporterName || 'Court Reporter'}`,
            size: 20,
            font: 'Courier New',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: metadata.firmName || '',
            size: 20,
            font: 'Courier New',
          }),
        ],
      }),
    ],
  });

  // Appearances Page (placeholder)
  sections.push({
    properties: {},
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [
          new TextRun({
            text: 'APPEARANCES',
            bold: true,
            size: 28,
            font: 'Courier New',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 800 },
        children: [
          new TextRun({
            text: '[Appearances to be added]',
            size: 24,
            font: 'Courier New',
            italics: true,
          }),
        ],
      }),
    ],
  });

  // Transcript Pages
  let globalLineNumber = 0;
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageLines = pages[pageIndex];
    const paragraphs: Paragraph[] = [];

    for (let lineIndex = 0; lineIndex < pageLines.length; lineIndex++) {
      globalLineNumber++;
      const line = pageLines[lineIndex];
      const lineNum = options.lineNumbering ? getLineNumber(globalLineNumber - 1) : '';

      paragraphs.push(
        new Paragraph({
          spacing: { line: 360 }, // 1.5 line spacing
          children: [
            new TextRun({
              text: lineNum ? `${lineNum}  ` : '',
              size: 24,
              font: 'Courier New',
              color: '888888',
            }),
            new TextRun({
              text: line,
              size: 24,
              font: 'Courier New',
            }),
          ],
        })
      );
    }

    sections.push({
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${metadata.caseName || 'Deposition'} - ${metadata.deponentName || 'Deponent'}`,
                  size: 20,
                  font: 'Courier New',
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'Page ',
                  size: 20,
                  font: 'Courier New',
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 20,
                  font: 'Courier New',
                }),
              ],
            }),
          ],
        }),
      },
      children: paragraphs,
    });
  }

  const doc = new Document({
    sections,
  });

  return await Packer.toBuffer(doc);
}

// ============================================
// PDF EXPORT
// ============================================

export async function exportToPdf(
  transcriptText: string,
  metadata: ExportMetadata,
  options: ExportOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title Page
      doc.font('Courier').fontSize(16).text('DEPOSITION TRANSCRIPT', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).text(metadata.caseName || 'Case Name', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Case No: ${metadata.caseNumber || 'N/A'}`, { align: 'center' });
      doc.moveDown(2);
      doc.text(`Deposition of: ${metadata.deponentName || 'Deponent'}`, { align: 'center' });
      doc.moveDown();
      doc.text(`Date: ${formatDate(metadata.depositionDate || new Date())}`, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(10).text(`Reported by: ${metadata.courtReporterName || 'Court Reporter'}`, { align: 'center' });
      doc.text(metadata.firmName || '', { align: 'center' });

      // New page for transcript
      doc.addPage();

      // Header function
      const addHeader = () => {
        doc.fontSize(8)
          .text(
            `${metadata.caseName || 'Deposition'} - ${metadata.deponentName || 'Deponent'}`,
            72,
            30,
            { align: 'center', width: 468 }
          );
      };

      // Footer function
      const addFooter = (pageNum: number) => {
        doc.fontSize(8).text(`Page ${pageNum}`, 72, 750, { align: 'center', width: 468 });
      };

      // Split text into lines
      const lines = splitIntoLines(transcriptText);
      let currentPage = 2;
      let lineOnPage = 0;

      addHeader();

      doc.fontSize(12);
      const lineHeight = 24;
      let yPosition = 72;

      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (lineOnPage >= LINES_PER_PAGE) {
          addFooter(currentPage);
          doc.addPage();
          currentPage++;
          lineOnPage = 0;
          yPosition = 72;
          addHeader();
        }

        // Line number
        if (options.lineNumbering) {
          const lineNum = getLineNumber(i);
          doc.fillColor('#888888').text(lineNum, 40, yPosition);
        }

        // Line text
        doc.fillColor('#000000').text(lines[i], 72, yPosition);

        yPosition += lineHeight;
        lineOnPage++;
      }

      // Final page footer
      addFooter(currentPage);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// PLAIN TEXT EXPORT
// ============================================

export function exportToText(
  transcriptText: string,
  metadata: ExportMetadata,
  options: ExportOptions
): Buffer {
  const lines = splitIntoLines(transcriptText);
  let output = '';

  // Header
  output += '='.repeat(70) + '\n';
  output += 'DEPOSITION TRANSCRIPT\n';
  output += '='.repeat(70) + '\n\n';
  output += `Case: ${metadata.caseName || 'N/A'}\n`;
  output += `Case Number: ${metadata.caseNumber || 'N/A'}\n`;
  output += `Deponent: ${metadata.deponentName || 'N/A'}\n`;
  output += `Date: ${formatDate(metadata.depositionDate || new Date())}\n`;
  output += `Reporter: ${metadata.courtReporterName || 'N/A'}\n`;
  output += `Firm: ${metadata.firmName || 'N/A'}\n`;
  output += '\n' + '='.repeat(70) + '\n\n';

  // Transcript with line numbers
  let pageNum = 1;
  for (let i = 0; i < lines.length; i++) {
    // Page break indicator
    if (i > 0 && i % LINES_PER_PAGE === 0) {
      pageNum++;
      output += '\n' + '-'.repeat(40) + ` Page ${pageNum} ` + '-'.repeat(40) + '\n\n';
    }

    // Line number
    if (options.lineNumbering) {
      const lineNum = (i % LINES_PER_PAGE) + 1;
      const displayNum = lineNum % LINE_NUMBER_INTERVAL === 0 ? lineNum.toString().padStart(2, ' ') : '  ';
      output += `${displayNum} | `;
    }

    output += lines[i] + '\n';
  }

  // Footer
  output += '\n' + '='.repeat(70) + '\n';
  output += 'END OF TRANSCRIPT\n';
  output += '='.repeat(70) + '\n';

  return Buffer.from(output, 'utf-8');
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export async function exportTranscript(
  transcriptText: string,
  metadata: ExportMetadata,
  options: ExportOptions
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const dateStr = format(metadata.depositionDate || new Date(), 'yyyy-MM-dd');
  const baseName = `${metadata.caseName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Transcript'}_${dateStr}`;

  switch (options.format) {
    case 'docx': {
      const buffer = await exportToDocx(transcriptText, metadata, options);
      return {
        buffer,
        filename: `${baseName}.docx`,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    case 'pdf': {
      const buffer = await exportToPdf(transcriptText, metadata, options);
      return {
        buffer,
        filename: `${baseName}.pdf`,
        contentType: 'application/pdf',
      };
    }
    case 'txt':
    default: {
      const buffer = exportToText(transcriptText, metadata, options);
      return {
        buffer,
        filename: `${baseName}.txt`,
        contentType: 'text/plain',
      };
    }
  }
}

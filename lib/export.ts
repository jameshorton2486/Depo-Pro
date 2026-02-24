// lib/export.ts
// Document export service for legal transcripts
//
// ARCHITECTURE NOTE (FROZEN):
// Entry point: exportTranscript(text, metadata, options) → { buffer, filename, contentType }
// Called exclusively by app/api/transcripts/[id]/export/route.ts after the route
// has merged all correction layers (transcription_edits → flagged_segments → flagged_words).
//
// Supported formats: docx (default), pdf, txt
// Legal formatting: 25 lines/page, 65 chars/line, line numbers every 5 lines (Q&A mode)
//
// DO NOT add new format handlers here without a matching canExportFormat() entry in
// lib/export/permissions.ts and a format test in tests/integration/export.test.ts.

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
import type { ExportOptions, ExportMetadata } from '@/types/transcript';

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

interface PaginatedPage {
  lines: string[];
  pageNumber: number;
}

function paginateTranscript(
  fullText: string,
  maxCharsPerLine: number = CHARS_PER_LINE,
  linesPerPage: number = LINES_PER_PAGE,
): PaginatedPage[] {
  const rawLines = splitIntoLines(fullText, maxCharsPerLine);
  const pages: PaginatedPage[] = [];

  for (let i = 0; i < rawLines.length; i += linesPerPage) {
    pages.push({
      lines: rawLines.slice(i, i + linesPerPage),
      pageNumber: pages.length + 1,
    });
  }

  if (pages.length === 0) {
    pages.push({ lines: [], pageNumber: 1 });
  }

  return pages;
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

// Helper: Detect and format Q/A lines
interface FormattedLine {
  text: string;
  isQuestion: boolean;
  isAnswer: boolean;
  isContinuation: boolean;
}

function formatQALines(lines: string[]): FormattedLine[] {
  return lines.map((line, index) => {
    const trimmed = line.trim();
    const isQuestion = /^Q[.:]\s*/i.test(trimmed);
    const isAnswer = /^A[.:]\s*/i.test(trimmed);
    
    // Continuation: not Q or A, and previous line was Q or A
    const prevLine = index > 0 ? lines[index - 1].trim() : '';
    const prevWasQA = /^[QA][.:]/i.test(prevLine);
    const isContinuation = !isQuestion && !isAnswer && prevWasQA && trimmed.length > 0;
    
    return {
      text: line,
      isQuestion,
      isAnswer,
      isContinuation,
    };
  });
}

// Helper: Format seconds to timestamp string [HH:MM:SS]
function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `[${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
}

// Helper: Replace speaker numbers with names
function replaceSpeakerLabels(text: string, speakerNames?: Record<number, string>): string {
  if (!speakerNames) return text;
  
  let result = text;
  Object.entries(speakerNames).forEach(([speakerId, name]) => {
    // Replace patterns like "Speaker 1:", "SPEAKER 1:", "[Speaker 1]"
    const patterns = [
      new RegExp(`Speaker\\s*${parseInt(speakerId) + 1}:`, 'gi'),
      new RegExp(`\\[Speaker\\s*${parseInt(speakerId) + 1}\\]`, 'gi'),
      new RegExp(`SPEAKER\\s*${parseInt(speakerId) + 1}:`, 'gi'),
    ];
    patterns.forEach(pattern => {
      result = result.replace(pattern, `${name}:`);
    });
  });
  return result;
}

// ============================================
// DOCX EXPORT
// ============================================

export async function exportToDocx(
  transcriptText: string,
  metadata: ExportMetadata,
  options: ExportOptions,
  wordData?: Array<{ word: string; start: number; end: number }>,
): Promise<Buffer> {
  // Apply speaker name replacement
  const processedText = replaceSpeakerLabels(transcriptText, metadata.speakerNames);
  const paginatedPages = paginateTranscript(processedText, CHARS_PER_LINE, options.linesPerPage || LINES_PER_PAGE);
  const lines = paginatedPages.flatMap((page) => page.lines);

  // Create document sections
  const sections: any[] = [];

  // Title Page
  sections.push({
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: {
          top: 1440,
          bottom: 1440,
          left: 1800,
          right: 1440,
        },
      },
    },
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
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: {
          top: 1440,
          bottom: 1440,
          left: 1800,
          right: 1440,
        },
      },
    },
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
  const formattedLines = options.useQAFormat ? formatQALines(lines) : null;

  for (let pageIndex = 0; pageIndex < paginatedPages.length; pageIndex++) {
    const pageLines = paginatedPages[pageIndex].lines;
    const paragraphs: Paragraph[] = [];

    // Add timestamp at page start if enabled
    if (options.includeTimestamps && wordData && wordData.length > 0) {
      // Estimate timestamp based on words per page
      const wordsPerPage = LINES_PER_PAGE * 10; // rough estimate
      const startWordIndex = pageIndex * wordsPerPage;
      const startTime = wordData[Math.min(startWordIndex, wordData.length - 1)]?.start || 0;
      
      paragraphs.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: formatTimestamp(startTime),
              size: 18,
              font: 'Courier New',
              color: '666666',
              italics: true,
            }),
          ],
        }),
      );
    }

    for (let lineIndex = 0; lineIndex < pageLines.length; lineIndex++) {
      globalLineNumber++;
      const line = pageLines[lineIndex];
      const lineNum = options.lineNumbering ? getLineNumber(globalLineNumber - 1) : '';
      
      // Get Q/A formatting info if enabled
      const globalLineIdx = pageIndex * (options.linesPerPage || LINES_PER_PAGE) + lineIndex;
      const qaInfo = formattedLines ? formattedLines[globalLineIdx] : null;

      // Build text runs
      const textRuns: TextRun[] = [];
      
      // Line number (gray)
      if (lineNum) {
        textRuns.push(new TextRun({
          text: `${lineNum}  `,
          size: 24,
          font: 'Courier New',
          color: '888888',
        }));
      }
      
      // Main text with Q/A formatting
      if (qaInfo?.isQuestion) {
        // Bold "Q." prefix
        textRuns.push(new TextRun({
          text: line,
          size: 24,
          font: 'Courier New',
          bold: true,
        }));
      } else if (qaInfo?.isAnswer) {
        // Normal "A." line
        textRuns.push(new TextRun({
          text: line,
          size: 24,
          font: 'Courier New',
        }));
      } else if (qaInfo?.isContinuation) {
        // Indented continuation
        textRuns.push(new TextRun({
          text: '     ' + line.trim(),  // 5-space indent
          size: 24,
          font: 'Courier New',
        }));
      } else {
        // Regular line
        textRuns.push(new TextRun({
          text: line,
          size: 24,
          font: 'Courier New',
        }));
      }

      paragraphs.push(
        new Paragraph({
          spacing: { line: 360 }, // 1.5 line spacing
          children: textRuns,
        }),
      );
    }

    sections.push({
      properties: {
        page: {
          size: {
            width: 12240,
            height: 15840,
          },
          margin: {
            top: 1440,
            bottom: 1440,
            left: 1800,
            right: 1440,
          },
        },
      },
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

  const reporterName = metadata.courtReporterName || 'Court Reporter';
  sections.push({
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: {
          top: 1440,
          bottom: 1440,
          left: 1800,
          right: 1440,
        },
      },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'CERTIFICATE', bold: true, size: 28, font: 'Courier New' })],
      }),
      new Paragraph({
        spacing: { after: 400, line: 360 },
        children: [new TextRun({
          text: `I, ${reporterName}, do hereby certify that the foregoing transcript is a true and accurate record of the proceedings in the above-entitled matter.`,
          size: 24, font: 'Courier New',
        })],
      }),
      new Paragraph({
        spacing: { after: 800, line: 360 },
        children: [new TextRun({
          text: `Dated this _____ day of _____________, ${new Date().getFullYear()}.`,
          size: 24, font: 'Courier New',
        })],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: '_________________________________', size: 24, font: 'Courier New' })],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: reporterName, size: 24, font: 'Courier New' })],
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Court Reporter', size: 24, font: 'Courier New' })],
      }),
      new Paragraph({ spacing: { before: 600 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Generated by Depo-Pro', size: 18, font: 'Courier New', color: '999999' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: `Processing Timestamp: ${new Date().toISOString()}`,
          size: 18, font: 'Courier New', color: '999999',
        })],
      }),
    ],
  });

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
  options: ExportOptions,
  wordData?: Array<{ word: string; start: number; end: number }>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // NOTE: pdfkit uses built-in PostScript Courier. DOCX uses Courier New.
      // Both are monospace with very similar metrics; exact glyph matching requires embedded TTF.
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
      });
      const PAGE_WIDTH = 612;
      const PAGE_HEIGHT = 792;
      const MARGIN_TOP = 72;
      const MARGIN_BOTTOM = 72;
      const MARGIN_LEFT = 72;
      const MARGIN_RIGHT = 72;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
      const HEADER_Y = 30;
      const FOOTER_Y = PAGE_HEIGHT - MARGIN_BOTTOM + 20;
      const LINE_HEIGHT_PT = 24;
      const CONTENT_START_Y = MARGIN_TOP;
      const linesPerPage = options.linesPerPage || LINES_PER_PAGE;

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Apply speaker name replacement
      const processedText = replaceSpeakerLabels(transcriptText, metadata.speakerNames);

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

      // Appearances page (placeholder — matches DOCX)
      doc.addPage();
      doc.font('Courier-Bold').fontSize(14).text('APPEARANCES', { align: 'center' });
      doc.moveDown(2);
      doc.font('Courier-Oblique').fontSize(12).text('[Appearances to be added]', { align: 'center' });

      // New page for transcript
      doc.addPage();

      const addHeader = () => {
        doc.fontSize(8)
          .text(
            `${metadata.caseName || 'Deposition'} - ${metadata.deponentName || 'Deponent'}`,
            MARGIN_LEFT,
            HEADER_Y,
            { align: 'center', width: CONTENT_WIDTH },
          );
      };

      const addFooter = (pageNum: number) => {
        doc.fontSize(8).font('Courier').fillColor('#000000').text(
          `Page ${pageNum}`,
          MARGIN_LEFT,
          FOOTER_Y,
          { align: 'center', width: CONTENT_WIDTH },
        );
      };

      const paginatedPages = paginateTranscript(processedText, CHARS_PER_LINE, linesPerPage);
      const lines = paginatedPages.flatMap((page) => page.lines);
      const formattedLines = options.useQAFormat ? formatQALines(lines) : null;

      for (let pageIndex = 0; pageIndex < paginatedPages.length; pageIndex++) {
        if (pageIndex > 0) {
          doc.addPage();
        }

        addHeader();
        let yPosition = CONTENT_START_Y;

        if (options.includeTimestamps && wordData && wordData.length > 0) {
          const wordsPerPage = linesPerPage * 10;
          const startWordIndex = pageIndex * wordsPerPage;
          const startTime = wordData[Math.min(startWordIndex, wordData.length - 1)]?.start || 0;
          doc.fontSize(9).fillColor('#666666').font('Courier-Oblique').text(
            formatTimestamp(startTime),
            MARGIN_LEFT,
            yPosition,
          );
          yPosition = CONTENT_START_Y + LINE_HEIGHT_PT;
        }

        const pageLines = paginatedPages[pageIndex].lines;
        for (let lineIndex = 0; lineIndex < pageLines.length; lineIndex++) {
          const globalLineIndex = pageIndex * linesPerPage + lineIndex;
          const qaInfo = formattedLines ? formattedLines[globalLineIndex] : null;
          const lineText = pageLines[lineIndex];

          if (options.lineNumbering) {
            const lineNum = getLineNumber(globalLineIndex);
            doc.fillColor('#888888').font('Courier').text(lineNum, 40, yPosition);
          }

          doc.fillColor('#000000');
          if (qaInfo?.isQuestion) {
            doc.font('Courier-Bold').text(lineText, MARGIN_LEFT, yPosition);
          } else if (qaInfo?.isContinuation) {
            doc.font('Courier').text(`     ${lineText.trim()}`, MARGIN_LEFT, yPosition);
          } else {
            doc.font('Courier').text(lineText, MARGIN_LEFT, yPosition);
          }

          yPosition += LINE_HEIGHT_PT;
        }

        addFooter(pageIndex + 1);
      }

      // Certificate page
      doc.addPage();
      doc.font('Courier-Bold').fontSize(14).text('CERTIFICATE', { align: 'center' });
      doc.moveDown(2);

      doc.font('Courier').fontSize(12);
      const reporterName = metadata.courtReporterName || 'Court Reporter';
      doc.text(
        `I, ${reporterName}, do hereby certify that the foregoing transcript is a true and accurate record of the proceedings in the above-entitled matter.`,
        { lineGap: 8 },
      );
      doc.moveDown(2);
      doc.text(`Dated this _____ day of _____________, ${new Date().getFullYear()}.`);
      doc.moveDown(3);
      doc.text('_________________________________');
      doc.moveDown(0.5);
      doc.text(reporterName);
      doc.text('Court Reporter');
      doc.moveDown(3);
      doc.font('Courier').fontSize(8).fillColor('#999999');
      doc.text('Generated by Depo-Pro', { align: 'center' });
      doc.text(`Processing Timestamp: ${new Date().toISOString()}`, { align: 'center' });

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
  options: ExportOptions,
): Buffer {
  // Apply speaker name replacement
  const processedText = replaceSpeakerLabels(transcriptText, metadata.speakerNames);
  const lines = splitIntoLines(processedText);
  let output = '';

  // Header
  output += `${'='.repeat(70)}\n`;
  output += 'DEPOSITION TRANSCRIPT\n';
  output += `${'='.repeat(70)}\n\n`;
  output += `Case: ${metadata.caseName || 'N/A'}\n`;
  output += `Case Number: ${metadata.caseNumber || 'N/A'}\n`;
  output += `Deponent: ${metadata.deponentName || 'N/A'}\n`;
  output += `Date: ${formatDate(metadata.depositionDate || new Date())}\n`;
  output += `Reporter: ${metadata.courtReporterName || 'N/A'}\n`;
  output += `Firm: ${metadata.firmName || 'N/A'}\n`;
  output += `\n${'='.repeat(70)}\n\n`;

  // Transcript with line numbers
  let pageNum = 1;
  for (let i = 0; i < lines.length; i++) {
    // Page break indicator
    if (i > 0 && i % LINES_PER_PAGE === 0) {
      pageNum++;
      output += `\n${'-'.repeat(40)} Page ${pageNum} ${'-'.repeat(40)}\n\n`;
    }

    // Line number
    if (options.lineNumbering) {
      const lineNum = (i % LINES_PER_PAGE) + 1;
      const displayNum = lineNum % LINE_NUMBER_INTERVAL === 0 ? lineNum.toString().padStart(2, ' ') : '  ';
      output += `${displayNum} | `;
    }

    output += `${lines[i]}\n`;
  }

  // Footer
  output += `\n${'='.repeat(70)}\n`;
  output += 'END OF TRANSCRIPT\n';
  output += `${'='.repeat(70)}\n`;

  return Buffer.from(output, 'utf-8');
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export async function exportTranscript(
  transcriptText: string,
  metadata: ExportMetadata,
  options: ExportOptions,
  wordData?: Array<{ word: string; start: number; end: number }>,
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const dateStr = format(metadata.depositionDate || new Date(), 'yyyy-MM-dd');
  const baseName = `${metadata.caseName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Transcript'}_${dateStr}`;

  switch (options.format) {
    case 'docx': {
      const buffer = await exportToDocx(transcriptText, metadata, options, wordData);
      return {
        buffer,
        filename: `${baseName}.docx`,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    case 'pdf': {
      const buffer = await exportToPdf(transcriptText, metadata, options, wordData);
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

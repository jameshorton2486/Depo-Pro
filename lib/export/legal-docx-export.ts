import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  PageBreak,
} from 'docx';

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  caseName: string;
  caseNumber: string;
  deponentName: string;
  depositionDate: Date;
  courtReporterName: string;
  firmName: string;
  includeTimestamps?: boolean;
  includeLineNumbers?: boolean;
  includeConfidenceMarkers?: boolean;
  confidenceThreshold?: number;
  integrityHash?: string; // Security Audit D.14 - Legal safeguard
}

export interface TranscriptWord {
  word: string;
  start: number;
  confidence: number;
  punctuated_word?: string;
  speaker?: number;
}

export interface TranscriptSegment {
  speaker: number;
  words: TranscriptWord[];
  start?: number;
  end?: number;
}

// ============================================================================
// Constants
// ============================================================================

const LINES_PER_PAGE = 25;
const CHARS_PER_LINE = 65;
const FONT_SIZE = 24; // 12pt in half-points
const LINE_HEIGHT = 360; // Double-spaced in twips

// ============================================================================
// Main Export Function
// ============================================================================

export async function generateLegalDOCX(
  segments: TranscriptSegment[],
  options: ExportOptions
): Promise<Buffer> {
  const children: Paragraph[] = [];
  
  // -------------------------------------------------------------------------
  // Title Page
  // -------------------------------------------------------------------------
  children.push(
    ...createTitlePage(options),
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // -------------------------------------------------------------------------
  // Appearance Page (Placeholder)
  // -------------------------------------------------------------------------
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'APPEARANCES',
          bold: true,
          size: 28,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '[Appearances to be added]',
          italics: true,
          size: FONT_SIZE,
          font: 'Times New Roman',
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // -------------------------------------------------------------------------
  // Transcript Body
  // -------------------------------------------------------------------------
  let lineNumber = 1;
  let currentPageLines = 0;

  for (const segment of segments) {
    // Determine speaker label
    const speakerLabel = getSpeakerLabel(segment.speaker);
    
    // Build the text content
    const segmentText = segment.words
      .map(w => w.punctuated_word || w.word)
      .join(' ');

    // Format as Q/A with indentation
    const fullText = `${speakerLabel}  ${segmentText}`;
    
    // Split into lines
    const lines = splitIntoLines(fullText, CHARS_PER_LINE);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isFirstLine = i === 0;
      
      // Create paragraph with optional line number
      const para = createTranscriptLine(
        line,
        lineNumber,
        options.includeLineNumbers ?? true,
        isFirstLine
      );
      
      children.push(para);
      lineNumber++;
      currentPageLines++;
      
      // Page break every 25 lines
      if (currentPageLines >= LINES_PER_PAGE) {
        children.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
        currentPageLines = 0;
      }
    }
    
    // Empty line between speakers (if not at page boundary)
    if (currentPageLines > 0 && currentPageLines < LINES_PER_PAGE - 1) {
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
      lineNumber++;
      currentPageLines++;
    }
  }

  // -------------------------------------------------------------------------
  // Certificate Page
  // -------------------------------------------------------------------------
  children.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
    ...createCertificatePage(options)
  );

  // -------------------------------------------------------------------------
  // Create Document
  // -------------------------------------------------------------------------
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: `${options.caseName}`,
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Page ',
                    size: 20,
                    font: 'Times New Roman',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 20,
                    font: 'Times New Roman',
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSpeakerLabel(speaker: number): string {
  // Legal transcript convention: Q = questioning attorney, A = witness
  if (speaker === 0) return 'Q.';
  if (speaker === 1) return 'A.';
  return `SPEAKER ${speaker + 1}:`;
}

function splitIntoLines(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxLength) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

function createTranscriptLine(
  text: string,
  lineNumber: number,
  includeLineNumbers: boolean,
  isFirstLine: boolean
): Paragraph {
  const children: TextRun[] = [];
  
  // Line number (show every 5 lines)
  if (includeLineNumbers) {
    const lineNumText = lineNumber % 5 === 0 
      ? lineNumber.toString().padStart(2, ' ') + '  '
      : '    ';
    
    children.push(
      new TextRun({
        text: lineNumText,
        font: 'Courier New',
        size: FONT_SIZE,
        color: '888888',
      })
    );
  }
  
  // Add indentation for continuation lines
  const indent = isFirstLine ? '' : '         '; // 9 spaces for Q/A alignment
  
  children.push(
    new TextRun({
      text: indent + text,
      font: 'Courier New',
      size: FONT_SIZE,
    })
  );
  
  return new Paragraph({
    children,
    spacing: { line: LINE_HEIGHT },
  });
}

function createTitlePage(options: ExportOptions): Paragraph[] {
  const dateStr = options.depositionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return [
    // Spacing at top
    new Paragraph({ children: [], spacing: { after: 800 } }),
    
    // Title
    new Paragraph({
      children: [
        new TextRun({
          text: 'DEPOSITION TRANSCRIPT',
          bold: true,
          size: 36,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    
    // Case Name
    new Paragraph({
      children: [
        new TextRun({
          text: options.caseName,
          bold: true,
          size: 28,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    
    // Case Number
    new Paragraph({
      children: [
        new TextRun({
          text: `Case No.: ${options.caseNumber}`,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    
    // Deponent
    new Paragraph({
      children: [
        new TextRun({
          text: `Deposition of: ${options.deponentName}`,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    
    // Date
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${dateStr}`,
          size: 24,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    
    // Firm info
    new Paragraph({
      children: [
        new TextRun({
          text: `Prepared by: ${options.firmName}`,
          size: 20,
          font: 'Times New Roman',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    
    new Paragraph({
      children: [
        new TextRun({
          text: `Court Reporter: ${options.courtReporterName}`,
          size: 20,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  ];
}

function createCertificatePage(options: ExportOptions): Paragraph[] {
  const paragraphs = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'CERTIFICATE',
          bold: true,
          size: 28,
          font: 'Times New Roman',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: `I, ${options.courtReporterName}, do hereby certify that the foregoing transcript is a true and accurate record of the proceedings in the above-entitled matter.`,
          size: FONT_SIZE,
          font: 'Times New Roman',
        }),
      ],
      spacing: { after: 400, line: LINE_HEIGHT },
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: `Dated this _____ day of _____________, ${new Date().getFullYear()}.`,
          size: FONT_SIZE,
          font: 'Times New Roman',
        }),
      ],
      spacing: { after: 800, line: LINE_HEIGHT },
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: '_________________________________',
          size: FONT_SIZE,
          font: 'Times New Roman',
        }),
      ],
      spacing: { after: 100 },
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: options.courtReporterName,
          size: FONT_SIZE,
          font: 'Times New Roman',
        }),
      ],
      spacing: { after: 100 },
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: 'Court Reporter',
          size: FONT_SIZE,
          font: 'Times New Roman',
        }),
      ],
    }),
  ];

  // Security Audit D.14 - Legal safeguard footer
  // Add legal footer with timestamp and integrity hash
  paragraphs.push(
    new Paragraph({
      children: [],
      spacing: { before: 600 }, // Extra spacing before footer
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated by Depo-Pro',
          font: 'Courier New',
          size: 18, // 9pt
          color: '999999',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Processing Timestamp: ${new Date().toISOString()}`,
          font: 'Courier New',
          size: 18,
          color: '999999',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Integrity Hash: ${options.integrityHash || 'N/A'}`,
          font: 'Courier New',
          size: 18,
          color: '999999',
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  return paragraphs;
}

// ============================================================================
// API Route Helper
// ============================================================================

export async function exportTranscript(
  segments: TranscriptSegment[],
  options: ExportOptions
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const buffer = await generateLegalDOCX(segments, options);
  
  // Generate safe filename
  const safeCaseName = options.caseName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
  const safeDeponent = options.deponentName.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
  const dateStr = options.depositionDate.toISOString().split('T')[0];
  
  const filename = `${safeCaseName}_${safeDeponent}_${dateStr}_Transcript.docx`;
  
  return {
    buffer,
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

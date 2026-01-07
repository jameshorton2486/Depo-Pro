// ═══════════════════════════════════════════════════════════════
// ATTORNEY REPORT GENERATION
// ═══════════════════════════════════════════════════════════════
// Generate trial-ready reports from transcript annotations

import type { TranscriptAnnotation } from '@/types/issue-code';
import type { AttorneyTranscript } from '@/types/attorney-transcript';
import type { ExhibitReference } from '@/types/exhibits';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableCell, TableRow, WidthType } from 'docx';

export interface ReportEntry {
  transcriptName: string;
  deponent: string;
  page: number;
  line: number;
  issueType: string;
  quotedText: string;
  attorneyNote?: string;
  linkedExhibits?: ExhibitReference[];
}

export interface ReportData {
  title: string;
  caseName?: string;
  generatedDate: Date;
  entries: ReportEntry[];
}

/**
 * Generate Impeachment Report
 * Lists all contradictions and inconsistencies
 */
export function generateImpeachmentReport(
  annotations: TranscriptAnnotation[],
  transcripts: Map<string, AttorneyTranscript>,
  exhibitLinks?: Map<string, ExhibitReference[]>, // annotationId -> exhibits
): ReportData {
  const impeachmentIssues = annotations.filter(
    (ann) => ann.issueCode.code === 'CONTRADICTION' || ann.issueCode.code === 'PERJURY',
  );

  const entries: ReportEntry[] = impeachmentIssues.map((ann) => {
    const transcript = transcripts.get(ann.transcriptId);
    const lines = extractLinesFromAnnotation(transcript, ann);
    const linkedExhibits = exhibitLinks?.get(ann.id) || [];

    return {
      transcriptName: transcript?.name || `Transcript ${ann.transcriptId}`,
      deponent: transcript?.deponent || 'Unknown',
      page: ann.pageStart,
      line: ann.lineStart,
      issueType: ann.issueCode.label,
      quotedText: lines.join(' '),
      attorneyNote: ann.note,
      linkedExhibits: linkedExhibits.length > 0 ? linkedExhibits : undefined,
    };
  });

  return {
    title: 'Impeachment Report',
    generatedDate: new Date(),
    entries,
  };
}

/**
 * Generate Contradictions Summary
 * Focused on contradictions only
 */
export function generateContradictionsSummary(
  annotations: TranscriptAnnotation[],
  transcripts: Map<string, AttorneyTranscript>,
  exhibitLinks?: Map<string, ExhibitReference[]>, // annotationId -> exhibits
): ReportData {
  const contradictions = annotations.filter(
    (ann) => ann.issueCode.code === 'CONTRADICTION',
  );

  const entries: ReportEntry[] = contradictions.map((ann) => {
    const transcript = transcripts.get(ann.transcriptId);
    const lines = extractLinesFromAnnotation(transcript, ann);
    const linkedExhibits = exhibitLinks?.get(ann.id) || [];

    return {
      transcriptName: transcript?.name || `Transcript ${ann.transcriptId}`,
      deponent: transcript?.deponent || 'Unknown',
      page: ann.pageStart,
      line: ann.lineStart,
      issueType: ann.issueCode.label,
      quotedText: lines.join(' '),
      attorneyNote: ann.note,
      linkedExhibits: linkedExhibits.length > 0 ? linkedExhibits : undefined,
    };
  });

  return {
    title: 'Contradictions Summary',
    generatedDate: new Date(),
    entries,
  };
}

/**
 * Generate Admissions List
 * Lists all admissions against interest
 */
export function generateAdmissionsList(
  annotations: TranscriptAnnotation[],
  transcripts: Map<string, AttorneyTranscript>,
  exhibitLinks?: Map<string, ExhibitReference[]>, // annotationId -> exhibits
): ReportData {
  const admissions = annotations.filter(
    (ann) => ann.issueCode.code === 'ADMISSION',
  );

  const entries: ReportEntry[] = admissions.map((ann) => {
    const transcript = transcripts.get(ann.transcriptId);
    const lines = extractLinesFromAnnotation(transcript, ann);
    const linkedExhibits = exhibitLinks?.get(ann.id) || [];

    return {
      transcriptName: transcript?.name || `Transcript ${ann.transcriptId}`,
      deponent: transcript?.deponent || 'Unknown',
      page: ann.pageStart,
      line: ann.lineStart,
      issueType: ann.issueCode.label,
      quotedText: lines.join(' '),
      attorneyNote: ann.note,
      linkedExhibits: linkedExhibits.length > 0 ? linkedExhibits : undefined,
    };
  });

  return {
    title: 'Admissions List',
    generatedDate: new Date(),
    entries,
  };
}

/**
 * Extract text lines from annotation range
 */
function extractLinesFromAnnotation(
  transcript: AttorneyTranscript | undefined,
  annotation: TranscriptAnnotation,
): string[] {
  if (!transcript) return ['[Transcript not available]'];

  const lines: string[] = [];
  for (let page = annotation.pageStart; page <= annotation.pageEnd; page++) {
    const pageData = transcript.pages.find((p) => p.pageNumber === page);
    if (!pageData) continue;

    const startLine = page === annotation.pageStart ? annotation.lineStart : 1;
    const endLine = page === annotation.pageEnd ? annotation.lineEnd : pageData.lines.length;

    pageData.lines
      .filter((line) => line.line >= startLine && line.line <= endLine)
      .forEach((line) => {
        lines.push(`${line.speaker}: ${line.text}`);
      });
  }

  return lines;
}

/**
 * Generate DOCX document from report data
 */
export async function generateDOCXReport(reportData: ReportData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: reportData.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    }),
  ];

  if (reportData.caseName) {
    children.push(
      new Paragraph({
        text: `Case: ${reportData.caseName}`,
        spacing: { after: 200 },
      }),
    );
  }

  children.push(
    new Paragraph({
      text: `Generated: ${reportData.generatedDate.toLocaleDateString()}`,
      spacing: { after: 600 },
    }),
  );

  // Table header
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph('Transcript')],
        width: { size: 20, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph('Deponent')],
        width: { size: 15, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph('Citation')],
        width: { size: 10, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph('Issue Type')],
        width: { size: 15, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph('Quoted Text')],
        width: { size: 30, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph('Note')],
        width: { size: 10, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph('Exhibits')],
        width: { size: 10, type: WidthType.PERCENTAGE },
      }),
    ],
  });

  // Table rows
  const rows = reportData.entries.map(
    (entry) => {
      // Build exhibit references text
      const exhibitText = entry.linkedExhibits && entry.linkedExhibits.length > 0
        ? entry.linkedExhibits.map((ex) => ex.label).join(', ')
        : '';

      return new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph(entry.transcriptName)],
          }),
          new TableCell({
            children: [new Paragraph(entry.deponent)],
          }),
          new TableCell({
            children: [new Paragraph(`Page ${entry.page}, Line ${entry.line}`)],
          }),
          new TableCell({
            children: [new Paragraph(entry.issueType)],
          }),
          new TableCell({
            children: [
              new Paragraph(entry.quotedText),
              ...(entry.linkedExhibits && entry.linkedExhibits.length > 0
                ? [
                    new Paragraph({
                      text: `Referenced Exhibits: ${exhibitText}`,
                      spacing: { before: 200 },
                      children: [
                        new TextRun({
                          text: 'Referenced Exhibits: ',
                          italics: true,
                        }),
                        new TextRun({
                          text: exhibitText,
                          bold: true,
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
          new TableCell({
            children: [new Paragraph(entry.attorneyNote || '')],
          }),
          new TableCell({
            children: [new Paragraph(exhibitText || '—')],
          }),
        ],
      });
    },
  );

  children.push(
    new Table({
      rows: [headerRow, ...rows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
  );

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}


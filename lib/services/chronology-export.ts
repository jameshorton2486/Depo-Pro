/**
 * Chronology DOCX Export Service
 * Phase 10 — Depo-Pro
 *
 * Generates a professional legal medical chronology document using docx-js.
 * Follows SKILL.md guidelines: US Letter, DXA widths, no unicode bullets,
 * no \n, no WidthType.PERCENTAGE.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  Header,
  Footer,
} from 'docx';
import type { ChronologyEntryRow } from '@/types/medical';

interface ExportOptions {
  caseName: string;
  caseNumber?: string;
  deponentName?: string;
}

// ── Constants ──────────────────────────────────────────────────

const PAGE_WIDTH = 12240; // US Letter 8.5"
const MARGIN = 1440;      // 1" margins
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 9360 DXA

// Column widths for chronology table (must sum to CONTENT_WIDTH)
const COL_DATE = 1400;      // Date
const COL_CATEGORY = 1200;  // Category
const COL_PROVIDER = 1500;  // Provider
const COL_SUMMARY = 3860;   // Summary/Details
const COL_SOURCE = 1400;    // Source/Page

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_MARGINS = { top: 60, bottom: 60, left: 100, right: 100 };

// ── Category colors ────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Visit': 'E8F5E9',
  'Surgery': 'FFEBEE',
  'Imaging': 'E3F2FD',
  'Lab': 'FFF3E0',
  'Prescription': 'F3E5F5',
  'Diagnosis': 'FCE4EC',
  'Therapy': 'E0F7FA',
  'Hospitalization': 'FBE9E7',
  'Consultation': 'E8EAF6',
  'Procedure': 'FFF8E1',
  'Follow-Up': 'F1F8E9',
  'Other': 'F5F5F5',
};

// ── Main Export Function ───────────────────────────────────────

export async function generateChronologyDocx(
  entries: ChronologyEntryRow[],
  options: ExportOptions,
): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20 }, // 10pt default
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 32, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      // ── Title Page ───────────────────────────────────────
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 15840 },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children: buildTitlePage(options, entries.length),
      },
      // ── Chronology Table ─────────────────────────────────
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 15840 },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${options.caseName} — Medical Chronology`,
                    font: 'Arial',
                    size: 16,
                    italics: true,
                    color: '666666',
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
                  new TextRun({ text: 'Page ', font: 'Arial', size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16 }),
                ],
              }),
            ],
          }),
        },
        children: buildChronologySection(entries),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ── Title Page Builder ─────────────────────────────────────────

function buildTitlePage(options: ExportOptions, entryCount: number): Paragraph[] {
  const children: Paragraph[] = [];

  // Spacing at top
  children.push(new Paragraph({ spacing: { before: 3000 } }));

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'MEDICAL CHRONOLOGY',
          bold: true,
          font: 'Arial',
          size: 40,
        }),
      ],
    }),
  );

  // Case name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: options.caseName,
          font: 'Arial',
          size: 28,
        }),
      ],
    }),
  );

  // Case number
  if (options.caseNumber) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Case No. ${options.caseNumber}`,
            font: 'Arial',
            size: 24,
          }),
        ],
      }),
    );
  }

  // Deponent
  if (options.deponentName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Deponent: ${options.deponentName}`,
            font: 'Arial',
            size: 24,
          }),
        ],
      }),
    );
  }

  // Divider space
  children.push(new Paragraph({ spacing: { before: 600 } }));

  // Meta info
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `${entryCount} chronology entries`,
          font: 'Arial',
          size: 22,
          color: '666666',
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          font: 'Arial',
          size: 22,
          color: '666666',
        }),
      ],
    }),
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: 'Generated by Depo-Pro',
          font: 'Arial',
          size: 18,
          italics: true,
          color: '999999',
        }),
      ],
    }),
  );

  return children;
}

// ── Chronology Table Builder ───────────────────────────────────

function buildChronologySection(entries: ChronologyEntryRow[]): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  // Section heading
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun('Medical Chronology')],
    }),
  );

  // Build table with header row + data rows
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeHeaderCell('Date', COL_DATE),
      makeHeaderCell('Category', COL_CATEGORY),
      makeHeaderCell('Provider', COL_PROVIDER),
      makeHeaderCell('Summary / Details', COL_SUMMARY),
      makeHeaderCell('Source / Page', COL_SOURCE),
    ],
  });

  const dataRows = entries.map((entry) => buildEntryRow(entry));

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [COL_DATE, COL_CATEGORY, COL_PROVIDER, COL_SUMMARY, COL_SOURCE],
      rows: [headerRow, ...dataRows],
    }),
  );

  // Legend / notes
  children.push(new Paragraph({ spacing: { before: 300 } }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Note: ',
          bold: true,
          font: 'Arial',
          size: 18,
        }),
        new TextRun({
          text: 'Entries marked with an asterisk (*) were generated by AI and have not been manually verified. All dates, providers, and details should be confirmed against original source documents.',
          font: 'Arial',
          size: 18,
          color: '666666',
        }),
      ],
    }),
  );

  return children;
}

// ── Table Cell Builders ────────────────────────────────────────

function makeHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: '2C3E50', type: ShadingType.CLEAR },
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            font: 'Arial',
            size: 18,
            color: 'FFFFFF',
          }),
        ],
      }),
    ],
  });
}

function buildEntryRow(entry: ChronologyEntryRow): TableRow {
  // Format date
  let dateStr = formatDate(entry.event_date);
  if (entry.event_date_end) {
    dateStr += ` to ${formatDate(entry.event_date_end)}`;
  }
  if (entry.date_precision === 'MONTH') {
    dateStr += ' (approx.)';
  } else if (entry.date_precision === 'YEAR') {
    dateStr += ' (year only)';
  }

  // Verification marker
  const verifiedMark = entry.is_verified ? '' : ' *';

  // Category color
  const catColor = CATEGORY_COLORS[entry.category] || 'F5F5F5';

  // Summary + details content
  const summaryRuns: TextRun[] = [
    new TextRun({
      text: entry.summary + verifiedMark,
      font: 'Arial',
      size: 18,
    }),
  ];
  if (entry.details) {
    summaryRuns.push(
      new TextRun({
        text: '',
        font: 'Arial',
        size: 18,
        break: 1,
      }),
    );
    summaryRuns.push(
      new TextRun({
        text: entry.details,
        font: 'Arial',
        size: 16,
        color: '555555',
        italics: true,
      }),
    );
  }

  // Source info
  const sourceLines: string[] = [];
  if (entry.source_document_name) {
    sourceLines.push(entry.source_document_name);
  }
  if (entry.page_reference) {
    sourceLines.push(entry.page_reference);
  }

  return new TableRow({
    children: [
      // Date
      new TableCell({
        borders: BORDERS,
        width: { size: COL_DATE, type: WidthType.DXA },
        margins: CELL_MARGINS,
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: dateStr, font: 'Arial', size: 18 }),
            ],
          }),
        ],
      }),
      // Category
      new TableCell({
        borders: BORDERS,
        width: { size: COL_CATEGORY, type: WidthType.DXA },
        shading: { fill: catColor, type: ShadingType.CLEAR },
        margins: CELL_MARGINS,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: entry.category,
                font: 'Arial',
                size: 18,
                bold: true,
              }),
            ],
          }),
        ],
      }),
      // Provider
      new TableCell({
        borders: BORDERS,
        width: { size: COL_PROVIDER, type: WidthType.DXA },
        margins: CELL_MARGINS,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: entry.provider || '—',
                font: 'Arial',
                size: 18,
              }),
            ],
          }),
        ],
      }),
      // Summary + Details
      new TableCell({
        borders: BORDERS,
        width: { size: COL_SUMMARY, type: WidthType.DXA },
        margins: CELL_MARGINS,
        children: [new Paragraph({ children: summaryRuns })],
      }),
      // Source / Page
      new TableCell({
        borders: BORDERS,
        width: { size: COL_SOURCE, type: WidthType.DXA },
        margins: CELL_MARGINS,
        children: sourceLines.length > 0
          ? sourceLines.map(
              (line) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: line, font: 'Arial', size: 16, color: '777777' }),
                  ],
                }),
            )
          : [
              new Paragraph({
                children: [
                  new TextRun({ text: '—', font: 'Arial', size: 16, color: '999999' }),
                ],
              }),
            ],
      }),
    ],
  });
}

// ── Helpers ────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

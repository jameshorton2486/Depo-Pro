/**
 * Depo-Pro Legal Transcript DOCX Formatter
 * 
 * Generates formatted legal transcript DOCX files using the docx npm package.
 * 
 * Tab Layout (from left margin):
 *   Tab 1 (left, 0.5")  — Line numbers / Q./A. continuation text
 *   Tab 2 (left, 1.0")  — Q./A. labels
 *   Tab 3 (left, 1.5")  — Speaker labels / Speaker continuation text
 *   Tab 4 (center, 3.25") — Centered content (headers, page numbers)
 * 
 * Speaker lines:   3 tabs → label starts at 1.5"
 * Q./A. first line: 1 tab → Q./A. at ~1.0", text follows
 * Q./A. continuation: no tab → text starts at left margin (full width)
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  TabStopType,
  convertInchesToTwip,
} from 'docx';

import type {
  TranscriptSegment,
  TranscriptFormatConfig,
  TranscriptFormatOptions,
  SpeakerMapping,
  ExaminationSection,
} from '@/types/transcript-format';

// ── Constants ──────────────────────────────────────────────────────

// Courier New 12pt ≈ 10 characters per inch
const CHARS_PER_INCH = 10;

// ── Helper: Word Wrap ──────────────────────────────────────────────

function wrapText(
  text: string,
  maxFirstLine: number,
  maxRestLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let isFirst = true;
  let maxChars = maxFirstLine;

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (isFirst) {
        isFirst = false;
        maxChars = maxRestLines;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Helper: Build Tab Stops ────────────────────────────────────────

function buildTabStops(opts: TranscriptFormatOptions) {
  return [
    {
      type: TabStopType.LEFT,
      position: convertInchesToTwip(opts.tabStops.tab1),
    },
    {
      type: TabStopType.LEFT,
      position: convertInchesToTwip(opts.tabStops.tab2),
    },
    {
      type: TabStopType.LEFT,
      position: convertInchesToTwip(opts.tabStops.tab3),
    },
    {
      type: TabStopType.CENTER,
      position: convertInchesToTwip(opts.tabStops.center),
    },
  ];
}

// ── Helper: Create Paragraph Helpers ───────────────────────────────

function makeRun(text: string, opts: TranscriptFormatOptions, bold = false) {
  return new TextRun({
    text,
    font: opts.fontName,
    size: opts.fontSize * 2, // docx uses half-points
    bold,
  });
}

function makeParagraph(
  text: string,
  opts: TranscriptFormatOptions,
  bold = false,
) {
  return new Paragraph({
    spacing: { line: opts.lineSpacing * 240 }, // 240 twips = single space
    tabStops: buildTabStops(opts),
    children: [makeRun(text, opts, bold)],
  });
}

// ── Resolve Speaker Label ──────────────────────────────────────────

function getSpeakerLabel(
  speakerId: string,
  mappings: SpeakerMapping[],
): string {
  const mapping = mappings.find((m) => m.deepgramId === speakerId);
  return mapping?.displayLabel ?? speakerId;
}

// ── Check Q/A Status ───────────────────────────────────────────────

function getQALabel(
  speakerLabel: string,
  currentLine: number,
  sections: ExaminationSection[],
): string | null {
  for (const section of sections) {
    if (currentLine >= section.startLine && currentLine <= section.endLine) {
      if (speakerLabel === section.qaMapping.questionSpeaker) return 'Q.';
      if (speakerLabel === section.qaMapping.answerSpeaker) return 'A.';
    }
  }
  return null;
}

// ── Main Export Function ───────────────────────────────────────────

/**
 * Generate a formatted legal transcript DOCX from processed segments.
 * 
 * @param segments - Post-processed transcript segments
 * @param config - Complete formatting configuration
 * @returns Buffer containing the DOCX file
 */
export async function generateLegalTranscriptDocx(
  segments: TranscriptSegment[],
  config: TranscriptFormatConfig,
): Promise<Buffer> {
  const opts = config.formatOptions;
  const qaSpace = ' '.repeat(opts.qaSpaces);

  // Calculate max characters per line for different contexts
  const textAreaWidth =
    8.5 - opts.margins.left - opts.margins.right; // inches
  const maxCharsSpeaker = Math.floor(
    (textAreaWidth - opts.tabStops.tab3) * CHARS_PER_INCH,
  ); // ~50
  const maxCharsQACont = Math.floor(
    textAreaWidth * CHARS_PER_INCH,
  ); // ~65 (full width, no tab)
  const maxCharsQAFirst = Math.floor(
    (textAreaWidth - opts.tabStops.tab2) * CHARS_PER_INCH -
      2 - opts.qaSpaces, // subtract "Q." + spaces
  ); // ~46

  // Line counter
  let lineNum = opts.startLineNumber - 1;
  const paragraphs: Paragraph[] = [];

  // ── Helper: Add a speaker label line (3 tabs) ──
  function addSpeakerLabel(label: string) {
    lineNum++;
    const prefix = opts.includeLineNumbers ? `${lineNum.toString().padStart(2)}\t` : '';
    paragraphs.push(
      makeParagraph(`${prefix}\t\t\t${label}:`, opts, true),
    );
  }

  // ── Helper: Add speaker continuation line (3 tabs) ──
  function addSpeakerCont(text: string) {
    lineNum++;
    const prefix = opts.includeLineNumbers ? `${lineNum.toString().padStart(2)}\t` : '';
    paragraphs.push(
      makeParagraph(`${prefix}\t\t\t${text}`, opts),
    );
  }

  // ── Helper: Add Q/A first line (1 tab → label at ~1.0") ──
  function addQAFirst(label: string, text: string) {
    lineNum++;
    const prefix = opts.includeLineNumbers ? `${lineNum.toString().padStart(2)}` : '';
    paragraphs.push(
      makeParagraph(`${prefix}\t${label}${qaSpace}${text}`, opts),
    );
  }

  // ── Helper: Add Q/A continuation (no tab, full width) ──
  function addQACont(text: string) {
    lineNum++;
    const prefix = opts.includeLineNumbers ? `${lineNum.toString().padStart(2)}\t` : '';
    paragraphs.push(
      makeParagraph(`${prefix}${text}`, opts),
    );
  }

  // ── Build transcript body ──
  for (const seg of segments) {
    const label = getSpeakerLabel(seg.speakerId, config.speakerMappings);
    const qaLabel = getQALabel(
      label,
      lineNum + 1, // peek at next line number
      config.examinationSections,
    );

    if (qaLabel) {
      // Q/A format
      const lines = wrapText(seg.text, maxCharsQAFirst, maxCharsQACont);
      if (lines.length > 0) {
        addQAFirst(qaLabel, lines[0]);
        for (let i = 1; i < lines.length; i++) {
          addQACont(lines[i]);
        }
      }
    } else {
      // Standard speaker label format
      addSpeakerLabel(label);
      const lines = wrapText(seg.text, maxCharsSpeaker, maxCharsSpeaker);
      for (const line of lines) {
        addSpeakerCont(line);
      }
    }
  }

  // ── Create Document ──
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: opts.fontName,
            size: opts.fontSize * 2,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240, // 8.5" in DXA
              height: 15840, // 11" in DXA
            },
            margin: {
              top: convertInchesToTwip(opts.margins.top),
              right: convertInchesToTwip(opts.margins.right),
              bottom: convertInchesToTwip(opts.margins.bottom),
              left: convertInchesToTwip(opts.margins.left),
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

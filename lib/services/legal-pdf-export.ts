/**
 * Legal-grade PDF transcript export.
 *
 * Mirrors the layout rules of src/lib/transcription/legal-formatter.ts
 * (Courier New, 25 lines/page, line numbers, Q/A format, speaker labels)
 * but renders to PDF via pdfkit instead of DOCX via docx.
 *
 * The frozen legal-formatter.ts is not modified; its helper functions
 * (wrapText, getSpeakerLabel, getQALabel) are re-implemented here to apply
 * the same formatting contract to the PDF output format.
 */

import PDFDocument from 'pdfkit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { postProcessSegments } from '@/src/lib/transcription/post-process';
import {
  DEFAULT_FORMAT_OPTIONS,
  DEFAULT_PROCESSING_RULES,
  type TranscriptFormatConfig,
  type TranscriptFormatOptions,
  type SpeakerMapping,
  type ExaminationSection,
  type TranscriptSegment,
} from '@/src/types/transcript-format';
import { toTranscriptSegments, normalizeFormatConfig } from '@/lib/services/export';

// =============================================================================
// Constants — must match legal-formatter.ts values
// =============================================================================

const CHARS_PER_INCH = 10;
const LINES_PER_PAGE = 25;
const PT_PER_INCH = 72;

// =============================================================================
// Formatting helpers — mirrors legal-formatter.ts private functions
// =============================================================================

function wrapText(text: string, maxFirstLine: number, maxRestLines: number): string[] {
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

function getSpeakerLabel(speakerId: string, mappings: SpeakerMapping[]): string {
  const mapping = mappings.find((m) => m.deepgramId === speakerId);
  return mapping?.displayLabel ?? speakerId;
}

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

// =============================================================================
// Line builders — produces padded monospace strings for each layout variant
//
// Column layout (Courier New, 10 chars/inch):
//   cols  0–4  : line number  (0.5" = 5 chars)
//   cols  5–14 : Q/A label area (1.0" = 10 chars total from left)
//   cols 15+   : speaker content area (1.5" = 15 chars total from left)
// =============================================================================

function linePrefix(lineNum: number, opts: TranscriptFormatOptions): string {
  return opts.includeLineNumbers
    ? lineNum.toString().padStart(2) + '   ' // 2-digit num + 3 spaces → 5 chars
    : '     ';
}

function buildSpeakerLabelLine(lineNum: number, label: string, opts: TranscriptFormatOptions): string {
  const indent = ' '.repeat(Math.floor(opts.tabStops.tab3 * CHARS_PER_INCH) - 5); // tab3 - prefix
  return linePrefix(lineNum, opts) + indent + label + ':';
}

function buildSpeakerContLine(lineNum: number, text: string, opts: TranscriptFormatOptions): string {
  const indent = ' '.repeat(Math.floor(opts.tabStops.tab3 * CHARS_PER_INCH) - 5);
  return linePrefix(lineNum, opts) + indent + text;
}

function buildQAFirstLine(
  lineNum: number,
  qaLabel: string,
  text: string,
  qaSpaces: number,
  opts: TranscriptFormatOptions,
): string {
  const indent = ' '.repeat(Math.floor(opts.tabStops.tab2 * CHARS_PER_INCH) - 5); // tab2 - prefix
  const space = ' '.repeat(qaSpaces);
  return linePrefix(lineNum, opts) + indent + qaLabel + space + text;
}

function buildQAContLine(lineNum: number, text: string, opts: TranscriptFormatOptions): string {
  return linePrefix(lineNum, opts) + text;
}

// =============================================================================
// Segment → lines renderer
// =============================================================================

interface RenderedLine {
  text: string;
  bold: boolean;
}

function renderSegmentsToLines(
  segments: TranscriptSegment[],
  config: TranscriptFormatConfig,
): RenderedLine[] {
  const opts = config.formatOptions;
  const textAreaWidth = 8.5 - opts.margins.left - opts.margins.right;
  const maxCharsSpeaker = Math.floor((textAreaWidth - opts.tabStops.tab3) * CHARS_PER_INCH);
  const maxCharsQACont = Math.floor(textAreaWidth * CHARS_PER_INCH);
  const maxCharsQAFirst = Math.floor(
    (textAreaWidth - opts.tabStops.tab2) * CHARS_PER_INCH - 2 - opts.qaSpaces,
  );

  let lineNum = opts.startLineNumber - 1;
  const lines: RenderedLine[] = [];

  for (const seg of segments) {
    const label = getSpeakerLabel(seg.speakerId, config.speakerMappings);
    const qaLabel = getQALabel(label, lineNum + 1, config.examinationSections);

    if (qaLabel) {
      const wrapped = wrapText(seg.text, maxCharsQAFirst, maxCharsQACont);
      if (wrapped.length > 0) {
        lineNum++;
        lines.push({ text: buildQAFirstLine(lineNum, qaLabel, wrapped[0], opts.qaSpaces, opts), bold: false });
        for (let i = 1; i < wrapped.length; i++) {
          lineNum++;
          lines.push({ text: buildQAContLine(lineNum, wrapped[i], opts), bold: false });
        }
      }
    } else {
      lineNum++;
      lines.push({ text: buildSpeakerLabelLine(lineNum, label, opts), bold: true });
      const wrapped = wrapText(seg.text, maxCharsSpeaker, maxCharsSpeaker);
      for (const chunk of wrapped) {
        lineNum++;
        lines.push({ text: buildSpeakerContLine(lineNum, chunk, opts), bold: false });
      }
    }
  }

  return lines;
}

// =============================================================================
// PDF document builder
// =============================================================================

function buildPdf(
  lines: RenderedLine[],
  opts: TranscriptFormatOptions,
  meta: { caseName: string; caseNumber?: string; date?: string },
): Buffer {
  const marginPt = opts.margins.left * PT_PER_INCH;
  const pageHeightPt = 11 * PT_PER_INCH;          // 792
  const pageWidthPt = 8.5 * PT_PER_INCH;          // 612
  const fontSizePt = opts.fontSize;
  // Double-spacing: line pitch = fontSize × lineSpacing
  const linePitch = Math.round(fontSizePt * opts.lineSpacing);
  const bodyTopPt = opts.margins.top * PT_PER_INCH;
  const bodyBottomPt = pageHeightPt - opts.margins.bottom * PT_PER_INCH;
  const contentWidth = pageWidthPt - marginPt * 2;

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: {
      top: bodyTopPt,
      bottom: opts.margins.bottom * PT_PER_INCH,
      left: marginPt,
      right: opts.margins.right * PT_PER_INCH,
    },
    autoFirstPage: false,
    bufferPages: true,
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // ── Helper: add a page with header ──────────────────────────────
  let currentPage = 0;
  function addPage() {
    currentPage++;
    doc.addPage();
    doc
      .font('Courier')
      .fontSize(fontSizePt - 2) // 10pt header
      .fillColor('#000000');

    // Header: case name left, page number right
    const headerY = bodyTopPt - 18;
    doc.text(meta.caseName, marginPt, headerY, { width: contentWidth / 2 });
    doc.text(`Page ${currentPage}`, marginPt + contentWidth / 2, headerY, {
      width: contentWidth / 2,
      align: 'right',
    });
    if (meta.caseNumber) {
      doc.text(meta.caseNumber, marginPt, headerY + 12, { width: contentWidth / 2 });
    }
  }

  // ── Paginate lines (LINES_PER_PAGE per page) ─────────────────────
  doc.font('Courier').fontSize(fontSizePt).fillColor('#000000');

  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    addPage();
    const pageLines = lines.slice(i, i + LINES_PER_PAGE);
    let y = bodyTopPt;

    for (const line of pageLines) {
      if (line.bold) {
        doc.font('Courier-Bold').fontSize(fontSizePt);
      } else {
        doc.font('Courier').fontSize(fontSizePt);
      }
      doc.text(line.text, marginPt, y, {
        width: contentWidth,
        lineBreak: false,
      });
      y += linePitch;

      // Safety: stop rendering if we exceed the body bottom
      if (y > bodyBottomPt - linePitch) break;
    }
  }

  doc.end();

  return Buffer.concat(chunks);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a legal-grade PDF transcript from a job's transcription data.
 * Falls back to plain text layout if no format config is provided.
 */
export async function exportLegalPdf(
  jobId: string,
  formatConfig: TranscriptFormatConfig | null,
): Promise<Buffer> {
  const supabase = await createSupabaseServerClient();

  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('segments, full_transcript, original_transcript')
    .eq('job_id', jobId)
    .single();

  if (!transcription) {
    throw new Error('Transcription not found');
  }

  // Resolve format config — use defaults when none provided
  const resolvedConfig: TranscriptFormatConfig = formatConfig && formatConfig.speakerMappings.length > 0
    ? normalizeFormatConfig(formatConfig)
    : {
        speakerMappings: [],
        examinationSections: [],
        formatOptions: { ...DEFAULT_FORMAT_OPTIONS, includeLineNumbers: true },
        processingRules: DEFAULT_PROCESSING_RULES,
      };

  const rawSegments = toTranscriptSegments(transcription.segments);
  const processedSegments = postProcessSegments(
    rawSegments,
    resolvedConfig.processingRules,
    resolvedConfig.formatOptions.sentenceSpaces,
  );

  // Fall back to plain-text lines when there are no structured segments
  let lines: RenderedLine[];
  if (processedSegments.length > 0) {
    lines = renderSegmentsToLines(processedSegments, resolvedConfig);
  } else {
    const rawText: string =
      transcription.full_transcript || transcription.original_transcript || '';
    const textLines = rawText.split('\n').filter(Boolean);
    lines = textLines.map((t, i) => ({
      text: `${String(i + 1).padStart(2)}   ${t}`,
      bold: false,
    }));
  }

  return buildPdf(lines, resolvedConfig.formatOptions, { caseName: 'Transcript' });
}

/**
 * Generate a legal PDF with job metadata for the case header.
 */
export async function exportLegalPdfWithMeta(
  transcriptId: string,
): Promise<Buffer> {
  const supabase = await createSupabaseServerClient();

  const { data: transcript } = await supabase
    .from('transcriptions')
    .select('job_id')
    .eq('id', transcriptId)
    .single();

  if (!transcript) throw new Error('Transcript not found');

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, case_name, case_number, deposition_date, format_settings')
    .eq('id', transcript.job_id)
    .single();

  const formatConfig = (job?.format_settings as TranscriptFormatConfig | null) ?? null;

  const buf = await exportLegalPdf(transcript.job_id, formatConfig);

  // Re-build with proper metadata if job data is available
  if (job) {
    const resolvedConfig: TranscriptFormatConfig = formatConfig && (formatConfig as TranscriptFormatConfig).speakerMappings?.length > 0
      ? normalizeFormatConfig(formatConfig)
      : {
          speakerMappings: [],
          examinationSections: [],
          formatOptions: { ...DEFAULT_FORMAT_OPTIONS, includeLineNumbers: true },
          processingRules: DEFAULT_PROCESSING_RULES,
        };

    const supabase2 = await createSupabaseServerClient();
    const { data: transcription } = await supabase2
      .from('transcriptions')
      .select('segments, full_transcript, original_transcript')
      .eq('job_id', transcript.job_id)
      .single();

    if (transcription) {
      const rawSegments = toTranscriptSegments(transcription.segments);
      const processedSegments = postProcessSegments(
        rawSegments,
        resolvedConfig.processingRules,
        resolvedConfig.formatOptions.sentenceSpaces,
      );

      const lines = processedSegments.length > 0
        ? renderSegmentsToLines(processedSegments, resolvedConfig)
        : (transcription.full_transcript || '').split('\n').filter(Boolean).map((t: string, i: number) => ({
            text: `${String(i + 1).padStart(2)}   ${t}`,
            bold: false,
          }));

      return buildPdf(lines, resolvedConfig.formatOptions, {
        caseName: job.title || job.case_name || 'Transcript',
        caseNumber: job.case_number ?? undefined,
        date: job.deposition_date
          ? new Date(job.deposition_date).toLocaleDateString('en-US')
          : undefined,
      });
    }
  }

  return buf;
}

import type { UnifiedRenderLine, UnifiedRenderModel } from "../transcript/unifiedRendering";

import type { RepairCategory, RepairFinding, RepairOwner, RepairSeverity } from "./types";

/**
 * Deterministic Stage S structural & presentation validators.
 *
 * Every validator READS a UnifiedRenderModel (the richest single owner output)
 * and returns measured RepairFindings. None of them mutate the model or any
 * upstream owner. Ids are stable and content-derived so results are
 * reproducible across runs (required for the regression baseline).
 */

interface FindingSeed {
  category: RepairCategory;
  severity: RepairSeverity;
  owner: RepairOwner;
  line: UnifiedRenderLine | null;
  index: number | null;
  message: string;
  count?: number;
  autoRepairable?: boolean;
}

function makeFinding(seed: FindingSeed): RepairFinding {
  const paragraphId = seed.line?.paragraphId ?? null;
  const idParts = [seed.category, seed.index ?? "-", paragraphId ?? "-"];
  return {
    id: `stage-s:${idParts.join(":")}`,
    category: seed.category,
    severity: seed.severity,
    owner: seed.owner,
    paragraphId,
    paragraphIndex: seed.index,
    message: seed.message,
    count: seed.count ?? 1,
    autoRepairable: seed.autoRepairable ?? false,
  };
}

/** Section headers that open an examination (Direct/Cross/Redirect/Recross). */
const EXAMINATION_HEADERS = new Set([
  "EXAMINATION",
  "CROSS-EXAMINATION",
  "REDIRECT",
  "REDIRECT EXAMINATION",
  "RECROSS",
  "RECROSS-EXAMINATION",
]);

export function isExaminationHeader(content: string): boolean {
  return EXAMINATION_HEADERS.has(content.trim().toUpperCase());
}

/** The spoken portion of a rendered line, with any Q./A./speaker label removed. */
function spokenText(line: UnifiedRenderLine): string {
  if (line.kind === "Q" || line.kind === "A") {
    return line.content.replace(/^[QA]\.\s+/, "").trim();
  }
  if (line.kind === "COLLOQUY") {
    const colon = line.content.indexOf(":");
    return colon >= 0 ? line.content.slice(colon + 1).trim() : line.content.trim();
  }
  return line.content.trim();
}

const QA_KINDS = new Set(["Q", "A"]);

/** Paragraph continuity: no empty/whitespace-only content on content-bearing paragraphs. */
export function validateParagraphContinuity(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  model.lines.forEach((line, index) => {
    if (line.content.trim().length === 0) {
      findings.push(
        makeFinding({
          category: "PARAGRAPH_CONTINUITY",
          severity: "CRITICAL",
          owner: "COMPILER",
          line,
          index,
          message: `Paragraph ${line.paragraphId} (${line.kind}) has no content.`,
        }),
      );
    }
  });
  return findings;
}

/** Q/A continuity: labels present, and no answer precedes its first question. */
export function validateQaContinuity(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  let seenQuestion = false;
  model.lines.forEach((line, index) => {
    if (line.kind === "SECTION_HEADER") {
      seenQuestion = false;
      return;
    }
    if (line.kind === "Q") {
      seenQuestion = true;
      if (!/^Q\.\s/.test(line.content) && line.content.trim() !== "Q.") {
        findings.push(
          makeFinding({
            category: "QA_CONTINUITY",
            severity: "MAJOR",
            owner: "COMPILER",
            line,
            index,
            message: `Question paragraph ${line.paragraphId} is missing its "Q." label.`,
          }),
        );
      }
    }
    if (line.kind === "A") {
      if (!/^A\.\s/.test(line.content) && line.content.trim() !== "A.") {
        findings.push(
          makeFinding({
            category: "QA_CONTINUITY",
            severity: "MAJOR",
            owner: "COMPILER",
            line,
            index,
            message: `Answer paragraph ${line.paragraphId} is missing its "A." label.`,
          }),
        );
      }
      if (!seenQuestion) {
        findings.push(
          makeFinding({
            category: "QA_CONTINUITY",
            severity: "CRITICAL",
            owner: "COMPILER",
            line,
            index,
            message: `Answer paragraph ${line.paragraphId} appears before any question.`,
          }),
        );
      }
    }
  });
  return findings;
}

/**
 * Examination boundary: EVERY run of Q/A testimony must sit under an examination
 * section header. A deposition has multiple examinations (Direct, Cross,
 * Redirect, Recross); each transition is validated, not just the first. The
 * "active examination" is the most recent SECTION_HEADER; a non-examination
 * header (or none) invalidates the Q/A run that follows.
 */
export function validateExaminationBoundary(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  let activeExamination = false;
  let flaggedCurrentRun = false;

  model.lines.forEach((line, index) => {
    if (line.kind === "SECTION_HEADER") {
      activeExamination = isExaminationHeader(line.content);
      flaggedCurrentRun = false;
      return;
    }
    if (!QA_KINDS.has(line.kind)) {
      // A non-Q/A, non-header paragraph (parenthetical, colloquy) ends the run
      // but does not change the active examination context.
      flaggedCurrentRun = false;
      return;
    }
    if (!activeExamination && !flaggedCurrentRun) {
      flaggedCurrentRun = true;
      findings.push(
        makeFinding({
          category: "EXAMINATION_BOUNDARY",
          severity: "MAJOR",
          owner: "COMPILER",
          line,
          index,
          message: `Q/A testimony at paragraph ${line.paragraphId} is not under an examination section header.`,
        }),
      );
    }
  });

  return findings;
}

/** Colloquy transitions: colloquy paragraphs must carry a speaker label. */
export function validateColloquyTransitions(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  model.lines.forEach((line, index) => {
    if (line.kind !== "COLLOQUY") {
      return;
    }
    if (!line.content.includes(":")) {
      findings.push(
        makeFinding({
          category: "COLLOQUY_TRANSITION",
          severity: "MAJOR",
          owner: "COMPILER",
          line,
          index,
          message: `Colloquy paragraph ${line.paragraphId} has no speaker label.`,
        }),
      );
    }
  });
  return findings;
}

/** Speaker-label continuity: colloquy labels should be upper-cased. */
export function validateSpeakerLabelContinuity(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  model.lines.forEach((line, index) => {
    if (line.kind !== "COLLOQUY") {
      return;
    }
    const colonIndex = line.content.indexOf(":");
    if (colonIndex <= 0) {
      return;
    }
    const label = line.content.slice(0, colonIndex);
    if (label !== label.toUpperCase()) {
      findings.push(
        makeFinding({
          category: "SPEAKER_LABEL",
          severity: "MINOR",
          owner: "COMPILER",
          line,
          index,
          message: `Speaker label "${label}" is not upper-cased.`,
        }),
      );
    }
  });
  return findings;
}

/**
 * Objection placement: an objection is recognized by its canonical STRUCTURE —
 * the spoken utterance *begins* with "Objection" — not by mere presence of the
 * word (which produces false positives like "I have no objection" in testimony).
 * A structural objection must be spoken in colloquy and canonically formatted.
 */
export function validateObjectionPlacement(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  model.lines.forEach((line, index) => {
    const spoken = spokenText(line);
    if (!/^Objection\b/i.test(spoken)) {
      return;
    }
    if (line.kind !== "COLLOQUY") {
      findings.push(
        makeFinding({
          category: "OBJECTION_PLACEMENT",
          severity: "MAJOR",
          owner: "COMPILER",
          line,
          index,
          message: `A spoken objection appears in a ${line.kind} paragraph rather than colloquy.`,
        }),
      );
      return;
    }
    if (!/^Objection\.\s{2}\S/.test(spoken)) {
      findings.push(
        makeFinding({
          category: "OBJECTION_PLACEMENT",
          severity: "MINOR",
          owner: "EDITORIAL",
          line,
          index,
          message: `Objection in paragraph ${line.paragraphId} is not in canonical "Objection.  <basis>." form.`,
        }),
      );
    }
  });
  return findings;
}

/** Parenthetical placement: parentheticals must be wrapped in parentheses. */
export function validateParentheticalPlacement(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  model.lines.forEach((line, index) => {
    if (line.kind !== "PARENTHETICAL") {
      return;
    }
    const text = line.content.trim();
    if (!(text.startsWith("(") && text.endsWith(")"))) {
      findings.push(
        makeFinding({
          category: "PARENTHETICAL_PLACEMENT",
          severity: "MINOR",
          owner: "COMPILER",
          line,
          index,
          message: `Parenthetical paragraph ${line.paragraphId} is not enclosed in parentheses.`,
        }),
      );
    }
  });
  return findings;
}

/** Section transitions: section headers must be upper-cased. */
export function validateSectionTransitions(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  model.lines.forEach((line, index) => {
    if (line.kind !== "SECTION_HEADER") {
      return;
    }
    const text = line.content.trim();
    if (text.length > 0 && text !== text.toUpperCase()) {
      findings.push(
        makeFinding({
          category: "SECTION_TRANSITION",
          severity: "MINOR",
          owner: "COMPILER",
          line,
          index,
          message: `Section header "${text}" is not upper-cased.`,
        }),
      );
    }
  });
  return findings;
}

const EXPECTED_ROLE: Record<string, string> = {
  Q: "qa",
  A: "qa",
  PARENTHETICAL: "parenthetical",
  SECTION_HEADER: "centered",
  DOCUMENT_BLOCK: "centered",
  COLLOQUY: "speaker",
  BY_LINE: "speaker",
};

/** Geometry: per-line tab role alignment, missing layout, margins, overflow, pagination. */
export function validateGeometry(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  const geometry = model.geometry;

  model.lines.forEach((line, index) => {
    if (line.geometry.paragraph_index < 0) {
      findings.push(
        makeFinding({
          category: "INDENT",
          severity: "MAJOR",
          owner: "GEOMETRY",
          line,
          index,
          message: `Paragraph ${line.paragraphId} has no geometry instruction.`,
        }),
      );
      return;
    }
    const expected = EXPECTED_ROLE[line.kind];
    if (expected && line.geometry.role !== expected) {
      findings.push(
        makeFinding({
          category: "INDENT",
          severity: "MAJOR",
          owner: "GEOMETRY",
          line,
          index,
          message: `Paragraph ${line.paragraphId} (${line.kind}) has tab role "${line.geometry.role}", expected "${expected}".`,
        }),
      );
    }
    // Layout-aware overflow: text WRAPS, so a long paragraph is not a defect.
    // Only an unbreakable token wider than the usable line box is a real
    // overflow. Usable width accounts for the paragraph's indentation.
    const usable = usableCharsPerLine(geometry.format_box_width_inches, lineIndentInches(line));
    if (usable > 0) {
      const longestToken = longestTokenLength(line.content);
      if (longestToken > usable) {
        findings.push(
          makeFinding({
            category: "LINE_OVERFLOW",
            severity: "COSMETIC",
            owner: "GEOMETRY",
            line,
            index,
            message: `Paragraph ${line.paragraphId} has an unbreakable token of ${longestToken} chars exceeding the ~${usable}-char usable line width.`,
          }),
        );
      }
    }
  });

  if (!(geometry.left_margin_inches > 0) || !(geometry.right_margin_inches > 0)) {
    findings.push(
      makeFinding({
        category: "MARGIN",
        severity: "MAJOR",
        owner: "GEOMETRY",
        line: null,
        index: null,
        message: "Geometry margins are not positive on both sides.",
      }),
    );
  }
  if (!(geometry.lines_per_page > 0)) {
    findings.push(
      makeFinding({
        category: "PAGE_BREAK",
        severity: "MAJOR",
        owner: "GEOMETRY",
        line: null,
        index: null,
        message: "Geometry lines-per-page is not positive; pagination cannot be validated.",
      }),
    );
  }

  return findings;
}

/** Characters-per-inch of the fixed-pitch (Courier 10-CPI) transcript font. */
const CHARS_PER_INCH = 10;

/** Courier 10-CPI approximation of characters per inch of format-box width. */
export function estimateCharsPerLine(formatBoxWidthInches: number): number {
  if (!(formatBoxWidthInches > 0)) {
    return 0;
  }
  return Math.floor(formatBoxWidthInches * CHARS_PER_INCH);
}

/** Usable characters on a line after subtracting the paragraph's indentation. */
export function usableCharsPerLine(formatBoxWidthInches: number, indentInches: number): number {
  const usableInches = formatBoxWidthInches - Math.max(0, indentInches);
  if (!(usableInches > 0)) {
    return 0;
  }
  return Math.floor(usableInches * CHARS_PER_INCH);
}

/** The effective indentation of a rendered line (first-line vs continuation). */
function lineIndentInches(line: UnifiedRenderLine): number {
  return Math.max(line.geometry.first_line_tab_inches, line.geometry.continuation_indent_inches);
}

function longestTokenLength(content: string): number {
  return content.split(/\s+/).reduce((max, token) => Math.max(max, token.length), 0);
}

/**
 * Estimate rendered line count for a paragraph: its text wraps within the usable
 * width, so a long paragraph occupies multiple lines (min one).
 */
function estimateRenderedLines(line: UnifiedRenderLine, formatBoxWidthInches: number): number {
  const usable = usableCharsPerLine(formatBoxWidthInches, lineIndentInches(line));
  if (usable <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(line.content.length / usable));
}

/**
 * Estimate page count from the total WRAPPED rendered lines (not paragraph
 * count) and lines-per-page. Still a heuristic — labeled as an estimate and not
 * used for RC pass/fail — but far closer than counting paragraphs.
 */
export function estimatePageCount(model: UnifiedRenderModel): number {
  const perPage = model.geometry.lines_per_page;
  if (!(perPage > 0)) {
    return 0;
  }
  const renderedLines = model.lines.reduce(
    (sum, line) => sum + estimateRenderedLines(line, model.geometry.format_box_width_inches),
    0,
  );
  return Math.max(1, Math.ceil(renderedLines / perPage));
}

export const STRUCTURAL_VALIDATORS: readonly ((model: UnifiedRenderModel) => RepairFinding[])[] = [
  validateParagraphContinuity,
  validateQaContinuity,
  validateExaminationBoundary,
  validateColloquyTransitions,
  validateSpeakerLabelContinuity,
  validateObjectionPlacement,
  validateParentheticalPlacement,
  validateSectionTransitions,
  validateGeometry,
];

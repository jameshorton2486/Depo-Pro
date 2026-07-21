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
    autoRepairable: seed.autoRepairable ?? false,
  };
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

/** Examination boundary: Q/A testimony must be introduced by an EXAMINATION section header. */
export function validateExaminationBoundary(model: UnifiedRenderModel): RepairFinding[] {
  const firstQaIndex = model.lines.findIndex((line) => QA_KINDS.has(line.kind));
  if (firstQaIndex === -1) {
    return [];
  }
  const hasExaminationHeader = model.lines
    .slice(0, firstQaIndex + 1)
    .some((line) => line.kind === "SECTION_HEADER" && /EXAMINATION/i.test(line.content));
  if (hasExaminationHeader) {
    return [];
  }
  const line = model.lines[firstQaIndex] ?? null;
  return [
    makeFinding({
      category: "EXAMINATION_BOUNDARY",
      severity: "MAJOR",
      owner: "COMPILER",
      line,
      index: firstQaIndex,
      message: "Q/A testimony is not introduced by an EXAMINATION section header.",
    }),
  ];
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

/** Objection placement: objections should be spoken (colloquy) and canonically formatted. */
export function validateObjectionPlacement(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  model.lines.forEach((line, index) => {
    if (!/\bobjection\b/i.test(line.content)) {
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
          message: `Objection text appears in a ${line.kind} paragraph rather than colloquy.`,
        }),
      );
      return;
    }
    if (!/Objection\.\s{2}\S/.test(line.content)) {
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
  const charsPerLine = estimateCharsPerLine(geometry.format_box_width_inches);

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
    if (charsPerLine > 0 && line.content.length > charsPerLine) {
      findings.push(
        makeFinding({
          category: "LINE_OVERFLOW",
          severity: "COSMETIC",
          owner: "GEOMETRY",
          line,
          index,
          message: `Paragraph ${line.paragraphId} content length ${line.content.length} exceeds ~${charsPerLine} chars per line.`,
        }),
      );
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

/** Courier 10-CPI approximation of usable characters per line within the format box. */
export function estimateCharsPerLine(formatBoxWidthInches: number): number {
  if (!(formatBoxWidthInches > 0)) {
    return 0;
  }
  return Math.floor(formatBoxWidthInches * 10);
}

/** Page count from paragraph count and lines-per-page (measurement helper). */
export function estimatePageCount(model: UnifiedRenderModel): number {
  const perPage = model.geometry.lines_per_page;
  if (!(perPage > 0)) {
    return 0;
  }
  return Math.max(1, Math.ceil(model.lines.length / perPage));
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

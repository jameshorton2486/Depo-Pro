import type { ValidationBlock } from "./correctionValidator";

export interface FormattedParagraph {
  kind: ValidationBlock["block_type"] | "BY_LINE";
  text: string;
}

export interface GeometryViolation {
  type: string;
  severity: "ERROR" | "WARNING";
  paragraph_index: number;
  message: string;
}

export interface FormattingResult {
  formatted_text: string;
  docx_paragraphs: FormattedParagraph[];
  geometry_violations: GeometryViolation[];
  metrics: {
    engine: "formatting_engine";
    blocks_formatted: number;
    q_lines: number;
    a_lines: number;
    sp_lines: number;
    pn_lines: number;
    header_lines: number;
    total_characters: number;
    geometry_violations: {
      errors: number;
      warnings: number;
      auto_fixed: number;
    };
    punctuation_corrections: number;
    number_formatting_applied: number;
    output_ready: boolean;
  };
}

const ABBREVIATION_PATTERN = /\b(?:Mr|Ms|Mrs|Dr|No|CSR|a\.m|p\.m|St|Ave|Blvd|Rd|Inc|LLC|PLLC|Corp)\.$/i;

function applyPunctuationRules(text: string): { text: string; changes: number } {
  let next = text;
  let changes = 0;
  const byLinePrefixMatch = next.match(/^\(BY\s+(MR|MS|MRS)\.\s{2}[A-Z][A-Z\s]+\)\s{2}/);
  const byLinePrefix = byLinePrefixMatch?.[0] ?? "";
  const bodyWithoutByLine = byLinePrefix ? next.slice(byLinePrefix.length) : next;

  const objectionSpaced = bodyWithoutByLine.replace(/(Objection\.)\s+(Form|Hearsay|Speculation|Foundation|Leading|Nonresponsive|Compound|Relevance|Privilege|Scope|Argumentative|Vague)\./g, "$1  $2.");
  if (objectionSpaced !== bodyWithoutByLine) {
    changes += 1;
  }
  let body = objectionSpaced;

  const okayNormalized = body.replace(/\bOkay,\s+/g, "Okay. ");
  if (okayNormalized !== body) {
    changes += 1;
  }
  body = okayNormalized;

  body = body.replace(/([.?!])\s([A-Z])/g, (_match, terminal: string, capital: string, offset: number, source: string) => {
    const prefix = source.slice(0, offset + 1);
    const lastToken = prefix.split(/\s+/).filter(Boolean).pop() ?? "";
    if (/Okay\.$/i.test(lastToken)) {
      return `${terminal} ${capital}`;
    }
    if (ABBREVIATION_PATTERN.test(lastToken)) {
      return `${terminal} ${capital}`;
    }
    changes += 1;
    return `${terminal}  ${capital}`;
  });

  body = body.replace(/\s*--\s*/g, " -- ");
  body = body.replace(/ {3,}/g, "  ");
  next = `${byLinePrefix}${body}`.trim();

  return { text: next.trim(), changes };
}

function formatCurrencyToken(token: string): string {
  const match = token.match(/^\$(\d+)\.00$/);
  if (!match) {
    return token;
  }
  return `$${match[1]}`;
}

function formatPercentageToken(token: string): string {
  const match = token.match(/^(\d+)%$/);
  if (!match) {
    return token;
  }
  return `${match[1]} percent`;
}

function applyNumberFormatting(text: string): { text: string; changes: number } {
  let changes = 0;
  const currencyAdjusted = text.replace(/\$\d+\.00\b/g, (token) => {
    const updated = formatCurrencyToken(token);
    if (updated !== token) {
      changes += 1;
    }
    return updated;
  });

  const percentAdjusted = currencyAdjusted.replace(/\b\d+%/g, (token) => {
    const updated = formatPercentageToken(token);
    if (updated !== token) {
      changes += 1;
    }
    return updated;
  });

  const timeAdjusted = percentAdjusted.replace(/\b0(\d:\d{2}\s*[ap]\.m\.)/gi, (_match, time: string) => {
    changes += 1;
    return time;
  });

  return { text: timeAdjusted, changes };
}

function formatSpeakerLabel(label: string): string {
  return label.replace(/\b(MR|MS|MRS|DR)\.\s+/gi, (_match, honorific: string) => `${honorific.toUpperCase()}. `).replace(/THE COURT REPORTER:/gi, "THE REPORTER:");
}

function renderBlock(block: ValidationBlock): FormattedParagraph[] {
  if (block.block_type === "HEADER") {
    const lines: FormattedParagraph[] = [{ kind: "HEADER", text: block.text }];
    const byLineMatch = block.text.match(/^BY\s+(MR|MS|MRS)\.\s{2}.+:/);
    if (byLineMatch) {
      lines.push({ kind: "BY_LINE", text: block.text });
    }
    return lines;
  }

  if (block.block_type === "Q") {
    return [{ kind: "Q", text: `\tQ.\t${block.text}` }];
  }

  if (block.block_type === "A") {
    return [{ kind: "A", text: `\tA.\t${block.text}` }];
  }

  if (block.block_type === "PN") {
    return [{ kind: "PN", text: `\t\t\t\t${block.text}` }];
  }

  return [{ kind: "SP", text: `\t\t\t${formatSpeakerLabel(block.display_name)}:  ${block.text}`.replace(/::/g, ":") }];
}

export function checkGeometry(paragraphs: FormattedParagraph[]): GeometryViolation[] {
  const issues: GeometryViolation[] = [];

  paragraphs.forEach((paragraph, index) => {
    if (paragraph.kind === "Q" && !paragraph.text.startsWith("\tQ.\t")) {
      issues.push({ type: "Q_MISSING_LEADING_TAB", severity: "ERROR", paragraph_index: index, message: "Q line missing leading tab." });
    }
    if (paragraph.kind === "A" && !paragraph.text.startsWith("\tA.\t")) {
      issues.push({ type: "A_MISSING_LEADING_TAB", severity: "ERROR", paragraph_index: index, message: "A line missing leading tab." });
    }
    if (paragraph.kind === "SP" && /\b(?:MR|MS|MRS|DR)\.\s{2}[A-Z]/.test(paragraph.text)) {
      issues.push({ type: "SPEAKER_LABEL_DOUBLE_SPACE", severity: "ERROR", paragraph_index: index, message: "Speaker label uses two spaces after honorific period." });
    }
    if (paragraph.kind === "PN" && !paragraph.text.startsWith("\t\t\t\t(")) {
      issues.push({ type: "PARENTHETICAL_INDENT", severity: "ERROR", paragraph_index: index, message: "Parenthetical missing four-tab indent." });
    }
    if (/THE COURT REPORTER:/i.test(paragraph.text)) {
      issues.push({ type: "COURT_REPORTER_LABEL", severity: "ERROR", paragraph_index: index, message: "THE COURT REPORTER must render as THE REPORTER." });
    }
    if (/[.?!] (?=[A-Z])/.test(paragraph.text)) {
      issues.push({ type: "SINGLE_SPACE_AFTER_TERMINAL", severity: "WARNING", paragraph_index: index, message: "Single space after sentence-ending punctuation." });
    }
    if (/Objection\.\s(?:Form|Hearsay|Speculation|Foundation|Leading|Nonresponsive|Compound|Relevance|Privilege|Scope|Argumentative|Vague)\./.test(paragraph.text)) {
      issues.push({ type: "OBJECTION_SINGLE_SPACE", severity: "WARNING", paragraph_index: index, message: "Objection basis uses single spacing." });
    }
    if (/\d+%/.test(paragraph.text)) {
      issues.push({ type: "PERCENT_SYMBOL", severity: "ERROR", paragraph_index: index, message: "Percentages must use the word percent." });
    }
  });

  return issues;
}

export function formatTranscriptBlocks(blocks: ValidationBlock[]): FormattingResult {
  let punctuationCorrections = 0;
  let numberFormattingApplied = 0;
  const rendered = blocks.flatMap((block) => {
    const punctuation = applyPunctuationRules(block.text);
    punctuationCorrections += punctuation.changes;
    const numeric = applyNumberFormatting(punctuation.text);
    numberFormattingApplied += numeric.changes;
    return renderBlock({ ...block, text: numeric.text });
  });

  const geometryViolations = checkGeometry(rendered);
  const formattedText = rendered.map((paragraph) => paragraph.text).join("\n");
  const errorCount = geometryViolations.filter((issue) => issue.severity === "ERROR").length;
  const warningCount = geometryViolations.filter((issue) => issue.severity === "WARNING").length;

  return {
    formatted_text: formattedText,
    docx_paragraphs: rendered,
    geometry_violations: geometryViolations,
    metrics: {
      engine: "formatting_engine",
      blocks_formatted: blocks.length,
      q_lines: blocks.filter((block) => block.block_type === "Q").length,
      a_lines: blocks.filter((block) => block.block_type === "A").length,
      sp_lines: blocks.filter((block) => block.block_type === "SP").length,
      pn_lines: blocks.filter((block) => block.block_type === "PN").length,
      header_lines: blocks.filter((block) => block.block_type === "HEADER").length,
      total_characters: formattedText.length,
      geometry_violations: {
        errors: errorCount,
        warnings: warningCount,
        auto_fixed: punctuationCorrections + numberFormattingApplied,
      },
      punctuation_corrections: punctuationCorrections,
      number_formatting_applied: numberFormattingApplied,
      output_ready: errorCount === 0,
    },
  };
}

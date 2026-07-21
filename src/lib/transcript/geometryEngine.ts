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
function formatSpeakerLabel(label: string): string {
  return label.replace(/\b(MR|MS|MRS|DR)\.\s+/gi, (_match, honorific: string) => `${honorific.toUpperCase()}. `).replace(/THE COURT REPORTER:/gi, "THE REPORTER:");
}

export function renderBlock(block: ValidationBlock): FormattedParagraph[] {
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




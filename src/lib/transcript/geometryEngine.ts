import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import type { GeometryProfile } from "../format/types";
import type { ValidationBlock } from "./correctionValidator";
import type { StructuredTranscriptPackage } from "./structuredTranscriptPackage";

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

export type GeometryLayoutRole = "qa" | "speaker" | "parenthetical" | "centered";

export interface GeometryLayoutLine {
  paragraph_index: number;
  paragraph_id: string | null;
  role: GeometryLayoutRole;
  first_line_tab_inches: number;
  text_tab_inches: number | null;
  continuation_indent_inches: number;
}

export interface GeometryLayoutModel {
  format_box_width_inches: number;
  left_margin_inches: number;
  right_margin_inches: number;
  line_spacing_points: number;
  lines_per_page: number;
  lines: GeometryLayoutLine[];
}

function formatSpeakerLabel(label: string): string {
  return label.replace(/\b(MR|MS|MRS|DR)\.\s+/gi, (_match, honorific: string) => `${honorific.toUpperCase()}. `).replace(/THE COURT REPORTER:/gi, "THE REPORTER:");
}

export function renderBlock(
  block: ValidationBlock,
  profile: GeometryProfile = DEFAULT_GEOMETRY_PROFILE
): FormattedParagraph[] {
  if (block.block_type === "HEADER") {
    const lines: FormattedParagraph[] = [{ kind: "HEADER", text: block.text }];
    const byLineMatch = block.text.match(/^BY\s+(MR|MS|MRS)\.\s{2}.+:/);
    if (byLineMatch) {
      lines.push({ kind: "BY_LINE", text: block.text });
    }
    return lines;
  }

  if (block.block_type === "Q") {
    return [{ kind: "Q", text: `${tabsFor(profile.tabs.qaLabelInches, profile)}Q.${tabsFor(profile.tabs.qaTextInches - profile.tabs.qaLabelInches, profile)}${block.text}` }];
  }

  if (block.block_type === "A") {
    return [{ kind: "A", text: `${tabsFor(profile.tabs.qaLabelInches, profile)}A.${tabsFor(profile.tabs.qaTextInches - profile.tabs.qaLabelInches, profile)}${block.text}` }];
  }

  if (block.block_type === "PN") {
    return [{ kind: "PN", text: `${tabsFor(profile.tabs.parentheticalInches, profile)}${block.text}` }];
  }

  return [{ kind: "SP", text: `${tabsFor(profile.tabs.speakerInches, profile)}${formatSpeakerLabel(block.display_name)}:  ${block.text}`.replace(/::/g, ":") }];
}

export function buildGeometryLayout(
  paragraphs: readonly FormattedParagraph[] | null | undefined,
  profile: GeometryProfile = DEFAULT_GEOMETRY_PROFILE
): GeometryLayoutModel {
  return {
    format_box_width_inches: profile.formatBoxWidthInches,
    left_margin_inches: profile.leftMarginInches,
    right_margin_inches: profile.rightMarginInches,
    line_spacing_points: profile.lineSpacingPoints,
    lines_per_page: profile.linesPerPage,
    lines: (paragraphs ?? []).map((paragraph, paragraphIndex) => ({
      paragraph_index: paragraphIndex,
      paragraph_id: null,
      ...layoutFor(paragraph?.kind, profile),
    })),
  };
}

export function buildStructuredTranscriptGeometryLayout(
  transcriptPackage: StructuredTranscriptPackage | null | undefined,
  profile: GeometryProfile = DEFAULT_GEOMETRY_PROFILE
): GeometryLayoutModel {
  return {
    format_box_width_inches: profile.formatBoxWidthInches,
    left_margin_inches: profile.leftMarginInches,
    right_margin_inches: profile.rightMarginInches,
    line_spacing_points: profile.lineSpacingPoints,
    lines_per_page: profile.linesPerPage,
    lines: (transcriptPackage?.paragraphs ?? []).map((entry, paragraphIndex) => ({
      paragraph_index: paragraphIndex,
      paragraph_id: entry?.id ?? null,
      ...layoutForTranscriptParagraph(entry?.paragraph?.kind, profile),
    })),
  };
}
export function checkGeometry(
  paragraphs: readonly FormattedParagraph[] | null | undefined,
  profile: GeometryProfile = DEFAULT_GEOMETRY_PROFILE
): GeometryViolation[] {
  const issues: GeometryViolation[] = [];

  if (!paragraphs) {
    return issues;
  }

  paragraphs.forEach((paragraph, index) => {
    if (paragraph.kind === "Q" && !paragraph.text.startsWith(`${tabsFor(profile.tabs.qaLabelInches, profile)}Q.${tabsFor(profile.tabs.qaTextInches - profile.tabs.qaLabelInches, profile)}`)) {
      issues.push({ type: "Q_MISSING_LEADING_TAB", severity: "ERROR", paragraph_index: index, message: "Q line is not aligned to the Q/A tab stops." });
    }
    if (paragraph.kind === "A" && !paragraph.text.startsWith(`${tabsFor(profile.tabs.qaLabelInches, profile)}A.${tabsFor(profile.tabs.qaTextInches - profile.tabs.qaLabelInches, profile)}`)) {
      issues.push({ type: "A_MISSING_LEADING_TAB", severity: "ERROR", paragraph_index: index, message: "A line is not aligned to the Q/A tab stops." });
    }
    if (paragraph.kind === "SP" && !paragraph.text.startsWith(tabsFor(profile.tabs.speakerInches, profile))) {
      issues.push({ type: "SPEAKER_INDENT", severity: "ERROR", paragraph_index: index, message: "Speaker line is not aligned to the speaker tab." });
    }
    if (paragraph.kind === "PN" && !paragraph.text.startsWith(`${tabsFor(profile.tabs.parentheticalInches, profile)}(`)) {
      issues.push({ type: "PARENTHETICAL_INDENT", severity: "ERROR", paragraph_index: index, message: "Parenthetical is not aligned to the parenthetical tab." });
    }
  });

  return issues;
}

function tabsFor(inches: number, profile: GeometryProfile): string {
  const qaLabelInches = profile.tabs.qaLabelInches;
  if (qaLabelInches <= 0) {
    return "";
  }
  const tabCount = Math.round(inches / qaLabelInches);
  return "\t".repeat(Math.max(0, Number.isFinite(tabCount) ? tabCount : 0));
}

function layoutFor(
  kind: FormattedParagraph["kind"] | null | undefined,
  profile: GeometryProfile
): Omit<GeometryLayoutLine, "paragraph_index" | "paragraph_id"> {
  if (kind === "Q" || kind === "A") {
    return {
      role: "qa",
      first_line_tab_inches: profile.tabs.qaLabelInches,
      text_tab_inches: profile.tabs.qaTextInches,
      continuation_indent_inches: profile.tabs.continuationInches,
    };
  }

  if (kind === "PN") {
    return {
      role: "parenthetical",
      first_line_tab_inches: profile.tabs.parentheticalInches,
      text_tab_inches: null,
      continuation_indent_inches: profile.tabs.continuationInches,
    };
  }

  if (kind === "HEADER") {
    return {
      role: "centered",
      first_line_tab_inches: profile.tabs.centerInches,
      text_tab_inches: null,
      continuation_indent_inches: profile.tabs.continuationInches,
    };
  }

  return {
    role: "speaker",
    first_line_tab_inches: profile.tabs.speakerInches,
    text_tab_inches: null,
    continuation_indent_inches: profile.tabs.continuationInches,
  };
}
function layoutForTranscriptParagraph(
  kind: StructuredTranscriptPackage["paragraphs"][number]["paragraph"]["kind"] | null | undefined,
  profile: GeometryProfile
): Omit<GeometryLayoutLine, "paragraph_index" | "paragraph_id"> {
  if (kind === "Q" || kind === "A") {
    return layoutFor(kind, profile);
  }

  if (kind === "PARENTHETICAL") {
    return layoutFor("PN", profile);
  }

  if (kind === "SECTION_HEADER" || kind === "DOCUMENT_BLOCK") {
    return layoutFor("HEADER", profile);
  }

  return layoutFor("SP", profile);
}
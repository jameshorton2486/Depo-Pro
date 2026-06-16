import { roleToQaMode, type StageSRole } from "../speakerMapping";
import { colloquyInlineText, colloquyLabel, normalizeHonorificSpacing } from "./colloquy";
import {
  LINE_A,
  LINE_BY,
  LINE_COLLOQUY,
  LINE_EXAMINATION,
  LINE_FLAGGED,
  LINE_PARENTHETICAL,
  LINE_Q,
  ON_RECORD,
  TAB_COLLOQUY,
  TAB_MARGIN,
  TAB_PARENTHETICAL,
  TAB_QA_DESIGNATION,
  type RenderLine,
  type RenderState,
} from "./models";

export function qaLine(
  lineId: string,
  mode: "Q" | "A",
  text: string,
  utteranceIds: string[],
  renderState: RenderState = ON_RECORD,
  byLabel = "",
): RenderLine {
  let body = text.trim();
  if (byLabel) {
    body = `(BY ${normalizeHonorificSpacing(byLabel).trim().toUpperCase()})  ${body}`;
  }

  return {
    lineId,
    lineType: mode === "Q" ? LINE_Q : LINE_A,
    text: body,
    speakerLabel: "",
    sourceUtteranceIds: [...utteranceIds],
    tabLevel: TAB_QA_DESIGNATION,
    procedural: false,
    renderState,
    auditNote: "",
  };
}

export function colloquyLine(
  lineId: string,
  speakerLabel: string,
  text: string,
  utteranceIds: string[],
  renderState: RenderState = ON_RECORD,
  auditNote = "",
): RenderLine {
  return {
    lineId,
    lineType: LINE_COLLOQUY,
    text: colloquyInlineText(speakerLabel, text),
    speakerLabel: colloquyLabel(speakerLabel),
    sourceUtteranceIds: [...utteranceIds],
    tabLevel: TAB_COLLOQUY,
    procedural: false,
    renderState,
    auditNote,
  };
}

export function parentheticalLine(
  lineId: string,
  text: string,
  renderState: RenderState = ON_RECORD,
  auditNote = "",
): RenderLine {
  return {
    lineId,
    lineType: LINE_PARENTHETICAL,
    text,
    speakerLabel: "",
    sourceUtteranceIds: [],
    tabLevel: TAB_PARENTHETICAL,
    procedural: true,
    renderState,
    auditNote,
  };
}

export function byAttributionLine(
  lineId: string,
  examinerLabel: string,
  renderState: RenderState = ON_RECORD,
): RenderLine {
  const label = normalizeHonorificSpacing(examinerLabel).trim().toUpperCase().replace(/:+$/, "");
  const text = `BY ${label}:`;

  return {
    lineId,
    lineType: LINE_BY,
    text,
    speakerLabel: text,
    sourceUtteranceIds: [],
    tabLevel: TAB_MARGIN,
    procedural: true,
    renderState,
    auditNote: "Examination attribution re-emitted after resumption.",
  };
}

export function examinationHeaderLine(
  lineId: string,
  renderState: RenderState = ON_RECORD,
): RenderLine {
  return {
    lineId,
    lineType: LINE_EXAMINATION,
    text: "EXAMINATION",
    speakerLabel: "",
    sourceUtteranceIds: [],
    tabLevel: TAB_MARGIN,
    procedural: true,
    renderState,
    auditNote: "Examination section header emitted at examination start.",
  };
}

export function flaggedLine(
  lineId: string,
  rawLabel: string,
  text: string,
  utteranceIds: string[],
  renderState: RenderState = ON_RECORD,
): RenderLine {
  return {
    lineId,
    lineType: LINE_FLAGGED,
    text: text.trim(),
    speakerLabel: rawLabel || "UNIDENTIFIED SPEAKER",
    sourceUtteranceIds: [...utteranceIds],
    tabLevel: TAB_COLLOQUY,
    procedural: false,
    renderState,
    auditNote: "Unmapped speaker cluster -- flagged for review.",
  };
}

export function qaModeForRole(role: StageSRole | null | undefined): "Q" | "A" | "" {
  return roleToQaMode(role);
}

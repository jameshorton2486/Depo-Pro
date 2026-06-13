export const ON_RECORD = "ON_RECORD" as const;
export const OFF_RECORD = "OFF_RECORD" as const;

export const LINE_Q = "Q" as const;
export const LINE_A = "A" as const;
export const LINE_COLLOQUY = "colloquy" as const;
export const LINE_PARENTHETICAL = "parenthetical" as const;
export const LINE_BY = "by_line" as const;
export const LINE_EXAMINATION = "examination" as const;
export const LINE_FLAGGED = "flagged" as const;
export const LINE_BLANK = "blank" as const;

export const TAB_MARGIN = 0 as const;
export const TAB_QA_DESIGNATION = 1 as const;
export const TAB_QA_TEXT = 2 as const;
export const TAB_COLLOQUY = 3 as const;
export const TAB_PARENTHETICAL = 4 as const;

export type RenderState = typeof ON_RECORD | typeof OFF_RECORD;

export type LineType =
  | typeof LINE_Q
  | typeof LINE_A
  | typeof LINE_COLLOQUY
  | typeof LINE_PARENTHETICAL
  | typeof LINE_BY
  | typeof LINE_EXAMINATION
  | typeof LINE_FLAGGED
  | typeof LINE_BLANK;

export type TabLevel =
  | typeof TAB_MARGIN
  | typeof TAB_QA_DESIGNATION
  | typeof TAB_QA_TEXT
  | typeof TAB_COLLOQUY
  | typeof TAB_PARENTHETICAL;

export interface RenderLine {
  lineId: string;
  lineType: LineType;
  text: string;
  speakerLabel: string;
  sourceUtteranceIds: string[];
  tabLevel: TabLevel;
  procedural: boolean;
  renderState: RenderState;
  auditNote: string;
}

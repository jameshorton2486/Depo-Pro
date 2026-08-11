// DOC-0328 — certified index model (examination index + exhibit index).
//
// The witness/exhibit index pages cite certified page numbers. Those numbers now
// exist as anchors on the PaginationMap (`detectSectionAnchors` / `detectExhibitAnchors`),
// derived from the same rendered body. This module is the pure PROJECTION from those
// anchors to the row models the index pages print — one authoritative source of page
// numbers, no re-derivation.
//
// INERT / default-off: nothing renders these rows yet. Descriptions/columns sourced
// from the CaseRecord (exhibit descriptions, witness name) are merged by the renderer
// at build time; this projection is over the paginated body alone, so its page numbers
// match the body by construction.
import type { PaginationMap, SectionAnchor } from "./paginationContract";

/** One examination-index row: which examination, by whom, beginning on which page. */
export interface ExaminationIndexRow {
  kind: SectionAnchor["kind"];
  examinerLabel: string | null;
  /** Certified page on which the examination begins. */
  page: number;
}

/**
 * One exhibit-index row: the exhibit and the certified page of each action taken on
 * it. A null page means that action did not occur (or was not detected) for the
 * exhibit. The first occurrence of each action wins (an exhibit is marked once).
 */
export interface ExhibitIndexRow {
  exhibit_number: string;
  marked: number | null;
  offered: number | null;
  admitted: number | null;
  excluded: number | null;
}

/** Examination-index rows in transcript order (anchors are already document-ordered). */
export function buildExaminationIndex(map: PaginationMap): ExaminationIndexRow[] {
  return map.sections.map((s) => ({
    kind: s.kind,
    examinerLabel: s.examinerLabel,
    page: s.start.page,
  }));
}

const ACTION_FIELD: Record<
  "MARKED" | "OFFERED" | "ADMITTED" | "EXCLUDED",
  keyof Omit<ExhibitIndexRow, "exhibit_number">
> = {
  MARKED: "marked",
  OFFERED: "offered",
  ADMITTED: "admitted",
  EXCLUDED: "excluded",
};

/**
 * Exhibit-index rows, one per distinct exhibit number in first-appearance order.
 * Each action column carries the certified page of that action's first occurrence.
 */
export function buildExhibitIndex(map: PaginationMap): ExhibitIndexRow[] {
  const rowByNumber = new Map<string, ExhibitIndexRow>();
  const order: string[] = [];

  for (const anchor of map.exhibits) {
    let row = rowByNumber.get(anchor.exhibit_number);
    if (!row) {
      row = { exhibit_number: anchor.exhibit_number, marked: null, offered: null, admitted: null, excluded: null };
      rowByNumber.set(anchor.exhibit_number, row);
      order.push(anchor.exhibit_number);
    }
    const field = ACTION_FIELD[anchor.action];
    // First occurrence of an action wins — later restatements don't overwrite it.
    if (row[field] === null) {
      row[field] = anchor.at.page;
    }
  }

  return order.map((n) => rowByNumber.get(n)!);
}

// Pagination data contract (DOC-0328 — the certified-pages re-home prerequisite).
//
// The live renderer (formatter_core / geometryEngine) already computes, then DISCARDS, the
// final page/line coordinates of every rendered line. Certified indexes (witness/exhibit page
// refs) and the errata / changes-&-signature grid (each correction cites a transcript page +
// line) cannot be built until those coordinates are a queryable output. This module defines
// the CONTRACT for that output plus pure lookup helpers over it.
//
// INERT / default-off: nothing in the live path produces or consumes a PaginationMap yet. The
// PRODUCER (which must reproduce the renderer's wrap-then-chunk logic and match its page breaks
// exactly — a rendering-parity concern) is deliberately NOT implemented here; that is the
// activation build, gated with the rest of the certified-pages re-home. This file only fixes the
// shape and the read-side, so the shape can be reviewed and unit-tested ahead of the build.

/** A 1-based coordinate into the certified, line-numbered transcript body. */
export interface PageLineRef {
  /** 1-based certified page. */
  page: number;
  /** 1-based line within the page (1..linesPerPage). */
  line: number;
}

/** One physical (post-wrap) rendered line with its final coordinate and source identity. */
export interface PaginatedLine {
  ref: PageLineRef;
  /** Source paragraph identity (stable across the render). */
  paragraph_id: string;
  /** Source utterance, or null for generated lines (section headers, BY-lines, front/back matter). */
  utterance_id: string | null;
  /** True for wrapped continuation lines of a paragraph (not the paragraph's first line). */
  isContinuation: boolean;
}

/** Examination-section boundary, anchored to where it begins in the paginated body. */
export interface SectionAnchor {
  kind: "EXAMINATION" | "CROSS-EXAMINATION" | "REDIRECT" | "RECROSS" | "VOIR_DIRE";
  /** Examining attorney label, when known (feeds the witness index columns). */
  examinerLabel: string | null;
  start: PageLineRef;
}

/** Exhibit action, anchored to where it occurs (feeds the exhibit index columns). */
export interface ExhibitAnchor {
  exhibit_number: string;
  action: "MARKED" | "OFFERED" | "ADMITTED" | "EXCLUDED";
  at: PageLineRef;
}

/**
 * The queryable pagination output. `firstNumberedPage` records where body line-numbering starts
 * (front matter is unnumbered per ADR-0017), so page numbers here are certified page numbers.
 */
export interface PaginationMap {
  linesPerPage: number;
  firstNumberedPage: number;
  lines: PaginatedLine[];
  sections: SectionAnchor[];
  exhibits: ExhibitAnchor[];
}

/** Stable formatting of a ref for index/errata columns, e.g. "42:5". */
export function formatPageLine(ref: PageLineRef): string {
  return `${ref.page}:${ref.line}`;
}

/**
 * The first (page, line) at which a paragraph appears — the coordinate an errata row or an index
 * entry cites. Returns null if the paragraph is not in the map.
 */
export function lookupParagraphRef(map: PaginationMap, paragraphId: string): PageLineRef | null {
  for (const line of map.lines) {
    if (line.paragraph_id === paragraphId && !line.isContinuation) {
      return line.ref;
    }
  }
  // Fall back to any line for the paragraph (e.g. if only continuation lines are present).
  const any = map.lines.find((l) => l.paragraph_id === paragraphId);
  return any ? any.ref : null;
}

/** The first (page, line) for a source utterance — used to resolve a reviewed correction's location. */
export function lookupUtteranceRef(map: PaginationMap, utteranceId: string): PageLineRef | null {
  const line = map.lines.find((l) => l.utterance_id === utteranceId);
  return line ? line.ref : null;
}

/** Ascending sort key so index/errata rows print in transcript order. */
export function compareRefs(a: PageLineRef, b: PageLineRef): number {
  return a.page !== b.page ? a.page - b.page : a.line - b.line;
}

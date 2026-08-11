// DOC-0328 — canonical PaginationMap PRODUCER.
//
// The cardinal rule: there is ONE authoritative wrap/page-break process. The live
// certified body renderer already computes the final page/line coordinate of every
// physical (post-wrap) line inside `cfe` (FormattedLine.page_number /
// page_line_number) and then discards it. This producer does NOT re-implement
// wrapping or page chunking — it EXTRACTS those coordinates from the same `cfe`
// output the certified DOCX/PDF body is built from, so pagination cannot diverge
// from the rendered body by construction.
//
// It is a read/derive step over immutable render output: it never mutates the
// Working Transcript or raw evidence.
import type { CaseRecord } from "../../types/case";
import type { EditorDocument } from "../../api/types";
import type { CorrectionObject } from "../transcript/correctionObject";
import type { FormattedDocument, GeometryProfile } from "../format/types";
import { cfe } from "../format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import { abbreviationRegistry } from "../format/abbreviationRegistry";
import { buildDisplayDocument } from "../transcript/workspacePresentation";
import { deriveWorkingTranscript } from "../transcript/structuralApply";
import type { PaginatedLine, PaginationMap } from "./paginationContract";

// Stable per-paragraph id for the map. FormattedLine identifies its paragraph by a
// render-stable `paragraph_index`; we expose it as a string paragraph_id so index /
// errata lookups have a stable key. utterance_id (the correction-location key) is
// carried alongside for lookupUtteranceRef.
function paragraphIdOf(paragraphIndex: number): string {
  return `p${paragraphIndex}`;
}

/**
 * Build a PaginationMap from an already-rendered FormattedDocument (the `cfe`
 * output). Pure and deterministic: identical formatted input → identical map.
 * Each FormattedLine is one physical post-wrap line and carries its final
 * (page_number, page_line_number); consecutive lines sharing a paragraph_index are
 * wrapped continuations of that paragraph.
 */
export function buildPaginationMap(
  formatted: FormattedDocument | null | undefined,
  profile: GeometryProfile = DEFAULT_GEOMETRY_PROFILE,
): PaginationMap {
  const source = formatted?.lines ?? [];
  const lines: PaginatedLine[] = [];
  let prevParagraphIndex: number | null = null;

  for (const line of source) {
    const isContinuation = line.paragraph_index === prevParagraphIndex;
    lines.push({
      ref: { page: line.page_number, line: line.page_line_number },
      paragraph_id: paragraphIdOf(line.paragraph_index),
      utterance_id: line.utterance_id && line.utterance_id.length > 0 ? line.utterance_id : null,
      isContinuation,
    });
    prevParagraphIndex = line.paragraph_index;
  }

  const firstNumberedPage = lines.length > 0 ? Math.min(...lines.map((l) => l.ref.page)) : 1;

  return {
    linesPerPage: profile.linesPerPage,
    firstNumberedPage,
    lines,
    // Section / exhibit anchors are added by dedicated detectors in a follow-on
    // (they consume the same lines + the region/exhibit sources); an empty list is
    // a valid map for the paragraph/utterance errata + index refs that need it now.
    sections: [],
    exhibits: [],
  };
}

/**
 * Canonical pagination for a certified transcript. Runs the EXACT same body
 * pipeline `buildCanonicalExportRenderModel` uses — deriveWorkingTranscript →
 * buildDisplayDocument → verbatim `cfe` (no lexical correction) — then extracts the
 * PaginationMap from that formatted output. Because it is the same deterministic
 * `cfe` call on the same inputs, the page breaks match the certified body exactly.
 */
export function buildCanonicalPaginationMap(
  document: EditorDocument,
  record: CaseRecord,
  corrections?: CorrectionObject[],
  persistedLineTypeEnabled?: boolean,
  profile: GeometryProfile = DEFAULT_GEOMETRY_PROFILE,
): PaginationMap {
  const workingDocument = deriveWorkingTranscript(document, corrections, persistedLineTypeEnabled);
  const displayDocument = buildDisplayDocument(workingDocument, record);
  const formatted = cfe(displayDocument, profile, abbreviationRegistry, { applyLexicalCorrections: false });
  return buildPaginationMap(formatted, profile);
}

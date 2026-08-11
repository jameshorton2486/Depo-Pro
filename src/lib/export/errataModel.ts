// DOC-0328 — errata / changes-&-signature model over the canonical PaginationMap (#7).
//
// The certified "Changes and Signature" page lists each change the witness requests to
// their testimony, and MUST cite the transcript page + line of the changed passage.
// Those coordinates are exactly what the PaginationMap already carries. This module is
// the pure resolution from a witness change request to its certified (page, line) via
// the map's lookup helpers — the ONE pagination authority. It never invents a
// coordinate: a change whose location is not in the map is returned UNRESOLVED, so the
// certified page can never cite a fabricated page/line.
//
// INERT / default-off: the change source (a case.ts errata field) is a separate,
// evidence-gated addition; this builder takes the changes as input so the resolution
// mechanism can be reviewed and tested ahead of that wiring.
import {
  compareRefs,
  lookupParagraphRef,
  lookupUtteranceRef,
  type PageLineRef,
  type PaginationMap,
} from "./paginationContract";

/**
 * One requested change to the testimony. The location is given by the reviewed unit
 * being changed — its utterance id (preferred) or paragraph id — so it resolves to the
 * same coordinate the certified body assigned that passage. `from`/`to` are the
 * original and requested text; `reason` is the witness's stated reason.
 */
export interface ErrataChangeRequest {
  utteranceId?: string | null;
  paragraphId?: string | null;
  from: string;
  to: string;
  reason: string;
}

/** A resolved errata row: the change plus its certified page/line citation. */
export interface ErrataRow {
  page: number;
  line: number;
  from: string;
  to: string;
  reason: string;
}

export interface ErrataResult {
  /** Resolved rows, sorted in certified reading order (page then line). */
  rows: ErrataRow[];
  /** Change requests whose location was not found in the map — never given a page. */
  unresolved: ErrataChangeRequest[];
}

function resolveRef(map: PaginationMap, change: ErrataChangeRequest): PageLineRef | null {
  if (change.utteranceId) {
    const byUtterance = lookupUtteranceRef(map, change.utteranceId);
    if (byUtterance) {
      return byUtterance;
    }
  }
  if (change.paragraphId) {
    return lookupParagraphRef(map, change.paragraphId);
  }
  return null;
}

/**
 * Resolve witness change requests to certified errata rows. Pure and deterministic.
 * Unresolvable locations are segregated into `unresolved` (the certified page then
 * shows no fabricated citation for them). Resolved rows are sorted by (page, line).
 */
export function buildErrataRows(
  changes: readonly ErrataChangeRequest[] | null | undefined,
  map: PaginationMap,
): ErrataResult {
  const rows: Array<ErrataRow & { ref: PageLineRef }> = [];
  const unresolved: ErrataChangeRequest[] = [];

  for (const change of changes ?? []) {
    const ref = resolveRef(map, change);
    if (!ref) {
      unresolved.push(change);
      continue;
    }
    rows.push({ ref, page: ref.page, line: ref.line, from: change.from, to: change.to, reason: change.reason });
  }

  rows.sort((a, b) => compareRefs(a.ref, b.ref));

  return {
    rows: rows.map(({ ref: _ref, ...row }) => row),
    unresolved,
  };
}

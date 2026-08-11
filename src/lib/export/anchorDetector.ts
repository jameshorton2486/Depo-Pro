// DOC-0328 — certified-pages anchor detector (target addition #5).
//
// The PaginationMap producer (`paginationProducer.ts`) extracts the per-line
// (page, line) coordinates the certified body render already computes. The witness
// index and the exhibit index additionally need to know WHERE each examination
// section begins and WHERE each exhibit action occurs, expressed as those same
// certified (page, line) coordinates. This module derives those anchors from the
// same rendered `FormattedDocument` — it never re-paginates and never mutates the
// transcript. It is a pure, deterministic read over immutable render output.
//
// INERT / default-off: the anchors are additive fields on the (unconsumed) map.
// Detection is intentionally CONSERVATIVE — it anchors only on explicit examination
// headers and reporter-voice exhibit statements, so ordinary testimony that merely
// mentions "Exhibit 5" does not create a spurious index row. Recall tuning against a
// real corpus is a later, gated concern; correctness-without-false-positives is the
// bar for this inert scaffolding.
import type { FormattedDocument, FormattedLine } from "../format/types";
import type { ExhibitAnchor, PageLineRef, SectionAnchor } from "./paginationContract";

/** The certified coordinate of a rendered line. */
function refOf(line: FormattedLine): PageLineRef {
  return { page: line.page_number, line: line.page_line_number };
}

/**
 * The printed CONTENT of a line: the joined `words` (honoring each token's trailing
 * space), whitespace-normalized. Section headers, BY-lines and exhibit statements are
 * all matched against this — never against `prefix_text`, which carries the "Q."/"A."
 * or speaker label and would defeat the anchored header patterns. Falls back to
 * `prefix_text` only for a generated line that has no words.
 */
function lineBody(line: FormattedLine): string {
  const body = (line.words ?? [])
    .map((w) => `${w.text}${w.trailing_space ?? ""}`)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (body.length > 0) {
    return body;
  }
  return (line.prefix_text ?? "").replace(/\s+/g, " ").trim();
}

// Examination-header patterns, most specific first. Each maps a header line to the
// SectionAnchor.kind the witness index groups by. "DIRECT EXAMINATION" and a bare
// "EXAMINATION" are both the initial direct examination.
const SECTION_PATTERNS: ReadonlyArray<{ re: RegExp; kind: SectionAnchor["kind"] }> = [
  { re: /^(?:FURTHER\s+)?RECROSS(?:[-\s]?EXAMINATION)?$/i, kind: "RECROSS" },
  { re: /^(?:FURTHER\s+)?CROSS[-\s]?EXAMINATION$/i, kind: "CROSS-EXAMINATION" },
  { re: /^(?:FURTHER\s+)?REDIRECT(?:\s+EXAMINATION)?$/i, kind: "REDIRECT" },
  { re: /^VOIR\s+DIRE(?:\s+EXAMINATION)?$/i, kind: "VOIR_DIRE" },
  { re: /^(?:DIRECT\s+)?EXAMINATION$/i, kind: "EXAMINATION" },
];

function classifySectionHeader(normalizedText: string): SectionAnchor["kind"] | null {
  for (const { re, kind } of SECTION_PATTERNS) {
    if (re.test(normalizedText)) {
      return kind;
    }
  }
  return null;
}

// "BY MR. SMITH:" → examiner label "MR. SMITH". The examining attorney sits on the
// BY-line that follows an examination header; it feeds the witness-index columns.
const BY_LINE = /^BY\s+((?:MR|MS|MRS|DR|MISS)\.?\s+.+?):?\s*$/i;

function examinerFromByLine(normalizedText: string): string | null {
  const m = BY_LINE.exec(normalizedText);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

// How far past a header to look for the examiner's BY-line before giving up.
const EXAMINER_LOOKAHEAD = 5;

/**
 * Examination-section anchors, in document order. Anchors only on an explicit
 * examination header line; the examiner label is captured from the nearest following
 * BY-line (within a small window). Bare BY-line examiner changes without a header are
 * intentionally NOT anchored — their examination kind is ambiguous — which keeps the
 * kind field trustworthy.
 */
export function detectSectionAnchors(formatted: FormattedDocument | null | undefined): SectionAnchor[] {
  const lines = formatted?.lines ?? [];
  const anchors: SectionAnchor[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const kind = classifySectionHeader(lineBody(lines[i]));
    if (!kind) {
      continue;
    }

    let examinerLabel: string | null = null;
    for (let j = i + 1; j <= i + EXAMINER_LOOKAHEAD && j < lines.length; j += 1) {
      const ahead = lineBody(lines[j]);
      const examiner = examinerFromByLine(ahead);
      if (examiner) {
        examinerLabel = examiner;
        break;
      }
      // A second header before any BY-line means this section has no BY-line.
      if (classifySectionHeader(ahead)) {
        break;
      }
    }

    anchors.push({ kind, examinerLabel, start: refOf(lines[i]) });
  }

  return anchors;
}

// The identifier binds tightly to the number: "5", "5A", "5-A", or a bare letter
// "A" — it never spans whitespace into the following word (so "Exhibit 5 was" yields
// "5", not "5 was").
const EXHIBIT_NUMBER =
  /\bexhibit\s+(?:no\.?\s*|number\s+|#\s*)?([0-9]+(?:-[A-Za-z0-9]+)?[A-Za-z]?|[A-Za-z])\b/i;

// A reporter-voice exhibit statement: the exhibit identifier immediately followed by
// a passive action verb, e.g. "Exhibit 5 was marked". The action must be CONTIGUOUS
// with the identifier (no intervening words), so testimony such as "Exhibit 5 before
// it was marked" does not match — only the parenthetical gate or a true reporter
// statement produces an index row.
const EXHIBIT_PASSIVE =
  /\bexhibit\s+(?:no\.?\s*|number\s+|#\s*)?(?:[0-9]+(?:-[A-Za-z0-9]+)?[A-Za-z]?|[A-Za-z])\s+(?:was|were|is|are)\s+(?:marked|offered|admitted|received|excluded)/i;

function detectExhibitAction(text: string): ExhibitAnchor["action"] | null {
  // Precedence: a line usually states one action; when a compound line names more
  // than one, the later-stage action wins (admitted over offered over marked).
  if (/\bexclud(?:e|ed|es|ing)\b/i.test(text)) {
    return "EXCLUDED";
  }
  if (/\badmit(?:ted)?\b/i.test(text) || /\breceived in evidence\b/i.test(text)) {
    return "ADMITTED";
  }
  if (/\boffer(?:ed)?\b/i.test(text)) {
    return "OFFERED";
  }
  if (/\bmark(?:ed)?\b/i.test(text)) {
    return "MARKED";
  }
  return null;
}

function normalizeExhibitNumber(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/-/g, "-").toUpperCase();
}

/**
 * Exhibit-action anchors, in document order. Fires only on a parenthetical
 * stage-direction or a reporter-voice passive statement that both names an exhibit
 * and states an action — so it does not anchor on a witness merely referring to an
 * exhibit mid-answer.
 */
export function detectExhibitAnchors(formatted: FormattedDocument | null | undefined): ExhibitAnchor[] {
  const lines = formatted?.lines ?? [];
  const anchors: ExhibitAnchor[] = [];

  for (const line of lines) {
    const body = lineBody(line);
    if (body.length === 0 || !/\bexhibit\b/i.test(body)) {
      continue;
    }

    const isParenthetical = body.startsWith("(");
    if (!isParenthetical && !EXHIBIT_PASSIVE.test(body)) {
      continue;
    }

    const numberMatch = EXHIBIT_NUMBER.exec(body);
    const action = detectExhibitAction(body);
    if (!numberMatch || !action) {
      continue;
    }

    anchors.push({
      exhibit_number: normalizeExhibitNumber(numberMatch[1]),
      action,
      at: refOf(line),
    });
  }

  return anchors;
}

// DOC-0328 — anchor detector tests. Proves examination-section and exhibit-action
// anchors are derived from the rendered lines with correct kind/action/number and the
// certified (page, line) coordinate, and that ordinary testimony does not create
// spurious index rows.
import { describe, expect, it } from "vitest";
import type { FormattedDocument, FormattedLine, FormattedWord } from "../format/types";
import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import { detectSectionAnchors, detectExhibitAnchors } from "./anchorDetector";

function words(text: string): FormattedWord[] {
  return text
    .split(" ")
    .filter((t) => t.length > 0)
    .map((tok, k) => ({
      word_id: `w${k}`,
      utterance_id: "u",
      speaker_id: "s",
      text: tok,
      raw_text: tok,
      start_time: 0,
      end_time: 0,
      confidence: 1,
      reviewed: false,
      edited: false,
      inline_flag: null,
      trailing_space: " ",
    })) as unknown as FormattedWord[];
}

function line(text: string, over: Partial<FormattedLine> = {}): FormattedLine {
  return {
    role: "speaker_label",
    indent_intent: "speaker",
    paragraph_index: 0,
    utterance_id: "u",
    speaker_id: "s",
    speaker_label: "",
    prefix_text: "",
    source_word_ids: [],
    words: words(text),
    page_number: 1,
    page_line_number: 1,
    line_number: 1,
    start_time: 0,
    end_time: 0,
    segment_index: 0,
    segment_count: 1,
    language: null,
    geometry: DEFAULT_GEOMETRY_PROFILE,
    continuation_mode: "return_to_margin",
    flags: [],
    ...over,
  } as FormattedLine;
}

function doc(lines: FormattedLine[]): FormattedDocument {
  return { job_id: "j", lines };
}

describe("detectSectionAnchors", () => {
  it("anchors an EXAMINATION header and captures the examiner from the following BY-line", () => {
    const sections = detectSectionAnchors(
      doc([
        line("EXAMINATION", { page_number: 2, page_line_number: 3 }),
        line("BY MR. SMITH:", { page_number: 2, page_line_number: 4 }),
        line("Tell us your name.", { page_number: 2, page_line_number: 5 }),
      ]),
    );
    expect(sections).toEqual([
      { kind: "EXAMINATION", examinerLabel: "MR. SMITH", start: { page: 2, line: 3 } },
    ]);
  });

  it("maps DIRECT/CROSS/REDIRECT/RECROSS/VOIR DIRE headers to their kinds", () => {
    const sections = detectSectionAnchors(
      doc([
        line("DIRECT EXAMINATION"),
        line("CROSS-EXAMINATION"),
        line("REDIRECT EXAMINATION"),
        line("RECROSS-EXAMINATION"),
        line("VOIR DIRE EXAMINATION"),
      ]),
    );
    expect(sections.map((s) => s.kind)).toEqual([
      "EXAMINATION",
      "CROSS-EXAMINATION",
      "REDIRECT",
      "RECROSS",
      "VOIR_DIRE",
    ]);
  });

  it("captures the examiner across a blank-ish gap and stops at the next header", () => {
    const sections = detectSectionAnchors(
      doc([
        line("CROSS-EXAMINATION", { page_number: 10, page_line_number: 1 }),
        line("BY MS. JONES:", { page_number: 10, page_line_number: 2 }),
        line("REDIRECT EXAMINATION", { page_number: 20, page_line_number: 1 }),
      ]),
    );
    expect(sections[0]).toEqual({
      kind: "CROSS-EXAMINATION",
      examinerLabel: "MS. JONES",
      start: { page: 10, line: 1 },
    });
    // The REDIRECT has no BY-line before end-of-doc → null examiner.
    expect(sections[1]).toEqual({
      kind: "REDIRECT",
      examinerLabel: null,
      start: { page: 20, line: 1 },
    });
  });

  it("does not anchor a bare BY-line examiner change without a header", () => {
    const sections = detectSectionAnchors(
      doc([line("BY MR. SMITH:"), line("Q. Continue, please.")]),
    );
    expect(sections).toEqual([]);
  });

  it("does not mistake ordinary testimony containing the word examination for a header", () => {
    const sections = detectSectionAnchors(
      doc([line("Q. Did the doctor perform a physical examination that day?")]),
    );
    expect(sections).toEqual([]);
  });
});

describe("detectExhibitAnchors", () => {
  it("anchors a MARKED exhibit from a parenthetical stage-direction with its coordinate", () => {
    const exhibits = detectExhibitAnchors(
      doc([
        line("(Exhibit No. 5 was marked for identification.)", {
          page_number: 12,
          page_line_number: 8,
        }),
      ]),
    );
    expect(exhibits).toEqual([
      { exhibit_number: "5", action: "MARKED", at: { page: 12, line: 8 } },
    ]);
  });

  it("detects OFFERED, ADMITTED (incl. received in evidence), and EXCLUDED actions", () => {
    const exhibits = detectExhibitAnchors(
      doc([
        line("(Plaintiff's Exhibit 7 was offered.)"),
        line("(Exhibit 7 was admitted.)"),
        line("(Exhibit 8 was received in evidence.)"),
        line("(Exhibit 9 was excluded.)"),
      ]),
    );
    expect(exhibits.map((e) => `${e.exhibit_number}:${e.action}`)).toEqual([
      "7:OFFERED",
      "7:ADMITTED",
      "8:ADMITTED",
      "9:EXCLUDED",
    ]);
  });

  it("extracts number/letter/suffixed exhibit identifiers", () => {
    const exhibits = detectExhibitAnchors(
      doc([
        line("(Exhibit No. 5 was marked.)"),
        line("(Exhibit 5-A was marked.)"),
        line("(Exhibit A was marked.)"),
        line("(Deposition Exhibit Number 12 was marked.)"),
      ]),
    );
    expect(exhibits.map((e) => e.exhibit_number)).toEqual(["5", "5-A", "A", "12"]);
  });

  it("anchors a non-parenthetical reporter-voice passive statement", () => {
    const exhibits = detectExhibitAnchors(
      doc([line("Exhibit 3 was marked for identification by the reporter.")]),
    );
    expect(exhibits).toEqual([
      { exhibit_number: "3", action: "MARKED", at: { page: 1, line: 1 } },
    ]);
  });

  it("does NOT anchor ordinary testimony that merely mentions an exhibit", () => {
    const exhibits = detectExhibitAnchors(
      doc([
        line("Q. I am handing you Exhibit 5. Do you recognize it?"),
        line("A. Yes, I saw Exhibit 5 before it was marked at my last deposition."),
        line("Q. Was Exhibit 6 something you reviewed?"),
      ]),
    );
    expect(exhibits).toEqual([]);
  });

  it("is deterministic and preserves document order", () => {
    const d = doc([
      line("(Exhibit 2 was marked.)", { page_number: 3, page_line_number: 1 }),
      line("(Exhibit 1 was marked.)", { page_number: 4, page_line_number: 1 }),
    ]);
    expect(detectExhibitAnchors(d)).toEqual(detectExhibitAnchors(d));
    expect(detectExhibitAnchors(d).map((e) => e.exhibit_number)).toEqual(["2", "1"]);
  });
});

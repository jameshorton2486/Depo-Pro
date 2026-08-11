// DOC-0328 — PaginationMap producer tests. Proves the map is extracted from the
// same cfe render (one authoritative paginator), is deterministic, assigns valid
// page/line coordinates, detects wrapped continuations, and answers the
// paragraph/utterance ref lookups errata + indexes need.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Word, Utterance } from "../../api/types";
import type { FormattedDocument, FormattedLine } from "../format/types";
import { emptyCaseRecord } from "../../types/case";
import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import { buildCanonicalPaginationMap, buildPaginationMap } from "./paginationProducer";
import { lookupParagraphRef, lookupUtteranceRef, formatPageLine, compareRefs } from "./paginationContract";

const LPP = DEFAULT_GEOMETRY_PROFILE.linesPerPage;
const RECORD = () => emptyCaseRecord("case-pag", "2026-07-22T00:00:00.000Z");

// A deposition long enough to cross several page boundaries.
function bigDoc(nUtterances: number): EditorDocument {
  const utterances: Utterance[] = [];
  const words: Word[] = [];
  let t = 0;
  for (let i = 0; i < nUtterances; i += 1) {
    const uttId = `u${i}`;
    const isAtty = i % 2 === 0;
    const speaker = isAtty ? "spk-atty" : "spk-wit";
    const tokens = isAtty ? ["Question", "number", `${i}?`] : ["Answer", "number", `${i}.`];
    const wordIds: string[] = [];
    tokens.forEach((tok, k) => {
      const wid = `w_${i}_${k}`;
      wordIds.push(wid);
      words.push({ word_id: wid, text: tok, raw_text: tok, speaker_id: speaker, utterance_id: uttId, start_time: t, end_time: t + 0.4, confidence: 1, reviewed: false, edited: false });
      t += 0.5;
    });
    utterances.push({ utterance_id: uttId, speaker_id: speaker, start_time: words[words.length - tokens.length].start_time, end_time: t, word_ids: wordIds });
  }
  return {
    job_id: "pag", media_url: null, duration: t,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
    ],
    utterances, words,
  } as unknown as EditorDocument;
}

describe("buildCanonicalPaginationMap", () => {
  it("assigns valid page/line coordinates and spans multiple pages for a long transcript", () => {
    const map = buildCanonicalPaginationMap(bigDoc(120), RECORD());
    expect(map.lines.length).toBeGreaterThan(0);
    expect(map.linesPerPage).toBe(LPP);
    const maxPage = Math.max(...map.lines.map((l) => l.ref.page));
    expect(maxPage).toBeGreaterThan(1); // crossed at least one page boundary
    for (const l of map.lines) {
      expect(l.ref.page).toBeGreaterThanOrEqual(1);
      expect(l.ref.line).toBeGreaterThanOrEqual(1);
      expect(l.ref.line).toBeLessThanOrEqual(LPP); // line-within-page never exceeds the page
    }
  });

  it("is deterministic: identical content → identical map (no random ids/order)", () => {
    const a = buildCanonicalPaginationMap(bigDoc(60), RECORD());
    const b = buildCanonicalPaginationMap(bigDoc(60), RECORD());
    expect(b).toEqual(a);
  });

  it("page/line coordinates advance monotonically down the transcript", () => {
    const map = buildCanonicalPaginationMap(bigDoc(80), RECORD());
    for (let i = 1; i < map.lines.length; i += 1) {
      // Each physical line is at or after the previous one in reading order.
      expect(compareRefs(map.lines[i].ref, map.lines[i - 1].ref)).toBeGreaterThanOrEqual(0);
    }
  });

  it("resolves an utterance to its first (page:line) — the errata/index citation", () => {
    const map = buildCanonicalPaginationMap(bigDoc(40), RECORD());
    const ref = lookupUtteranceRef(map, "u10");
    expect(ref).not.toBeNull();
    expect(formatPageLine(ref!)).toMatch(/^\d+:\d+$/);
  });

  it("resolves a paragraph to its first (non-continuation) line", () => {
    const map = buildCanonicalPaginationMap(bigDoc(40), RECORD());
    const firstPara = map.lines.find((l) => !l.isContinuation)!;
    const ref = lookupParagraphRef(map, firstPara.paragraph_id);
    expect(ref).toEqual(firstPara.ref);
  });
});

describe("buildPaginationMap (pure, over cfe output)", () => {
  function fmtLine(over: Partial<FormattedLine>): FormattedLine {
    return {
      role: "q", indent_intent: "hang" as never, paragraph_index: 0, utterance_id: "u1",
      speaker_id: "spk", speaker_label: "", prefix_text: "", source_word_ids: [], words: [],
      page_number: 1, page_line_number: 1, line_number: 1, start_time: 0, end_time: 1,
      segment_index: 0, segment_count: 1, language: null, geometry: DEFAULT_GEOMETRY_PROFILE,
      continuation_mode: "return_to_margin", flags: [], ...over,
    } as FormattedLine;
  }

  it("marks consecutive same-paragraph lines as wrapped continuations", () => {
    const formatted: FormattedDocument = { job_id: "j", lines: [
      fmtLine({ paragraph_index: 0, utterance_id: "u1", page_number: 1, page_line_number: 1 }),
      fmtLine({ paragraph_index: 0, utterance_id: "u1", page_number: 1, page_line_number: 2 }), // wrap
      fmtLine({ paragraph_index: 1, utterance_id: "u2", page_number: 1, page_line_number: 3 }), // new para
    ] };
    const map = buildPaginationMap(formatted);
    expect(map.lines.map((l) => l.isContinuation)).toEqual([false, true, false]);
    expect(map.lines[0].paragraph_id).toBe("p0");
    expect(map.lines[2].paragraph_id).toBe("p1");
  });

  it("treats an empty utterance_id (generated line) as null", () => {
    const formatted: FormattedDocument = { job_id: "j", lines: [fmtLine({ utterance_id: "" as never, page_number: 3, page_line_number: 5 })] };
    const map = buildPaginationMap(formatted);
    expect(map.lines[0].utterance_id).toBeNull();
    expect(map.firstNumberedPage).toBe(3);
  });

  it("returns an empty-but-valid map for no lines", () => {
    const map = buildPaginationMap({ job_id: "j", lines: [] });
    expect(map.lines).toEqual([]);
    expect(map.linesPerPage).toBe(LPP);
    expect(map.firstNumberedPage).toBe(1);
  });
});

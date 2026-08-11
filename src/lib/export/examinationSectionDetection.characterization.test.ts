// DOC-0328 — characterization of the examination-index gap surfaced by the cross-runtime
// fixture (its body showed an "EXAMINATION" line but examinationIndex was empty).
//
// ROOT CAUSE (characterized here, not patched with heuristics): the certified PaginationMap
// anchors are detected over the cfe FormattedDocument, which contains only lines rendered
// from real utterances. The "EXAMINATION" header / "BY MR. SMITH:" by-line in the export
// render model are SYNTHESIZED at the paragraph layer (buildTranscriptParagraphs), AFTER cfe,
// so the anchor detector never sees them -> no examination anchor. Exhibit detection works
// because an exhibit action is a REAL parenthetical utterance the cfe renders.
//
// The grounded fix (deferred, gate item) is to source examination-section boundaries from the
// SAME structural authority the paragraph builder uses and resolve their coordinates via the
// PaginationMap's utterance lookup — NOT to broaden text-pattern heuristics in the detector.
// These tests pin the current, real behavior so the fix is a deliberate, reviewed change.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Utterance, Word } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { buildCanonicalPaginationMap } from "./paginationProducer";

const RECORD = () => emptyCaseRecord("case-exam", "2026-07-22T00:00:00.000Z");

function word(id: string, text: string, uttId: string, speaker: string, t: number): Word {
  return { word_id: id, text, raw_text: text, speaker_id: speaker, utterance_id: uttId, start_time: t, end_time: t + 0.3, confidence: 1, reviewed: false, edited: false } as Word;
}

function docWith(utterances: Utterance[], words: Word[]): EditorDocument {
  return {
    job_id: "exam", media_url: null, duration: 10,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
      { speaker_id: "spk-rptr", display_name: "THE REPORTER", deepgram_speaker: 2, role: "OTHER" },
    ],
    utterances, words,
  } as unknown as EditorDocument;
}

describe("examination-section detection characterization", () => {
  it("does NOT anchor an examination header that is only synthesized at the paragraph layer", () => {
    // A normal Q/A opening: no spoken "EXAMINATION" line. The export render model would
    // synthesize one, but the cfe-based pagination does not, so no examination anchor exists.
    const doc = docWith(
      [
        { utterance_id: "u0", speaker_id: "spk-atty", start_time: 0, end_time: 1, word_ids: ["a0", "a1"] },
        { utterance_id: "u1", speaker_id: "spk-wit", start_time: 1, end_time: 2, word_ids: ["b0", "b1"] },
      ] as unknown as Utterance[],
      [word("a0", "State", "u0", "spk-atty", 0), word("a1", "your name.", "u0", "spk-atty", 0.3), word("b0", "Jane", "u1", "spk-wit", 1), word("b1", "Doe.", "u1", "spk-wit", 1.3)],
    );
    const map = buildCanonicalPaginationMap(doc, RECORD());
    expect(map.sections).toEqual([]); // documented gap
  });

  it("DOES anchor an examination header when it exists as a real rendered line", () => {
    // When the header is a real utterance (as some transcripts carry it), the detector
    // finds it — proving the detector is correct; the gap is purely the synthesized-header
    // source, not the matching logic.
    const doc = docWith(
      [
        { utterance_id: "h0", speaker_id: "spk-rptr", start_time: 0, end_time: 1, word_ids: ["h0w"] },
        { utterance_id: "b0", speaker_id: "spk-rptr", start_time: 1, end_time: 2, word_ids: ["b0w0", "b0w1"] },
        { utterance_id: "u0", speaker_id: "spk-atty", start_time: 2, end_time: 3, word_ids: ["a0", "a1"] },
      ] as unknown as Utterance[],
      [
        word("h0w", "EXAMINATION", "h0", "spk-rptr", 0),
        word("b0w0", "BY", "b0", "spk-rptr", 1), word("b0w1", "MR. SMITH:", "b0", "spk-rptr", 1.3),
        word("a0", "State", "u0", "spk-atty", 2), word("a1", "your name.", "u0", "spk-atty", 2.3),
      ],
    );
    const map = buildCanonicalPaginationMap(doc, RECORD());
    expect(map.sections.length).toBeGreaterThanOrEqual(1);
    expect(map.sections[0].kind).toBe("EXAMINATION");
  });
});

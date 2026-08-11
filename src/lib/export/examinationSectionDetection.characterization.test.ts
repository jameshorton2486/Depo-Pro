// DOC-0328 / Gate 0 P1 — examination-section detection (fix verification).
//
// Previously characterized gap: the certified PaginationMap anchors were detected over the
// cfe FormattedDocument (real utterance lines only), so a synthesized "EXAMINATION"/"BY ..."
// header (generated at the paragraph layer, after cfe) produced no examination anchor and an
// empty witness index. P1 fixes this by detecting examination-section boundaries from the SAME
// structural state machine that generates those headers (detectExaminationSections), keying
// each start to the real utterance that opens it and resolving its (page, line) from the one
// PaginationMap. These tests verify the fix and guard against regression.
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
      { speaker_id: "spk-atty2", display_name: "MS. JONES", deepgram_speaker: 1, role: "ATTORNEY" },
      { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 2, role: "WITNESS" },
    ],
    utterances, words,
  } as unknown as EditorDocument;
}

describe("examination-section detection (P1 fix)", () => {
  it("anchors a synthesized examination header from the structural authority", () => {
    // A normal Q/A opening: no spoken "EXAMINATION" line. The header is synthesized at the
    // paragraph layer; the structural detector still anchors the examination at the first Q.
    const doc = docWith(
      [
        { utterance_id: "u0", speaker_id: "spk-atty", start_time: 0, end_time: 1, word_ids: ["a0", "a1"] },
        { utterance_id: "u1", speaker_id: "spk-wit", start_time: 1, end_time: 2, word_ids: ["b0", "b1"] },
      ] as unknown as Utterance[],
      [word("a0", "State", "u0", "spk-atty", 0), word("a1", "your name.", "u0", "spk-atty", 0.3), word("b0", "Jane", "u1", "spk-wit", 1), word("b1", "Doe.", "u1", "spk-wit", 1.3)],
    );
    const map = buildCanonicalPaginationMap(doc, RECORD());
    expect(map.sections.length).toBeGreaterThanOrEqual(1);
    const direct = map.sections.find((s) => s.kind === "EXAMINATION");
    expect(direct).toBeDefined();
    expect(direct!.examinerLabel).toBe("MR. SMITH");
    expect(direct!.start.page).toBeGreaterThanOrEqual(1);
    expect(direct!.start.line).toBeGreaterThanOrEqual(1);
  });

  it("anchors a second examiner as a CROSS-EXAMINATION section", () => {
    // Examiner change (MR. SMITH -> MS. JONES) opens a new examination section.
    const doc = docWith(
      [
        { utterance_id: "u0", speaker_id: "spk-atty", start_time: 0, end_time: 1, word_ids: ["a0"] },
        { utterance_id: "u1", speaker_id: "spk-wit", start_time: 1, end_time: 2, word_ids: ["b0"] },
        { utterance_id: "u2", speaker_id: "spk-atty2", start_time: 2, end_time: 3, word_ids: ["c0"] },
        { utterance_id: "u3", speaker_id: "spk-wit", start_time: 3, end_time: 4, word_ids: ["d0"] },
      ] as unknown as Utterance[],
      [word("a0", "Name?", "u0", "spk-atty", 0), word("b0", "Jane.", "u1", "spk-wit", 1), word("c0", "Occupation?", "u2", "spk-atty2", 2), word("d0", "Nurse.", "u3", "spk-wit", 3)],
    );
    const map = buildCanonicalPaginationMap(doc, RECORD());
    const kinds = map.sections.map((s) => s.kind);
    expect(kinds).toContain("EXAMINATION");
    expect(kinds).toContain("CROSS-EXAMINATION");
    const cross = map.sections.find((s) => s.kind === "CROSS-EXAMINATION");
    expect(cross!.examinerLabel).toBe("MS. JONES");
  });

  it("is deterministic", () => {
    const doc = docWith(
      [
        { utterance_id: "u0", speaker_id: "spk-atty", start_time: 0, end_time: 1, word_ids: ["a0"] },
        { utterance_id: "u1", speaker_id: "spk-wit", start_time: 1, end_time: 2, word_ids: ["b0"] },
      ] as unknown as Utterance[],
      [word("a0", "Name?", "u0", "spk-atty", 0), word("b0", "Jane.", "u1", "spk-wit", 1)],
    );
    expect(buildCanonicalPaginationMap(doc, RECORD()).sections).toEqual(buildCanonicalPaginationMap(doc, RECORD()).sections);
  });
});

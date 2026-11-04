// DOC-0325 Decision A — the client builds a WORD-SCOPED working-text save for
// edits to DERIVED structural units, so the edit persists onto the stable DB
// transcript_words rows (by word_id) instead of orphaning on a derived
// utterance_id (u1::obj) that has no DB row. This tests the exact payload the
// provider's saveNow sends (buildWorkingChanges), the part that was broken.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Word } from "../api/types";
import type { CorrectionObject } from "../lib/transcript/correctionObject";
import { buildWorkingChanges } from "./DocumentContext";

function word(id: string, text: string, uttId: string, t: number): Word {
  return {
    word_id: id, text, raw_text: text, speaker_id: "spk-atty", utterance_id: uttId,
    start_time: t, end_time: t + 0.4, confidence: 1, reviewed: false, edited: false,
  };
}

function doc(): EditorDocument {
  return {
    job_id: "job-A", media_url: null, duration: 10,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-def", display_name: "MS. JONES", deepgram_speaker: 1, role: "ATTORNEY" },
    ],
    utterances: [
      { utterance_id: "u1", speaker_id: "spk-atty", start_time: 0, end_time: 4, word_ids: ["w1", "w2", "w3", "w4"] },
    ],
    words: [
      word("w1", "You", "u1", 0), word("w2", "understand?", "u1", 1),
      word("w3", "Objection.", "u1", 2), word("w4", "Form.", "u1", 3),
    ],
  } as unknown as EditorDocument;
}

function objectionSplit(): CorrectionObject {
  return {
    id: "corr_01HXA92NVXZM3K4T7B2R9WQPDO",
    transcript_id: "job-A", case_id: "c", specialty: "objection_attribution", prompt_version: "v1",
    location: { paragraph_id: "u1", start_word_id: "w3", end_word_id: "w4" },
    change: { type: "objection_split", structural_change: { objection_start_word_id: "w3", objection_end_word_id: "w4", objector_speaker_id: "spk-def" } },
    reason: "Objection embedded in the attorney question turn.",
    reason_kind: "structural_boundary", confidence: 0.9,
    provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-10T00:00:00Z" },
    review: { state: "accepted" },
    downstream: { applied_to_working_transcript: false },
  } as CorrectionObject;
}

describe("buildWorkingChanges — Decision A word-scoped save", () => {
  it("flag OFF: emits the historical {utterance_id, working_text} with no word_ids", () => {
    const changes = buildWorkingChanges(doc(), [objectionSplit()], { "u1": "You understand? Objection. Form." }, false);
    expect(changes).toEqual([{ utterance_id: "u1", working_text: "You understand? Objection. Form." }]);
    expect(changes[0].word_ids).toBeUndefined();
  });

  it("flag ON: a DERIVED objection unit edit persists by the stable underlying word_ids", () => {
    // The reporter edits the derived objection unit u1::obj (its utterance_id has
    // no DB row). The save must target the real words w3, w4.
    const changes = buildWorkingChanges(doc(), [objectionSplit()], { "u1::obj": "Objection. Foundation." }, true);
    expect(changes).toHaveLength(1);
    expect(changes[0].utterance_id).toBe("u1::obj");
    expect(changes[0].word_ids).toEqual(["w3", "w4"]);
    // Crucially those word_ids are REAL rows in the immutable DB document — so the
    // word-scoped RPC (where word_id = any(word_ids)) matches, no orphan.
    const dbWordIds = new Set(doc().words.map((w) => w.word_id));
    for (const id of changes[0].word_ids!) expect(dbWordIds.has(id)).toBe(true);
  });

  it("flag ON: the pre remainder (u1::pre) persists onto its own stable words", () => {
    const changes = buildWorkingChanges(doc(), [objectionSplit()], { "u1::pre": "You understand?" }, true);
    expect(changes[0].word_ids).toEqual(["w1", "w2"]);
  });

  it("flag ON: a non-derived (unsplit) utterance still resolves to its own words", () => {
    // No corrections → deriveWorkingTranscript is identity → u1 maps to its words.
    const changes = buildWorkingChanges(doc(), [], { "u1": "You understand? Objection. Form." }, true);
    expect(changes[0].word_ids).toEqual(["w1", "w2", "w3", "w4"]);
  });

  it("only edited units produce changes (multiple derived units)", () => {
    const changes = buildWorkingChanges(doc(), [objectionSplit()], { "u1::obj": "Objection." }, true);
    expect(changes.map((c) => c.utterance_id)).toEqual(["u1::obj"]);
  });
});

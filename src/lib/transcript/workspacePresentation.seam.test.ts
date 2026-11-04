import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import type { StructuredUtterance } from "./structuredTranscript";
import { buildTranscriptParagraphs } from "./workspacePresentation";
import { LINE_TYPE_TO_KIND } from "./lineTypeMigration";

// DOC-0325 shared-builder SEAM test. Proves the Workspace builder wires applyReviewedStructure:
// flag-off output is unchanged (byte-identical), flag-on lets persisted reviewed line_type
// override the inferred kind. Production stays flag-off; these tests pass persistedStructureEnabled
// explicitly. (applyReviewedStructure's own invariants are unit-tested separately.)

function makeDocument(lineTypes: Record<string, string> = {}): EditorDocument {
  const utt = (utterance_id: string, speaker_id: string, word_ids: string[]): StructuredUtterance =>
    ({ utterance_id, speaker_id, start_time: 0, end_time: 1, word_ids, line_type: lineTypes[utterance_id] } as StructuredUtterance);
  const w = (word_id: string, text: string, speaker_id: string, utterance_id: string) =>
    ({ word_id, text, raw_text: text, speaker_id, utterance_id, start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false });
  return {
    job_id: "job-seam",
    media_url: "https://example.test/a.wav",
    duration: 30,
    speakers: [
      { speaker_id: "spk-0", display_name: "Speaker 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-1", display_name: "Speaker 1", deepgram_speaker: 1, role: "OTHER" },
      { speaker_id: "spk-2", display_name: "Speaker 2", deepgram_speaker: 2, role: "OTHER" },
      { speaker_id: "spk-3", display_name: "Speaker 3", deepgram_speaker: 3, role: "OTHER" },
    ],
    utterances: [
      utt("utt-1", "spk-0", ["w1", "w2", "w3", "w4"]),
      utt("utt-2", "spk-1", ["w5", "w6", "w7"]),
      utt("utt-3", "spk-2", ["w8", "w9", "w10", "w11", "w12"]),
      utt("utt-4", "spk-3", ["w13", "w14"]),
    ],
    words: [
      w("w1", "Good", "spk-0", "utt-1"), w("w2", "afternoon.", "spk-0", "utt-1"),
      w("w3", "We", "spk-0", "utt-1"), w("w4", "are on the record.", "spk-0", "utt-1"),
      w("w5", "This", "spk-1", "utt-2"), w("w6", "is cause number", "spk-1", "utt-2"), w("w7", "123.", "spk-1", "utt-2"),
      w("w8", "Good", "spk-2", "utt-3"), w("w9", "afternoon.", "spk-2", "utt-3"), w("w10", "Dennis", "spk-2", "utt-3"),
      w("w11", "Bentley", "spk-2", "utt-3"), w("w12", "for the plaintiff.", "spk-2", "utt-3"),
      w("w13", "I", "spk-3", "utt-4"), w("w14", "do.", "spk-3", "utt-4"),
    ],
  } as unknown as EditorDocument;
}

const kindsBySourceUtt = (paras: ReturnType<typeof buildTranscriptParagraphs>) => {
  const map = new Map<string, string>();
  for (const p of paras) for (const id of p.sourceUtteranceIds) if (!map.has(id)) map.set(id, p.kind);
  return map;
};

describe("workspacePresentation seam — applyReviewedStructure", () => {
  it("flag OFF (default + explicit) is byte-identical to no overlay", () => {
    const doc = makeDocument({ "utt-4": "PN" }); // persisted PN present but flag off → ignored
    const dflt = buildTranscriptParagraphs(doc, null, "display");
    const off = buildTranscriptParagraphs(doc, null, "display", false);
    expect(off).toEqual(dflt);
    // utt-4 ("I do.", witness) keeps its inferred kind (NOT PARENTHETICAL) while the flag is off.
    expect(kindsBySourceUtt(off).get("utt-4")).not.toBe("PARENTHETICAL");
  });

  it("flag ON: a persisted reviewed line_type overrides the inferred kind", () => {
    const doc = makeDocument({ "utt-4": "PN" });
    const off = kindsBySourceUtt(buildTranscriptParagraphs(doc, null, "display", false));
    const on = kindsBySourceUtt(buildTranscriptParagraphs(doc, null, "display", true));
    expect(on.get("utt-4")).toBe(LINE_TYPE_TO_KIND.PN); // PARENTHETICAL — persisted wins
    expect(on.get("utt-4")).not.toBe(off.get("utt-4")); // and it differs from inference
  });

  it("flag ON: utterances without persisted line_type keep inferred kind (UNKNOWN compat)", () => {
    const doc = makeDocument({ "utt-4": "PN" }); // only utt-4 persisted; others UNKNOWN
    const off = kindsBySourceUtt(buildTranscriptParagraphs(doc, null, "display", false));
    const on = kindsBySourceUtt(buildTranscriptParagraphs(doc, null, "display", true));
    for (const id of ["utt-1", "utt-2", "utt-3"]) {
      expect(on.get(id)).toBe(off.get(id)); // unchanged where no persisted structure exists
    }
  });
});

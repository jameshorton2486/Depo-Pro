import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import type { EditorDocument } from "../../api/types";
import { buildBaselineContent, baselineToLabeledLines } from "./buildBaselineContent";

type OverlayWord = EditorDocument["words"][number] & {
  working_text?: string | null;
  ai_suggestion?: string | null;
  ai_suggestion_status?: string | null;
};

function makeDoc(overrides?: Partial<EditorDocument>): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "http://example.test/audio.wav",
    duration: 120,
    speakers: [
      { speaker_id: "spk-0", display_name: "THE WITNESS", deepgram_speaker: 0, role: "WITNESS" },
      { speaker_id: "spk-1", display_name: "MR. SMITH", deepgram_speaker: 1, role: "ATTORNEY" },
    ],
    utterances: [
      { utterance_id: "utt-1", speaker_id: "spk-1", start_time: 0, end_time: 2, word_ids: ["w1", "w2"] },
      { utterance_id: "utt-2", speaker_id: "spk-0", start_time: 2, end_time: 4, word_ids: ["w3", "w4"] },
    ],
    words: [
      makeWord("w1", "Good", "spk-1", "utt-1", { start_time: 0, confidence: 0.4 }),
      makeWord("w2", "afternoon", "spk-1", "utt-1", { start_time: 0.5 }),
      makeWord("w3", "Yes", "spk-0", "utt-2", { start_time: 2 }),
      makeWord("w4", "sir", "spk-0", "utt-2", { start_time: 2.5 }),
    ],
    ...overrides,
  };
}

function makeWord(
  word_id: string,
  raw: string,
  speaker_id: string,
  utterance_id: string,
  overrides?: Partial<OverlayWord>
): OverlayWord {
  return {
    word_id,
    text: raw,
    raw_text: raw,
    speaker_id,
    utterance_id,
    start_time: 0,
    end_time: 1,
    confidence: 1,
    reviewed: false,
    edited: false,
    ...overrides,
  };
}

function textOf(block: JSONContent): string {
  return (block.content ?? []).map((n) => n.text ?? "").join("");
}

describe("buildBaselineContent", () => {
  it("renders one utterance block per Deepgram utterance, in order", () => {
    const content = buildBaselineContent(makeDoc());
    const blocks = (content.content ?? []).filter((b) => b.type === "utterance");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].attrs?.utterance_id).toBe("utt-1");
    expect(blocks[1].attrs?.utterance_id).toBe("utt-2");
    expect(textOf(blocks[0])).toBe("Good afternoon");
    expect(textOf(blocks[1])).toBe("Yes sir");
  });

  it("labels speakers with Deepgram speaker numbers, not inferred names", () => {
    const content = buildBaselineContent(makeDoc());
    const blocks = (content.content ?? []).filter((b) => b.type === "utterance");
    expect(blocks[0].attrs?.speaker_label).toBe("Speaker 1");
    expect(blocks[0].attrs?.prefix_text).toBe("Speaker 1");
    expect(blocks[1].attrs?.speaker_label).toBe("Speaker 0");
    // Never the legal display_name / role prefixes.
    expect(blocks[0].attrs?.prefix_text).not.toContain("MR.");
    expect(blocks[0].attrs?.role).toBeNull();
  });

  it("uses raw_text and ignores working_text / AI suggestions", () => {
    const doc = makeDoc();
    (doc.words[0] as OverlayWord).text = "GOODBYE"; // working override
    (doc.words[0] as OverlayWord).working_text = "GOODBYE";
    (doc.words[0] as OverlayWord).ai_suggestion = "Greetings";
    (doc.words[0] as OverlayWord).ai_suggestion_status = "pending";
    const blocks = (buildBaselineContent(doc).content ?? []).filter((b) => b.type === "utterance");
    // Immutable recognition wins: "Good", not the override or the suggestion.
    expect(textOf(blocks[0])).toBe("Good afternoon");
  });

  it("marks every word as the raw layer, never pending AI", () => {
    const blocks = (buildBaselineContent(makeDoc()).content ?? []).filter((b) => b.type === "utterance");
    const firstWordMark = blocks[0].content?.[0].marks?.[0];
    expect(firstWordMark?.type).toBe("wordMark");
    expect(firstWordMark?.attrs?.ai_layer).toBe("raw_text");
    expect(firstWordMark?.attrs?.ai_pending).toBe(false);
    // Confidence and timing survive for coloring + audio sync.
    expect(firstWordMark?.attrs?.confidence).toBe(0.4);
    expect(firstWordMark?.attrs?.start_time).toBe(0);
  });

  it("hides nothing — excluded utterances still render", () => {
    const doc = makeDoc();
    (doc.utterances[1] as typeof doc.utterances[number] & { excluded_from_output?: boolean }).excluded_from_output = true;
    const blocks = (buildBaselineContent(doc).content ?? []).filter((b) => b.type === "utterance");
    expect(blocks).toHaveLength(2);
  });

  it("emits no pageBreak / geometry framing", () => {
    const content = buildBaselineContent(makeDoc());
    expect((content.content ?? []).some((b) => b.type === "pageBreak")).toBe(false);
    const block = (content.content ?? [])[0];
    expect(block.attrs?.format_box_width_inches).toBeUndefined();
  });

  it("falls back to speaker index when deepgram_speaker is null", () => {
    const doc = makeDoc({
      speakers: [{ speaker_id: "spk-0", display_name: "", deepgram_speaker: null }],
      utterances: [{ utterance_id: "u", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1"] }],
      words: [makeWord("w1", "Hi", "spk-0", "u")],
    });
    const blocks = (buildBaselineContent(doc).content ?? []).filter((b) => b.type === "utterance");
    expect(blocks[0].attrs?.speaker_label).toBe("Speaker 0");
  });
});

describe("baselineToLabeledLines", () => {
  it("produces readable speaker-labeled lines from raw_text", () => {
    expect(baselineToLabeledLines(makeDoc())).toEqual([
      "Speaker 1: Good afternoon",
      "Speaker 0: Yes sir",
    ]);
  });
});

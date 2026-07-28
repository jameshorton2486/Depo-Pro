import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import { buildBaselineRows, baselineToLabeledLines } from "./buildBaselineContent";

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
      makeWord("w2", "afternoon", "spk-1", "utt-1", { start_time: 0.5, confidence: 0.6 }),
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

describe("buildBaselineRows", () => {
  it("produces one row per speaker turn, in order", () => {
    const rows = buildBaselineRows(makeDoc());
    expect(rows).toHaveLength(2);
    expect(rows[0].utterance_id).toBe("utt-1");
    expect(rows[1].utterance_id).toBe("utt-2");
    expect(rows[0].words.map((w) => w.text)).toEqual(["Good", "afternoon"]);
    expect(rows[1].words.map((w) => w.text)).toEqual(["Yes", "sir"]);
  });

  it("groups consecutive same-speaker utterances into one turn", () => {
    const doc = makeDoc({
      speakers: [{ speaker_id: "spk-0", display_name: "", deepgram_speaker: 1 }],
      utterances: [
        { utterance_id: "u1", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1"] },
        { utterance_id: "u2", speaker_id: "spk-0", start_time: 1, end_time: 2, word_ids: ["w2"] },
        { utterance_id: "u3", speaker_id: "spk-0", start_time: 2, end_time: 3, word_ids: ["w3", "w4", "w5"] },
      ],
      words: [
        makeWord("w1", "No.", "spk-0", "u1"),
        makeWord("w2", "Okay.", "spk-0", "u2"),
        makeWord("w3", "Where", "spk-0", "u3"),
        makeWord("w4", "do", "spk-0", "u3"),
        makeWord("w5", "you?", "spk-0", "u3"),
      ],
    });
    const rows = buildBaselineRows(doc);
    expect(rows).toHaveLength(1);
    expect(rows[0].speaker_label).toBe("Speaker 1");
    expect(rows[0].utterance_ids).toEqual(["u1", "u2", "u3"]);
    expect(rows[0].words.map((w) => w.text)).toEqual(["No.", "Okay.", "Where", "do", "you?"]);
    expect(rows[0].start_time).toBe(0); // start of the turn
  });

  it("starts a new turn when the speaker changes", () => {
    const rows = buildBaselineRows(makeDoc()); // spk-1 then spk-0
    expect(rows).toHaveLength(2);
    expect(rows[0].speaker_id).toBe("spk-1");
    expect(rows[1].speaker_id).toBe("spk-0");
    expect(rows[0].utterance_ids).toEqual(["utt-1"]);
  });

  it("labels speakers with Deepgram speaker numbers, not inferred names", () => {
    const rows = buildBaselineRows(makeDoc());
    expect(rows[0].speaker_label).toBe("Speaker 1");
    expect(rows[1].speaker_label).toBe("Speaker 0");
  });

  it("uses raw_text and ignores working_text / AI suggestions", () => {
    const doc = makeDoc();
    (doc.words[0] as OverlayWord).text = "GOODBYE";
    (doc.words[0] as OverlayWord).working_text = "GOODBYE";
    (doc.words[0] as OverlayWord).ai_suggestion = "Greetings";
    (doc.words[0] as OverlayWord).ai_suggestion_status = "pending";
    const rows = buildBaselineRows(doc);
    expect(rows[0].words[0].text).toBe("Good");
  });

  it("preserves confidence + timing and buckets the confidence level", () => {
    const rows = buildBaselineRows(makeDoc());
    expect(rows[0].words[0].confidence).toBe(0.4);
    expect(rows[0].words[0].start_time).toBe(0);
    expect(rows[0].words[0].confidenceLevel).toBe("very-low"); // < 0.5
    expect(rows[0].words[1].confidenceLevel).toBe("low"); // < 0.75
    expect(rows[1].words[0].confidenceLevel).toBe("ok"); // 1.0
  });

  it("hides nothing — excluded utterances still appear", () => {
    const doc = makeDoc();
    (doc.utterances[1] as typeof doc.utterances[number] & { excluded_from_output?: boolean }).excluded_from_output = true;
    expect(buildBaselineRows(doc)).toHaveLength(2);
  });

  it("falls back to speaker index when deepgram_speaker is null", () => {
    const doc = makeDoc({
      speakers: [{ speaker_id: "spk-0", display_name: "", deepgram_speaker: null }],
      utterances: [{ utterance_id: "u", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1"] }],
      words: [makeWord("w1", "Hi", "spk-0", "u")],
    });
    expect(buildBaselineRows(doc)[0].speaker_label).toBe("Speaker 0");
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

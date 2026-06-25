import { describe, expect, it } from "vitest";
import { buildEditorContent } from "./buildEditorContent";
import type { EditorDocument } from "../api/types";

function makeDoc(overrides?: Partial<EditorDocument>): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "http://example.test/audio.wav",
    duration: 120,
    speakers: [
      {
        speaker_id: "spk-1",
        display_name: "THE WITNESS",
        deepgram_speaker: 0,
        role: "WITNESS",
      },
    ],
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: 1,
        word_ids: ["word-1"],
      },
    ],
    words: [
      {
        word_id: "word-1",
        text: "Hello",
        raw_text: "Hello",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0,
        end_time: 1,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
    ],
    ...overrides,
  };
}

function makeWord(
  word_id: string,
  text: string,
  overrides?: Partial<EditorDocument["words"][number]>
): EditorDocument["words"][number] {
  return {
    word_id,
    text,
    raw_text: text,
    speaker_id: "spk-1",
    utterance_id: "utt-1",
    start_time: 0,
    end_time: 1,
    confidence: 1,
    reviewed: false,
    edited: false,
    ...overrides,
  };
}

function makeSingleUtteranceDoc(words: EditorDocument["words"]): EditorDocument {
  return makeDoc({
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: words.length,
        word_ids: words.map((word) => word.word_id),
      },
    ],
    words: words.map((word, index) => ({
      ...word,
      start_time: index,
      end_time: index + 0.5,
    })),
  });
}

function readUtteranceContentText(content: ReturnType<typeof buildEditorContent>): string {
  const utterance = content.content?.find((node) => node.type === "utterance");
  if (!utterance) {
    throw new Error("Expected an utterance block.");
  }

  return (utterance.content ?? [])
    .map((node) => node.text ?? "")
    .join("");
}

describe("buildEditorContent", () => {
  it("skips empty-text words and leaves a valid placeholder when an utterance has no renderable words", () => {
    const doc = makeDoc({
      utterances: [
        {
          utterance_id: "utt-1",
          speaker_id: "spk-1",
          start_time: 0,
          end_time: 1,
          word_ids: ["word-1", "missing-word"],
        },
        {
          utterance_id: "utt-2",
          speaker_id: "spk-1",
          start_time: 2,
          end_time: 3,
          word_ids: ["word-2"],
        },
      ],
      words: [
        {
          word_id: "word-1",
          text: "",
          raw_text: "",
          speaker_id: "spk-1",
          utterance_id: "utt-1",
          start_time: 0,
          end_time: 1,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
        {
          word_id: "word-2",
          text: "",
          raw_text: "",
          speaker_id: "spk-1",
          utterance_id: "utt-2",
          start_time: 2,
          end_time: 3,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
      ],
    });

    const content = buildEditorContent(doc);
    const utterances = content.content?.filter((node) => node.type === "utterance");

    expect(utterances).toHaveLength(2);
    expect(utterances?.[0].content).toEqual([{ type: "text", text: " " }]);
    expect(utterances?.[1].content).toEqual([{ type: "text", text: " " }]);
  });

  it("preserves the No. spacing rule in workspace content", () => {
    const numeric = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "No."),
        makeWord("word-2", "12129"),
      ])
    );
    const sentence = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "No."),
        makeWord("word-2", "No."),
      ])
    );

    expect(readUtteranceContentText(numeric)).toBe("No. 12129");
    expect(readUtteranceContentText(sentence)).toBe("No.  No.");
  });

  it("preserves deterministic punctuation normalization in workspace content", () => {
    const question = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "August"),
        makeWord("word-2", "17th?\""),
        makeWord("word-3", "What"),
      ])
    );
    const dash = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "one-year,\""),
        makeWord("word-2", "--"),
        makeWord("word-3", "no."),
      ])
    );

    expect(readUtteranceContentText(question)).toBe("August 17th\"?  What");
    expect(readUtteranceContentText(dash)).toBe("one-year\" -- no.");
  });

  it("preserves deterministic capitalization, numerals, and inline flags in workspace content", () => {
    const capitalization = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "yourself,"),
        makeWord("word-2", "doctor,"),
        makeWord("word-3", "if"),
      ])
    );
    const numerals = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "fifty-seven"),
        makeWord("word-2", "years"),
        makeWord("word-3", "old."),
      ])
    );
    const flagged = buildEditorContent(
      makeSingleUtteranceDoc([
        makeWord("word-1", "lameness", { confidence: 0.5 }),
      ])
    );

    expect(readUtteranceContentText(capitalization)).toBe("yourself, Doctor, if");
    expect(readUtteranceContentText(numerals)).toBe("57 years old.");
    expect(readUtteranceContentText(flagged)).toContain("lameness [SCOPIST: FLAG 1:");
  });
});

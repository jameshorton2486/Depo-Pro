import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { abbreviationRegistry } from "./abbreviationRegistry";
import { cfe } from "./cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "./geometryProfile";
import { serializeFormattedDocument } from "./serialize";

function makeDoc(words: Array<{
  word_id: string;
  text: string;
  speaker_id?: string;
  confidence?: number;
}>): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "http://example.test/audio.wav",
    duration: 120,
    speakers: [
      {
        speaker_id: "spk-1",
        display_name: "Mr. Nunez",
        deepgram_speaker: 0,
        role: "ATTORNEY",
      },
      {
        speaker_id: "spk-2",
        display_name: "THE WITNESS",
        deepgram_speaker: 1,
        role: "WITNESS",
      },
    ],
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: words[0]?.speaker_id ?? "spk-1",
        start_time: 0,
        end_time: words.length,
        word_ids: words.map((word) => word.word_id),
      },
    ],
    words: words.map((word, index) => ({
      word_id: word.word_id,
      text: word.text,
      raw_text: word.text,
      speaker_id: word.speaker_id ?? "spk-1",
      utterance_id: "utt-1",
      start_time: index,
      end_time: index + 0.5,
      confidence: word.confidence ?? 1,
      reviewed: false,
      edited: false,
    })),
  };
}

describe("cfe spacing and serialization", () => {
  it("uses two spaces after sentence boundaries that are not registry tokens", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "Hello." },
        { word_id: "w2", text: "There" },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(serializeFormattedDocument(formatted)).toContain("Q. Hello.  There");
  });

  it("uses one space after registry abbreviations", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "Mr." },
        { word_id: "w2", text: "Nunez" },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(serializeFormattedDocument(formatted)).toContain("Q. Mr. Nunez");
    expect(serializeFormattedDocument(formatted)).not.toContain("Mr.  Nunez");
  });

  it("keeps No. single-spaced only when followed by an identifier", () => {
    const numeric = cfe(
      makeDoc([
        { word_id: "w1", text: "No." },
        { word_id: "w2", text: "12129" },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );
    const sentence = cfe(
      makeDoc([
        { word_id: "w1", text: "No." },
        { word_id: "w2", text: "No." },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(serializeFormattedDocument(numeric)).toContain("Q. No. 12129");
    expect(serializeFormattedDocument(sentence)).toContain("Q. No.  No.");
  });

  it("moves a question mark outside the closing quote when the sentence is the question", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "August" },
        { word_id: "w2", text: "17th?\"" },
        { word_id: "w3", text: "What" },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(serializeFormattedDocument(formatted)).toContain("Q. August 17\"?  What");
  });

  it("removes commas immediately against interrupting dashes", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "one-year,\"" },
        { word_id: "w2", text: "--" },
        { word_id: "w3", text: "no." },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(serializeFormattedDocument(formatted)).toContain("Q. one-year\" -- no.");
    expect(serializeFormattedDocument(formatted)).not.toContain(",\" --");
  });

  it("normalizes month-day ordinals deterministically", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "August" },
        { word_id: "w2", text: "17th" },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].words[1].text).toBe("17");
  });

  it("normalizes age expressions to figures", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "fifty-seven" },
        { word_id: "w2", text: "years" },
        { word_id: "w3", text: "old." },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(serializeFormattedDocument(formatted)).toContain("Q. 57 years old.");
  });

  it("capitalizes direct-address titles after commas", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "yourself," },
        { word_id: "w2", text: "doctor," },
        { word_id: "w3", text: "if" },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(serializeFormattedDocument(formatted)).toContain("Q. yourself, Doctor, if");
  });

  it("renders inline scopist flags for low-confidence words without rewriting the token", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "lameness", confidence: 0.5 },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].words[0].text).toBe("lameness");
    expect(formatted.lines[0].words[0].inline_flag).toContain("SCOPIST: FLAG 1");
    expect(serializeFormattedDocument(formatted)).toContain(
      'Q. lameness [SCOPIST: FLAG 1: "lameness" — verify from audio]'
    );
  });

  it("attaches geometry metadata to each formatted line", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "Hello." },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].continuation_mode).toBe("return_to_margin");
    expect(formatted.lines[0].geometry.tabs.qaLabelInches).toBe(0.5);
    expect(formatted.lines[0].geometry.lineSpacingPoints).toBe(28);
  });
});

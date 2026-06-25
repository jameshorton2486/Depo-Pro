import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { abbreviationRegistry } from "./abbreviationRegistry";
import { cfe } from "./cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "./geometryProfile";
import { serializeFormattedDocument } from "./serialize";
import type { AbbreviationRegistry } from "./types";

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


type DeepgramWordFixture = {
  punctuated_word?: string;
  word?: string;
  speaker?: number;
  start?: number;
  end?: number;
  confidence?: number;
};

type DeepgramUtteranceFixture = {
  words?: DeepgramWordFixture[];
  speaker?: number;
  start?: number;
  end?: number;
};

function buildEtminanFixtureDoc(): EditorDocument {
  const payload = JSON.parse(readFileSync(path.resolve(process.cwd(), "etminan_response.json"), "utf8")) as {
    metadata?: { request_id?: string; duration?: number };
    results?: {
      utterances?: DeepgramUtteranceFixture[];
      channels?: Array<{ alternatives?: Array<{ words?: DeepgramWordFixture[] }> }>;
    };
  };
  const utterances = payload.results?.utterances ?? [];
  const allWords = payload.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
  const speakerIds = [...new Set<number>(allWords.map((word) => Number.isFinite(word.speaker) ? Number(word.speaker) : -1))]
    .filter((speakerId) => speakerId >= 0)
    .sort((left, right) => left - right);

  const roleBySpeaker = new Map<number, EditorDocument["speakers"][number]["role"]>([
    [0, "REPORTER"],
    [1, "ATTORNEY"],
    [2, "WITNESS"],
  ]);

  const speakers: EditorDocument["speakers"] = speakerIds.map((speakerId) => ({
    speaker_id: `spk_${String(speakerId).padStart(3, "0")}`,
    display_name: `SPEAKER ${speakerId}`,
    deepgram_speaker: speakerId,
    role: roleBySpeaker.get(speakerId) ?? "OTHER",
  }));

  const words: EditorDocument["words"] = [];
  const docUtterances: EditorDocument["utterances"] = [];
  let globalIndex = 0;

  utterances.forEach((utterance, utteranceIndex) => {
    const utteranceId = `utt_${String(utteranceIndex).padStart(6, "0")}`;
    const wordIds: string[] = [];

    (utterance.words ?? []).forEach((word) => {
      const wordId = `w_${String(globalIndex).padStart(8, "0")}`;
      globalIndex += 1;
      wordIds.push(wordId);
      words.push({
        word_id: wordId,
        text: word.punctuated_word ?? word.word ?? "",
        raw_text: word.punctuated_word ?? word.word ?? "",
        speaker_id: `spk_${String(Number.isFinite(word.speaker) ? word.speaker : utterance.speaker ?? 0).padStart(3, "0")}`,
        utterance_id: utteranceId,
        start_time: word.start ?? utterance.start ?? 0,
        end_time: word.end ?? utterance.end ?? 0,
        confidence: word.confidence ?? 1,
        reviewed: false,
        edited: false,
      });
    });

    docUtterances.push({
      utterance_id: utteranceId,
      speaker_id: `spk_${String(Number.isFinite(utterance.speaker) ? utterance.speaker : 0).padStart(3, "0")}`,
      start_time: utterance.start ?? 0,
      end_time: utterance.end ?? 0,
      word_ids: wordIds,
    });
  });

  return {
    job_id: payload?.metadata?.request_id ?? "etminan",
    media_url: "",
    duration: payload?.metadata?.duration ?? 0,
    speakers,
    utterances: docUtterances,
    words,
  };
}

function countInlineFlags(doc: EditorDocument): number {
  const formatted = cfe(doc, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);
  return formatted.lines.reduce((count, line) => (
    count + line.words.filter((word) => word.inline_flag).length
  ), 0);
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

  it("derives the No. exception from registry context-sensitive metadata", () => {
    const registryWithoutContextRule: AbbreviationRegistry = {
      ...abbreviationRegistry,
      context_sensitive: {},
    };

    const sentence = cfe(
      makeDoc([
        { word_id: "w1", text: "No." },
        { word_id: "w2", text: "No." },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      registryWithoutContextRule
    );

    expect(serializeFormattedDocument(sentence)).toContain("Q. No. No.");
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

    expect(serializeFormattedDocument(formatted)).toContain("Q. August 17th\"?  What");
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

  it("preserves spoken date ordinals", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "August" },
        { word_id: "w2", text: "17th" },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].words[1].text).toBe("17th");
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

  it("suppresses inline flags for function words", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "the", confidence: 0.2 },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].words[0].inline_flag).toBeNull();
  });

  it("preserves inline flags for proper nouns", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "Etminan", confidence: 0.5 },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].words[0].inline_flag).toContain("SCOPIST: FLAG 1");
  });

  it("preserves inline flags for medical terms", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "disc", confidence: 0.5 },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].words[0].inline_flag).toContain("SCOPIST: FLAG 1");
  });

  it("preserves inline flags for legal terms", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "witness", confidence: 0.5 },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].words[0].inline_flag).toContain("SCOPIST: FLAG 1");
  });

  it("preserves inline flags for organization tokens", () => {
    const formatted = cfe(
      makeDoc([
        { word_id: "w1", text: "PLLC", confidence: 0.5 },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(formatted.lines[0].words[0].inline_flag).toContain("SCOPIST: FLAG 1");
  });

  it("uses a stricter threshold for common words", () => {
    const suppressed = cfe(
      makeDoc([
        { word_id: "w1", text: "just", confidence: 0.5 },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );
    const flagged = cfe(
      makeDoc([
        { word_id: "w1", text: "just", confidence: 0.2 },
      ]),
      DEFAULT_GEOMETRY_PROFILE,
      abbreviationRegistry
    );

    expect(suppressed.lines[0].words[0].inline_flag).toBeNull();
    expect(flagged.lines[0].words[0].inline_flag).toContain("SCOPIST: FLAG 1");
  });

  it("reduces inline flag noise on the Etminan regression fixture while preserving real flags", () => {
    const doc = buildEtminanFixtureDoc();
    const formatted = cfe(doc, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);
    const flaggedWords = formatted.lines.flatMap((line) => line.words.filter((word) => word.inline_flag));
    const flaggedTokens = new Set(flaggedWords.map((word) => word.raw_text));

    expect(countInlineFlags(doc)).toBeLessThan(499);
    expect(flaggedTokens.has("the")).toBe(false);
    expect(flaggedTokens.has("and")).toBe(false);
    expect(flaggedTokens.has("Rico")).toBe(true);
    expect(flaggedTokens.has("PLLC,")).toBe(true);
    expect(flaggedTokens.has("disc")).toBe(true);
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

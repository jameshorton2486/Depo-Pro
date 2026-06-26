import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../api/types";
import type { CaseRecord } from "../types/case";
import {
  buildFormattedTranscriptText,
  buildWordTranscriptHtml,
  buildWorkspaceTranscriptJson,
} from "./transcriptDownloads";
import { stripInlineFlagSpans } from "./transcript/workspacePresentation";

function makeDocument(): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "https://example.test/audio.mp3",
    duration: 12,
    speakers: [
      {
        speaker_id: "spk-1",
        display_name: "DENNIS BENTLEY",
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
        speaker_id: "spk-1",
        start_time: 0,
        end_time: 1,
        word_ids: ["w1", "w2", "w3"],
      },
      {
        utterance_id: "utt-2",
        speaker_id: "spk-2",
        start_time: 1,
        end_time: 2,
        word_ids: ["w4", "w5"],
      },
    ],
    words: [
      {
        word_id: "w1",
        text: "Please",
        raw_text: "Please",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0,
        end_time: 0.25,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
      {
        word_id: "w2",
        text: "state",
        raw_text: "state",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0.25,
        end_time: 0.5,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
      {
        word_id: "w3",
        text: "your",
        raw_text: "your",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0.5,
        end_time: 0.75,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
      {
        word_id: "w4",
        text: "No.",
        raw_text: "No.",
        speaker_id: "spk-2",
        utterance_id: "utt-2",
        start_time: 0.75,
        end_time: 1,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
      {
        word_id: "w5",
        text: "12129",
        raw_text: "12129",
        speaker_id: "spk-2",
        utterance_id: "utt-2",
        start_time: 1,
        end_time: 1.25,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
    ],
  };
}

function makeRecord(): CaseRecord {
  return {
    reporter: { name: { value: "Nellie Bardel" } },
    witnesses: [{ name: { value: "Mohammad Etminan" }, prefix_suffix: "Dr." }],
    attorneys: [
      { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
    ],
  } as unknown as CaseRecord;
}

describe("transcriptDownloads", () => {
  it("builds a workspace download text without auto-inserted structure markers", () => {
    const text = buildFormattedTranscriptText(makeDocument());

    expect(text).not.toContain("PROCEEDINGS");
    expect(text).not.toContain("EXAMINATION");
    expect(text).not.toContain("BY DENNIS BENTLEY:");
    expect(text).toContain("Q. Please state your");
    expect(text).toContain("A. No. 12129");
  });

  it("serializes the workspace transcript JSON in full", () => {
    const json = buildWorkspaceTranscriptJson(makeDocument());

    expect(json).toContain("\"job_id\": \"job-1\"");
    expect(json).toContain("\"utterance_id\": \"utt-1\"");
    expect(json).toContain("\"word_id\": \"w1\"");
  });

  it("builds a Word-compatible HTML document and escapes transcript content", () => {
    const html = buildWordTranscriptHtml("Transcript", "Q. <test> & \"quote\"");

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<pre>Q. &lt;test&gt; &amp; &quot;quote&quot;</pre>");
    expect(html).toContain("<title>Transcript</title>");
  });

  it("builds inferred transcript text only after structure confirmation", () => {
    const rawText = buildFormattedTranscriptText(makeDocument());
    const structuredText = buildFormattedTranscriptText(makeDocument(), {
      structureConfirmed: true,
      record: makeRecord(),
    });

    expect(rawText).not.toContain("PROCEEDINGS");
    expect(structuredText).toContain("EXAMINATION");
    expect(structuredText).toContain("BY DENNIS BENTLEY:");
  });

  it("strips inline flag spans from raw TXT download output while preserving verbatim tokens", () => {
    const document = makeDocument();
    document.words[0] = {
      ...document.words[0],
      confidence: 0.2,
      text: "trauma",
      raw_text: "trauma",
    };

    const text = buildFormattedTranscriptText(document);

    expect(text).toContain("trauma");
    expect(text).not.toContain("[SCOPIST: FLAG");
  });

  it("strips inline flag spans from structured download output while preserving structural markers", () => {
    const document = makeDocument();
    document.words[0] = {
      ...document.words[0],
      confidence: 0.2,
      text: "trauma",
      raw_text: "trauma",
    };

    const text = buildFormattedTranscriptText(document, {
      structureConfirmed: true,
      record: makeRecord(),
    });

    expect(text).toContain("EXAMINATION");
    expect(text).toContain("BY DENNIS BENTLEY:");
    expect(text).toContain("trauma");
    expect(text).not.toContain("[SCOPIST: FLAG");
  });

  it("builds Word-compatible HTML without inline flag spans when given clean transcript text", () => {
    const html = buildWordTranscriptHtml("Transcript", "trauma to the disc");

    expect(html).toContain("<pre>trauma to the disc</pre>");
    expect(html).not.toContain("[SCOPIST: FLAG");
  });

  it("strips inline flag spans with and without likely clauses", () => {
    expect(stripInlineFlagSpans('trauma [SCOPIST: FLAG 1: "trauma" — verify from audio]')).toBe("trauma");
    expect(stripInlineFlagSpans('disc [SCOPIST: FLAG 2: "disc" — verify from audio; likely "disk"]')).toBe("disc");
    expect(stripInlineFlagSpans("normal text without flags")).toBe("normal text without flags");
  });
});

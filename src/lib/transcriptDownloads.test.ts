import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../api/types";
import {
  buildFormattedTranscriptText,
  buildWordTranscriptHtml,
  buildWorkspaceTranscriptJson,
} from "./transcriptDownloads";

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
});

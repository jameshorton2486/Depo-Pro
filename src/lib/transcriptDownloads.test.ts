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
        word_ids: ["w1", "w2"],
      },
    ],
    words: [
      {
        word_id: "w1",
        text: "No.",
        raw_text: "No.",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0,
        end_time: 0.5,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
      {
        word_id: "w2",
        text: "12129",
        raw_text: "12129",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0.5,
        end_time: 1,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
    ],
  };
}

describe("transcriptDownloads", () => {
  it("builds the formatted transcript text from the canonical formatter", () => {
    expect(buildFormattedTranscriptText(makeDocument())).toContain("A. No. 12129");
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

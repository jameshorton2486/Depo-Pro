import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../api/types";
import type { CaseRecord } from "../types/case";
import {
  buildFormattedTranscriptText,
  buildPrintableTranscriptHtml,
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
    const html = buildWordTranscriptHtml("Transcript \"draft\" & notes", "Q. <test> & \"quote\" 'apostrophe'");

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<pre>Q. &lt;test&gt; &amp; &quot;quote&quot; &#39;apostrophe&#39;</pre>");
    expect(html).toContain("<title>Transcript &quot;draft&quot; &amp; notes</title>");
  });

  it("builds printable HTML for browser PDF export and escapes transcript content", () => {
    const html = buildPrintableTranscriptHtml("Transcript", "Q. <test> & more");

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("@page { margin: 0.75in; size: letter; }");
    expect(html).toContain("<main>Q. &lt;test&gt; &amp; more</main>");
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

  it("prepends persisted inclusion pages to transcript downloads", () => {
    const text = buildFormattedTranscriptText(makeDocument(), {
      structureConfirmed: true,
      record: makeRecord(),
      inclusionPages: {
        caption: "Jordan Alvarez v. Acme Logistics, Inc.",
        cause_number: "2026-CV-1042",
        court: "250th Judicial District Court",
        county: "Travis County",
        state: "Texas",
        deponent: "Mohammad Etminan",
        deposition_date: "2026-04-24",
        appearances: [
          {
            name: "Dennis Bentley",
            role: "EXAMINING",
            firm: "Bentley Trial Group",
            representing: "Plaintiff",
          },
        ],
      },
    });

    expect(text).toContain("Jordan Alvarez v. Acme Logistics, Inc.");
    expect(text).toContain("APPEARANCES");
    expect(text).toContain("Dennis Bentley");
    expect(text).toContain("EXAMINATION");
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
  it("keeps raw labels in clean downloads when keepRawLabels is selected", () => {
    const text = buildFormattedTranscriptText(makeDocument(), {
      structureConfirmed: true,
      keepRawLabels: true,
      record: makeRecord(),
    });

    expect(text).not.toContain("EXAMINATION");
    expect(text).toContain("Q. Please state your");
    expect(text).toContain("A. No. 12129");
  });

  it("uses the structured paragraph pipeline for clean downloads", () => {
    const document = makeDocument();
    document.speakers = [
      {
        speaker_id: "spk-1",
        display_name: "DENNIS BENTLEY",
        deepgram_speaker: 0,
        role: "ATTORNEY",
      },
    ];
    document.utterances = [
      { utterance_id: "utt-1", speaker_id: "spk-1", start_time: 0, end_time: 1, word_ids: ["w1", "w2"] },
      { utterance_id: "utt-2", speaker_id: "spk-1", start_time: 1, end_time: 2, word_ids: ["w3", "w4"] },
    ];
    document.words = [
      { word_id: "w1", text: "And and", raw_text: "And and", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0, end_time: 0.25, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "many physicians, many tree treating physicians as part of the examination", raw_text: "many physicians, many tree treating physicians as part of the examination", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0.25, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "look for things,", raw_text: "look for things,", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.5, end_time: 0.75, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "to not only coordinate the pain symptoms", raw_text: "to not only coordinate the pain symptoms", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.75, end_time: 1, confidence: 1, reviewed: false, edited: false },
    ];

    const text = buildFormattedTranscriptText(document, {
      structureConfirmed: true,
      record: makeRecord(),
    });

    expect(text).toContain("Q. And and many physicians, many tree treating physicians as part of the examination look for things, to not only coordinate the pain symptoms");
  });

});

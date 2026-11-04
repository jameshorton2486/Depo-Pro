import { describe, expect, it } from "vitest";
import {
  buildTranscriptVersionLabels,
  formatTranscriptStatus,
  sortTranscriptsByCreatedAt,
} from "./transcriptVersionLabels";

describe("transcriptVersionLabels", () => {
  const transcripts = [
    {
      transcript_id: "tr_3",
      created_at: "2026-06-23T10:00:00.000Z",
    },
    {
      transcript_id: "tr_1",
      created_at: "2026-06-20T10:00:00.000Z",
    },
    {
      transcript_id: "tr_2",
      created_at: "2026-06-22T10:00:00.000Z",
    },
  ];

  it("sorts transcripts by creation date ascending", () => {
    expect(sortTranscriptsByCreatedAt(transcripts).map((entry) => entry.transcript_id)).toEqual([
      "tr_1",
      "tr_2",
      "tr_3",
    ]);
  });

  it("labels the newest transcript as the Deposition Transcript and older copies as superseded", () => {
    const labels = buildTranscriptVersionLabels(transcripts);

    expect(labels.get("tr_1")).toBe("Deposition Transcript (superseded)");
    expect(labels.get("tr_2")).toBe("Deposition Transcript (superseded)");
    expect(labels.get("tr_3")).toBe("Deposition Transcript");
  });

  it("labels a single transcript as the Deposition Transcript", () => {
    const labels = buildTranscriptVersionLabels([transcripts[0]]);

    expect(labels.get("tr_3")).toBe("Deposition Transcript");
  });

  it("normalizes transcript status values into user-facing badges", () => {
    expect(formatTranscriptStatus("queued")).toBe("Processing");
    expect(formatTranscriptStatus("assembling")).toBe("Processing");
    expect(formatTranscriptStatus("complete")).toBe("Complete");
    expect(formatTranscriptStatus("completed")).toBe("Complete");
    expect(formatTranscriptStatus("failed")).toBe("Failed");
  });
});

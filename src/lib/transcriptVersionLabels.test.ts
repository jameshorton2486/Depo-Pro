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

  it("labels the oldest transcript as original and later runs incrementally", () => {
    const labels = buildTranscriptVersionLabels(transcripts);

    expect(labels.get("tr_1")).toBe("Original");
    expect(labels.get("tr_2")).toBe("Retranscription 1");
    expect(labels.get("tr_3")).toBe("Retranscription 2");
  });

  it("supports a single transcript without numbering reruns", () => {
    const labels = buildTranscriptVersionLabels([transcripts[0]]);

    expect(labels.get("tr_3")).toBe("Original");
  });

  it("normalizes transcript status values into user-facing badges", () => {
    expect(formatTranscriptStatus("queued")).toBe("Processing");
    expect(formatTranscriptStatus("assembling")).toBe("Processing");
    expect(formatTranscriptStatus("complete")).toBe("Complete");
    expect(formatTranscriptStatus("completed")).toBe("Complete");
    expect(formatTranscriptStatus("failed")).toBe("Failed");
  });
});

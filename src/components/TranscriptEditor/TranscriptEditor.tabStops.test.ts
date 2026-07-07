import { describe, expect, it } from "vitest";
import { extractTranscriptTabStops } from "./TranscriptEditor";
import type { JSONContent } from "@tiptap/core";

describe("extractTranscriptTabStops", () => {
  it("reads tab-stop geometry from the first utterance node", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "utterance",
          attrs: {
            tab_qa_label_inches: 0.5,
            tab_qa_text_inches: 1.0,
            tab_speaker_inches: 1.5,
            tab_parenthetical_inches: 2.0,
            tab_center_inches: 3.25,
            tab_continuation_inches: 1.75,
          },
        },
      ],
    };

    expect(extractTranscriptTabStops(content)).toEqual([
      { key: "qa-label", label: "Q/A label", inches: 0.5 },
      { key: "qa-text", label: "Q/A text", inches: 1.0 },
      { key: "speaker", label: "Speaker", inches: 1.5 },
      { key: "parenthetical", label: "Paren", inches: 2.0 },
      { key: "center", label: "Center", inches: 3.25 },
      { key: "continuation", label: "Cont.", inches: 1.75 },
    ]);
  });

  it("returns an empty list when no utterance geometry is present", () => {
    expect(extractTranscriptTabStops({ type: "doc", content: [] })).toEqual([]);
    expect(extractTranscriptTabStops(null)).toEqual([]);
  });
});

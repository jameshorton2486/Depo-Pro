import { describe, expect, it } from "vitest";

import {
  extractUtteranceTextsFromDoc,
  getActiveUtteranceInfoFromDoc,
} from "./editorFragments";

function makeDoc(nodes: Array<{
  utterance_id: string;
  speaker_id: string;
  textContent: string;
}>) {
  return {
    descendants(cb: (node: {
      type: { name: string };
      attrs: Record<string, unknown>;
      textContent: string;
    }) => void) {
      nodes.forEach((node) => {
        cb({
          type: { name: "utterance" },
          attrs: {
            utterance_id: node.utterance_id,
            speaker_id: node.speaker_id,
          },
          textContent: node.textContent,
        });
      });
    },
  };
}

describe("editor fragment helpers", () => {
  it("reassembles split display segments in source utterance order with single spaces", () => {
    const texts = extractUtteranceTextsFromDoc(makeDoc([
      { utterance_id: "utt-1", speaker_id: "spk-1", textContent: "How are" },
      { utterance_id: "utt-1", speaker_id: "spk-2", textContent: "you today" },
      { utterance_id: "utt-2", speaker_id: "spk-1", textContent: "Fine" },
    ]));

    expect(texts.get("utt-1")).toBe("How are you today");
    expect(texts.get("utt-2")).toBe("Fine");
  });

  it("reports when an active utterance spans multiple rendered segments", () => {
    const info = getActiveUtteranceInfoFromDoc(makeDoc([
      { utterance_id: "utt-1", speaker_id: "spk-1", textContent: "How are" },
      { utterance_id: "utt-1", speaker_id: "spk-2", textContent: "you today" },
    ]), "utt-1");

    expect(info).toEqual({
      activeSpeakerId: "spk-2",
      matchingNodeCount: 2,
      hasMultipleSegments: true,
    });
  });
});

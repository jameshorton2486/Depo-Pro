import { describe, expect, it } from "vitest";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

import { UtteranceNode } from "./UtteranceNode";

function renderUtterance(attributes: Record<string, unknown>) {
  const renderHTML = UtteranceNode.config.renderHTML?.bind({
    name: "utterance",
    options: {},
    storage: {},
    parent: null,
  });
  if (!renderHTML) {
    throw new Error("UtteranceNode.renderHTML is not defined");
  }

  return renderHTML({
    node: null as unknown as ProseMirrorNode,
    HTMLAttributes: attributes,
  });
}

describe("UtteranceNode", () => {
  it("renders colloquy as a single inline speaker-label paragraph shape", () => {
    const spec = renderUtterance({
      utterance_id: "utt-1",
      speaker_id: "spk-1",
      speaker_label: "THE REPORTER",
      line_number: 1,
      page_line_number: 1,
      start_time: 0,
      role: "REPORTER",
      language: null,
      display_mode: "COLLOQUY",
      display_label: "THE REPORTER",
      display_heading: null,
      display_by_line: null,
    });

    expect(spec).toEqual([
      "div",
      expect.objectContaining({
        class: "utterance-block utterance-block--colloquy",
        "data-speaker-label": "THE REPORTER",
      }),
      [
        "span",
        expect.objectContaining({ class: "utt-line-num" }),
        "1",
      ],
      [
        "span",
        expect.objectContaining({ class: "utt-colloquy-line" }),
        [
          "span",
          expect.objectContaining({ class: "utt-prefix utt-prefix--colloquy" }),
          "THE REPORTER:  ",
        ],
        ["span", { class: "utt-content utt-content--colloquy" }, 0],
      ],
    ]);
  });

  it("keeps q/a geometry in the dedicated prefix column", () => {
    const spec = renderUtterance({
      utterance_id: "utt-2",
      speaker_id: "spk-2",
      speaker_label: "MR. NUNEZ",
      line_number: 2,
      page_line_number: 2,
      start_time: 10,
      role: "ATTORNEY",
      language: null,
      display_mode: "Q",
      display_label: "MR. NUNEZ",
      display_heading: "EXAMINATION",
      display_by_line: "BY MR. NUNEZ:",
    });

    expect(spec).toEqual([
      "div",
      expect.objectContaining({
        class: "utterance-block utterance-block--q",
      }),
      [
        "div",
        expect.objectContaining({ class: "utt-structural utt-structural--heading" }),
        "EXAMINATION",
      ],
      [
        "div",
        expect.objectContaining({ class: "utt-structural utt-structural--byline" }),
        "BY MR. NUNEZ:",
      ],
      [
        "span",
        expect.objectContaining({ class: "utt-line-num" }),
        "2",
      ],
      [
        "span",
        expect.objectContaining({ class: "utt-prefix utt-prefix--qa" }),
        "Q.",
      ],
      ["span", { class: "utt-content" }, 0],
    ]);
  });
});

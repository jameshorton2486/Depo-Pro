import { describe, expect, it } from "vitest";

import { buildEntityRegistry } from "./entityRegistry";
import { buildStructuredTranscriptGeometryLayout } from "./geometryEngine";
import { buildStructuredTranscriptPackage } from "./structuredTranscriptPackage";
import { buildUnifiedRenderModel, renderTxt, renderWorkspace, validateRenderParity } from "./unifiedRendering";

function makePackage() {
  return buildStructuredTranscriptPackage({
    transcriptId: "synthetic-rendering-transcript",
    createdAt: "2026-07-21T00:00:00.000Z",
    dialogue: [],
    paragraphs: [
      {
        kind: "SECTION_HEADER",
        region: "TESTIMONY",
        label: "",
        speakerLabel: "",
        text: "EXAMINATION",
        speakerId: null,
        leadingText: "",
        mode: "display",
        words: [],
        sourceLines: [],
        sourceUtteranceIds: ["utt_1"],
        sourceWordIds: [],
      },
      {
        kind: "Q",
        region: "TESTIMONY",
        label: "Q.",
        speakerLabel: "MR. SAMPLE",
        text: "Please state your name.",
        speakerId: "speaker_examiner",
        leadingText: "",
        mode: "display",
        words: [],
        sourceLines: [],
        sourceUtteranceIds: ["utt_2"],
        sourceWordIds: ["word_1"],
      },
      {
        kind: "A",
        region: "TESTIMONY",
        label: "A.",
        speakerLabel: "THE WITNESS",
        text: "Alex Morgan.",
        speakerId: "speaker_witness",
        leadingText: "",
        mode: "display",
        words: [],
        sourceLines: [],
        sourceUtteranceIds: ["utt_3"],
        sourceWordIds: ["word_2"],
      },
      {
        kind: "PARENTHETICAL",
        region: "PROCEEDINGS",
        label: "",
        speakerLabel: "",
        text: "(Whereupon, a recess was taken.)",
        speakerId: "speaker_reporter",
        leadingText: "",
        mode: "display",
        words: [],
        sourceLines: [],
        sourceUtteranceIds: ["utt_4"],
        sourceWordIds: ["word_3"],
      },
    ],
  });
}

describe("unifiedRendering", () => {
  it("keeps Workspace and TXT content in parity from one render model", () => {
    const transcriptPackage = makePackage();
    const model = buildUnifiedRenderModel({
      transcriptPackage,
      geometry: buildStructuredTranscriptGeometryLayout(transcriptPackage),
      entityRegistry: buildEntityRegistry(null),
    });

    expect(renderWorkspace(model).lines.map((line) => line.content)).toEqual(renderTxt(model).lineContents);
    expect(renderTxt(model).content).toBe("EXAMINATION\n\nQ. Please state your name.\n\nA. Alex Morgan.\n\n(Whereupon, a recess was taken.)");
    expect(validateRenderParity(model)).toEqual([]);
  });

  it("preserves package paragraph ordering, provenance, and geometry without changing transcript content", () => {
    const transcriptPackage = makePackage();
    const model = buildUnifiedRenderModel({
      transcriptPackage,
      geometry: buildStructuredTranscriptGeometryLayout(transcriptPackage),
    });

    expect(model.lines.map((line) => line.paragraphId)).toEqual(transcriptPackage.paragraphs.map((entry) => entry.id));
    expect(model.lines[1]).toMatchObject({
      content: "Q. Please state your name.",
      sourceUtteranceIds: ["utt_2"],
      sourceWordIds: ["word_1"],
      geometry: { role: "qa", first_line_tab_inches: 0.5, text_tab_inches: 1 },
    });
  });
  it("reports a missing geometry instruction instead of inventing layout", () => {
    const transcriptPackage = makePackage();
    const model = buildUnifiedRenderModel({
      transcriptPackage,
      geometry: {
        format_box_width_inches: 6.5,
        left_margin_inches: 1.25,
        right_margin_inches: 0.75,
        line_spacing_points: 28,
        lines_per_page: 25,
        lines: [],
      },
    });

    expect(validateRenderParity(model)).toEqual(expect.arrayContaining([
      `geometry is missing for paragraph ${transcriptPackage.paragraphs[0]?.id}`,
    ]));
  });

  it("handles an absent rendering input without crashing", () => {
    expect(buildUnifiedRenderModel(null)).toMatchObject({
      transcriptId: "",
      lines: [],
      entityRegistryEntryCount: 0,
    });
  });
});

import { describe, expect, it } from "vitest";

import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import { buildGeometryLayout, buildStructuredTranscriptGeometryLayout, checkGeometry, renderBlock } from "./geometryEngine";
import { buildStructuredTranscriptPackage } from "./structuredTranscriptPackage";
import type { ValidationBlock } from "./correctionValidator";

function block(overrides: Partial<ValidationBlock>): ValidationBlock {
  return {
    utterance_index: 1,
    utterance_id: "utt_geometry_1",
    block_type: "Q",
    speaker_id: "spk_attorney",
    display_name: "MR. BENTLEY",
    role: "ATTORNEY",
    text: "Please state your name.",
    ...overrides,
  };
}

describe("geometryEngine", () => {
  it("builds the locked UFM layout model without changing paragraph text", () => {
    const paragraphs = [
      ...renderBlock(block({ block_type: "Q" })),
      ...renderBlock(block({ block_type: "A", role: "WITNESS", text: "Alex Morgan." })),
      ...renderBlock(block({ block_type: "SP", text: "Please answer." })),
      ...renderBlock(block({ block_type: "PN", text: "(Whereupon, a recess was taken.)" })),
      ...renderBlock(block({ block_type: "HEADER", text: "EXAMINATION" })),
    ];

    const layout = buildGeometryLayout(paragraphs);

    expect(layout).toMatchObject({
      format_box_width_inches: 6.5,
      left_margin_inches: 1.25,
      right_margin_inches: 0.75,
      line_spacing_points: 28,
      lines_per_page: 25,
    });
    expect(layout.lines).toEqual([
      { paragraph_index: 0, paragraph_id: null, role: "qa", first_line_tab_inches: 0.5, text_tab_inches: 1, continuation_indent_inches: 0 },
      { paragraph_index: 1, paragraph_id: null, role: "qa", first_line_tab_inches: 0.5, text_tab_inches: 1, continuation_indent_inches: 0 },
      { paragraph_index: 2, paragraph_id: null, role: "speaker", first_line_tab_inches: 1.5, text_tab_inches: null, continuation_indent_inches: 0 },
      { paragraph_index: 3, paragraph_id: null, role: "parenthetical", first_line_tab_inches: 2, text_tab_inches: null, continuation_indent_inches: 0 },
      { paragraph_index: 4, paragraph_id: null, role: "centered", first_line_tab_inches: 3.25, text_tab_inches: null, continuation_indent_inches: 0 },
    ]);
  });

  it("renders the locked Q/A, speaker, and parenthetical tab positions", () => {
    expect(renderBlock(block({ block_type: "Q" }))[0]?.text).toBe("\tQ.\tPlease state your name.");
    expect(renderBlock(block({ block_type: "A", role: "WITNESS", text: "Yes." }))[0]?.text).toBe("\tA.\tYes.");
    expect(renderBlock(block({ block_type: "SP", text: "Please answer." }))[0]?.text).toBe("\t\t\tMR. BENTLEY:  Please answer.");
    expect(renderBlock(block({ block_type: "PN", text: "(Off the record.)" }))[0]?.text).toBe("\t\t\t\t(Off the record.)");
  });

  it("uses the structured package as a geometry-only layout input", () => {
    const transcriptPackage = buildStructuredTranscriptPackage({
      transcriptId: "synthetic_geometry_transcript",
      createdAt: "2026-07-21T00:00:00.000Z",
      dialogue: [],
      paragraphs: [{
        kind: "PARENTHETICAL",
        region: "PROCEEDINGS",
        label: "",
        speakerLabel: "",
        text: "(Off the record.)",
        speakerId: null,
        leadingText: "",
        mode: "display",
        words: [],
        sourceLines: [],
        sourceUtteranceIds: ["utt_geometry_1"],
        sourceWordIds: [],
      }],
    });

    expect(buildStructuredTranscriptGeometryLayout(transcriptPackage).lines).toEqual([
      {
        paragraph_index: 0,
        paragraph_id: "paragraph:0:utt_geometry_1",
        role: "parenthetical",
        first_line_tab_inches: 2,
        text_tab_inches: null,
        continuation_indent_inches: 0,
      },
    ]);
  });
  it("returns safe empty layouts and violations for absent runtime inputs", () => {
    expect(buildGeometryLayout(null).lines).toEqual([]);
    expect(buildStructuredTranscriptGeometryLayout(undefined).lines).toEqual([]);
    expect(checkGeometry(undefined)).toEqual([]);
  });

  it("keeps a layout model available for malformed runtime entries", () => {
    const malformedPackage = { paragraphs: [null] } as unknown as import("./structuredTranscriptPackage").StructuredTranscriptPackage;
    const malformedParagraphs = [null] as unknown as import("./geometryEngine").FormattedParagraph[];

    expect(buildStructuredTranscriptGeometryLayout(malformedPackage).lines[0]).toMatchObject({
      paragraph_id: null,
      role: "speaker",
    });
    expect(buildGeometryLayout(malformedParagraphs).lines[0]).toMatchObject({
      paragraph_id: null,
      role: "speaker",
    });
  });
  it("does not throw when an invalid tab step reaches the runtime boundary", () => {
    const invalidProfile = {
      ...DEFAULT_GEOMETRY_PROFILE,
      tabs: { ...DEFAULT_GEOMETRY_PROFILE.tabs, qaLabelInches: 0 },
    };

    expect(() => renderBlock(block({ block_type: "Q" }), invalidProfile)).not.toThrow();
  });
  it("reports a geometry violation when a locked tab position is absent", () => {
    expect(checkGeometry([{ kind: "PN", text: "\t\t\t(Off the record.)" }])).toEqual([
      expect.objectContaining({ type: "PARENTHETICAL_INDENT", severity: "ERROR" }),
    ]);
  });
});
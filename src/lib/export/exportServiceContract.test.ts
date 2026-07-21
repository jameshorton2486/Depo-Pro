import { describe, expect, it } from "vitest";

import {
  buildExportServiceRequest,
  canTransitionExportJob,
  validateExportServiceRequest,
  type ExportArtifactFormat,
} from "./exportServiceContract";
import type { UnifiedRenderModel } from "../transcript/unifiedRendering";

function makeRenderModel(): UnifiedRenderModel {
  return {
    transcriptId: "synthetic-export-transcript",
    geometry: {
      format_box_width_inches: 6.5,
      left_margin_inches: 1.25,
      right_margin_inches: 0.75,
      line_spacing_points: 28,
      lines_per_page: 25,
    },
    entityRegistryEntryCount: 0,
    lines: [{
      paragraphId: "paragraph_1",
      kind: "Q",
      content: "Q. Please state your name.",
      sourceUtteranceIds: ["utterance_1"],
      sourceWordIds: ["word_1"],
      geometry: {
        paragraph_index: 0,
        paragraph_id: "paragraph_1",
        role: "qa",
        first_line_tab_inches: 0.5,
        text_tab_inches: 1,
        continuation_indent_inches: 1,
      },
    }],
  };
}

describe("exportServiceContract", () => {
  it("submits a render model without reconstructing its transcript content", () => {
    const formats: ExportArtifactFormat[] = ["DOCX", "PDF"];
    const request = buildExportServiceRequest({
      renderModel: makeRenderModel(),
      formats,
      idempotencyKey: "synthetic-request-1",
    });

    expect(request.renderModel.lines[0]?.content).toBe("Q. Please state your name.");
    expect(request.formats).toEqual(["DOCX", "PDF"]);
  });

  it("rejects empty or duplicate format requests", () => {
    expect(() => buildExportServiceRequest({
      renderModel: makeRenderModel(),
      formats: [],
      idempotencyKey: "synthetic-request-2",
    })).toThrow("unique output formats");

    expect(() => buildExportServiceRequest({
      renderModel: makeRenderModel(),
      formats: ["DOCX", "DOCX"],
      idempotencyKey: "synthetic-request-3",
    })).toThrow("unique output formats");
  });

  it("allows only forward asynchronous job transitions", () => {
    expect(canTransitionExportJob("QUEUED", "PROCESSING")).toBe(true);
    expect(canTransitionExportJob("PROCESSING", "COMPLETED")).toBe(true);
    expect(canTransitionExportJob("COMPLETED", "PROCESSING")).toBe(false);
  });

  it("rejects stale contract versions and untrusted format values", () => {
    const validRequest = buildExportServiceRequest({
      renderModel: makeRenderModel(),
      formats: ["DOCX"],
      idempotencyKey: "synthetic-request-4",
    });

    expect(() => validateExportServiceRequest({ ...validRequest, contractVersion: "2026-01-01" })).toThrow("unsupported contract version");
    expect(() => validateExportServiceRequest({ ...validRequest, formats: ["RTF"] })).toThrow("valid output formats");
  });
});

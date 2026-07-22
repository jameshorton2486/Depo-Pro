import { describe, expect, it } from "vitest";
import type { ExportJob } from "../../../src/lib/export/exportServiceContract";
import {
  assertJobTranscript,
  buildCancelledJob,
  parseAdapterRequest,
  validateStoredJob,
} from "../../../supabase/functions/export-adapter/protocol";

function queuedJob(): ExportJob {
  return {
    jobId: "export-synthetic",
    transcriptId: "transcript-synthetic",
    status: "QUEUED",
    artifacts: [],
    error: null,
  };
}

describe("Export Adapter server protocol", () => {
  it("validates canonical create requests without modifying the render model", () => {
    const renderModel = {
      transcriptId: "transcript-synthetic",
      geometry: {
        format_box_width_inches: 6.5,
        left_margin_inches: 1.25,
        right_margin_inches: 0.75,
        line_spacing_points: 28,
        lines_per_page: 25,
      },
      lines: [{
        paragraphId: "paragraph-synthetic",
        kind: "Q" as const,
        content: "Q. Synthetic?",
        sourceUtteranceIds: ["utterance-synthetic"],
        sourceWordIds: [],
        geometry: {
          paragraph_index: 0,
          paragraph_id: "paragraph-synthetic",
          role: "qa" as const,
          first_line_tab_inches: 0.5,
          text_tab_inches: 1,
          continuation_indent_inches: 1,
        },
      }],
      entityRegistryEntryCount: 0,
    };

    const parsed = parseAdapterRequest({
      action: "create",
      request: {
        contractVersion: "2026-07-21",
        transcriptId: "transcript-synthetic",
        renderModel,
        formats: ["DOCX"],
        idempotencyKey: "request-synthetic",
      },
    });

    expect(parsed.action).toBe("create");
    if (parsed.action !== "create") throw new Error("expected create action");
    expect(parsed.request.renderModel).toBe(renderModel);
  });

  it("rejects malformed formatter responses", () => {
    expect(() => validateStoredJob({ job: { status: "UNKNOWN" } })).toThrow("malformed export job");
  });

  it("prevents cross-transcript artifact retrieval", () => {
    expect(() => assertJobTranscript(queuedJob(), "different-transcript")).toThrow("transcript mismatch");
  });

  it("cancels only queued jobs using the existing FAILED contract state", () => {
    expect(buildCancelledJob(queuedJob())).toMatchObject({
      status: "FAILED",
      error: "export cancelled",
    });
    expect(() => buildCancelledJob({ ...queuedJob(), status: "PROCESSING" })).toThrow("only queued exports");
  });
});

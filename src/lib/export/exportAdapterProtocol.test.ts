import { describe, expect, it } from "vitest";
import type { ExportJob } from "../../../src/lib/export/exportServiceContract";
import {
  assertJobTranscript,
  buildFormatterRelayRequest,
  buildGoogleDependencyAdapterError,
  buildStagedFormatterRequest,
  parseFormatterRelayRequest,
  buildCancelledJob,
  parseAdapterRequest,
  persistQueuedCancellation,
  shouldPersistCancellationAfterMissingTask,
  shouldRecoverQueuedDispatch,
  validateStagedFormatterRequest,
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

describe("Export Adapter dependency errors", () => {
  it("surfaces Google API failures as structured dependency errors", () => {
    expect(buildGoogleDependencyAdapterError(403)).toEqual({
      status: 503,
      message: "google api request failed (403)",
    });
  });
});
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

  it("stages production-sized render models and keeps Cloud Tasks payloads bounded", () => {
    const renderModel = {
      transcriptId: "transcript-synthetic",
      lines: Array.from({ length: 30_000 }, (_, index) => ({
        paragraphId: `paragraph-${index}`,
        kind: "Q" as const,
        content: `Q. Synthetic production line ${index.toString().padStart(5, "0")}?`,
        sourceUtteranceIds: [`utterance-${index}`],
        sourceWordIds: [`word-${index}`],
        geometry: {
          paragraph_index: index,
          paragraph_id: `paragraph-${index}`,
          role: "qa" as const,
          first_line_tab_inches: 0.5,
          text_tab_inches: 1,
          continuation_indent_inches: 1,
        },
      })),
    };
    const request = {
      contractVersion: "2026-07-21" as const,
      transcriptId: "transcript-synthetic",
      renderModel,
      formats: ["DOCX", "PDF"] as Array<"DOCX" | "PDF">,
      idempotencyKey: "request-production-sized",
    };
    const inlineFormatterTaskBytes = new TextEncoder().encode(JSON.stringify({
      jobId: "export-production-sized",
      request,
    })).byteLength;
    const staged = buildStagedFormatterRequest("export-production-sized", request, "2026-07-22T00:00:00.000Z");
    const relay = buildFormatterRelayRequest(
      staged.jobId,
      staged.transcriptId,
      "exports/requests/export-production-sized.json",
    );
    const relayTaskBytes = new TextEncoder().encode(JSON.stringify(relay)).byteLength;

    expect(inlineFormatterTaskBytes).toBeGreaterThan(1_000_000);
    expect(relayTaskBytes).toBeLessThan(1024);
    expect(staged.request.renderModel).toBe(renderModel);
    expect(parseFormatterRelayRequest(relay)).toEqual(relay);
    expect(() => validateStagedFormatterRequest(staged, relay)).not.toThrow();
  });
  it("rejects malformed formatter responses", () => {
    expect(() => validateStoredJob({ job: { status: "UNKNOWN" } })).toThrow("malformed export job");
  });

  it("prevents cross-transcript artifact retrieval", () => {
    expect(() => assertJobTranscript(queuedJob(), "different-transcript")).toThrow("transcript mismatch");
  });

  it("recovers dispatch for idempotent replays that are still queued", () => {
    expect(shouldRecoverQueuedDispatch(queuedJob())).toBe(true);
    expect(shouldRecoverQueuedDispatch({ ...queuedJob(), status: "PROCESSING" })).toBe(false);
    expect(shouldRecoverQueuedDispatch({ ...queuedJob(), status: "COMPLETED" })).toBe(false);
  });

  it("persists queued cancellation when Cloud Tasks already removed the task", () => {
    expect(shouldPersistCancellationAfterMissingTask(queuedJob())).toBe(true);
    expect(shouldPersistCancellationAfterMissingTask({ ...queuedJob(), status: "PROCESSING" })).toBe(false);
    expect(shouldPersistCancellationAfterMissingTask({ ...queuedJob(), status: "COMPLETED" })).toBe(false);
  });
  it("cancels only queued jobs using the existing FAILED contract state", () => {
    expect(buildCancelledJob(queuedJob())).toMatchObject({
      status: "FAILED",
      error: "export cancelled",
    });
    expect(() => buildCancelledJob({ ...queuedJob(), status: "PROCESSING" })).toThrow("only queued exports");
  });

  it("retries a generation conflict after task deletion and persists terminal cancellation", async () => {
    const writes: string[] = [];
    let writeAttempt = 0;
    const result = await persistQueuedCancellation(
      {
        value: { job: queuedJob(), idempotencyKey: "request-synthetic", retryEligible: true, updatedAt: "first" },
        generation: "1",
      },
      async (stored, generation) => {
        writes.push(`${generation}:${stored.job.status}`);
        writeAttempt += 1;
        if (writeAttempt === 1) throw new Error("generation conflict");
      },
      async () => ({
        value: { job: queuedJob(), idempotencyKey: "request-synthetic", retryEligible: true, updatedAt: "second" },
        generation: "2",
      }),
      (error) => error instanceof Error && error.message === "generation conflict",
    );

    expect(result).toMatchObject({ status: "FAILED", error: "export cancelled" });
    expect(writes).toEqual(["1:FAILED", "2:FAILED"]);
  });

  it("returns the formatter state when a cancellation conflict reveals processing", async () => {
    const processing = { ...queuedJob(), status: "PROCESSING" as const };
    const result = await persistQueuedCancellation(
      {
        value: { job: queuedJob(), idempotencyKey: "request-synthetic", retryEligible: true, updatedAt: "first" },
        generation: "1",
      },
      async () => { throw new Error("generation conflict"); },
      async () => ({
        value: { job: processing, idempotencyKey: "request-synthetic", retryEligible: true, updatedAt: "second" },
        generation: "2",
      }),
      () => true,
    );

    expect(result).toBe(processing);
  });
});

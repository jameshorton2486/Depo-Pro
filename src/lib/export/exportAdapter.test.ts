import { describe, expect, it, vi } from "vitest";
import type { EditorDocument } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import type { ExportJob } from "./exportServiceContract";
import {
  buildCanonicalExportRenderModel,
  ExportAdapter,
  ExportEligibilityError,
  type ExportAdapterTransport,
} from "./exportAdapter";

const completedJob: ExportJob = {
  jobId: "export-001",
  transcriptId: "transcript-001",
  status: "COMPLETED",
  artifacts: [{
    format: "DOCX",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    downloadUrl: "https://storage.example.test/signed",
    expiresAt: "2026-07-22T06:00:00.000Z",
  }],
  error: null,
};

function certifiedRecord() {
  const record = emptyCaseRecord("case-synthetic", "2026-07-22T00:00:00.000Z");
  record.certification = {
    certification_date: "2026-07-22",
    certification_statement: "I certify this fabricated transcript.",
    checklist: {
      review_complete: true,
      speaker_mapping_complete: true,
      confidence_review_complete: true,
      exhibits_complete: true,
      ufm_complete: true,
    },
    signature_hash: null,
  };
  return record;
}

function renderModel() {
  return {
    transcriptId: "transcript-001",
    geometry: {
      format_box_width_inches: 6.5,
      left_margin_inches: 1.25,
      right_margin_inches: 0.75,
      line_spacing_points: 28,
      lines_per_page: 25,
    },
    lines: [{
      paragraphId: "paragraph-001",
      kind: "Q" as const,
      content: "Q. Is this synthetic?",
      sourceUtteranceIds: ["utterance-001"],
      sourceWordIds: ["word-001"],
      geometry: {
        paragraph_index: 0,
        paragraph_id: "paragraph-001",
        role: "qa" as const,
        first_line_tab_inches: 0.5,
        text_tab_inches: 1,
        continuation_indent_inches: 1,
      },
    }],
    entityRegistryEntryCount: 0,
  };
}

function transport(overrides: Partial<ExportAdapterTransport> = {}): ExportAdapterTransport {
  return {
    create: vi.fn().mockResolvedValue(completedJob),
    get: vi.fn().mockResolvedValue(completedJob),
    cancel: vi.fn().mockResolvedValue({ ...completedJob, status: "FAILED", artifacts: [], error: "export cancelled" }),
    ...overrides,
  };
}

describe("ExportAdapter", () => {
  it("orchestrates a certified export without changing render geometry", async () => {
    const gateway = transport();
    const adapter = new ExportAdapter(gateway);
    const model = renderModel();

    await expect(adapter.start({
      certification: certifiedRecord().certification,
      renderModel: model,
      formats: ["DOCX"],
      idempotencyKey: "request-001",
    })).resolves.toEqual(completedJob);

    expect(gateway.create).toHaveBeenCalledWith(expect.objectContaining({
      renderModel: model,
      formats: ["DOCX"],
      idempotencyKey: "request-001",
    }));
    expect(model.lines[0].geometry).toEqual(expect.objectContaining({
      first_line_tab_inches: 0.5,
      text_tab_inches: 1,
      continuation_indent_inches: 1,
    }));
  });

  it("enforces persisted certification", () => {
    const adapter = new ExportAdapter(transport());
    const certification = certifiedRecord().certification;
    if (!certification) throw new Error("fixture certification is missing");
    certification.certification_date = null;

    expect(() => adapter.start({
      certification,
      renderModel: renderModel(),
      formats: ["PDF"],
      idempotencyKey: "request-002",
    })).toThrow(ExportEligibilityError);
  });

  it("surfaces formatter failures deterministically", async () => {
    const failed = { ...completedJob, status: "FAILED" as const, artifacts: [], error: "formatter unavailable" };
    const adapter = new ExportAdapter(transport({ create: vi.fn().mockResolvedValue(failed) }));

    await expect(adapter.start({
      certification: certifiedRecord().certification,
      renderModel: renderModel(),
      formats: ["PDF"],
      idempotencyKey: "request-003",
    })).resolves.toEqual(failed);
  });

  it("retrieves completed signed artifacts without alteration", async () => {
    const gateway = transport();
    const adapter = new ExportAdapter(gateway);

    await expect(adapter.get("export-001", "transcript-001")).resolves.toBe(completedJob);
  });

  it("propagates queued and processing progress until artifacts complete", async () => {
    const queued = { ...completedJob, status: "QUEUED" as const, artifacts: [] };
    const processing = { ...queued, status: "PROCESSING" as const };
    const get = vi.fn().mockResolvedValueOnce(processing).mockResolvedValueOnce(completedJob);
    const adapter = new ExportAdapter(transport({ get }));
    const updates: ExportJob[] = [];

    await expect(adapter.waitForCompletion(queued, {
      intervalMs: 0,
      onUpdate: (job) => updates.push(job),
    })).resolves.toEqual(completedJob);

    expect(updates.map((job) => job.status)).toEqual(["PROCESSING", "COMPLETED"]);
  });
  it("propagates cancellation as a terminal adapter result", async () => {
    const adapter = new ExportAdapter(transport());

    await expect(adapter.cancel("export-001", "transcript-001")).resolves.toMatchObject({
      status: "FAILED",
      error: "export cancelled",
    });
  });

  it("reuses the caller idempotency key for duplicate requests", async () => {
    const gateway = transport();
    const adapter = new ExportAdapter(gateway);
    const input = {
      certification: certifiedRecord().certification,
      renderModel: renderModel(),
      formats: ["DOCX"] as const,
      idempotencyKey: "same-request",
    };

    await adapter.start(input);
    await adapter.start(input);

    expect(gateway.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ idempotencyKey: "same-request" }));
    expect(gateway.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ idempotencyKey: "same-request" }));
  });
});

describe("buildCanonicalExportRenderModel", () => {
  it("consumes the owner pipeline and returns completed geometry", () => {
    const document: EditorDocument = {
      job_id: "transcript-001",
      media_url: "",
      duration: 2,
      speakers: [{ speaker_id: "speaker-001", display_name: "MR. SAMPLE", role: "ATTORNEY", deepgram_speaker: 0 }],
      utterances: [{ utterance_id: "utterance-001", speaker_id: "speaker-001", start_time: 0, end_time: 2, word_ids: ["word-001", "word-002", "word-003"] }],
      words: [
        { word_id: "word-001", utterance_id: "utterance-001", speaker_id: "speaker-001", start_time: 0, end_time: 0.5, confidence: 1, reviewed: true, edited: false, text: "Is", raw_text: "Is" },
        { word_id: "word-002", utterance_id: "utterance-001", speaker_id: "speaker-001", start_time: 0.5, end_time: 1, confidence: 1, reviewed: true, edited: false, text: "this", raw_text: "this" },
        { word_id: "word-003", utterance_id: "utterance-001", speaker_id: "speaker-001", start_time: 1, end_time: 2, confidence: 1, reviewed: true, edited: false, text: "synthetic?", raw_text: "synthetic?" },
      ],
    };

    const model = buildCanonicalExportRenderModel(document, certifiedRecord());

    expect(model.transcriptId).toBe("transcript-001");
    expect(model.lines.length).toBeGreaterThan(0);
    expect(model.lines.every((line) => line.geometry.paragraph_index >= 0)).toBe(true);
  });
});

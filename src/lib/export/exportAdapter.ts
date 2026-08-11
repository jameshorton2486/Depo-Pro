import type { EditorDocument } from "../../api/types";
import type { CaseCertification, CaseRecord } from "../../types/case";
import { isCertificationLocked, isCertificationReady } from "../certification";
import { abbreviationRegistry } from "../format/abbreviationRegistry";
import { cfe } from "../format/cfe";
import { DEFAULT_GEOMETRY_PROFILE } from "../format/geometryProfile";
import { serializeFormattedLineClean } from "../format/serialize";
import { applyEditorialRulesToRenderModel } from "../transcript/editorialEngine";
import { classifyDepositionRegions } from "../transcript/depositionRegionEngine";
import { buildStructuredTranscriptGeometryLayout } from "../transcript/geometryEngine";
import { buildStructuredTranscriptPackage } from "../transcript/structuredTranscriptPackage";
import { asStructuredUtterance, normalizePersistedLineType } from "../transcript/structuredTranscript";
import { applyReviewedStructure } from "../transcript/lineTypeMigration";
import { buildTranscriptParagraphs } from "../transcript/transcriptParagraphs";
import { buildDisplayDocument } from "../transcript/workspacePresentation";
import { buildUnifiedRenderModel, type UnifiedRenderModel } from "../transcript/unifiedRendering";
import {
  buildExportServiceRequest,
  type ExportArtifactFormat,
  type ExportJob,
  type ExportServiceRequest,
} from "./exportServiceContract";

export class ExportEligibilityError extends Error {
  constructor(message = "Persisted certification is required before export.") {
    super(message);
    this.name = "ExportEligibilityError";
  }
}

export class ExportPollingTimeoutError extends Error {
  constructor(message = "Export did not complete before the polling timeout.") {
    super(message);
    this.name = "ExportPollingTimeoutError";
  }
}
export interface ExportAdapterTransport {
  create(request: ExportServiceRequest): Promise<ExportJob>;
  get(jobId: string, transcriptId: string): Promise<ExportJob>;
  cancel(jobId: string, transcriptId: string): Promise<ExportJob>;
}

export interface StartExportInput {
  certification: CaseCertification | null | undefined;
  renderModel: UnifiedRenderModel;
  formats: readonly ExportArtifactFormat[];
  idempotencyKey: string;
}

export class ExportAdapter {
  constructor(private readonly transport: ExportAdapterTransport) {}

  start(input: StartExportInput): Promise<ExportJob> {
    if (!isCertificationReady(input.certification) || !isCertificationLocked(input.certification)) {
      throw new ExportEligibilityError();
    }

    return this.transport.create(buildExportServiceRequest(input));
  }

  get(jobId: string, transcriptId: string): Promise<ExportJob> {
    return this.transport.get(jobId, transcriptId);
  }

  cancel(jobId: string, transcriptId: string): Promise<ExportJob> {
    return this.transport.cancel(jobId, transcriptId);
  }

  async waitForCompletion(
    initialJob: ExportJob,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      signal?: AbortSignal;
      onUpdate?: (job: ExportJob) => void;
    } = {},
  ): Promise<ExportJob> {
    let job = initialJob;
    const startedAt = Date.now();
    const timeoutMs = options.timeoutMs;
    while (job.status === "QUEUED" || job.status === "PROCESSING") {
      if (options.signal?.aborted) {
        throw new DOMException("Export polling was cancelled.", "AbortError");
      }
      if (timeoutMs !== undefined && Date.now() - startedAt >= timeoutMs) {
        throw new ExportPollingTimeoutError();
      }
      await delay(options.intervalMs ?? 1000, options.signal);
      if (options.signal?.aborted) {
        throw new DOMException("Export polling was cancelled.", "AbortError");
      }
      job = await this.get(job.jobId, job.transcriptId);
      options.onUpdate?.(job);
    }
    return job;
  }
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timeout);
      reject(new DOMException("Export polling was cancelled.", "AbortError"));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export function buildCanonicalExportRenderModel(
  document: EditorDocument,
  record: CaseRecord,
): UnifiedRenderModel {
  const displayDocument = buildDisplayDocument(document, record);
  // A11 / C1b: this render model produces the certified DOCX the reporter signs
  // her CSR number to. It must be verbatim — no correction-registry word
  // substitution (which could silently swap a real surname into testimony).
  // Word correction is the separate, recorded A5 correction engine, not this render.
  const formatted = cfe(displayDocument, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry, {
    applyLexicalCorrections: false,
  });
  const utteranceById = new Map(displayDocument.utterances.map((utterance) => [utterance.utterance_id, asStructuredUtterance(utterance)]));
  const regionByUtteranceId = classifyDepositionRegions(formatted.lines.map((line) => ({
    utteranceId: line.utterance_id,
    text: serializeFormattedLineClean(line),
    persistedLineType: normalizePersistedLineType(utteranceById.get(line.utterance_id)?.line_type),
    role: line.role,
  })));
  // DOC-0325 shared-builder seam (export side). The overlay is flag-gated (default off →
  // no-op), so certified output is byte-identical today. When the flag is on, export consumes
  // the SAME persisted reviewed line_type authority as Workspace — the invariant that the
  // reporter certifies exactly the structure she reviewed. Uses displayDocument (carries the
  // persisted line_type) for the utterance→line_type lookup.
  const exportParagraphs = applyReviewedStructure(
    buildTranscriptParagraphs(formatted.lines.map((line) => ({
      line,
      text: line.words.map((word) => `${word.text}${word.trailing_space}`).join("").trim(),
      region: regionByUtteranceId.get(line.utterance_id) ?? "CAPTION",
      persistedLineType: normalizePersistedLineType(utteranceById.get(line.utterance_id)?.line_type),
      speakerLabel: line.speaker_label,
    }))),
    displayDocument,
  );
  const transcriptPackage = buildStructuredTranscriptPackage({
    transcriptId: document.job_id,
    paragraphs: exportParagraphs,
    dialogue: [],
  });
  const renderModel = buildUnifiedRenderModel({
    transcriptPackage,
    geometry: buildStructuredTranscriptGeometryLayout(transcriptPackage),
    entityRegistry: null,
  });

  return applyEditorialRulesToRenderModel(renderModel).model;
}

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
      signal?: AbortSignal;
      onUpdate?: (job: ExportJob) => void;
    } = {},
  ): Promise<ExportJob> {
    let job = initialJob;
    while (job.status === "QUEUED" || job.status === "PROCESSING") {
      if (options.signal?.aborted) {
        throw new DOMException("Export polling was cancelled.", "AbortError");
      }
      await delay(options.intervalMs ?? 1000, options.signal);
      job = await this.get(job.jobId, job.transcriptId);
      options.onUpdate?.(job);
    }
    return job;
  }
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new DOMException("Export polling was cancelled.", "AbortError"));
    }, { once: true });
  });
}

export function buildCanonicalExportRenderModel(
  document: EditorDocument,
  record: CaseRecord,
): UnifiedRenderModel {
  const displayDocument = buildDisplayDocument(document, record);
  const formatted = cfe(displayDocument, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry);
  const utteranceById = new Map(displayDocument.utterances.map((utterance) => [utterance.utterance_id, asStructuredUtterance(utterance)]));
  const regionByUtteranceId = classifyDepositionRegions(formatted.lines.map((line) => ({
    utteranceId: line.utterance_id,
    text: serializeFormattedLineClean(line),
    persistedLineType: normalizePersistedLineType(utteranceById.get(line.utterance_id)?.line_type),
    role: line.role,
  })));
  const transcriptPackage = buildStructuredTranscriptPackage({
    transcriptId: document.job_id,
    paragraphs: buildTranscriptParagraphs(formatted.lines.map((line) => ({
      line,
      text: line.words.map((word) => `${word.text}${word.trailing_space}`).join("").trim(),
      region: regionByUtteranceId.get(line.utterance_id) ?? "CAPTION",
      persistedLineType: normalizePersistedLineType(utteranceById.get(line.utterance_id)?.line_type),
      speakerLabel: line.speaker_label,
    }))),
    dialogue: [],
  });
  const renderModel = buildUnifiedRenderModel({
    transcriptPackage,
    geometry: buildStructuredTranscriptGeometryLayout(transcriptPackage),
    entityRegistry: null,
  });

  return applyEditorialRulesToRenderModel(renderModel).model;
}

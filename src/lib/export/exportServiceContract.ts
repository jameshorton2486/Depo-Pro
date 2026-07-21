import type { UnifiedRenderModel } from "../transcript/unifiedRendering";

export const EXPORT_SERVICE_CONTRACT_VERSION = "2026-07-21";

export type ExportArtifactFormat = "DOCX" | "PDF";
export type ExportJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ExportServiceRequest {
  contractVersion: typeof EXPORT_SERVICE_CONTRACT_VERSION;
  transcriptId: string;
  renderModel: UnifiedRenderModel;
  formats: ExportArtifactFormat[];
  idempotencyKey: string;
}

export type ExportArtifact =
  | {
      format: "DOCX";
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      downloadUrl: string;
      expiresAt: string;
    }
  | {
      format: "PDF";
      contentType: "application/pdf";
      downloadUrl: string;
      expiresAt: string;
    };

export interface ExportJob {
  jobId: string;
  transcriptId: string;
  status: ExportJobStatus;
  artifacts: ExportArtifact[];
  error: string | null;
}

export function buildExportServiceRequest(input: {
  renderModel: UnifiedRenderModel;
  formats: readonly ExportArtifactFormat[];
  idempotencyKey: string;
}): ExportServiceRequest {
  const request: ExportServiceRequest = {
    contractVersion: EXPORT_SERVICE_CONTRACT_VERSION,
    transcriptId: input.renderModel.transcriptId,
    renderModel: input.renderModel,
    formats: [...input.formats],
    idempotencyKey: input.idempotencyKey,
  };

  validateExportServiceRequest(request);
  return request;
}

export function validateExportServiceRequest(request: unknown): asserts request is ExportServiceRequest {
  if (!request || typeof request !== "object") {
    throw new Error("export request must be an object");
  }

  const candidate = request as Partial<ExportServiceRequest>;
  if (candidate.contractVersion !== EXPORT_SERVICE_CONTRACT_VERSION) {
    throw new Error("export request uses an unsupported contract version");
  }
  if (typeof candidate.transcriptId !== "string" || !candidate.transcriptId.trim()) {
    throw new Error("export request requires a transcript id");
  }
  if (!candidate.renderModel || typeof candidate.renderModel !== "object") {
    throw new Error("export request requires a render model");
  }
  if (candidate.renderModel.transcriptId !== candidate.transcriptId) {
    throw new Error("export request transcript id must match the render model");
  }
  if (typeof candidate.idempotencyKey !== "string" || !candidate.idempotencyKey.trim()) {
    throw new Error("export request requires an idempotency key");
  }
  if (!Array.isArray(candidate.formats) || candidate.formats.length === 0 || new Set(candidate.formats).size !== candidate.formats.length) {
    throw new Error("export request requires unique output formats");
  }
  if (candidate.formats.some((format) => format !== "DOCX" && format !== "PDF")) {
    throw new Error("export request requires valid output formats");
  }
  if (!Array.isArray(candidate.renderModel.lines) || candidate.renderModel.lines.length === 0) {
    throw new Error("export request requires rendered transcript content");
  }
}

export function canTransitionExportJob(from: ExportJobStatus, to: ExportJobStatus): boolean {
  if (from === "QUEUED") return to === "PROCESSING" || to === "FAILED";
  if (from === "PROCESSING") return to === "COMPLETED" || to === "FAILED";
  return false;
}

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

export interface ExportArtifact {
  format: ExportArtifactFormat;
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/pdf";
  downloadUrl: string;
  expiresAt: string;
}

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

export function validateExportServiceRequest(request: ExportServiceRequest): void {
  if (!request.transcriptId.trim()) {
    throw new Error("export request requires a transcript id");
  }
  if (request.renderModel.transcriptId !== request.transcriptId) {
    throw new Error("export request transcript id must match the render model");
  }
  if (!request.idempotencyKey.trim()) {
    throw new Error("export request requires an idempotency key");
  }
  if (request.formats.length === 0 || new Set(request.formats).size !== request.formats.length) {
    throw new Error("export request requires unique output formats");
  }
  if (request.renderModel.lines.length === 0) {
    throw new Error("export request requires rendered transcript content");
  }
}

export function canTransitionExportJob(from: ExportJobStatus, to: ExportJobStatus): boolean {
  if (from === "QUEUED") return to === "PROCESSING" || to === "FAILED";
  if (from === "PROCESSING") return to === "COMPLETED" || to === "FAILED";
  return false;
}

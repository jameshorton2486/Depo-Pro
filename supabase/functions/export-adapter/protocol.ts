export type ExportJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type ExportJob = {
  jobId: string;
  transcriptId: string;
  status: ExportJobStatus;
  artifacts: Array<Record<string, unknown>>;
  error: string | null;
};

export type ExportServiceRequest = {
  contractVersion: "2026-07-21";
  transcriptId: string;
  renderModel: {
    transcriptId: string;
    lines: unknown[];
    [key: string]: unknown;
  };
  formats: Array<"DOCX" | "PDF">;
  idempotencyKey: string;
};

export type AdapterRequest =
  | { action: "create"; request: ExportServiceRequest }
  | { action: "get"; jobId: string; transcriptId: string }
  | { action: "cancel"; jobId: string; transcriptId: string };

export type StoredJob = {
  job: ExportJob;
  idempotencyKey: string | null;
  retryEligible: boolean;
  updatedAt: string;
};
export type StoredJobVersion = {
  value: StoredJob;
  generation: string;
};

export class CancellationConflictError extends Error {
  constructor() {
    super("export state changed during cancellation");
    this.name = "CancellationConflictError";
  }
}

export async function persistQueuedCancellation(
  initial: StoredJobVersion,
  write: (job: StoredJob, generation: string) => Promise<void>,
  reload: () => Promise<StoredJobVersion>,
  isGenerationConflict: (error: unknown) => boolean,
): Promise<ExportJob> {
  let stored = initial;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (stored.value.job.status !== "QUEUED") {
      return stored.value.job;
    }
    const cancelled = buildCancelledJob(stored.value.job);
    try {
      await write({
        ...stored.value,
        job: cancelled,
        retryEligible: false,
        updatedAt: new Date().toISOString(),
      }, stored.generation);
      return cancelled;
    } catch (error) {
      if (!isGenerationConflict(error)) {
        throw error;
      }
      stored = await reload();
    }
  }
  throw new CancellationConflictError();
}

function validateExportServiceRequest(
  value: unknown,
): asserts value is ExportServiceRequest {
  if (!value || typeof value !== "object") {
    throw new Error("export request must be an object");
  }
  const request = value as Partial<ExportServiceRequest>;
  if (request.contractVersion !== "2026-07-21") {
    throw new Error("export request uses an unsupported contract version");
  }
  if (
    typeof request.transcriptId !== "string" || !request.transcriptId.trim()
  ) throw new Error("export request requires a transcript id");
  if (
    !request.renderModel ||
    request.renderModel.transcriptId !== request.transcriptId
  ) throw new Error("export request transcript id must match the render model");
  if (
    !Array.isArray(request.renderModel.lines) ||
    request.renderModel.lines.length === 0
  ) throw new Error("export request requires rendered transcript content");
  if (
    !Array.isArray(request.formats) || request.formats.length === 0 ||
    new Set(request.formats).size !== request.formats.length
  ) throw new Error("export request requires unique output formats");
  if (request.formats.some((format) => format !== "DOCX" && format !== "PDF")) {
    throw new Error("export request requires valid output formats");
  }
  if (
    typeof request.idempotencyKey !== "string" || !request.idempotencyKey.trim()
  ) throw new Error("export request requires an idempotency key");
}
export function parseAdapterRequest(value: unknown): AdapterRequest {
  if (!value || typeof value !== "object") {
    throw new Error("adapter request must be an object");
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.action === "create") {
    validateExportServiceRequest(candidate.request);
    return { action: "create", request: candidate.request };
  }
  if (
    (candidate.action === "get" || candidate.action === "cancel") &&
    typeof candidate.jobId === "string" && candidate.jobId.trim() &&
    typeof candidate.transcriptId === "string" && candidate.transcriptId.trim()
  ) {
    return {
      action: candidate.action,
      jobId: candidate.jobId,
      transcriptId: candidate.transcriptId,
    };
  }
  throw new Error("adapter request is invalid");
}

export function validateStoredJob(value: unknown): asserts value is StoredJob {
  if (!value || typeof value !== "object") {
    throw new Error("formatter returned a malformed export job");
  }
  const stored = value as Partial<StoredJob>;
  if (
    !stored.job || typeof stored.job.jobId !== "string" ||
    typeof stored.job.transcriptId !== "string"
  ) {
    throw new Error("formatter returned a malformed export job");
  }
  if (
    !["QUEUED", "PROCESSING", "COMPLETED", "FAILED"].includes(stored.job.status)
  ) {
    throw new Error("formatter returned an invalid export status");
  }
  if (!Array.isArray(stored.job.artifacts)) {
    throw new Error("formatter returned malformed artifacts");
  }
}

export function assertJobTranscript(
  job: ExportJob,
  transcriptId: string,
): void {
  if (job.transcriptId !== transcriptId) {
    throw new Error("export job transcript mismatch");
  }
}

export function buildCancelledJob(job: ExportJob): ExportJob {
  if (job.status !== "QUEUED") {
    throw new Error("only queued exports can be cancelled");
  }
  return {
    ...job,
    status: "FAILED",
    artifacts: [],
    error: "export cancelled",
  };
}

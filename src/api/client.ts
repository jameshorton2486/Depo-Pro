// ALL network calls go through this module. Nothing else may call fetch().
import type {
  EditorDocument,
  SaveWorkingPayload,
  SaveWorkingResponse,
  ReviewPayload,
  SpeakersPayload,
  Speaker,
  AiSuggestion,
  Exhibit,
  CertifyChecklist,
} from "./types";
import { isRealApiMode } from "../lib/runtime/mode";
import { AuthRequiredError, getSupabaseAccessToken, supabase } from "../lib/supabase";
import type { ExportAdapterTransport } from "../lib/export/exportAdapter";
import type { ExportJob, ExportServiceRequest } from "../lib/export/exportServiceContract";
import type { CorrectionObject, ReviewState } from "../lib/transcript/correctionObject";

// Re-export all contract types so the rest of the app imports from one place.
export type * from "./types";

export interface PendingAISuggestion {
  word_id: string;
  utterance_id: string;
  raw_text: string;
  ai_suggestion: string;
  ai_suggestion_reason: string;
  ai_confidence: number;
  utterance_raw_text: string;
}

let _baseUrl = "";

export function configureClient(apiBaseUrl: string) {
  _baseUrl = apiBaseUrl.replace(/\/$/, "");
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = body ? { "Content-Type": "application/json" } : {};
  const accessToken = await getAccessToken();
  if (!accessToken && isRealApiMode()) {
    throw new AuthRequiredError(`Authentication is required for ${method} ${url}.`);
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `API ${method} ${url} → ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`,
    );
  }

  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    const preview = (await res.text()).trim().slice(0, 120);
    throw new Error(
      `API ${method} ${url} returned ${contentType || "an unknown content type"} instead of JSON${preview ? ` — ${preview}` : ""}`,
    );
  }

  return res.json() as Promise<T>;
}

async function getAccessToken(): Promise<string | null> {
  return getSupabaseAccessToken();
}

export async function externalRequest(
  method: string,
  url: string,
  options: {
    headers?: Record<string, string>;
    body?: BodyInit;
  } = {},
): Promise<Response> {
  const response = await fetch(url, {
    method,
    headers: options.headers,
    body: options.body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `External ${method} ${url} → ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`,
    );
  }

  return response;
}

export async function externalJsonRequest<T>(
  method: string,
  url: string,
  options: {
    headers?: Record<string, string>;
    body?: BodyInit;
  } = {},
): Promise<T> {
  const response = await externalRequest(method, url, options);
  return response.json() as Promise<T>;
}

async function invokeExportAdapter(body: Record<string, unknown>): Promise<ExportJob> {
  if (!supabase) {
    throw new Error("Export Adapter is unavailable because Supabase is not configured.");
  }
  const { data, error } = await supabase.functions.invoke<ExportJob>("export-adapter", { body });
  if (error) {
    throw new Error(`Export Adapter request failed: ${error.message}`);
  }
  if (!data) {
    throw new Error("Export Adapter returned an empty response.");
  }
  return data;
}

export const exportAdapterTransport: ExportAdapterTransport = {
  create: (request: ExportServiceRequest) => invokeExportAdapter({ action: "create", request }),
  get: (jobId: string, transcriptId: string) => invokeExportAdapter({ action: "get", jobId, transcriptId }),
  cancel: (jobId: string, transcriptId: string) => invokeExportAdapter({ action: "cancel", jobId, transcriptId }),
};
function url(jobId: string, path: string): string {
  return `${_baseUrl}/${jobId}/${path}`;
}

export const api = {
  getDocument: (jobId: string) =>
    request<EditorDocument>("GET", url(jobId, "document")),

  saveWorking: (jobId: string, payload: SaveWorkingPayload) =>
    request<SaveWorkingResponse>("PUT", url(jobId, "working"), payload),

  saveReview: (jobId: string, payload: ReviewPayload) =>
    request<{ ok: true }>("PUT", url(jobId, "review"), payload),

  saveSpeakers: (jobId: string, payload: SpeakersPayload) =>
    request<{ ok: true }>("PUT", url(jobId, "speakers"), payload),

  addSpeaker: (jobId: string, payload: { display_name: string; role?: Speaker["role"] }) =>
    request<{ speaker: Speaker }>("POST", url(jobId, "speakers"), payload),

  getSuggestions: (jobId: string) =>
    request<AiSuggestion[]>("GET", url(jobId, "suggestions")),

  resolveSuggestion: (
    jobId: string,
    id: string,
    body: { action: "accept" | "reject" | "edit"; edited_text?: string }
  ) =>
    request<{ ok: true }>("POST", url(jobId, `suggestions/${id}/resolve`), body),

  resolveAISuggestion: (
    jobId: string,
    wordId: string,
    body: { action: "accept" | "reject" }
  ) =>
    request<{ ok: true }>("PATCH", url(jobId, `ai-suggestions/${wordId}`), body),

  getAISuggestions: (jobId: string) =>
    request<PendingAISuggestion[]>("GET", url(jobId, "ai-suggestions")),

  acceptAllAISuggestions: (jobId: string) =>
    request<{ accepted_count: number }>("POST", url(jobId, "ai-suggestions/accept-all")),

  triggerAIReview: (jobId: string, body: { force: boolean }) =>
    request<{ status: string }>("POST", url(jobId, "ai-review"), body),

  // DOC-0325 Step 1 — reviewed CorrectionObjects (the qa_split structural
  // decisions the reporter accepted). GET /:jobId/corrections[?state=...].
  // The Working Transcript projection (deriveWorkingTranscript) filters to
  // accepted/edited itself, so callers typically fetch unfiltered.
  getCorrections: (jobId: string, state?: ReviewState) =>
    request<CorrectionObject[]>(
      "GET",
      url(jobId, state ? `corrections?state=${encodeURIComponent(state)}` : "corrections"),
    ),

  getExhibits: (jobId: string) =>
    request<Exhibit[]>("GET", url(jobId, "exhibits")),

  getCertifyStatus: (jobId: string) =>
    request<CertifyChecklist>("GET", url(jobId, "certify/status")),
};

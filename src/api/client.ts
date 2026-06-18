// ALL network calls go through this module. Nothing else may call fetch().
import type {
  EditorDocument,
  SaveWorkingPayload,
  SaveWorkingResponse,
  ReviewPayload,
  SpeakersPayload,
  AiSuggestion,
  Exhibit,
  CertifyChecklist,
} from "./types";
import { isRealApiMode } from "../lib/runtime/mode";
import { AuthRequiredError, supabase } from "../lib/supabase";
import type { ResolvedSpeakerView } from "../lib/transcript/resolvedSpeakers";
import type {
  TranscriptReassemblyApplyResult,
  TranscriptReassemblyPreview,
  TranscriptReassemblyRestoreResult,
  TranscriptReassemblyUndoSnapshot,
} from "../lib/transcript/reassembly";

// Re-export all contract types so the rest of the app imports from one place.
export type * from "./types";

type SaveWorkingContractResponse = SaveWorkingResponse & {
  updatedAt?: string | null;
};

type WorkspaceMutationContractResponse = {
  ok: true;
  updatedAt?: string | null;
};

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
    throw new Error(`API ${method} ${url} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function getAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
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

function url(jobId: string, path: string): string {
  return `${_baseUrl}/${jobId}/${path}`;
}

export const api = {
  getDocument: (jobId: string) =>
    request<EditorDocument>("GET", url(jobId, "document")),

  getResolvedSpeakers: (jobId: string) =>
    request<ResolvedSpeakerView[]>("GET", url(jobId, "speakers/resolved")),

  saveWorking: (jobId: string, payload: SaveWorkingPayload) =>
    request<SaveWorkingContractResponse>("PUT", url(jobId, "working"), payload),

  saveReview: (jobId: string, payload: ReviewPayload) =>
    request<WorkspaceMutationContractResponse>("PUT", url(jobId, "review"), payload),

  saveSpeakers: (jobId: string, payload: SpeakersPayload) =>
    request<WorkspaceMutationContractResponse>("PUT", url(jobId, "speakers"), payload),

  getSuggestions: (jobId: string) =>
    request<AiSuggestion[]>("GET", url(jobId, "suggestions")),

  resolveSuggestion: (
    jobId: string,
    id: string,
    body: { action: "accept" | "reject" | "edit"; edited_text?: string }
  ) =>
    request<{ ok: true }>("POST", url(jobId, `suggestions/${id}/resolve`), body),

  getExhibits: (jobId: string) =>
    request<Exhibit[]>("GET", url(jobId, "exhibits")),

  getCertifyStatus: (jobId: string) =>
    request<CertifyChecklist>("GET", url(jobId, "certify/status")),

  getTranscriptReassemblyPreview: (jobId: string) =>
    request<TranscriptReassemblyPreview>("GET", url(jobId, "reassembly/preview")),

  applyTranscriptReassembly: (jobId: string, previewToken: string) =>
    request<TranscriptReassemblyApplyResult>("POST", url(jobId, "reassembly/apply"), { previewToken }),

  restoreTranscriptReassembly: (jobId: string, snapshot: TranscriptReassemblyUndoSnapshot) =>
    request<TranscriptReassemblyRestoreResult>("POST", url(jobId, "reassembly/restore"), { snapshot }),
};

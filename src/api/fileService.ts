import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "../lib/supabase";
import type { Database, Tables } from "../types/database";
import type { TranscriptionJobRecord } from "../lib/transcriptionJobs";

export type CaseFileType =
  | "notice"
  | "scheduling"
  | "supporting"
  | "transcript_source"
  | "export"
  | "other";

export interface CaseFileRecord {
  id: string;
  case_id: string;
  file_id: string;
  file_type: CaseFileType;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number | null;
  checksum: string | null;
  uploaded_by: string | null;
  storage_path: string;
  uploaded_at: string;
  status: "active" | "removed";
  created_at: string;
}

type CaseFileInsert = Omit<CaseFileRecord, "id" | "uploaded_at" | "created_at"> & {
  id?: string;
  uploaded_at?: string;
  created_at?: string;
};

type CaseFileUpdate = Partial<CaseFileInsert>;

type CaseFilesDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      case_files: {
        Row: CaseFileRecord;
        Insert: CaseFileInsert;
        Update: CaseFileUpdate;
        Relationships: [];
      };
      transcription_jobs: {
        Row: TranscriptionJobRecord;
        Insert: Omit<TranscriptionJobRecord, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TranscriptionJobRecord>;
        Relationships: [];
      };
    };
  };
};

export type CaseAudioRecord = Tables<"case_audio"> & {
  source_index: number;
};

const CASE_FILES_BUCKET = "case-files";
const DOCUMENT_LIMIT_BYTES = 50 * 1024 * 1024;
const TRANSCRIPT_SOURCE_LIMIT_BYTES = 100 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024 * 1024;

const DOCUMENT_EXTENSIONS = new Set(["pdf", "docx", "txt", "png", "jpg", "jpeg"]);
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
]);
const TRANSCRIPT_SOURCE_EXTENSIONS = new Set(["json", "txt"]);
const TRANSCRIPT_SOURCE_MIME_TYPES = new Set(["application/json", "text/plain"]);
const AUDIO_EXTENSIONS = new Set(["wav", "mp3", "m4a", "mp4", "webm"]);
const AUDIO_MIME_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "audio/webm",
  "video/webm",
]);

function getExtendedClient(client: SupabaseClient<Database>): SupabaseClient<CaseFilesDatabase> {
  return client as unknown as SupabaseClient<CaseFilesDatabase>;
}

function createProtectedRemovalError(message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.name = "ProtectedRemovalError";
  error.status = 409;
  return error;
}

function getFileExtension(filename: string): string {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot === -1 || lastDot === trimmed.length - 1) {
    return "";
  }
  return trimmed.slice(lastDot + 1).toLowerCase();
}

function isAllowedFile(
  file: Pick<File, "name" | "type" | "size">,
  allowedExtensions: Set<string>,
  allowedMimeTypes: Set<string>,
  maxBytes: number,
): boolean {
  const extension = getFileExtension(file.name);
  const mime = file.type.trim().toLowerCase();

  if (file.size > maxBytes) {
    return false;
  }

  if (allowedExtensions.has(extension)) {
    return true;
  }

  if (!mime) {
    return false;
  }

  return allowedMimeTypes.has(mime);
}

function formatLimitBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }

  return `${bytes} bytes`;
}

function formatFileBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${bytes} B`;
}

export function isAudioUploadWithinLimit(fileSizeBytes: number, maxBytes = MAX_AUDIO_BYTES): boolean {
  return fileSizeBytes <= maxBytes;
}

export function buildAudioLimitErrorMessage(fileSizeBytes: number, maxBytes = MAX_AUDIO_BYTES): string {
  return `Audio uploads are limited to ${formatLimitBytes(maxBytes)}. This file is ${formatFileBytes(fileSizeBytes)}.`;
}

export function normalizeAudioUploadError(error: unknown, fileSizeBytes?: number): Error {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("exceeded the maximum allowed size")) {
      if (typeof fileSizeBytes === "number" && !isAudioUploadWithinLimit(fileSizeBytes)) {
        return new Error(buildAudioLimitErrorMessage(fileSizeBytes));
      }

      return error;
    }

    return error;
  }

  return new Error("Audio upload failed.");
}

export function validateCaseFileUpload(fileType: CaseFileType, file: Pick<File, "name" | "type" | "size">): void {
  if (
    fileType === "notice"
    || fileType === "scheduling"
    || fileType === "supporting"
    || fileType === "export"
    || fileType === "other"
  ) {
    if (!isAllowedFile(file, DOCUMENT_EXTENSIONS, DOCUMENT_MIME_TYPES, DOCUMENT_LIMIT_BYTES)) {
      throw new Error("Documents must be PDF, DOCX, TXT, PNG, or JPG and no larger than 50 MB.");
    }
    return;
  }

  if (fileType === "transcript_source") {
    if (!isAllowedFile(file, TRANSCRIPT_SOURCE_EXTENSIONS, TRANSCRIPT_SOURCE_MIME_TYPES, TRANSCRIPT_SOURCE_LIMIT_BYTES)) {
      throw new Error("Transcript source files must be JSON or TXT and no larger than 100 MB.");
    }
    return;
  }
}

export function validateCaseAudioUpload(file: Pick<File, "name" | "type" | "size">): void {
  if (!isAudioUploadWithinLimit(file.size)) {
    throw new Error(buildAudioLimitErrorMessage(file.size));
  }

  if (!isAllowedFile(file, AUDIO_EXTENSIONS, AUDIO_MIME_TYPES, MAX_AUDIO_BYTES)) {
    throw new Error("Audio must be WAV, MP3, M4A, MP4, or WEBM and no larger than 2 GB.");
  }
}

export function sanitizeFilename(filename: string): string {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/]+/g, " ")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^[_. -]+|[_. -]+$/g, "");

  return normalized || "file";
}

export function createFileId(now = Date.now(), random = Math.random()): string {
  const suffix = Math.floor(random * 36 ** 4).toString(36).padStart(4, "0");
  return `f_${now}_${suffix}`;
}

export function buildStoragePath(
  ownerUserId: string,
  caseId: string,
  category: string,
  fileId: string,
  filename: string,
): string {
  return `${ownerUserId}/${caseId}/${category}/${fileId}_${sanitizeFilename(filename)}`;
}

export async function computeChecksum(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getUploadedBy(client: SupabaseClient<Database>): Promise<string | null> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user?.id ?? null;
}

async function loadAudioDuration(file: File): Promise<number | null> {
  if (typeof Audio === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }

  return new Promise((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      audio.src = "";
      URL.revokeObjectURL(objectUrl);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      cleanup();
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = objectUrl;
  });
}

export async function uploadCaseFile(caseId: string, file: File, fileType: CaseFileType): Promise<CaseFileRecord> {
  validateCaseFileUpload(fileType, file);

  const client = await getSupabaseClient("uploadCaseFile");
  const extendedClient = getExtendedClient(client);
  const fileId = createFileId();
  const uploadedBy = await getUploadedBy(client);
  if (!uploadedBy) {
    throw new Error("Authentication is required to upload case files.");
  }
  const storagePath = buildStoragePath(uploadedBy, caseId, fileType, fileId, file.name);
  const checksum = await computeChecksum(file);

  const { error: uploadError } = await client.storage
    .from(CASE_FILES_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    throw uploadError;
  }

  const row: CaseFileInsert = {
    case_id: caseId,
    file_id: fileId,
    file_type: fileType,
    original_filename: file.name,
    mime_type: file.type || "",
    file_size_bytes: file.size,
    checksum,
    uploaded_by: uploadedBy,
    storage_path: storagePath,
    status: "active",
  };

  const { data, error: insertError } = await extendedClient
    .from("case_files")
    .insert(row as never)
    .select("*")
    .single();

  if (insertError) {
    await client.storage.from(CASE_FILES_BUCKET).remove([storagePath]);
    throw insertError;
  }

  return data as unknown as CaseFileRecord;
}

function throwIfAborted(signal: AbortSignal | undefined, message: string): void {
  if (signal?.aborted) {
    const error = new Error(message);
    error.name = "AbortError";
    throw error;
  }
}

/**
 * Persist the case_audio row for an already-uploaded object, removing the
 * orphaned storage object if the insert fails OR the upload was cancelled after
 * the object landed. Extracted from uploadCaseAudio so the cancellation/orphan
 * cleanup logic is unit-testable without the DOM-bound audio-duration decode.
 */
export async function finalizeAudioUpload(
  client: SupabaseClient<Database>,
  storagePath: string,
  row: Database["public"]["Tables"]["case_audio"]["Insert"],
  signal?: AbortSignal,
): Promise<CaseAudioRecord> {
  try {
    // A cancellation that arrived during the upload must not persist a row.
    throwIfAborted(signal, "Case audio upload cancelled.");

    const { data, error: insertError } = await client
      .from("case_audio")
      .insert(row)
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    return data as CaseAudioRecord;
  } catch (error) {
    // Best-effort orphan cleanup: the object is in storage but has no valid
    // case_audio row, so remove it rather than leak it. Preserve the original
    // failure if cleanup itself fails.
    try {
      await client.storage.from(CASE_FILES_BUCKET).remove([storagePath]);
    } catch {
      // ignore — surface the original error
    }
    throw error;
  }
}

export async function uploadCaseAudio(
  caseId: string,
  file: File,
  options: { signal?: AbortSignal } = {},
): Promise<CaseAudioRecord> {
  const { signal } = options;
  // Do not even begin a cancelled upload.
  throwIfAborted(signal, "Case audio upload cancelled.");

  validateCaseAudioUpload(file);

  const client = await getSupabaseClient("uploadCaseAudio");
  const fileId = createFileId();
  const durationSeconds = await loadAudioDuration(file);
  const existingAudio = await listCaseAudio(caseId);
  const nextSourceIndex = existingAudio.reduce((maxIndex, audioRow) => Math.max(maxIndex, audioRow.source_index), -1) + 1;
  const uploadedBy = await getUploadedBy(client);
  if (!uploadedBy) {
    throw new Error("Authentication is required to upload case audio.");
  }
  const storagePath = buildStoragePath(uploadedBy, caseId, "audio", fileId, file.name);

  // Last cheap cancellation check before the expensive PUT.
  throwIfAborted(signal, "Case audio upload cancelled.");

  const { error: uploadError } = await client.storage
    .from(CASE_FILES_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    throw normalizeAudioUploadError(uploadError, file.size);
  }

  const row = {
    case_id: caseId,
    audio_id: fileId,
    original_filename: file.name,
    mime_type: file.type || "",
    file_size_bytes: file.size,
    duration_seconds: durationSeconds,
    source_index: nextSourceIndex,
    storage_path: storagePath,
    uploaded_at: new Date().toISOString(),
  };

  return finalizeAudioUpload(client, storagePath, row, signal);
}

export async function listCaseFiles(caseId: string, includeRemoved = false): Promise<CaseFileRecord[]> {
  const client = await getSupabaseClient("listCaseFiles");
  const extendedClient = getExtendedClient(client);
  let query = extendedClient
    .from("case_files")
    .select("*")
    .eq("case_id", caseId)
    .order("uploaded_at", { ascending: false });

  if (!includeRemoved) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CaseFileRecord[];
}

export async function listCaseAudio(caseId: string): Promise<CaseAudioRecord[]> {
  const client = await getSupabaseClient("listCaseAudio");
  const { data, error } = await client
    .from("case_audio")
    .select("*")
    .eq("case_id", caseId)
    .order("source_index", { ascending: true })
    .order("uploaded_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...row,
    source_index: typeof (row as { source_index?: unknown }).source_index === "number"
      ? (row as { source_index: number }).source_index
      : 0,
  }));
}

export async function reorderCaseAudio(caseId: string, orderedAudioIds: string[]): Promise<void> {
  const client = await getSupabaseClient("reorderCaseAudio");

  await Promise.all(
    orderedAudioIds.map(async (audioId, sourceIndex) => {
      const { error } = await client
        .from("case_audio")
        .update({ source_index: sourceIndex })
        .eq("case_id", caseId)
        .eq("audio_id", audioId);

      if (error) {
        throw error;
      }
    }),
  );
}

async function ensureCaseRemovalAllowed(client: SupabaseClient<Database>, caseId: string): Promise<void> {
  const extendedClient = getExtendedClient(client);
  const [transcriptResult, certificationResult, jobResult] = await Promise.all([
    client
      .from("transcripts")
      .select("transcript_id", { count: "exact", head: true })
      .eq("case_id", caseId),
    client
      .from("case_certifications")
      .select("case_id", { count: "exact", head: true })
      .eq("case_id", caseId),
    extendedClient
      .from("transcription_jobs")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId),
  ]);

  if (transcriptResult.error) {
    throw transcriptResult.error;
  }
  if (certificationResult.error) {
    throw certificationResult.error;
  }
  if (jobResult.error) {
    throw jobResult.error;
  }

  if ((transcriptResult.count ?? 0) > 0 || (certificationResult.count ?? 0) > 0 || (jobResult.count ?? 0) > 0) {
    throw createProtectedRemovalError(
      "This file can't be removed because the case is already linked to transcript or certification data.",
    );
  }
}

export async function removeCaseFile(caseId: string, fileId: string): Promise<void> {
  const client = await getSupabaseClient("removeCaseFile");
  const extendedClient = getExtendedClient(client);
  await ensureCaseRemovalAllowed(client, caseId);

  const { data: rawFileRow, error: fileError } = await extendedClient
    .from("case_files")
    .select("*")
    .eq("case_id", caseId)
    .eq("file_id", fileId)
    .maybeSingle();
  const fileRow = rawFileRow as CaseFileRecord | null;

  if (fileError) {
    throw fileError;
  }

  if (fileRow?.storage_path) {
    const { error: storageError } = await client.storage
      .from(CASE_FILES_BUCKET)
      .remove([fileRow.storage_path]);

    if (storageError) {
      throw storageError;
    }
  }

  const { error } = await extendedClient
    .from("case_files")
    .delete()
    .eq("case_id", caseId)
    .eq("file_id", fileId);

  if (error) {
    throw error;
  }
}

export async function removeCaseAudio(caseId: string, audioId: string): Promise<void> {
  const client = await getSupabaseClient("removeCaseAudio");
  await ensureCaseRemovalAllowed(client, caseId);

  const { data: audioRow, error: audioError } = await client
    .from("case_audio")
    .select("storage_path")
    .eq("case_id", caseId)
    .eq("audio_id", audioId)
    .maybeSingle();

  if (audioError) {
    throw audioError;
  }

  if (audioRow?.storage_path) {
    const { error: storageError } = await client.storage
      .from(CASE_FILES_BUCKET)
      .remove([audioRow.storage_path]);

    if (storageError) {
      throw storageError;
    }
  }

  const { error } = await client
    .from("case_audio")
    .delete()
    .eq("case_id", caseId)
    .eq("audio_id", audioId);

  if (error) {
    throw error;
  }
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const client = await getSupabaseClient("getSignedUrl");
  const { data, error } = await client.storage
    .from(CASE_FILES_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function downloadCaseFile(storagePath: string, filename: string, mimeType = ""): Promise<File> {
  const client = await getSupabaseClient("downloadCaseFile");
  const { data, error } = await client.storage
    .from(CASE_FILES_BUCKET)
    .download(storagePath);

  if (error) {
    throw error;
  }

  return new File([data], filename, { type: mimeType || data.type || "" });
}

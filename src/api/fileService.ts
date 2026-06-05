import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "../lib/supabase";
import type { Database, Tables } from "../types/database";

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
    };
  };
};

export type CaseAudioRecord = Tables<"case_audio">;

const CASE_FILES_BUCKET = "case-files";
const DOCUMENT_LIMIT_BYTES = 50 * 1024 * 1024;
const TRANSCRIPT_SOURCE_LIMIT_BYTES = 100 * 1024 * 1024;
const AUDIO_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

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
  if (!isAllowedFile(file, AUDIO_EXTENSIONS, AUDIO_MIME_TYPES, AUDIO_LIMIT_BYTES)) {
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
    .replace(/^[_\. -]+|[_\. -]+$/g, "");

  return normalized || "file";
}

export function createFileId(now = Date.now(), random = Math.random()): string {
  const suffix = Math.floor(random * 36 ** 4).toString(36).padStart(4, "0");
  return `f_${now}_${suffix}`;
}

export function buildStoragePath(
  caseId: string,
  category: string,
  fileId: string,
  filename: string,
): string {
  return `cases/${caseId}/${category}/${fileId}_${sanitizeFilename(filename)}`;
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
  const storagePath = buildStoragePath(caseId, fileType, fileId, file.name);
  const checksum = await computeChecksum(file);
  const uploadedBy = await getUploadedBy(client);

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

export async function uploadCaseAudio(caseId: string, file: File): Promise<CaseAudioRecord> {
  validateCaseAudioUpload(file);

  const client = await getSupabaseClient("uploadCaseAudio");
  const fileId = createFileId();
  const storagePath = buildStoragePath(caseId, "audio", fileId, file.name);
  const durationSeconds = await loadAudioDuration(file);

  const { error: uploadError } = await client.storage
    .from(CASE_FILES_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    throw uploadError;
  }

  const row = {
    case_id: caseId,
    audio_id: fileId,
    original_filename: file.name,
    mime_type: file.type || "",
    file_size_bytes: file.size,
    duration_seconds: durationSeconds,
    storage_path: storagePath,
    uploaded_at: new Date().toISOString(),
  };

  const { data, error: insertError } = await client
    .from("case_audio")
    .insert(row)
    .select("*")
    .single();

  if (insertError) {
    await client.storage.from(CASE_FILES_BUCKET).remove([storagePath]);
    throw insertError;
  }

  return data;
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
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function removeCaseFile(caseId: string, fileId: string): Promise<void> {
  const client = await getSupabaseClient("removeCaseFile");
  const extendedClient = getExtendedClient(client);
  const { error } = await extendedClient
    .from("case_files")
    .update({ status: "removed" } as never)
    .eq("case_id", caseId)
    .eq("file_id", fileId);

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

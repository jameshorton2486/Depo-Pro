import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Sparkles, Upload, X } from "lucide-react";

import type { CaseAudioRecord, CaseFileRecord } from "../../api/fileService";
import {
  downloadCaseFile,
  getSignedUrl,
  removeCaseFile,
  uploadCaseAudio,
  uploadCaseFile,
} from "../../api/fileService";
import { useIntake } from "../../context/IntakeContext";
import { useConflict } from "../conflict/conflictStore";
import { extractDocumentText } from "../../lib/parsing/documentText";
import { aiExtract } from "../../lib/parsing/aiExtract";
import { applyExtraction } from "../../lib/parsing/applyExtraction";
import type { CaseAudio, FieldSource } from "../../types/case";

type SlotId = "notice" | "scheduling" | "supporting" | "audio";

type UploadStatus = "idle" | "uploading" | "done" | "error";

type UploadSlotConfig = {
  id: SlotId;
  label: string;
  accept: string;
  description: string;
};

type SlotUiState = {
  status: UploadStatus;
  error: string | null;
};

type ExtractionSummary = {
  appliedCount: number;
  conflictCount: number;
};

type DocumentUploadPanelProps = {
  files: CaseFileRecord[];
  audio: CaseAudioRecord[];
  persisted: boolean;
  ensureCaseSaved: () => Promise<unknown>;
  onAudioUploaded: (audioRecord: CaseAudioRecord) => void;
  onFileUploaded: (fileRecord: CaseFileRecord) => void;
  onFileRemoved: (fileId: string) => void;
  onRevealExtractedFields: () => void;
};

const SLOT_CONFIGS: UploadSlotConfig[] = [
  {
    id: "notice",
    label: "Notice of Deposition",
    accept: ".pdf,.doc,.docx,.txt,.text",
    description: "PDF, Word, or plain text",
  },
  {
    id: "scheduling",
    label: "Scheduling Notes / Job Sheet",
    accept: ".pdf,.doc,.docx,.txt",
    description: "PDF, Word, or plain text",
  },
  {
    id: "supporting",
    label: "Supporting Documents",
    accept: ".pdf,.doc,.docx,.txt,.jpg,.png",
    description: "Any supporting material",
  },
  {
    id: "audio",
    label: "Audio / Video Recording",
    accept: "audio/*,video/*",
    description: "MP3, WAV, MP4, M4A…",
  },
];

function slotFileType(slotId: Exclude<SlotId, "audio">): "notice" | "scheduling" | "supporting" {
  return slotId;
}

function toDisplaySourceFromFieldSource(source: FieldSource): "Notice" | "Job Sheet" | "Reporter Profile" | "Manual" {
  if (source === "extracted") return "Notice";
  if (source === "imported") return "Reporter Profile";
  return "Manual";
}

function toCaseAudioRecord(row: CaseAudioRecord): CaseAudio {
  return {
    audio_id: row.audio_id,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    duration_seconds: row.duration_seconds,
    file_size_bytes: row.file_size_bytes,
    uploaded_at: row.uploaded_at,
    media_url: null,
  };
}

function formatBytes(bytes: number | null): string | null {
  if (bytes == null || Number.isNaN(bytes)) {
    return null;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUploadedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleString();
}

function UploadCard({
  slot,
  status,
  error,
  fileName,
  fileSize,
  uploadedAt,
  viewUrl,
  removable,
  onDrop,
  onRemove,
  children,
}: {
  slot: UploadSlotConfig;
  status: UploadStatus;
  error: string | null;
  fileName: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
  viewUrl: string | null;
  removable: boolean;
  onDrop: (slotId: SlotId, file: File) => void;
  onRemove: (() => void) | null;
  children?: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onDrop(slot.id, files[0]);
  }

  const uploadedLabel = formatUploadedAt(uploadedAt);
  const sizeLabel = formatBytes(fileSize);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition-all ${
        dragging ? "border-blue-400 bg-blue-50/60"
          : status === "done" ? "border-emerald-300 bg-emerald-50/40"
            : status === "error" ? "border-red-300 bg-red-50/40"
              : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={slot.accept}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        {status === "done" ? (
          <CheckCircle2 size={18} className="text-emerald-500" />
        ) : status === "error" ? (
          <AlertTriangle size={18} className="text-red-500" />
        ) : status === "uploading" ? (
          <Clock size={18} className="animate-spin text-blue-500" />
        ) : (
          <Upload size={18} className="text-slate-400 transition-colors group-hover:text-slate-600" />
        )}
      </div>

      <p className="text-center text-xs font-semibold text-slate-700">{slot.label}</p>
      <p className="mt-0.5 text-center text-[11px] text-slate-400">{slot.description}</p>

      {fileName && (
        <div className="mt-2 w-full space-y-1">
          <p className="truncate rounded-md bg-white px-2 py-1 text-center text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            {fileName}
          </p>
          {(sizeLabel || uploadedLabel) && (
            <p className="text-center text-[10px] text-slate-500">
              {[sizeLabel, uploadedLabel].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      )}

      {status === "idle" && !fileName && (
        <p className="mt-2 text-[11px] text-slate-400">
          Drag & drop or <span className="text-blue-600 underline">browse</span>
        </p>
      )}

      {viewUrl && status === "done" && (
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-3 text-[11px] font-semibold text-blue-700 underline"
        >
          View
        </a>
      )}

      {removable && onRemove && status === "done" && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <X size={11} />
          Remove
        </button>
      )}

      {error && (
        <p className="mt-2 text-center text-[11px] text-rose-600">
          {error}
        </p>
      )}

      {children}
    </div>
  );
}

export function DocumentUploadPanel({
  files,
  audio,
  persisted,
  ensureCaseSaved,
  onAudioUploaded,
  onFileUploaded,
  onFileRemoved,
  onRevealExtractedFields,
}: DocumentUploadPanelProps) {
  const { record, applyExtraction: applyParsedExtraction, setAudio } = useIntake();
  const { detectConflict, recordExtraction } = useConflict();
  const [slotUi, setSlotUi] = useState<Partial<Record<SlotId, SlotUiState>>>({});
  const [localFiles, setLocalFiles] = useState<Partial<Record<SlotId, File>>>({});
  const [viewUrls, setViewUrls] = useState<Partial<Record<SlotId, string>>>({});
  const [extractingNotice, setExtractingNotice] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSummary, setExtractSummary] = useState<ExtractionSummary | null>(null);

  const currentFiles = useMemo(() => ({
    notice: files.find((file) => file.file_type === "notice") ?? null,
    scheduling: files.find((file) => file.file_type === "scheduling") ?? null,
    supporting: files.find((file) => file.file_type === "supporting") ?? null,
    audio: audio[0] ?? null,
  }), [audio, files]);

  useEffect(() => {
    let cancelled = false;

    async function resolveViewUrls() {
      const nextEntries = await Promise.all(
        SLOT_CONFIGS.map(async (slot) => {
          const asset = currentFiles[slot.id];
          if (!asset?.storage_path) {
            return [slot.id, undefined] as const;
          }
          try {
            const signedUrl = await getSignedUrl(asset.storage_path);
            return [slot.id, signedUrl] as const;
          } catch {
            return [slot.id, undefined] as const;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setViewUrls(Object.fromEntries(nextEntries) as Partial<Record<SlotId, string>>);
    }

    void resolveViewUrls();

    return () => {
      cancelled = true;
    };
  }, [currentFiles]);

  async function ensureUploadPrecondition() {
    if (!persisted) {
      await ensureCaseSaved();
    }
  }

  async function handleDrop(slotId: SlotId, file: File) {
    setSlotUi((previous) => ({
      ...previous,
      [slotId]: { status: "uploading", error: null },
    }));

    try {
      await ensureUploadPrecondition();

      if (slotId === "audio") {
        const uploadedAudio = await uploadCaseAudio(record.case_id, file);
        onAudioUploaded(uploadedAudio);
        setAudio(toCaseAudioRecord(uploadedAudio));
        setLocalFiles((previous) => ({ ...previous, [slotId]: file }));

        if (uploadedAudio.storage_path) {
          const signedUrl = await getSignedUrl(uploadedAudio.storage_path);
          setViewUrls((previous) => ({ ...previous, [slotId]: signedUrl }));
        }
      } else {
        const uploadedFile = await uploadCaseFile(record.case_id, file, slotFileType(slotId));
        onFileUploaded(uploadedFile);
        setLocalFiles((previous) => ({ ...previous, [slotId]: file }));

        if (uploadedFile.storage_path) {
          const signedUrl = await getSignedUrl(uploadedFile.storage_path);
          setViewUrls((previous) => ({ ...previous, [slotId]: signedUrl }));
        }
      }

      setSlotUi((previous) => ({
        ...previous,
        [slotId]: { status: "done", error: null },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setSlotUi((previous) => ({
        ...previous,
        [slotId]: { status: "error", error: message },
      }));
    }
  }

  async function handleRemove(slotId: Exclude<SlotId, "audio">) {
    const currentFile = currentFiles[slotId];
    if (!currentFile) {
      return;
    }

    setSlotUi((previous) => ({
      ...previous,
      [slotId]: { status: "uploading", error: null },
    }));

    try {
      await removeCaseFile(record.case_id, currentFile.file_id);
      onFileRemoved(currentFile.file_id);
      setLocalFiles((previous) => {
        const next = { ...previous };
        delete next[slotId];
        return next;
      });
      setViewUrls((previous) => {
        const next = { ...previous };
        delete next[slotId];
        return next;
      });
      setSlotUi((previous) => ({
        ...previous,
        [slotId]: { status: "idle", error: null },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Remove failed.";
      setSlotUi((previous) => ({
        ...previous,
        [slotId]: { status: "error", error: message },
      }));
    }
  }

  async function getNoticeFile(): Promise<File | null> {
    const localNotice = localFiles.notice;
    if (localNotice) {
      return localNotice;
    }

    const storedNotice = currentFiles.notice;
    if (!storedNotice) {
      return null;
    }

    return downloadCaseFile(
      storedNotice.storage_path,
      storedNotice.original_filename,
      storedNotice.mime_type,
    );
  }

  async function handleExtractNotice() {
    const noticeFile = await getNoticeFile();
    if (!noticeFile) return;

    setExtractingNotice(true);
    setExtractError(null);
    setExtractSummary(null);

    try {
      const text = await extractDocumentText(noticeFile);
      const extraction = await aiExtract(text, "nod");
      if ("error" in extraction) {
        throw new Error(`Extraction failed: ${extraction.error}. You can enter fields manually.`);
      }

      const application = applyExtraction(extraction.fields, record);

      applyParsedExtraction(application);

      for (const update of application.fieldUpdates) {
        recordExtraction(record.case_id, update.path, update.label, String(update.value), "Notice", update.confidence_score);
      }

      for (const conflict of application.conflicts) {
        detectConflict(
          record.case_id,
          conflict.path,
          conflict.label,
          {
            value: conflict.currentValue,
            source: toDisplaySourceFromFieldSource(conflict.currentSource),
            confidence_score: null,
          },
          {
            value: conflict.incomingValue,
            source: "Notice",
            confidence_score: conflict.incomingConfidence,
          },
        );
      }

      setExtractSummary({
        appliedCount:
          application.fieldUpdates.length +
          application.attorneyAdds.length +
          application.attorneyPatches.length +
          application.witnessAdds.length +
          application.witnessPatches.length,
        conflictCount: application.conflicts.length,
      });
      onRevealExtractedFields();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document extraction failed.";
      setExtractError(message.startsWith("Extraction failed:") ? message : `Extraction failed: ${message}. You can enter fields manually.`);
    } finally {
      setExtractingNotice(false);
    }
  }

  const hasAudio = Boolean(currentFiles.audio);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Upload size={14} className="text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Document Intake</span>
        </div>
        {hasAudio && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 size={12} />
            Audio ready
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {SLOT_CONFIGS.map((slot) => {
          const currentAsset = currentFiles[slot.id];
          const localFile = localFiles[slot.id] ?? null;
          const ui = slotUi[slot.id];
          const status = ui?.status ?? (currentAsset ? "done" : "idle");
          const error = ui?.error ?? null;
          const fileName = localFile?.name ?? currentAsset?.original_filename ?? null;
          const fileSize = localFile?.size ?? currentAsset?.file_size_bytes ?? null;
          const uploadedAt = currentAsset?.uploaded_at ?? null;
          const removable = slot.id !== "audio" && Boolean(currentAsset);

          return (
            <UploadCard
              key={slot.id}
              slot={slot}
              status={status}
              error={error}
              fileName={fileName}
              fileSize={fileSize}
              uploadedAt={uploadedAt}
              viewUrl={viewUrls[slot.id] ?? null}
              removable={removable}
              onDrop={(slotId, file) => {
                void handleDrop(slotId, file);
              }}
              onRemove={slot.id === "audio" ? null : () => {
                void handleRemove(slot.id as Exclude<SlotId, "audio">);
              }}
            >
              {slot.id === "notice" && fileName ? (
                <div className="mt-3 w-full space-y-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleExtractNotice();
                    }}
                    disabled={extractingNotice}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles size={13} />
                    {extractingNotice ? "Extracting..." : "Extract from Document"}
                  </button>
                  {extractSummary && (
                    <p className="text-center text-[11px] text-slate-600">
                      Extracted {extractSummary.appliedCount} fields, {extractSummary.conflictCount} conflicts to resolve
                    </p>
                  )}
                  {extractError && (
                    <p className="text-center text-[11px] text-rose-600">
                      {extractError}
                    </p>
                  )}
                </div>
              ) : null}
            </UploadCard>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Clock, Sparkles, Upload, X } from "lucide-react";

import type { CaseAudioRecord, CaseFileRecord } from "../../api/fileService";
import {
  downloadCaseFile,
  getSignedUrl,
  reorderCaseAudio,
  removeCaseFile,
  uploadCaseAudio,
  uploadCaseFile,
} from "../../api/fileService";
import { useIntake } from "../../context/useIntake";
import { useConflict } from "../conflict/conflictStore";
import { useKeyterms } from "../DeepgramKeytermManager/keytermStore";
import { extractDocumentText } from "../../lib/parsing/documentText";
import { aiExtract } from "../../lib/parsing/aiExtract";
import { applyExtraction } from "../../lib/parsing/applyExtraction";
import { applyJobSheetExtraction } from "../../lib/parsing/applyJobSheetExtraction";
import { parseReporterNotes } from "../../lib/parsing/reporterNotesParser";
import type { CaseAudio } from "../../types/case";
import type { FieldProvenanceRow, ProvenanceEventType } from "../conflict/types";
import { intakeReducer } from "../../store/intakeReducer";
import { harvestKeyterms } from "../../lib/keyterms/harvestKeyterms";
import { mergeManagedKeytermSuggestions, serializeManagedKeyterms } from "../../lib/keyterms/managedKeyterms";
import { applyAndPersistExtraction, type ExtractionSummary } from "./extractionPersistence";

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

type DocumentUploadPanelProps = {
  files: CaseFileRecord[];
  audio: CaseAudioRecord[];
  persisted: boolean;
  saveCaseRecord: () => Promise<unknown>;
  onAudioUploaded: (audioRecord: CaseAudioRecord) => void;
  onAudioReordered: (audioRecords: CaseAudioRecord[]) => void;
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

const DOCUMENT_SLOT_IDS: Array<Exclude<SlotId, "audio">> = ["notice", "scheduling", "supporting"];

function slotFileType(slotId: Exclude<SlotId, "audio">): "notice" | "scheduling" | "supporting" {
  return slotId;
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
  saveCaseRecord,
  onAudioUploaded,
  onAudioReordered,
  onFileUploaded,
  onFileRemoved,
  onRevealExtractedFields,
}: DocumentUploadPanelProps) {
  const { record, applyExtraction: applyParsedExtraction, setAudio, setKeyterms } = useIntake();
  const { state: conflictState, detectConflict, recordExtraction } = useConflict();
  const { state: keytermState, load: loadKeyterms } = useKeyterms();
  const [slotUi, setSlotUi] = useState<Partial<Record<SlotId, SlotUiState>>>({});
  const [localFiles, setLocalFiles] = useState<Partial<Record<SlotId, File>>>({});
  const [viewUrls, setViewUrls] = useState<Partial<Record<SlotId, string>>>({});
  const [audioViewUrls, setAudioViewUrls] = useState<Record<string, string>>({});
  const [extractingSlot, setExtractingSlot] = useState<SlotId | null>(null);
  const [extractErrors, setExtractErrors] = useState<Partial<Record<SlotId, string | null>>>({});
  const [extractSummaries, setExtractSummaries] = useState<Partial<Record<SlotId, ExtractionSummary | null>>>({});
  const [reorderingAudioId, setReorderingAudioId] = useState<string | null>(null);

  const currentFiles = useMemo(() => ({
    notice: files.find((file) => file.file_type === "notice") ?? null,
    scheduling: files.find((file) => file.file_type === "scheduling") ?? null,
    supporting: files.find((file) => file.file_type === "supporting") ?? null,
  }), [audio, files]);
  const orderedAudio = useMemo(
    () => [...audio].sort((left, right) => left.source_index - right.source_index || (left.uploaded_at ?? "").localeCompare(right.uploaded_at ?? "")),
    [audio],
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveViewUrls() {
      const nextEntries = await Promise.all(
        DOCUMENT_SLOT_IDS.map(async (slotId) => {
          const asset = currentFiles[slotId];
          if (!asset?.storage_path) {
            return [slotId, undefined] as const;
          }
          try {
            const signedUrl = await getSignedUrl(asset.storage_path);
            return [slotId, signedUrl] as const;
          } catch {
            return [slotId, undefined] as const;
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

  useEffect(() => {
    let cancelled = false;

    async function resolveAudioViewUrls() {
      const nextEntries = await Promise.all(
        orderedAudio.map(async (audioRecord) => {
          if (!audioRecord.storage_path) {
            return [audioRecord.audio_id, ""] as const;
          }
          try {
            const signedUrl = await getSignedUrl(audioRecord.storage_path);
            return [audioRecord.audio_id, signedUrl] as const;
          } catch {
            return [audioRecord.audio_id, ""] as const;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setAudioViewUrls(
        Object.fromEntries(nextEntries.filter(([, value]) => Boolean(value))),
      );
    }

    void resolveAudioViewUrls();

    return () => {
      cancelled = true;
    };
  }, [orderedAudio]);

  async function ensureUploadPrecondition() {
    if (!persisted) {
      await saveCaseRecord();
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

  async function getSlotFile(slotId: Exclude<SlotId, "audio">): Promise<File | null> {
    const local = localFiles[slotId];
    if (local) {
      return local;
    }

    const storedFile = currentFiles[slotId];
    if (!storedFile) {
      return null;
    }

    return downloadCaseFile(
      storedFile.storage_path,
      storedFile.original_filename,
      storedFile.mime_type,
    );
  }

  function setExtractState(slotId: SlotId, error: string | null, summary: ExtractionSummary | null) {
    setExtractErrors((previous) => ({ ...previous, [slotId]: error }));
    setExtractSummaries((previous) => ({ ...previous, [slotId]: summary }));
  }

  function currentProvenanceRows(): FieldProvenanceRow[] {
    return Object.values(conflictState.history).flat();
  }

  function buildExtractionProvenanceRows(
    caseId: string,
    sourceLabel: "Notice" | "Job Sheet",
    application: ReturnType<typeof applyExtraction> | ReturnType<typeof applyJobSheetExtraction>["application"],
  ): FieldProvenanceRow[] {
    const rows: FieldProvenanceRow[] = [];
    const now = new Date().toISOString();
    const eventType: ProvenanceEventType = "extracted";

    for (const update of application.fieldUpdates) {
      rows.push({
        id: `preview_${update.path}`,
        case_id: caseId,
        field_path: update.path,
        field_label: update.label,
        event_type: eventType,
        value: String(update.value ?? ""),
        source: sourceLabel,
        winning_value: null,
        rejected_value: null,
        rejected_source: null,
        confidence_score: update.confidence_score,
        resolution_user: "reporter",
        resolved_at: now,
      });
    }

    for (const conflict of application.conflicts) {
      rows.push({
        id: `preview_conflict_${conflict.path}`,
        case_id: caseId,
        field_path: conflict.path,
        field_label: conflict.label,
        event_type: "conflict_detected",
        value: conflict.currentValue,
        source: sourceLabel,
        winning_value: null,
        rejected_value: conflict.incomingValue,
        rejected_source: sourceLabel,
        confidence_score: conflict.incomingConfidence,
        resolution_user: "reporter",
        resolved_at: now,
      });
    }

    return rows;
  }

  function mergeHarvestedSuggestions(
    sourceLabel: "Notice" | "Job Sheet",
    application: ReturnType<typeof applyExtraction> | ReturnType<typeof applyJobSheetExtraction>["application"],
  ) {
    const nextState = previewExtractionState(application);
    const suggestions = harvestKeyterms(
      nextState.record,
      [...buildExtractionProvenanceRows(record.case_id, sourceLabel, application), ...currentProvenanceRows()],
    );
    const mergedTerms = mergeManagedKeytermSuggestions(keytermState.terms, suggestions);
    loadKeyterms(mergedTerms);
    setKeyterms(serializeManagedKeyterms(mergedTerms));
  }

  async function moveAudio(audioId: string, direction: -1 | 1) {
    const currentIndex = orderedAudio.findIndex((entry) => entry.audio_id === audioId);
    const targetIndex = currentIndex + direction;
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= orderedAudio.length) {
      return;
    }

    const nextAudio = [...orderedAudio];
    const [moved] = nextAudio.splice(currentIndex, 1);
    nextAudio.splice(targetIndex, 0, moved);
    const reordered = nextAudio.map((entry, sourceIndex) => ({ ...entry, source_index: sourceIndex }));

    setReorderingAudioId(audioId);
    setSlotUi((previous) => ({
      ...previous,
      audio: { status: "uploading", error: null },
    }));

    try {
      await reorderCaseAudio(record.case_id, reordered.map((entry) => entry.audio_id));
      onAudioReordered(reordered);
      setSlotUi((previous) => ({
        ...previous,
        audio: { status: "done", error: null },
      }));
    } catch (error) {
      setSlotUi((previous) => ({
        ...previous,
        audio: {
          status: "error",
          error: error instanceof Error ? error.message : "Could not reorder audio sources.",
        },
      }));
    } finally {
      setReorderingAudioId(null);
    }
  }

  function previewExtractionState(
    application: ReturnType<typeof applyExtraction> | ReturnType<typeof applyJobSheetExtraction>["application"],
  ) {
    return intakeReducer(
      {
        record,
        dirty: false,
        last_saved_at: null,
        editSeq: 0,
      },
      {
        type: "APPLY_EXTRACTION",
        payload: {
          fieldUpdates: application.fieldUpdates,
          attorneyAdds: application.attorneyAdds,
          attorneyPatches: application.attorneyPatches,
          witnessAdds: application.witnessAdds,
          witnessPatches: application.witnessPatches,
          partyAdds: application.partyAdds,
          partyPatches: application.partyPatches,
          lawFirmAdds: application.lawFirmAdds,
          lawFirmPatches: application.lawFirmPatches,
        },
      },
    );
  }

  async function runNoticeExtraction(file: File, slotId: SlotId) {
    try {
      const text = await extractDocumentText(file);
      const extraction = await aiExtract(text, "nod");
      if ("error" in extraction) {
        throw new Error(`Extraction failed: ${extraction.error}. You can enter fields manually.`);
      }

      const application = applyExtraction(extraction.fields, record);
      const nextState = previewExtractionState(application);

      const result = await applyAndPersistExtraction({
        caseId: record.case_id,
        application,
        applyParsedExtraction,
        recordExtraction,
        detectConflict,
        onRevealExtractedFields,
        saveCaseRecord,
        recordToSave: nextState.record,
        sourceLabel: "Notice",
      });
      mergeHarvestedSuggestions("Notice", application);

      setExtractState(slotId, result.saveErrorMessage, result.summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document extraction failed.";
      setExtractState(slotId, message.startsWith("Extraction failed:") ? message : `Extraction failed: ${message}. You can enter fields manually.`, null);
      throw error;
    }
  }

  async function runJobSheetExtraction(file: File, slotId: SlotId) {
    const text = await extractDocumentText(file);
    const parsed = parseReporterNotes(text);
    const { application, droppedPaths } = applyJobSheetExtraction(parsed, record);
    const nextState = previewExtractionState(application);

    const result = await applyAndPersistExtraction({
      caseId: record.case_id,
      application,
      applyParsedExtraction,
      recordExtraction,
      detectConflict,
      onRevealExtractedFields,
      saveCaseRecord,
      recordToSave: nextState.record,
      sourceLabel: "Job Sheet",
    });
    mergeHarvestedSuggestions("Job Sheet", application);

    console.info("[DEPO-PRO] Job Sheet extraction filtered unsupported fields", {
      caseId: record.case_id,
      slotId,
      droppedCount: droppedPaths.length,
      droppedPaths,
    });

    setExtractState(slotId, result.saveErrorMessage, result.summary);
  }

  async function handleExtract(slotId: Exclude<SlotId, "audio">, mode: "notice" | "job_sheet") {
    const file = await getSlotFile(slotId);
    if (!file) {
      return;
    }

    setExtractingSlot(slotId);
    setExtractState(slotId, null, null);

    try {
      if (mode === "notice") {
        await runNoticeExtraction(file, slotId);
      } else {
        await runJobSheetExtraction(file, slotId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document extraction failed.";
      setExtractState(
        slotId,
        message.startsWith("Extraction failed:") ? message : `Extraction failed: ${message}. You can enter fields manually.`,
        null,
      );
    } finally {
      setExtractingSlot(null);
    }
  }

  const hasAudio = orderedAudio.length > 0;

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
          const currentAsset = slot.id === "audio" ? null : currentFiles[slot.id];
          const localFile = localFiles[slot.id] ?? null;
          const ui = slotUi[slot.id];
          const status = ui?.status ?? (slot.id === "audio" ? (hasAudio ? "done" : "idle") : (currentAsset ? "done" : "idle"));
          const error = ui?.error ?? null;
          const fileName = slot.id === "audio"
            ? (hasAudio ? `${orderedAudio.length} source file${orderedAudio.length === 1 ? "" : "s"} attached` : localFile?.name ?? null)
            : localFile?.name ?? currentAsset?.original_filename ?? null;
          const fileSize = slot.id === "audio"
            ? orderedAudio.reduce((sum, entry) => sum + (entry.file_size_bytes ?? 0), 0)
            : localFile?.size ?? currentAsset?.file_size_bytes ?? null;
          const uploadedAt = slot.id === "audio"
            ? (orderedAudio.length > 0 ? orderedAudio[orderedAudio.length - 1].uploaded_at : null)
            : currentAsset?.uploaded_at ?? null;
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
              {slot.id === "audio" && orderedAudio.length > 0 ? (
                <div className="mt-3 w-full space-y-2">
                  {orderedAudio.map((audioRecord, index) => (
                    <div
                      key={audioRecord.audio_id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-slate-700">
                            {index + 1}. {audioRecord.original_filename}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {[
                              audioRecord.mime_type || "audio",
                              audioRecord.duration_seconds ? `${audioRecord.duration_seconds.toFixed(1)}s` : null,
                              formatBytes(audioRecord.file_size_bytes),
                            ].filter(Boolean).join(" · ")}
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-emerald-700">
                            Ready for transcription
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0 || reorderingAudioId === audioRecord.audio_id}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void moveAudio(audioRecord.audio_id, -1);
                            }}
                            className="rounded-md border border-slate-200 bg-slate-50 p-1 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={index === orderedAudio.length - 1 || reorderingAudioId === audioRecord.audio_id}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void moveAudio(audioRecord.audio_id, 1);
                            }}
                            className="rounded-md border border-slate-200 bg-slate-50 p-1 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>
                      {audioViewUrls[audioRecord.audio_id] ? (
                        <a
                          href={audioViewUrls[audioRecord.audio_id]}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="mt-2 inline-flex text-[11px] font-semibold text-blue-700 underline"
                        >
                          View source
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {(slot.id === "notice" || slot.id === "scheduling" || slot.id === "supporting") && fileName ? (
                <div className="mt-3 w-full space-y-2">
                  {slot.id === "supporting" ? (
                    <div className="space-y-2">
                      <p className="text-center text-[11px] font-medium text-slate-500">
                        Choose how to treat this supporting document.
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleExtract("supporting", "notice");
                        }}
                        disabled={extractingSlot !== null}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Sparkles size={13} />
                        {extractingSlot === "supporting" ? "Extracting..." : "Extract as Notice"}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleExtract("supporting", "job_sheet");
                        }}
                        disabled={extractingSlot !== null}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Sparkles size={13} />
                        {extractingSlot === "supporting" ? "Extracting..." : "Extract as Job Sheet"}
                      </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleExtract(slot.id as Exclude<SlotId, "audio">, slot.id === "notice" ? "notice" : "job_sheet");
                      }}
                      disabled={extractingSlot !== null}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        slot.id === "notice"
                          ? "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          : "border border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                      }`}
                    >
                      <Sparkles size={13} />
                      {extractingSlot === slot.id ? "Extracting..." : "Extract from Document"}
                    </button>
                  )}
                  {extractSummaries[slot.id] && (
                    <p className="text-center text-[11px] text-slate-600">
                      Extracted {extractSummaries[slot.id]?.appliedCount} fields, {extractSummaries[slot.id]?.conflictCount} conflicts to resolve
                    </p>
                  )}
                  {extractErrors[slot.id] && (
                    <p className="text-center text-[11px] text-rose-600">
                      {extractErrors[slot.id]}
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

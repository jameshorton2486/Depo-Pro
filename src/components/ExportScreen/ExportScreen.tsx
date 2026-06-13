import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Download, FileArchive, FileText } from "lucide-react";
import { useDocument } from "../../context/DocumentContext";
import { useIntake } from "../../context/useIntake";
import { useStage } from "../../context/StageContext";
import { loadOrderedTranscriptSnapshotsForCase } from "../../api/transcriptRepository";
import type { EditorDocument } from "../../api/types";
import { buildExportTranscriptText, countExportWords, type ExportSegmentDocument } from "./exportAssembly";
import { buildTranscriptDocxBlob, inferSpeakerRole } from "./docxFormatter";

interface GeneratedArtifact {
  name: string;
  type: string;
  size: number;
}

function certificationKey(jobId: string) {
  return `depo-pro.certification.${jobId}.v1`;
}

function downloadBlob(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return { name: filename, type, size: blob.size };
}

function downloadExistingBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return {
    name: filename,
    type: blob.type || "application/octet-stream",
    size: blob.size,
  };
}

export function ExportScreen({ jobId }: { jobId: string }) {
  const { state: docState } = useDocument();
  const { record } = useIntake();
  const { setStage } = useStage();
  const [lastArtifact, setLastArtifact] = useState<GeneratedArtifact | null>(null);
  const [exportSegments, setExportSegments] = useState<ExportSegmentDocument[]>([]);
  const [loadingExport, setLoadingExport] = useState(true);
  const [exportError, setExportError] = useState<string | null>(null);

  const certificationReady = useMemo(() => {
    try {
      const raw = localStorage.getItem(certificationKey(jobId));
      if (!raw) return false;
      const parsed = JSON.parse(raw) as {
        certificationStatement?: string;
        checklist?: Record<string, boolean>;
      };
      return !!parsed.certificationStatement?.trim() &&
        Object.values(parsed.checklist ?? {}).every(Boolean);
    } catch {
      return false;
    }
  }, [jobId]);

  useEffect(() => {
    let cancelled = false;

    async function loadExportSegments() {
      setLoadingExport(true);
      setExportError(null);
      try {
        const snapshots = await loadOrderedTranscriptSnapshotsForCase(jobId);
        if (cancelled) {
          return;
        }

        setExportSegments(snapshots.map((snapshot) => ({
          transcriptId: snapshot.job.transcript_id,
          sequenceIndex: snapshot.job.sequence_index,
          sourceFilename: snapshot.job.source_filename,
          document: buildEditorDocumentFromSnapshot(snapshot),
        })));
      } catch (error) {
        if (!cancelled) {
          setExportError(error instanceof Error ? error.message : "Could not load ordered transcript segments.");
          setExportSegments(docState.document ? [{
            transcriptId: docState.document.job_id,
            sequenceIndex: 0,
            sourceFilename: null,
            document: docState.document,
          }] : []);
        }
      } finally {
        if (!cancelled) {
          setLoadingExport(false);
        }
      }
    }

    void loadExportSegments();
    return () => {
      cancelled = true;
    };
  }, [docState.document, jobId]);

  const transcriptText = useMemo(
    () => buildExportTranscriptText(exportSegments),
    [exportSegments],
  );

  const exportWordCount = useMemo(
    () => countExportWords(exportSegments),
    [exportSegments],
  );

  const packageJson = useMemo(
    () =>
      JSON.stringify(
        {
          job_id: docState.document?.job_id ?? jobId,
          case_name: record.caption.case_name.value,
          case_number: record.caption.case_number.value,
          generated_at: new Date().toISOString(),
          transcript_text: transcriptText,
          word_count: exportWordCount,
        },
        null,
        2
      ),
    [exportWordCount, jobId, record.caption.case_name.value, record.caption.case_number.value, transcriptText]
  );

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <FileArchive size={18} className="text-blue-700" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage 7</p>
            <h1 className="text-lg font-semibold text-slate-900">Export</h1>
          </div>
          <span className="ml-auto text-xs text-slate-500">{record.caption.case_name.value || jobId}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-4xl space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Export Status</h2>
            <p className="text-sm text-slate-600">
              {certificationReady
                ? "Certification is complete. Export actions are enabled."
                : "Certification must be completed before export actions can be used."}
            </p>
            {loadingExport && (
              <p className="mt-2 text-sm text-slate-500">Loading ordered transcript segments…</p>
            )}
            {exportError && (
              <p className="mt-2 text-sm text-amber-700">
                Export used the current workspace segment because the full ordered segment load failed: {exportError}
              </p>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">TXT Transcript</h2>
              </div>
              <p className="mb-4 text-sm text-slate-600">
                Export the current transcript as plain text.
              </p>
              <button
                type="button"
                disabled={!certificationReady || loadingExport || exportSegments.length === 0}
                onClick={() =>
                  setLastArtifact(
                    downloadBlob(
                      `${jobId}-transcript.txt`,
                      "text/plain;charset=utf-8",
                      transcriptText
                    )
                  )
                }
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={13} />
                Export TXT
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileArchive size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Transcript Package</h2>
              </div>
              <p className="mb-4 text-sm text-slate-600">
                Export a local JSON package containing transcript metadata and text.
              </p>
              <button
                type="button"
                disabled={!certificationReady || loadingExport || exportSegments.length === 0}
                onClick={() =>
                  setLastArtifact(
                    downloadBlob(
                      `${jobId}-package.json`,
                      "application/json;charset=utf-8",
                      packageJson
                    )
                  )
                }
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={13} />
                Export Package
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">DOCX Transcript</h2>
              </div>
              <p className="mb-4 text-sm text-slate-600">
                Export the ordered transcript as a DOCX file with Q/A tab formatting.
              </p>
              <button
                type="button"
                disabled={!certificationReady || loadingExport || exportSegments.length === 0}
                onClick={async () => {
                  const blob = await buildTranscriptDocxBlob(exportSegments);
                  setLastArtifact(
                    downloadExistingBlob(
                      `${jobId}-transcript.docx`,
                      blob,
                    ),
                  );
                }}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={13} />
                Export DOCX
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Other Formats</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>PDF: not implemented in this local remediation pass</li>
            </ul>
          </section>

          {lastArtifact && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-emerald-800">Last Generated Output</h2>
              <p className="text-sm text-emerald-700">
                {lastArtifact.name} ({lastArtifact.type}, {lastArtifact.size} bytes)
              </p>
            </section>
          )}
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            type="button"
            onClick={() => setStage("certification")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft size={13} />
            Back to Certification
          </button>
        </div>
      </footer>
    </div>
  );
}

function buildEditorDocumentFromSnapshot(snapshot: Awaited<ReturnType<typeof loadOrderedTranscriptSnapshotsForCase>>[number]): EditorDocument {
  const wordIdsByUtterance = new Map<string, string[]>();
  for (const word of snapshot.words) {
    if (word.removed) {
      continue;
    }
    const ids = wordIdsByUtterance.get(word.utterance_id) ?? [];
    ids.push(word.word_id);
    wordIdsByUtterance.set(word.utterance_id, ids);
  }

  return {
    job_id: snapshot.job.transcript_id,
    media_url: snapshot.job.media_url ?? "",
    duration: snapshot.job.duration_seconds ?? snapshot.job.duration ?? 0,
    speakers: snapshot.speakers.map((speaker) => ({
      speaker_id: speaker.speaker_id,
      display_name: speaker.assigned_name || speaker.speaker_label || speaker.display_name,
      deepgram_speaker: speaker.speaker_index ?? speaker.deepgram_speaker,
      role: inferSpeakerRole(speaker.speaker_role || speaker.role),
    })),
    utterances: snapshot.utterances.map((utterance) => ({
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      start_time: utterance.start_time,
      end_time: utterance.end_time,
      word_ids: wordIdsByUtterance.get(utterance.utterance_id) ?? [],
    })),
    words: snapshot.words
      .filter((word) => !word.removed)
      .map((word) => ({
        word_id: word.word_id,
        text: word.working_text ?? word.raw_text,
        raw_text: word.raw_text,
        speaker_id: word.speaker_id,
        utterance_id: word.utterance_id,
        start_time: word.start_time,
        end_time: word.end_time,
        confidence: word.confidence,
        reviewed: word.reviewed,
        edited: Boolean(word.working_text && word.working_text !== word.raw_text),
      })),
  };
}

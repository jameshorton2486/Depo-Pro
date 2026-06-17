import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mic, RefreshCw, Sparkles } from "lucide-react";

import type { CaseAudioRecord } from "../api/fileService";
import type { TranscriptJobRow } from "../api/transcriptRepository";
import type { TranscriptionJobRecord } from "../lib/transcriptionJobs";
import { listCaseAudio } from "../api/fileService";
import { listTranscriptionJobs, startTranscription } from "../api/transcriptionService";
import { listTranscriptJobs as listSegmentTranscripts } from "../api/transcriptRepository";
import { saveCase } from "../api/caseService";
import { useIntake } from "../context/useIntake";
import { useStage } from "../context/StageContext";
import { isMockMode } from "../lib/runtime/mode";

export type SourceTranscriptStatus = "completed" | "processing" | "queued" | "failed" | "pending";

export interface SourceTranscriptRow {
  audioId: string;
  sourceIndex: number;
  originalFilename: string;
  mimeType: string;
  durationSeconds: number | null;
  transcriptId: string | null;
  status: SourceTranscriptStatus;
}

export function hasCompletedTranscriptRow(transcriptRows: TranscriptJobRow[]): boolean {
  return transcriptRows.some((row) => row.status === "completed");
}

function compareByUpdatedAtDesc(left: { updated_at: string }, right: { updated_at: string }) {
  return right.updated_at.localeCompare(left.updated_at);
}

function normalizePendingStatus(job: TranscriptionJobRecord | undefined): Exclude<SourceTranscriptStatus, "completed" | "pending"> | "pending" {
  if (!job) {
    return "pending";
  }

  if (job.status === "complete") {
    return "pending";
  }

  return job.status;
}

export function buildSourceTranscriptRows(
  audioRows: CaseAudioRecord[],
  transcriptRows: TranscriptJobRow[],
  transcriptionJobs: TranscriptionJobRecord[],
): SourceTranscriptRow[] {
  const orderedAudio = audioRows
    .slice()
    .sort(
      (left, right) =>
        left.source_index - right.source_index
        || (left.uploaded_at ?? "").localeCompare(right.uploaded_at ?? ""),
    );

  const transcriptBySequence = new Map<number, TranscriptJobRow>();
  for (const transcript of transcriptRows
    .slice()
    .sort((left, right) => left.sequence_index - right.sequence_index || compareByUpdatedAtDesc(left, right))) {
    if (!transcriptBySequence.has(transcript.sequence_index)) {
      transcriptBySequence.set(transcript.sequence_index, transcript);
    }
  }

  const jobBySourceIndex = new Map<number, TranscriptionJobRecord>();
  for (const job of transcriptionJobs.slice().sort(compareByUpdatedAtDesc)) {
    if (job.source_index == null || jobBySourceIndex.has(job.source_index)) {
      continue;
    }
    jobBySourceIndex.set(job.source_index, job);
  }

  return orderedAudio.map((audioRow) => {
    const transcript = transcriptBySequence.get(audioRow.source_index);
    const job = jobBySourceIndex.get(audioRow.source_index);

    return {
      audioId: audioRow.audio_id,
      sourceIndex: audioRow.source_index,
      originalFilename: audioRow.original_filename,
      mimeType: audioRow.mime_type,
      durationSeconds: audioRow.duration_seconds,
      transcriptId: transcript?.transcript_id ?? null,
      status: transcript?.status === "completed" ? "completed" : normalizePendingStatus(job),
    };
  });
}

function statusLabel(status: SourceTranscriptStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "processing":
      return "Processing";
    case "queued":
      return "Queued";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
  }
}

function statusClasses(status: SourceTranscriptStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "processing":
      return "bg-blue-100 text-blue-700";
    case "queued":
      return "bg-amber-100 text-amber-700";
    case "failed":
      return "bg-rose-100 text-rose-700";
    case "pending":
      return "bg-slate-100 text-slate-600";
  }
}

export function TranscriptCreationScreen({ caseId }: { caseId: string }) {
  const { record } = useIntake();
  const { setStage } = useStage();
  const [audioRows, setAudioRows] = useState<CaseAudioRecord[]>([]);
  const [jobs, setJobs] = useState<TranscriptionJobRecord[]>([]);
  const [transcriptRows, setTranscriptRows] = useState<TranscriptJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const advancedJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCreationState() {
      setLoading(true);
      setError(null);
      try {
        const [nextAudioRows, transcriptJobs, nextTranscriptRows] = await Promise.all([
          listCaseAudio(caseId),
          listTranscriptionJobs(caseId),
          listSegmentTranscripts(caseId),
        ]);

        if (!cancelled) {
          setAudioRows(nextAudioRows);
          setJobs(transcriptJobs);
          setTranscriptRows(nextTranscriptRows);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load transcript creation state.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCreationState();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    const activeJob = jobs.find((job) => job.status === "queued" || job.status === "processing") ?? null;
    if (!activeJob) {
      return;
    }

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const [nextJobs, nextTranscriptRows] = await Promise.all([
            listTranscriptionJobs(caseId),
            listSegmentTranscripts(caseId),
          ]);
          if (!cancelled) {
            setJobs(nextJobs);
            setTranscriptRows(nextTranscriptRows);
          }
        } catch (pollError) {
          if (!cancelled) {
            setError(pollError instanceof Error ? pollError.message : "Could not refresh transcription job state.");
          }
        }
      })();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [caseId, jobs]);

  const hasCompletedTranscript = hasCompletedTranscriptRow(transcriptRows);

  const openWorkspace = useCallback(async () => {
    if (!hasCompletedTranscript) {
      setError("Transcript is not ready for the workspace yet. Wait for the completed transcript row to appear.");
      return;
    }

    await saveCase({ ...record, stage: "workspace" });
    setStage("workspace");
  }, [hasCompletedTranscript, record, setStage]);

  async function runTranscription() {
    if (audioRows.length === 0) {
      setError("Upload audio before starting transcription.");
      return;
    }

    setRunning(true);
    setError(null);

    try {
      await startTranscription(caseId);
      const [transcriptJobs, nextTranscriptRows] = await Promise.all([
        listTranscriptionJobs(caseId),
        listSegmentTranscripts(caseId),
      ]);
      setJobs(transcriptJobs);
      setTranscriptRows(nextTranscriptRows);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Transcription failed.");
    } finally {
      setRunning(false);
    }
  }

  const completedJob = jobs.find((job) => job.status === "complete") ?? null;
  const failedJob = jobs.find((job) => job.status === "failed") ?? null;
  const sourceRows = buildSourceTranscriptRows(audioRows, transcriptRows, jobs);

  useEffect(() => {
    if (!completedJob || !hasCompletedTranscript || advancedJobIdRef.current === completedJob.id) {
      return;
    }

    advancedJobIdRef.current = completedJob.id;
    void openWorkspace();
  }, [completedJob, hasCompletedTranscript, openWorkspace]);

  useEffect(() => {
    if (failedJob?.error) {
      setError(failedJob.error);
    }
  }, [failedJob]);

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Stage 2
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Transcript Creation</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This stage sends the uploaded audio to transcription, stores the immutable raw packet,
            and assembles the canonical transcript rows that Stage 3 reads from Supabase.
          </p>
        </div>

        <div className="grid gap-8 px-8 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                  <Mic size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Audio Sources</p>
                  <p className="text-xs text-slate-500">The job reads from ordered case storage, not a second upload.</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading audio state…</p>
                ) : sourceRows.length > 0 ? (
                  <div className="space-y-3">
                    {sourceRows.map((sourceRow) => (
                      <div
                        key={sourceRow.audioId}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {sourceRow.sourceIndex + 1}. {sourceRow.originalFilename}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {sourceRow.mimeType || "audio"}
                            {sourceRow.durationSeconds ? ` · ${sourceRow.durationSeconds.toFixed(1)}s` : ""}
                            {sourceRow.transcriptId ? ` · transcript ${sourceRow.transcriptId}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(sourceRow.status)}`}>
                          {statusLabel(sourceRow.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-rose-600">No audio uploaded for this case yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Transcript Jobs</p>
                  <p className="text-xs text-slate-500">Most recent jobs for this case.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void runTranscription()}
                  disabled={running || loading || audioRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {running ? "Transcribing…" : completedJob ? "Re-run Transcription" : "Generate Transcript"}
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {jobs.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No transcript jobs yet.
                  </p>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{job.transcript_id}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            transcript {job.transcript_id} · updated {new Date(job.updated_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {job.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Provider</p>
              <p className="mt-3 text-sm text-slate-700">
                {isMockMode()
                  ? "Offline fixture mode is active. Output is marked non-authoritative and cannot be certified."
                  : "Deepgram Nova-3 is configured for batch ingestion."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Next Step</p>
              <p className="mt-3 text-sm text-slate-600">
                Once a transcript job completes, Stage 3 reads its canonical words, utterances, and speakers directly from Supabase.
              </p>
              <button
                type="button"
                onClick={() => void openWorkspace()}
                disabled={!hasCompletedTranscript || running}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Open Workspace
              </button>
              <button
                type="button"
                onClick={() => void setJobs([])}
                className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                <RefreshCw size={12} />
                Clear local list
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mic, RefreshCw, Sparkles } from "lucide-react";

import type { CaseAudioRecord } from "../api/fileService";
import { buildAudioPreAnalysisReport, type AudioPreAnalysisReport } from "../lib/audio/audioPreAnalysis";
import type { TranscriptionJobRecord } from "../lib/transcriptionJobs";
import { listCaseAudio } from "../api/fileService";
import { listTranscriptionJobs, startTranscription } from "../api/transcriptionService";
import { saveCase } from "../api/caseService";
import { useIntake } from "../context/useIntake";
import { useStage } from "../context/StageContext";
import { buildDeepgramRequestFromStoredKeyterms } from "../lib/deepgram/buildDeepgramRequest";
import { validateCaseAudioIntegrity } from "../lib/keyterms/caseAudioIntegrity";
import { deriveAutoSeedKeytermsFromCaseRecord } from "../lib/keyterms/autoSeedKeyterms";
import { isMockMode } from "../lib/runtime/mode";
import {
  buildTranscriptVersionLabels,
  formatTranscriptStatus,
  sortTranscriptsByCreatedAt,
} from "../lib/transcriptVersionLabels";
import { AudioPreAnalysisGate } from "./AudioPreAnalysisGate/AudioPreAnalysisGate";
import { PreTranscriptionConfirmDialog } from "./PreTranscriptionConfirmDialog";
import { RetranscriptionConfirmDialog } from "./TranscriptCreation/RetranscriptionConfirmDialog";
import { TranscriptHistoryPanel } from "./TranscriptCreation/TranscriptHistoryPanel";
import { WorkflowStageNav } from "./WorkflowStageNav";
import { WorkspaceSidebar } from "./WorkspaceSidebar/WorkspaceSidebar";

const REQUIRE_BINDING_CONFIRM = import.meta.env.VITE_REQUIRE_BINDING_CONFIRM !== "false";

export function TranscriptCreationScreen({ caseId }: { caseId: string }) {
  const { record } = useIntake();
  const { openWorkspace } = useStage();
  const [audio, setAudio] = useState<CaseAudioRecord | null>(null);
  const [jobs, setJobs] = useState<TranscriptionJobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [retranscribeConfirmOpen, setRetranscribeConfirmOpen] = useState(false);
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [preAnalysisReport, setPreAnalysisReport] = useState<AudioPreAnalysisReport | null>(null);
  const [preAnalysisCountdown, setPreAnalysisCountdown] = useState<number | null>(null);
  const [preAnalysisConfirmChecked, setPreAnalysisConfirmChecked] = useState(false);

  const requestPreview = useMemo(() => buildDeepgramRequestFromStoredKeyterms({
    caseId,
    keyterms: record.deepgram.keyterms,
  }), [caseId, record.deepgram.keyterms]);

  const caseIdentity = useMemo(() => ({
    caseId: record.case_id,
    caseName: record.caption.case_name.value.trim() || null,
    caseStyle: record.caption.case_style.value.trim() || null,
    witnessName: record.witnesses[0]?.name.value.trim() || null,
  }), [record.caption.case_name.value, record.caption.case_style.value, record.case_id, record.witnesses]);

  const keytermPreview = useMemo(() => ({
    count: requestPreview.envelope.keyterms_count,
    estimatedTokens: requestPreview.envelope.estimated_token_usage,
    sample: requestPreview.envelope.keyterms.slice(0, 12).map((keyterm) => keyterm.term),
  }), [
    requestPreview.envelope.estimated_token_usage,
    requestPreview.envelope.keyterms,
    requestPreview.envelope.keyterms_count,
  ]);
  const audioIntegrity = useMemo(() => {
    if (!audio) {
      return null;
    }

    return validateCaseAudioIntegrity(record, audio.original_filename);
  }, [audio, record]);
  const audioIntegrityWarning = useMemo(() => {
    if (!audioIntegrity || audioIntegrity.ok) {
      return null;
    }

    const unmatched = audioIntegrity.unmatchedDistinctiveTokens.join(", ");
    return unmatched
      ? `Audio filename does not appear to match this case. Unmatched filename tokens: ${unmatched}. Open the correct case before starting or retranscribing.`
      : "Audio filename does not appear to match this case. Open the correct case before starting or retranscribing.";
  }, [audioIntegrity]);

  const completedJobs = useMemo(
    () => jobs.filter((job) => job.status === "complete"),
    [jobs],
  );
  const orderedJobs = useMemo(() => sortTranscriptsByCreatedAt(jobs), [jobs]);
  const transcriptVersionLabels = useMemo(
    () => buildTranscriptVersionLabels(orderedJobs),
    [orderedJobs],
  );

  useEffect(() => {
    if (completedJobs.length === 0) {
      setSelectedTranscriptId(null);
      return;
    }

    const currentStillExists = completedJobs.some((job) => job.transcript_id === selectedTranscriptId);
    if (!currentStillExists) {
      setSelectedTranscriptId(completedJobs[0]?.transcript_id ?? null);
    }
  }, [completedJobs, selectedTranscriptId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCreationState() {
      setLoading(true);
      setError(null);
      try {
        const [audioRows, transcriptJobs] = await Promise.all([
          listCaseAudio(caseId),
          listTranscriptionJobs(caseId),
        ]);

        if (!cancelled) {
          setAudio(audioRows[0] ?? null);
          setJobs(transcriptJobs);
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
          const nextJobs = await listTranscriptionJobs(caseId);
          if (!cancelled) {
            setJobs(nextJobs);
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

  const persistWorkspaceStage = useCallback(async () => {
    await saveCase({ ...record, stage: "workspace" });
  }, [record]);

  const runTranscription = useCallback(async (sourceTranscriptId?: string | null) => {
    if (!audio) {
      setError("Upload audio before starting transcription.");
      return;
    }

    setRunning(true);
    setError(null);

    try {
      await startTranscription(caseId, { sourceTranscriptId: sourceTranscriptId ?? null });
      const transcriptJobs = await listTranscriptionJobs(caseId);
      setJobs(transcriptJobs);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Transcription failed.");
    } finally {
      setRunning(false);
    }
  }, [audio, caseId]);

  // Guard against the countdown effect firing after the user has already
  // proceeded manually, cancelled, or switched to a new pre-analysis report.
  const preAnalysisHandledRef = useRef(false);
  const failedJob = jobs.find((job) => job.status === "failed") ?? null;

  useEffect(() => {
    if (failedJob?.error) {
      setError(failedJob.error);
    }
  }, [failedJob]);

  useEffect(() => {
    if (!preAnalysisReport || preAnalysisReport.gate_action !== "proceed") {
      preAnalysisHandledRef.current = false;
      setPreAnalysisCountdown(null);
      return;
    }

    // Reset the guard whenever the report changes so a new "proceed" report
    // gets its own countdown even after a prior manual proceed.
    preAnalysisHandledRef.current = false;
    setPreAnalysisCountdown(2);
    const tick = window.setInterval(() => {
      setPreAnalysisCountdown((current) => {
        if (current == null || preAnalysisHandledRef.current) {
          return current;
        }
        if (current <= 1) {
          window.clearInterval(tick);
          preAnalysisHandledRef.current = true;
          if (REQUIRE_BINDING_CONFIRM) {
            setConfirmOpen(true);
          } else {
            resetPreAnalysisGate();
            void runTranscription();
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(tick);
    };
  }, [preAnalysisReport, runTranscription]);

  function resetPreAnalysisGate() {
    setPreAnalysisReport(null);
    setPreAnalysisCountdown(null);
    setPreAnalysisConfirmChecked(false);
  }

  function handleTriggerTranscription() {
    if (!audio) {
      setError("Upload audio before starting transcription.");
      return;
    }
    if (audioIntegrityWarning) {
      setError(audioIntegrityWarning);
      return;
    }

    const report = buildAudioPreAnalysisReport({
      audio_id: audio.audio_id,
      original_filename: audio.original_filename,
      file_size_bytes: audio.file_size_bytes,
      mime_type: audio.mime_type,
      duration_seconds: audio.duration_seconds,
      recommended_keyterms: deriveAutoSeedKeytermsFromCaseRecord(record),
      keyterms_source: "case_record",
    });
    setError(null);
    setPreAnalysisConfirmChecked(false);
    setPreAnalysisReport(report);

    if (report.gate_action === "block") {
      return;
    }

    if (report.gate_action !== "proceed") {
      return;
    }

    if (!REQUIRE_BINDING_CONFIRM) {
      return;
    }
  }

  async function handleOpenWorkspace() {
    if (!selectedTranscriptId) {
      setError("Select a transcript before opening Workspace.");
      return;
    }

    await persistWorkspaceStage();
    openWorkspace(selectedTranscriptId);
  }

  function handleTriggerRetranscription() {
    if (!selectedTranscriptId) {
      setError("Select a source transcript before retranscribing.");
      return;
    }
    if (audioIntegrityWarning) {
      setError(audioIntegrityWarning);
      return;
    }

    setRetranscribeConfirmOpen(true);
  }

  function handleConfirmRetranscription() {
    setRetranscribeConfirmOpen(false);
    void runTranscription(selectedTranscriptId);
  }

  function handleConfirmTranscription() {
    setConfirmOpen(false);
    resetPreAnalysisGate();
    void runTranscription();
  }

  function handleProceedFromPreAnalysis() {
    if (!preAnalysisReport || preAnalysisReport.gate_action === "block") {
      return;
    }
    // Prevent the countdown effect from firing again after a manual proceed.
    if (preAnalysisHandledRef.current) {
      return;
    }
    preAnalysisHandledRef.current = true;
    setPreAnalysisCountdown(null);

    if (REQUIRE_BINDING_CONFIRM) {
      setConfirmOpen(true);
      return;
    }

    resetPreAnalysisGate();
    void runTranscription();
  }

  function handleCancelPreAnalysis() {
    resetPreAnalysisGate();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <WorkflowStageNav jobId={caseId} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceSidebar />

        <div className="flex-1 overflow-y-auto px-6 py-10">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Active Case</p>
              <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Case Name:</span>
                  {" "}
                  {caseIdentity.caseName ?? "—"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Witness:</span>
                  {" "}
                  {caseIdentity.witnessName ?? "—"}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Case ID:</span>
                  {" "}
                  <span className="font-mono text-xs text-slate-600">{caseIdentity.caseId}</span>
                </p>
              </div>
              {audioIntegrityWarning && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {audioIntegrityWarning}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                  <Mic size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Audio Source</p>
                  <p className="text-xs text-slate-500">The job reads from case storage, not a second upload.</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading audio state…</p>
                ) : audio ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900">{audio.original_filename}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {audio.mime_type || "audio"}{audio.duration_seconds ? ` · ${audio.duration_seconds.toFixed(1)}s` : ""}
                    </p>
                  </>
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
                  onClick={handleTriggerTranscription}
                  disabled={running || loading || Boolean(audioIntegrityWarning)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {running ? "Transcribing…" : completedJobs.length > 0 ? "Create New Transcript" : "Generate Transcript"}
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {preAnalysisReport && (
                <AudioPreAnalysisGate
                  report={preAnalysisReport}
                  countdownSeconds={preAnalysisReport.gate_action === "proceed" ? preAnalysisCountdown : null}
                  confirmChecked={preAnalysisConfirmChecked}
                  onConfirmCheckedChange={setPreAnalysisConfirmChecked}
                  onProceed={handleProceedFromPreAnalysis}
                  onCancel={handleCancelPreAnalysis}
                />
              )}

              <div className="mt-4 space-y-3">
                {jobs.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No transcript jobs yet.
                  </p>
                ) : (
                  orderedJobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {transcriptVersionLabels.get(job.transcript_id) ?? "Transcript"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Created {new Date(job.created_at).toLocaleString()} · Updated {new Date(job.updated_at).toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Transcript ID: {job.transcript_id}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {formatTranscriptStatus(job.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {completedJobs.length > 0 && (
              <TranscriptHistoryPanel
                audioFilename={audio?.original_filename ?? null}
                transcripts={completedJobs}
                selectedTranscriptId={selectedTranscriptId}
                onSelectTranscript={setSelectedTranscriptId}
                onOpenWorkspace={() => void handleOpenWorkspace()}
                onRetranscribe={handleTriggerRetranscription}
                disabled={running || Boolean(audioIntegrityWarning)}
              />
            )}
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
                onClick={() => void handleOpenWorkspace()}
                disabled={!selectedTranscriptId || running}
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
      </div>
      <PreTranscriptionConfirmDialog
        open={confirmOpen}
        caseIdentity={caseIdentity}
        audio={audio ? {
          filename: audio.original_filename,
          durationSeconds: audio.duration_seconds,
          mimeType: audio.mime_type,
        } : null}
        keyterms={keytermPreview}
        onConfirm={handleConfirmTranscription}
        onCancel={() => setConfirmOpen(false)}
      />
      <RetranscriptionConfirmDialog
        open={retranscribeConfirmOpen}
        transcriptId={selectedTranscriptId}
        onCancel={() => setRetranscribeConfirmOpen(false)}
        onConfirm={handleConfirmRetranscription}
      />
    </div>
  );
}

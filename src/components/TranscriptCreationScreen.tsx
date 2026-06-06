import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mic, RefreshCw, Sparkles } from "lucide-react";

import type { CaseAudioRecord } from "../api/fileService";
import type { TranscriptJobRow } from "../api/transcriptRepository";
import { listCaseAudio } from "../api/fileService";
import { startTranscription } from "../api/transcriptionService";
import { listWorkspaceTranscriptJobs } from "../api/workspaceService";
import { saveCase } from "../api/caseService";
import { useIntake } from "../context/useIntake";
import { useStage } from "../context/StageContext";

export function TranscriptCreationScreen({ caseId }: { caseId: string }) {
  const { record } = useIntake();
  const { setStage } = useStage();
  const [audio, setAudio] = useState<CaseAudioRecord | null>(null);
  const [jobs, setJobs] = useState<TranscriptJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCreationState() {
      setLoading(true);
      setError(null);
      try {
        const [audioRows, transcriptJobs] = await Promise.all([
          listCaseAudio(caseId),
          listWorkspaceTranscriptJobs(caseId),
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

  async function openWorkspace() {
    await saveCase({ ...record, stage: "workspace" });
    setStage("workspace");
  }

  async function runTranscription() {
    if (!audio) {
      setError("Upload audio before starting transcription.");
      return;
    }

    setRunning(true);
    setError(null);

    try {
      await startTranscription(caseId, audio);
      const transcriptJobs = await listWorkspaceTranscriptJobs(caseId);
      setJobs(transcriptJobs);
      await openWorkspace();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Transcription failed.");
    } finally {
      setRunning(false);
    }
  }

  const completedJob = jobs.find((job) => job.status === "completed") ?? null;

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
                  onClick={() => void runTranscription()}
                  disabled={running || loading || !audio}
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
                    <div key={job.job_id} className="rounded-xl border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{job.source_filename || job.job_id}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {job.transcription_source} · {job.engine || "pending engine"} · updated {new Date(job.updated_at).toLocaleString()}
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
                {import.meta.env.VITE_TRANSCRIPTION_PROVIDER === "offline" || !import.meta.env.VITE_DEEPGRAM_API_KEY
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
                disabled={!completedJob || running}
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

import { CheckCircle2, FileAudio2, History, RotateCcw } from "lucide-react";
import type { TranscriptionJobRecord } from "../../lib/transcriptionJobs";
import {
  buildTranscriptVersionLabels,
  formatTranscriptStatus,
  sortTranscriptsByCreatedAt,
} from "../../lib/transcriptVersionLabels";

interface TranscriptHistoryPanelProps {
  audioFilename: string | null;
  transcripts: TranscriptionJobRecord[];
  selectedTranscriptId: string | null;
  onSelectTranscript: (transcriptId: string) => void;
  onOpenWorkspace: () => void;
  onRetranscribe: () => void;
  disabled?: boolean;
  certified?: boolean;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export function TranscriptHistoryPanel({
  audioFilename,
  transcripts,
  selectedTranscriptId,
  onSelectTranscript,
  onOpenWorkspace,
  onRetranscribe,
  disabled = false,
  certified = false,
}: TranscriptHistoryPanelProps) {
  const orderedTranscripts = sortTranscriptsByCreatedAt(transcripts);
  const versionLabels = buildTranscriptVersionLabels(orderedTranscripts);
  const selected = orderedTranscripts.find((job) => job.transcript_id === selectedTranscriptId) ?? orderedTranscripts[0] ?? null;

  return (
    <section
      data-testid="transcript-history-panel"
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-blue-100 p-2 text-blue-700">
          <History size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Deposition Transcript</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            This case&rsquo;s Deposition Transcript. Open it in Workspace, or retranscribe to regenerate it from the audio &mdash; each case keeps a single Deposition Transcript, so retranscription replaces the current one.
          </p>
        </div>
      </div>

      {selected && (
        <div
          data-testid="transcript-history-summary"
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
        >
          <p><span className="font-semibold text-slate-900">Version:</span> {versionLabels.get(selected.transcript_id) ?? "Transcript"}</p>
          <p className="mt-1"><span className="font-semibold text-slate-900">Created:</span> {formatTimestamp(selected.created_at)}</p>
          <p className="mt-1"><span className="font-semibold text-slate-900">Transcript ID:</span> {selected.transcript_id}</p>
          <p className="mt-1"><span className="font-semibold text-slate-900">Audio:</span> {audioFilename ?? "Unknown audio"}</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {orderedTranscripts.map((job) => {
          const isSelected = job.transcript_id === selectedTranscriptId;
          const versionLabel = versionLabels.get(job.transcript_id) ?? "Transcript";
          return (
            <button
              key={job.id}
              type="button"
              data-testid={`transcript-history-option-${job.transcript_id}`}
              onClick={() => onSelectTranscript(job.transcript_id)}
              className={`flex w-full items-start justify-between rounded-xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{versionLabel}</p>
                  {isSelected && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">Created {formatTimestamp(job.created_at)}</p>
                <p className="mt-1 text-xs text-slate-500">Transcript ID: {job.transcript_id}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {formatTranscriptStatus(job.status)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="transcript-history-open-workspace"
          onClick={onOpenWorkspace}
          disabled={disabled || !selected}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          Open Workspace
        </button>
        <button
          type="button"
          data-testid="transcript-history-retranscribe"
          onClick={onRetranscribe}
          disabled={disabled || certified}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw size={14} />
          Retranscribe Audio
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <FileAudio2 size={13} />
        {certified
          ? "This case is certified. Decertify it before retranscribing — retranscription replaces the certified Deposition Transcript."
          : "Retranscription replaces the Deposition Transcript once the new one completes, so the case keeps a single Deposition Transcript."}
      </div>
    </section>
  );
}

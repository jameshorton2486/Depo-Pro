import { FileStack, RotateCcw } from "lucide-react";
import type { TranscriptJobRow } from "../api/transcriptRepository";

interface WorkspaceTranscriptChooserProps {
  transcripts: TranscriptJobRow[];
  onOpenTranscript: (transcriptId: string) => void;
  onOpenTranscriptCreation: () => void;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export function WorkspaceTranscriptChooser({
  transcripts,
  onOpenTranscript,
  onOpenTranscriptCreation,
}: WorkspaceTranscriptChooserProps) {
  return (
    <div
      data-testid="workspace-transcript-chooser"
      className="mx-auto max-w-4xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-blue-100 p-2 text-blue-700">
          <FileStack size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Transcript Selection</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Choose which transcript to open</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Multiple transcripts exist for this case. Select the original transcript or a retranscribed result explicitly; the Workspace will not choose one silently.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {transcripts.map((job) => (
          <button
            key={job.id}
            type="button"
            data-testid={`workspace-transcript-option-${job.transcript_id}`}
            onClick={() => onOpenTranscript(job.transcript_id)}
            className="flex w-full items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{job.transcript_id}</p>
              <p className="mt-1 text-xs text-slate-500">Created {formatTimestamp(job.created_at)}</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {job.status}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        data-testid="workspace-transcript-go-to-creation"
        onClick={onOpenTranscriptCreation}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <RotateCcw size={14} />
        Go to Transcript Creation
      </button>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Save, AlertCircle, CheckCircle, FileJson, FileText, FileType, History, Languages } from "lucide-react";
import { useDocument } from "../../context/DocumentContext";
import { useEditorContext } from "../../context/EditorContext";
import { useIntake } from "../../context/useIntake";
import { AuthStatusChip } from "../AuthGate/AuthGate";
import { OriginalTranscriptDialog } from "../OriginalTranscriptDialog";
import {
  buildFormattedTranscriptText,
  buildWordTranscriptHtml,
  buildWorkspaceTranscriptJson,
  downloadBlob,
} from "../../lib/transcriptDownloads";

interface Props {
  jobId: string;
  onSave: () => void;
}

function formatSavedTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatJobIdSuffix(jobId: string): string {
  const parts = jobId.split("_");
  const suffix = parts.length > 0 ? parts[parts.length - 1] : jobId;
  return `#${suffix.slice(-8)}`;
}

export function Toolbar({ jobId, onSave }: Props) {
  const { state } = useDocument();
  const {
    showInterpreterLayer,
    setShowInterpreterLayer,
    showTabStops,
    setShowTabStops,
  } = useEditorContext();
  const { record } = useIntake();
  const [showOriginal, setShowOriginal] = useState(false);
  const shortJobId = formatJobIdSuffix(jobId);

  const reviewedCount = Object.values(state.wordMap).filter((w) => w.reviewed).length;
  const totalWords = Object.keys(state.wordMap).length;
  const reviewPct = totalWords > 0 ? Math.round((reviewedCount / totalWords) * 100) : 0;
  const transcriptText = useMemo(
    () => (state.document ? buildFormattedTranscriptText(state.document, {
      structureConfirmed: state.structureConfirmed,
      keepRawLabels: state.keepRawLabels,
      record,
    }) : ""),
    [record, state.document, state.keepRawLabels, state.structureConfirmed],
  );
  const transcriptJson = useMemo(
    () => (state.document ? buildWorkspaceTranscriptJson(state.document) : ""),
    [state.document],
  );

  return (
    <>
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900 px-4 text-white">
      <div className="flex min-w-0 items-center gap-2">
        <FileText size={16} className="text-blue-400" />
        <span className="text-sm font-bold tracking-wide">DEPO-PRO</span>
        <span className="text-slate-600">|</span>
        <span className="font-mono text-xs text-slate-400">{shortJobId}</span>
      </div>

      <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
        <button
          onClick={() => setShowInterpreterLayer(!showInterpreterLayer)}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm transition-colors ${
            showInterpreterLayer
              ? "bg-teal-700 text-teal-100 hover:bg-teal-600"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          title="Toggle interpreter layer"
        >
          <Languages size={14} />
          <span className="hidden xl:inline">Interpreter</span>
        </button>

        <button
          onClick={() => setShowTabStops(!showTabStops)}
          className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
            showTabStops
              ? "bg-blue-700 text-blue-100 hover:bg-blue-600"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          title="Toggle transcript tab stop guides"
          data-testid="toolbar-tab-stops-toggle"
        >
          Tabs
        </button>

        <button
          onClick={() => setShowOriginal(true)}
          className="flex items-center gap-1.5 rounded border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          title="View the immutable original transcript (read-only)"
          data-testid="toolbar-view-original"
        >
          <History size={14} />
          <span className="hidden xl:inline">Original</span>
        </button>

        <button
          onClick={() =>
            downloadBlob(
              `${jobId}-transcript.txt`,
              "text/plain;charset=utf-8",
              transcriptText,
            )
          }
          disabled={!state.document}
          className="flex items-center gap-1.5 rounded border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-40"
          title="Download the full formatted transcript as text"
        >
          <FileText size={14} />
          TXT
        </button>

        <button
          onClick={() =>
            downloadBlob(
              `${jobId}-transcript.doc`,
              "application/msword;charset=utf-8",
              buildWordTranscriptHtml(`${jobId} Transcript`, transcriptText),
            )
          }
          disabled={!state.document}
          className="flex items-center gap-1.5 rounded border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-40"
          title="Download the full formatted transcript as a Word-compatible document"
        >
          <FileType size={14} />
          Word
        </button>

        <button
          onClick={() =>
            downloadBlob(
              `${jobId}-transcript.json`,
              "application/json;charset=utf-8",
              transcriptJson,
            )
          }
          disabled={!state.document}
          className="flex items-center gap-1.5 rounded border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-default disabled:opacity-40"
          title="Download the transcript JSON currently loaded in the workspace"
        >
          <FileJson size={14} />
          JSON
        </button>

        {state.saving && (
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
            Saving…
          </span>
        )}

        {!state.saving && state.dirty && !state.saveError && (
          <span className="flex items-center gap-1.5 text-sm text-amber-400">
            <AlertCircle size={12} />
            Unsaved changes
          </span>
        )}

        {!state.saving && !state.dirty && !state.saveError && state.lastSavedAt && (
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            <CheckCircle size={12} className="text-emerald-400" />
            Saved {formatSavedTime(state.lastSavedAt)}
          </span>
        )}

        {!state.saving && !state.dirty && !state.saveError && !state.lastSavedAt && !state.loading && (
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <CheckCircle size={12} className="text-slate-500" />
            No changes
          </span>
        )}

        {state.saveError && !state.saving && (
          <span
            className="flex cursor-help items-center gap-1.5 text-sm text-red-400"
            title={state.saveError}
          >
            <AlertCircle size={12} />
            Save failed
          </span>
        )}

        <button
          onClick={onSave}
          disabled={!state.dirty || state.saving}
          className="ml-1 flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-sm transition-colors hover:bg-blue-500 disabled:cursor-default disabled:opacity-40"
        >
          <Save size={14} />
          Save
        </button>

        <div className="ml-1 flex items-center gap-2 border-l border-slate-700 pl-4">
          <span className="text-sm text-slate-400">Reviewed</span>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${reviewPct}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-sm text-slate-400">{reviewPct}%</span>
        </div>

        <div className="border-l border-slate-700 pl-4">
          <AuthStatusChip />
        </div>
      </div>
    </header>
    {showOriginal && (
      <OriginalTranscriptDialog caseId={jobId} onClose={() => setShowOriginal(false)} />
    )}
    </>
  );
}

import { Save, AlertCircle, CheckCircle, FileText, Languages } from "lucide-react";
import { useDocument } from "../../context/DocumentContext";
import { useEditorContext } from "../../context/EditorContext";
import { useStage } from "../../context/StageContext";
import { useCase } from "../../context/CaseContext";

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

export function Toolbar({ jobId, onSave }: Props) {
  const { state } = useDocument();
  const { showInterpreterLayer, setShowInterpreterLayer } = useEditorContext();
  const { setStage } = useStage();
  const { showBrowser } = useCase();

  const reviewedCount = Object.values(state.wordMap).filter((w) => w.reviewed).length;
  const totalWords = Object.keys(state.wordMap).length;
  const reviewPct = totalWords > 0 ? Math.round((reviewedCount / totalWords) * 100) : 0;

  return (
    <header className="h-12 bg-slate-900 text-white flex items-center gap-4 px-4 shrink-0">
      {/* Branding */}
      <div className="flex items-center gap-2 mr-4">
        <FileText size={16} className="text-blue-400" />
        <span className="text-sm font-semibold tracking-wide">DEPO-PRO</span>
        <span className="text-slate-500 text-sm">|</span>
        <span className="font-mono text-xs text-slate-400">{jobId}</span>
      </div>

      {/* Interpreter layer toggle */}
      <button
        onClick={() => setShowInterpreterLayer(!showInterpreterLayer)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors ${
          showInterpreterLayer
            ? "bg-teal-700 text-teal-100 hover:bg-teal-600"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        }`}
        title="Toggle interpreter layer"
      >
        <Languages size={13} />
        <span className="hidden sm:inline">Interpreter</span>
      </button>

      <button
        onClick={() => void showBrowser()}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
      >
        Cases
      </button>

      <button
        onClick={() => setStage("intake")}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
      >
        Intake
      </button>

      <button
        onClick={() => setStage("certification")}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
      >
        Certification
      </button>

      {/* Save state indicator */}
      <div className="flex items-center gap-2 ml-auto">
        {state.saving && (
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
            Saving…
          </span>
        )}

        {!state.saving && state.dirty && !state.saveError && (
          <span className="text-xs text-amber-400 flex items-center gap-1.5">
            <AlertCircle size={12} />
            Unsaved changes
          </span>
        )}

        {!state.saving && !state.dirty && !state.saveError && state.lastSavedAt && (
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle size={12} className="text-emerald-400" />
            Saved {formatSavedTime(state.lastSavedAt)}
          </span>
        )}

        {!state.saving && !state.dirty && !state.saveError && !state.lastSavedAt && !state.loading && (
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle size={12} className="text-slate-500" />
            No changes
          </span>
        )}

        {state.saveError && !state.saving && (
          <span
            className="text-xs text-red-400 flex items-center gap-1.5 cursor-help"
            title={state.saveError}
          >
            <AlertCircle size={12} />
            Save failed
          </span>
        )}

        <button
          onClick={onSave}
          disabled={!state.dirty || state.saving}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-default rounded transition-colors ml-1"
        >
          <Save size={12} />
          Save
        </button>

        {/* Review progress */}
        <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-1">
          <span className="text-xs text-slate-400">Reviewed</span>
          <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${reviewPct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate-400 w-8 text-right">{reviewPct}%</span>
        </div>
      </div>
    </header>
  );
}

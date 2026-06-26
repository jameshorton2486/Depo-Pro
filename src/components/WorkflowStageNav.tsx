import { ChevronRight, FileText } from "lucide-react";
import { STAGE_LABELS, STAGE_ORDER, useStage } from "../context/StageContext";
import { useCase } from "../context/useCase";

export function WorkflowStageNav({ jobId }: { jobId: string }) {
  const { stage, setStage } = useStage();
  const { showBrowser } = useCase();
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <header className="flex h-12 shrink-0 items-center gap-0 border-b border-slate-800 bg-slate-900 px-4 text-white">
      <div className="mr-3 flex items-center gap-2 border-r border-slate-700 pr-4">
        <FileText size={15} className="text-blue-400" />
        <span className="text-sm font-bold tracking-wide text-white">DEPO-PRO</span>
        <span className="font-mono text-xs text-slate-500">{jobId}</span>
      </div>

      <button
        type="button"
        onClick={() => void showBrowser()}
        className="mr-3 rounded border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-800"
      >
        Cases
      </button>

      <div className="flex items-center gap-0 overflow-x-auto">
        {STAGE_ORDER.map((stageKey, index) => {
          const isActive = stageKey === stage;
          const isPast = index < currentIdx;
          const isFuture = index > currentIdx;

          return (
            <div key={stageKey} className="flex items-center">
              <button
                type="button"
                onClick={() => setStage(stageKey)}
                className={`whitespace-nowrap rounded px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-700 text-blue-100"
                    : isPast
                      ? "text-emerald-400 hover:bg-slate-800"
                      : isFuture
                        ? "text-slate-400 hover:bg-slate-800"
                        : ""
                }`}
              >
                {STAGE_LABELS[stageKey]}
              </button>
              {index < STAGE_ORDER.length - 1 && (
                <ChevronRight size={11} className="mx-0.5 shrink-0 text-slate-700" />
              )}
            </div>
          );
        })}
      </div>
    </header>
  );
}

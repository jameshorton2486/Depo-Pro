import { AlertTriangle, CheckCircle2, Clock, Save } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

export function CaseStatusBadge({
  persisted,
  dirty,
  saveState,
  savedAt,
}: {
  persisted: boolean;
  dirty: boolean;
  saveState: SaveState;
  savedAt: string | null;
}) {
  if (saveState === "saving") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
        <Save size={12} />
        SAVING...
      </span>
    );
  }

  if (saveState === "error") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
        <AlertTriangle size={12} />
        SAVE FAILED - RETRY
      </span>
    );
  }

  if (!persisted) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        <Clock size={12} />
        NOT SAVED
      </span>
    );
  }

  if (dirty) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        <Clock size={12} />
        MODIFIED
      </span>
    );
  }

  const timeLabel = savedAt
    ? new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(savedAt))
    : "";

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 size={12} />
      {timeLabel ? `SAVED ${timeLabel}` : "SAVED"}
    </span>
  );
}

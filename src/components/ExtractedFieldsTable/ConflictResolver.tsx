import { CheckCircle2 } from "lucide-react";
import type { FieldRow, DisplaySource } from "./fieldProjection";

interface Props {
  row: FieldRow;
  onResolve: (rowId: string, accepted: string, source: DisplaySource) => void;
}

export function ConflictResolver({ row, onResolve }: Props) {
  if (!row.conflict || !row.conflictAlternate) return null;

  const options = [
    { value: row.value, source: row.displaySource },
    row.conflictAlternate,
  ];

  return (
    <div className="rounded-lg border border-rose-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-rose-700">
          Human Review Required
        </span>
        <span className="text-xs text-rose-500">— Select the correct value</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={`${opt.source}-${opt.value}`}
            type="button"
            onClick={() => onResolve(row.id, opt.value, opt.source as DisplaySource)}
            className="group flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-all hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1"
          >
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-slate-800">{opt.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">from {opt.source}</p>
            </div>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

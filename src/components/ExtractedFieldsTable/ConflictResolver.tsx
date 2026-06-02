import type { FieldRow, DisplaySource } from "./fieldProjection";

interface Props {
  row: FieldRow;
  onResolve: (rowId: string, accepted: string, source: DisplaySource) => void;
}

export function ConflictResolver({ row, onResolve }: Props) {
  if (!row.conflict || !row.conflictAlternate) return null;

  const optionA = { value: row.value, source: row.displaySource };
  const optionB = row.conflictAlternate;

  return (
    <div className="mt-2 rounded border border-rose-200 bg-rose-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
        Conflict — Select the correct value
      </p>
      <div className="flex flex-col gap-2">
        {[optionA, optionB].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onResolve(row.id, opt.value, opt.source as DisplaySource)}
            className="flex items-center justify-between rounded border border-rose-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-rose-400 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1"
          >
            <span className="font-medium text-slate-800">{opt.value}</span>
            <span className="ml-3 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {opt.source}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

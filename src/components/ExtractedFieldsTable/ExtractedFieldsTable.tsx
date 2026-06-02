import { useState, useMemo } from "react";
import type { CaseRecord } from "../../types/case";
import {
  projectFieldRows,
  type FieldRow,
  type FieldCategory,
  type FieldStatus,
  type DisplaySource,
} from "./fieldProjection";
import { FieldStatusBadge } from "./FieldStatusBadge";
import { ConflictResolver } from "./ConflictResolver";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  record: CaseRecord;
  conflictAlternates?: Record<string, { value: string; source: string }>;
  onConfirm?: (rowId: string) => void;
  onConfirmAll?: () => void;
  onResolveConflict?: (rowId: string, value: string, source: DisplaySource) => void;
}

const ALL = "All" as const;
type FilterAll = typeof ALL;

const CATEGORIES: FieldCategory[] = [
  "Case Caption",
  "Session",
  "Reporter",
  "Witness",
  "Attorney",
  "Interpreter",
  "Videographer",
  "Participant",
];

const SOURCES: DisplaySource[] = [
  "Notice",
  "Job Sheet",
  "Reporter Profile",
  "Record",
  "Computed",
  "Manual",
];

const STATUSES: FieldStatus[] = ["Missing", "Needs Confirmation", "Confirmed", "Conflict"];

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-400">—</span>;
  const pct = Math.round(score * 100);
  const color =
    pct >= 90 ? "bg-emerald-500" :
    pct >= 70 ? "bg-amber-400" :
                "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

// ─── Source pill ──────────────────────────────────────────────────────────────

function SourcePill({ source }: { source: DisplaySource }) {
  const map: Record<DisplaySource, string> = {
    "Notice":          "bg-blue-50 text-blue-700",
    "Job Sheet":       "bg-cyan-50 text-cyan-700",
    "Reporter Profile":"bg-violet-50 text-violet-700",
    "Record":          "bg-slate-100 text-slate-600",
    "Computed":        "bg-orange-50 text-orange-700",
    "Manual":          "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${map[source]}`}>
      {source}
    </span>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

interface RowProps {
  row: FieldRow;
  expanded: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onResolve: (rowId: string, value: string, source: DisplaySource) => void;
}

function TableRow({ row, expanded, onToggle, onConfirm, onResolve }: RowProps) {
  const isEmpty = row.value === "";
  return (
    <>
      <tr
        className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${row.conflict ? "bg-rose-50/40" : ""}`}
      >
        {/* Field */}
        <td className="py-2.5 pl-4 pr-3">
          <div className="flex items-start gap-1">
            {row.required && (
              <span className="mt-0.5 text-red-500" title="Required">*</span>
            )}
            <div>
              <p className="text-sm font-medium text-slate-800">{row.label}</p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">{row.path}</p>
            </div>
          </div>
        </td>

        {/* Value */}
        <td className="max-w-[240px] px-3 py-2.5">
          {isEmpty ? (
            <span className="text-sm italic text-slate-400">—</span>
          ) : (
            <span className="break-words text-sm text-slate-800">{row.value}</span>
          )}
        </td>

        {/* Source */}
        <td className="px-3 py-2.5">
          <SourcePill source={row.displaySource} />
        </td>

        {/* Confidence */}
        <td className="px-3 py-2.5">
          <ConfidenceBar score={row.confidence_score} />
        </td>

        {/* Status */}
        <td className="px-3 py-2.5">
          <FieldStatusBadge status={row.status} />
        </td>

        {/* Actions */}
        <td className="py-2.5 pl-3 pr-4 text-right">
          <div className="flex items-center justify-end gap-2">
            {row.conflict && (
              <button
                type="button"
                onClick={onToggle}
                className="rounded px-2 py-1 text-xs font-medium text-rose-600 underline-offset-2 hover:underline focus:outline-none"
              >
                {expanded ? "Hide" : "Resolve"}
              </button>
            )}
            {!row.conflict && row.status === "Needs Confirmation" && !isEmpty && (
              <button
                type="button"
                onClick={onConfirm}
                className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1"
              >
                Confirm
              </button>
            )}
            {row.status === "Confirmed" && (
              <span className="text-xs text-emerald-600">&#10003;</span>
            )}
          </div>
        </td>
      </tr>

      {/* Conflict resolution panel — spans all columns */}
      {expanded && row.conflict && (
        <tr className="border-b border-rose-100 bg-rose-50/60">
          <td colSpan={6} className="px-4 pb-3 pt-1">
            <ConflictResolver row={row} onResolve={onResolve} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Category header ──────────────────────────────────────────────────────────

function CategoryHeader({ category, count }: { category: FieldCategory; count: number }) {
  return (
    <tr className="bg-slate-100">
      <td colSpan={6} className="py-1.5 pl-4 pr-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {category}
        </span>
        <span className="ml-2 text-xs text-slate-400">{count}</span>
      </td>
    </tr>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  activeCategory: FieldCategory | FilterAll;
  activeSource: DisplaySource | FilterAll;
  activeStatus: FieldStatus | FilterAll;
  showAll: boolean;
  onCategory: (v: FieldCategory | FilterAll) => void;
  onSource: (v: DisplaySource | FilterAll) => void;
  onStatus: (v: FieldStatus | FilterAll) => void;
  onToggleShowAll: () => void;
  onConfirmAll: () => void;
  conflictCount: number;
  missingCount: number;
}

function FilterBar({
  activeCategory, activeSource, activeStatus,
  showAll, onCategory, onSource, onStatus, onToggleShowAll, onConfirmAll,
  conflictCount, missingCount,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      {/* Category */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-slate-500">Category</label>
        <select
          value={activeCategory}
          onChange={(e) => onCategory(e.target.value as FieldCategory | FilterAll)}
          className="rounded border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value={ALL}>All</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Source */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-slate-500">Source</label>
        <select
          value={activeSource}
          onChange={(e) => onSource(e.target.value as DisplaySource | FilterAll)}
          className="rounded border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value={ALL}>All</option>
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-slate-500">Status</label>
        <select
          value={activeStatus}
          onChange={(e) => onStatus(e.target.value as FieldStatus | FilterAll)}
          className="rounded border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value={ALL}>All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          id="show-all-toggle"
          type="checkbox"
          checked={showAll}
          onChange={onToggleShowAll}
          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
        />
        <label htmlFor="show-all-toggle" className="cursor-pointer text-xs text-slate-600">
          Show empty fields
        </label>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {conflictCount > 0 && (
          <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
            {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
          </span>
        )}
        {missingCount > 0 && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            {missingCount} missing
          </span>
        )}
        <button
          type="button"
          onClick={onConfirmAll}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
        >
          Confirm All Visible
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExtractedFieldsTable({
  record,
  conflictAlternates = {},
  onConfirm,
  onConfirmAll,
  onResolveConflict,
}: Props) {
  const [filterCategory, setFilterCategory] = useState<FieldCategory | FilterAll>(ALL);
  const [filterSource, setFilterSource]     = useState<DisplaySource | FilterAll>(ALL);
  const [filterStatus, setFilterStatus]     = useState<FieldStatus | FilterAll>(ALL);
  const [showAll, setShowAll]               = useState(false);
  const [expandedRows, setExpandedRows]     = useState<Set<string>>(new Set());

  // Local optimistic confirm state (until parent persists)
  const [localConfirmed, setLocalConfirmed] = useState<Set<string>>(new Set());
  // Local optimistic conflict resolution
  const [resolvedConflicts, setResolvedConflicts] = useState<
    Record<string, { value: string; source: DisplaySource }>
  >({});

  const allRows = useMemo(
    () => projectFieldRows(record, conflictAlternates),
    [record, conflictAlternates],
  );

  // Apply local overrides so the UI is responsive without waiting for parent
  const rows = useMemo<FieldRow[]>(() => {
    return allRows.map((row) => {
      let r = row;
      if (localConfirmed.has(row.id)) {
        r = { ...r, status: "Confirmed", conflict: false };
      }
      if (resolvedConflicts[row.id]) {
        const res = resolvedConflicts[row.id];
        r = {
          ...r,
          value: res.value,
          displaySource: res.source,
          status: "Confirmed",
          conflict: false,
          conflictAlternate: null,
        };
      }
      return r;
    });
  }, [allRows, localConfirmed, resolvedConflicts]);

  const conflictCount = rows.filter((r) => r.conflict).length;
  const missingCount  = rows.filter((r) => r.status === "Missing").length;

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!showAll && row.value === "" && !row.conflict) return false;
      if (filterCategory !== ALL && row.category !== filterCategory) return false;
      if (filterSource   !== ALL && row.displaySource !== filterSource) return false;
      if (filterStatus   !== ALL && row.status !== filterStatus) return false;
      return true;
    });
  }, [rows, showAll, filterCategory, filterSource, filterStatus]);

  // Group by category preserving declaration order
  const grouped = useMemo(() => {
    const map = new Map<FieldCategory, FieldRow[]>();
    for (const row of filtered) {
      if (!map.has(row.category)) map.set(row.category, []);
      map.get(row.category)!.push(row);
    }
    return map;
  }, [filtered]);

  function handleToggleExpand(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm(id: string) {
    setLocalConfirmed((prev) => new Set(prev).add(id));
    onConfirm?.(id);
  }

  function handleConfirmAll() {
    const ids = new Set(filtered.filter((r) => r.status === "Needs Confirmation").map((r) => r.id));
    setLocalConfirmed((prev) => new Set([...prev, ...ids]));
    onConfirmAll?.();
  }

  function handleResolve(rowId: string, value: string, source: DisplaySource) {
    setResolvedConflicts((prev) => ({ ...prev, [rowId]: { value, source } }));
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    onResolveConflict?.(rowId, value, source);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <FilterBar
        activeCategory={filterCategory}
        activeSource={filterSource}
        activeStatus={filterStatus}
        showAll={showAll}
        onCategory={setFilterCategory}
        onSource={setFilterSource}
        onStatus={setFilterStatus}
        onToggleShowAll={() => setShowAll((v) => !v)}
        onConfirmAll={handleConfirmAll}
        conflictCount={conflictCount}
        missingCount={missingCount}
      />

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="py-2 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Field</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Extracted Value</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Source</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Confidence</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="py-2 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {grouped.size === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                  No fields match the current filters.
                </td>
              </tr>
            )}
            {Array.from(grouped.entries()).map(([category, catRows]) => (
              <>
                <CategoryHeader key={`cat-${category}`} category={category} count={catRows.length} />
                {catRows.map((row) => (
                  <TableRow
                    key={row.id}
                    row={row}
                    expanded={expandedRows.has(row.id)}
                    onToggle={() => handleToggleExpand(row.id)}
                    onConfirm={() => handleConfirm(row.id)}
                    onResolve={handleResolve}
                  />
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="flex items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <span>{filtered.length} field{filtered.length !== 1 ? "s" : ""} shown</span>
        {conflictCount > 0 && (
          <span className="font-medium text-rose-600">
            {conflictCount} conflict{conflictCount !== 1 ? "s" : ""} require resolution
          </span>
        )}
        {missingCount > 0 && (
          <span className="font-medium text-red-600">
            {missingCount} required field{missingCount !== 1 ? "s" : ""} missing
          </span>
        )}
        {conflictCount === 0 && missingCount === 0 && filtered.length > 0 && (
          <span className="font-medium text-emerald-600">All visible fields are valid</span>
        )}
      </div>
    </div>
  );
}

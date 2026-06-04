import { Fragment, useState, useMemo, useEffect } from "react";
import { AlertTriangle, Check, ChevronDown, History, Pencil, X } from "lucide-react";
import type { CaseRecord } from "../../types/case";
import {
  projectFieldRows,
  type FieldRow,
  type FieldCategory,
  type FieldStatus,
  type DisplaySource,
} from "./fieldProjection";
import { FieldStatusBadge } from "./FieldStatusBadge";
import { useConflict } from "../conflict/conflictStore";
import { ConflictResolutionModal } from "../conflict/ConflictResolutionModal";
import { ProvenanceViewer } from "../conflict/ProvenanceViewer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  caseId: string;
  record: CaseRecord;
  conflictAlternates?: Record<string, { value: string; source: string }>;
  onConfirm?: (rowId: string) => void;
  onConfirmAll?: () => void;
  onResolveConflict?: (rowId: string, value: string, source: DisplaySource) => void;
  onUpdate?: (rowId: string, value: string) => void;
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
        <div className={`h-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

// ─── Source pill ──────────────────────────────────────────────────────────────

function SourcePill({ source }: { source: DisplaySource }) {
  const map: Record<DisplaySource, string> = {
    "Notice":          "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    "Job Sheet":       "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
    "Reporter Profile":"bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    "Record":          "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    "Computed":        "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    "Manual":          "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
  };
  return (
    <span className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-medium ${map[source]}`}>
      {source}
    </span>
  );
}

// ─── Conflict cell ────────────────────────────────────────────────────────────

function ConflictCell({ row, isResolved }: { row: FieldRow; isResolved: boolean }) {
  const { openModal } = useConflict();

  if (!row.conflict && !isResolved) {
    return <span className="text-xs text-slate-300">—</span>;
  }
  if (isResolved) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <Check className="h-3.5 w-3.5" />
        Resolved
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openModal(row.id)}
      className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1"
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      Resolve
      <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
    </button>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

interface RowProps {
  row: FieldRow;
  isResolved: boolean;
  onConfirm: () => void;
  onOpenProvenance: () => void;
  onUpdate?: (value: string) => void;
}

function TableRow({ row, isResolved, onConfirm, onOpenProvenance, onUpdate }: RowProps) {
  const isEmpty = row.value === "";
  const { state } = useConflict();
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(row.value);
  const resolvedEntry = state.history[row.id]?.find(
    (e) => e.event_type === "conflict_resolved",
  );
  const displayValue = resolvedEntry?.winning_value ?? row.value;
  const isEditable = onUpdate !== undefined && row.path !== "session.is_remote" && row.path !== "session.remote_platform";

  useEffect(() => {
    setDraftValue(row.value);
  }, [row.value]);

  return (
    <tr
      data-field-path={row.id}
      className={`border-b border-slate-100 transition-colors hover:bg-slate-50/80 ${
        row.conflict && !isResolved ? "bg-rose-50/30" : ""
      }`}
    >
      {/* Field */}
      <td className="py-3 pl-5 pr-3">
        <div className="flex items-start gap-1.5">
          {row.required && (
            <span className="mt-0.5 text-xs leading-none text-red-500" title="Required for certification">*</span>
          )}
          <div>
            <p className="text-sm font-medium leading-tight text-slate-800">{row.label}</p>
            <p className="mt-0.5 font-mono text-[10px] leading-none text-slate-400">{row.path}</p>
          </div>
        </div>
      </td>

      {/* Extracted Value */}
      <td className="max-w-[200px] px-3 py-3">
        {!displayValue || displayValue === "" ? (
          <span className="text-sm italic text-slate-400">—</span>
        ) : (
          <span className="break-words text-sm text-slate-800">{displayValue}</span>
        )}
      </td>

      {/* Source */}
      <td className="px-3 py-3">
        <SourcePill source={row.displaySource} />
      </td>

      {/* Confidence */}
      <td className="px-3 py-3">
        <ConfidenceBar score={row.confidence_score} />
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <FieldStatusBadge status={isResolved ? "Confirmed" : row.status} />
      </td>

      {/* Conflict */}
      <td className="px-3 py-3">
        <ConflictCell row={row} isResolved={isResolved} />
      </td>

      {/* Action */}
      <td className="py-3 pl-3 pr-5">
        <div className="flex items-center justify-end gap-2">
          {/* Provenance history button — always visible for rows with any history */}
          <button
            type="button"
            onClick={onOpenProvenance}
            title="View field history"
            className="rounded p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <History className="h-3.5 w-3.5" />
          </button>

          {!row.conflict && !isResolved && row.status === "Needs Confirmation" && !isEmpty && (
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1"
            >
              Confirm
            </button>
          )}
          {isEditable && (
            editing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdate?.(draftValue);
                    setEditing(false);
                  }}
                  className="rounded p-1 text-emerald-600 transition-colors hover:bg-emerald-50"
                  title="Save edit"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftValue(row.value);
                    setEditing(false);
                  }}
                  className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100"
                  title="Cancel edit"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
                title="Edit value"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )
          )}
          {(row.status === "Confirmed" || isResolved) && !row.conflict && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              Done
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Category header ──────────────────────────────────────────────────────────

function CategoryHeader({ category, count }: { category: FieldCategory; count: number }) {
  return (
    <tr className="border-b border-slate-200 bg-slate-100/80">
      <td colSpan={7} className="py-2 pl-5 pr-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            {category}
          </span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
            {count}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ─── Summary badges ───────────────────────────────────────────────────────────

function SummaryBadge({
  count, label, color,
}: {
  count: number;
  label: string;
  color: "rose" | "red" | "amber" | "emerald";
}) {
  if (count === 0) return null;
  const cls = {
    rose:    "bg-rose-100 text-rose-700",
    red:     "bg-red-100 text-red-700",
    amber:   "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  }[color];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>
      {count} {label}{count !== 1 ? "s" : ""}
    </span>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function SelectFilter<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T | FilterAll;
  options: T[];
  onChange: (v: T | FilterAll) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="shrink-0 text-xs font-medium text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | FilterAll)}
        className="rounded-md border border-slate-200 bg-white py-1.5 pl-2.5 pr-7 text-xs text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
      >
        <option value={ALL}>All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

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
  needsConfirmCount: number;
  confirmedCount: number;
}

function FilterBar({
  activeCategory, activeSource, activeStatus,
  showAll, onCategory, onSource, onStatus, onToggleShowAll, onConfirmAll,
  conflictCount, missingCount, needsConfirmCount, confirmedCount,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-5 py-3">
      <SelectFilter<FieldCategory>
        label="Category"
        value={activeCategory}
        options={CATEGORIES}
        onChange={onCategory}
      />
      <SelectFilter<DisplaySource>
        label="Source"
        value={activeSource}
        options={SOURCES}
        onChange={onSource}
      />
      <SelectFilter<FieldStatus>
        label="Status"
        value={activeStatus}
        options={STATUSES}
        onChange={onStatus}
      />
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={showAll}
          onChange={onToggleShowAll}
          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
        />
        <span className="text-xs text-slate-600">Show empty fields</span>
      </label>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <SummaryBadge count={conflictCount}     label="conflict"    color="rose" />
        <SummaryBadge count={missingCount}      label="missing"     color="red" />
        <SummaryBadge count={needsConfirmCount} label="unconfirmed" color="amber" />
        <SummaryBadge count={confirmedCount}    label="confirmed"   color="emerald" />
        <button
          type="button"
          onClick={onConfirmAll}
          className="ml-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
        >
          Confirm All Visible
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExtractedFieldsTable({
  caseId,
  record,
  conflictAlternates = {},
  onConfirm,
  onConfirmAll,
  onResolveConflict,
  onUpdate,
}: Props) {
  const { state, detectConflict, recordConfirm } = useConflict();

  const [filterCategory, setFilterCategory] = useState<FieldCategory | FilterAll>(ALL);
  const [filterSource, setFilterSource]     = useState<DisplaySource | FilterAll>(ALL);
  const [filterStatus, setFilterStatus]     = useState<FieldStatus | FilterAll>(ALL);
  const [showAll, setShowAll]               = useState(false);
  const [provenancePath, setProvenancePath] = useState<string | null>(null);

  const [localConfirmed, setLocalConfirmed] = useState<Set<string>>(new Set());

  const allRows = useMemo(
    () => projectFieldRows(record, conflictAlternates),
    [record, conflictAlternates],
  );

  // Register active conflicts with the store on first render and whenever
  // the record/alternates change. Uses a ref-guard to avoid repeated fires.
  useEffect(() => {
    for (const row of allRows) {
      if (row.conflict && row.conflictAlternate) {
        detectConflict(
          caseId,
          row.id,
          row.label,
          { value: row.value, source: row.displaySource, confidence_score: row.confidence_score },
          { value: row.conflictAlternate.value, source: row.conflictAlternate.source, confidence_score: null },
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // A conflict row is "resolved" when the store has resolved it
  const isResolvedInStore = (rowId: string) =>
    !state.active[rowId] &&
    (state.history[rowId] ?? []).some((e) => e.event_type === "conflict_resolved");

  const rows = useMemo<FieldRow[]>(() => {
    return allRows.map((row) => {
      if (localConfirmed.has(row.id)) {
        return { ...row, status: "Confirmed" as FieldStatus, conflict: false };
      }
      return row;
    });
  }, [allRows, localConfirmed]);

  const conflictCount      = rows.filter((r) => r.conflict && !isResolvedInStore(r.id)).length;
  const missingCount       = rows.filter((r) => r.status === "Missing").length;
  const needsConfirmCount  = rows.filter((r) => r.status === "Needs Confirmation").length;
  const confirmedCount     = rows.filter((r) => r.status === "Confirmed" || isResolvedInStore(r.id)).length;

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!showAll && row.value === "" && !row.conflict) return false;
      if (filterCategory !== ALL && row.category !== filterCategory) return false;
      if (filterSource   !== ALL && row.displaySource !== filterSource) return false;
      if (filterStatus   !== ALL && row.status !== filterStatus) return false;
      return true;
    });
  }, [rows, showAll, filterCategory, filterSource, filterStatus]);

  const grouped = useMemo(() => {
    const map = new Map<FieldCategory, FieldRow[]>();
    for (const row of filtered) {
      if (!map.has(row.category)) map.set(row.category, []);
      map.get(row.category)!.push(row);
    }
    return map;
  }, [filtered]);

  function handleConfirm(row: FieldRow) {
    setLocalConfirmed((prev) => new Set(prev).add(row.id));
    recordConfirm(caseId, row.id, row.label, row.value, row.displaySource);
    onConfirm?.(row.id);
  }

  function handleConfirmAll() {
    const confirmable = filtered.filter(
      (r) => r.status === "Needs Confirmation" && r.value !== "" && !r.conflict,
    );
    const ids = new Set(confirmable.map((r) => r.id));
    setLocalConfirmed((prev) => new Set([...prev, ...ids]));
    for (const row of confirmable) {
      recordConfirm(caseId, row.id, row.label, row.value, row.displaySource);
    }
    onConfirmAll?.();
  }

  // Provenance viewer state — find label for header
  const provenanceRow = provenancePath
    ? allRows.find((r) => r.id === provenancePath)
    : null;

  return (
    <>
      <div className="flex gap-4">
        {/* Main table */}
        <div className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all ${provenancePath ? "flex-1 min-w-0" : "w-full"}`}>
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
            needsConfirmCount={needsConfirmCount}
            confirmedCount={confirmedCount}
          />

          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: "21%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  <th className="py-2.5 pl-5 pr-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Field</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Extracted Value</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Source</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Confidence</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Conflict</th>
                  <th className="py-2.5 pl-3 pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {grouped.size === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                      No fields match the current filters.
                    </td>
                  </tr>
                )}
                {Array.from(grouped.entries()).map(([category, catRows]) => (
                  <Fragment key={`cat-${category}`}>
                    <CategoryHeader category={category} count={catRows.length} />
                    {catRows.map((row) => (
                      <TableRow
                        key={row.id}
                        row={row}
                        isResolved={isResolvedInStore(row.id)}
                        onConfirm={() => handleConfirm(row)}
                        onUpdate={(value) => {
                          setLocalConfirmed((prev) => new Set(prev).add(row.id));
                          recordConfirm(caseId, row.id, row.label, value, "Manual");
                          onUpdate?.(row.id, value);
                          onConfirm?.(row.id);
                        }}
                        onOpenProvenance={() =>
                          setProvenancePath((p) => (p === row.id ? null : row.id))
                        }
                      />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">
            <span className="font-medium">{filtered.length} field{filtered.length !== 1 ? "s" : ""} shown</span>
            <span className="text-slate-300">·</span>
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
            <span className="ml-auto text-slate-400">* Required for certification</span>
          </div>
        </div>

        {/* Provenance panel — slides in alongside the table */}
        {provenancePath && provenanceRow && (
          <div className="w-80 shrink-0">
            <ProvenanceViewer
              caseId={caseId}
              fieldPath={provenancePath}
              fieldLabel={provenanceRow.label}
              onClose={() => setProvenancePath(null)}
            />
          </div>
        )}
      </div>

      {/* Conflict resolution modal — rendered at body level via portal-like position */}
      <ConflictResolutionModal
        caseId={caseId}
        onResolved={(fieldPath, winning) => {
          onResolveConflict?.(fieldPath, winning.value, winning.source);
        }}
        onProvenanceOpen={(fp) => {
          setProvenancePath(fp);
        }}
      />
    </>
  );
}

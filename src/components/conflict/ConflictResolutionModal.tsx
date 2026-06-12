// ConflictResolutionModal
//
// Full-screen overlay that forces the operator to make an explicit choice
// between two competing values for a field. No auto-selection is possible.
// The modal cannot be dismissed without choosing or explicitly cancelling.
//
// Displays:
//   - Field name and path
//   - Both options side-by-side with source and confidence
//   - Conflict detection timestamp
//   - "Resolve" button only becomes active after a selection
//   - Link to open ProvenanceViewer for the field's full history

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useConflict } from "./conflictStore";
import type { ConflictOption } from "./types";
import type { DisplaySource } from "../ExtractedFieldsTable/fieldProjection";

// ─── Confidence indicator ─────────────────────────────────────────────────────

function ConfidenceIndicator({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs text-slate-400">No score</span>;
  }
  const pct = Math.round(score * 100);
  const color =
    pct >= 90 ? "bg-emerald-500 text-emerald-700" :
    pct >= 70 ? "bg-amber-400 text-amber-700" :
                "bg-red-400 text-red-700";
  const [barColor] = color.split(" ");
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${color.split(" ")[1]}`}>
        {pct}% confidence
      </span>
    </div>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: DisplaySource }) {
  const map: Record<DisplaySource, string> = {
    "Notice":          "bg-blue-100 text-blue-700",
    "Job Sheet":       "bg-cyan-100 text-cyan-700",
    "Reporter Profile":"bg-teal-100 text-teal-700",
    "Record":          "bg-slate-100 text-slate-600",
    "Computed":        "bg-orange-100 text-orange-700",
    "Manual":          "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[source]}`}>
      <FileText className="h-3 w-3 shrink-0" />
      {source}
    </span>
  );
}

// ─── Option card ──────────────────────────────────────────────────────────────

function OptionCard({
  option,
  label,
  selected,
  onSelect,
}: {
  option: ConflictOption;
  label: "A" | "B";
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-xl border-2 p-5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        selected
          ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
            selected
              ? "bg-emerald-200 text-emerald-800"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          Option {label}
        </span>
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
            selected
              ? "border-emerald-500 bg-emerald-500"
              : "border-slate-300 group-hover:border-slate-400"
          }`}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </div>
      </div>

      {/* Value */}
      <p
        className={`mb-3 text-lg font-bold leading-snug break-words ${
          selected ? "text-slate-900" : "text-slate-700"
        }`}
      >
        {option.value || <span className="italic text-slate-400">— empty —</span>}
      </p>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={option.source} />
        <ConfidenceIndicator score={option.confidence_score} />
      </div>
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  caseId: string;
  onResolved?: (fieldPath: string, winning: ConflictOption, rejected: ConflictOption) => void;
  onProvenanceOpen?: (fieldPath: string) => void;
}

export async function submitConflictResolution({
  resolveConflict,
  fieldPath,
  winning,
  rejected,
  caseId,
  fieldLabel,
  onResolved,
}: {
  resolveConflict: (
    fieldPath: string,
    winning: ConflictOption,
    rejected: ConflictOption,
    caseId: string,
    fieldLabel: string,
  ) => Promise<boolean>;
  fieldPath: string;
  winning: ConflictOption;
  rejected: ConflictOption;
  caseId: string;
  fieldLabel: string;
  onResolved?: (fieldPath: string, winning: ConflictOption, rejected: ConflictOption) => void;
}): Promise<string | null> {
  const ok = await resolveConflict(fieldPath, winning, rejected, caseId, fieldLabel);
  if (ok) {
    onResolved?.(fieldPath, winning, rejected);
    return null;
  }
  return "Could not save the conflict resolution. Please try again.";
}

export function ConflictResolutionModal({ caseId, onResolved, onProvenanceOpen }: Props) {
  const { state, resolveConflict, closeModal } = useConflict();
  const [selectedOption, setSelectedOption] = useState<"a" | "b" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fieldPath = state.modalFieldPath;
  const conflict = fieldPath ? state.active[fieldPath] : null;

  // Reset selection when modal opens for a new field
  useEffect(() => {
    setSelectedOption(null);
    setSubmitting(false);
    setSubmitError(null);
  }, [fieldPath]);

  // Close on Escape — but only if no unresolved conflict exists
  // (forcing resolution requires explicit action)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !conflict) closeModal();
    },
    [conflict, closeModal],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!fieldPath || !conflict) return null;

  const winning: ConflictOption =
    selectedOption === "a" ? conflict.option_a : conflict.option_b;
  const rejected: ConflictOption =
    selectedOption === "a" ? conflict.option_b : conflict.option_a;

  async function handleResolve() {
    if (!selectedOption || !conflict || !fieldPath) return;
    setSubmitting(true);
    setSubmitError(null);
    const error = await submitConflictResolution({
      resolveConflict,
      fieldPath,
      winning,
      rejected,
      caseId,
      fieldLabel: conflict.field_label,
      onResolved,
    });
    setSubmitting(false);
    if (error === null) {
      return;
    }
    setSubmitError(error);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-3 rounded-t-2xl border-b border-slate-200 bg-rose-50 px-6 py-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="conflict-modal-title"
              className="text-base font-bold text-slate-900"
            >
              Conflict Resolution Required
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              <span className="font-semibold">{conflict.field_label}</span>
              {" "}— two sources disagree. You must select the correct value.
            </p>
          </div>
          {/* Close is only shown if there's no active conflict — already resolved */}
          {!conflict && (
            <button
              type="button"
              onClick={closeModal}
              className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Field path + detected time */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50 px-6 py-2">
          <span className="font-mono text-[11px] text-slate-400">{conflict.field_path}</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />
            Detected {new Date(conflict.detected_at).toLocaleTimeString()}
          </span>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <OptionCard
            option={conflict.option_a}
            label="A"
            selected={selectedOption === "a"}
            onSelect={() => setSelectedOption("a")}
          />
          <OptionCard
            option={conflict.option_b}
            label="B"
            selected={selectedOption === "b"}
            onSelect={() => setSelectedOption("b")}
          />
        </div>

        {/* Selection summary */}
        {selectedOption && (
          <div className="mx-6 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="text-sm">
                <span className="font-semibold text-emerald-800">Selected: </span>
                <span className="font-bold text-slate-900">{winning.value}</span>
                <span className="ml-2 text-slate-500">from {winning.source}</span>
                <div className="mt-0.5 text-xs text-slate-500">
                  Rejected:{" "}
                  <span className="line-through">{rejected.value}</span>
                  <span className="ml-1">({rejected.source})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mx-6 mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => onProvenanceOpen?.(conflict.field_path)}
            className="flex items-center gap-1.5 text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline focus:outline-none"
          >
            View field history
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-3">
            {/* No cancel while conflict is active — forces resolution */}
            <p className="text-xs text-slate-400">
              {selectedOption ? "" : "Select a value above to continue"}
            </p>
            <button
              type="button"
              onClick={handleResolve}
              disabled={!selectedOption || submitting}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Resolving…" : "Confirm Selection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

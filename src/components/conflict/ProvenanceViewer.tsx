// ProvenanceViewer
//
// Displays the complete audit trail for a single field path.
// Shows a timeline of all events: extracted → conflict detected →
// conflict resolved → confirmed, etc.
//
// Used as a panel/drawer alongside the main conflict resolution workflow.

import type React from "react";
import { useEffect } from "react";
import {
  X,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PenLine,
  Download,
  Clock,
} from "lucide-react";
import { useConflict, selectFieldHistory } from "./conflictStore";
import type { ProvenanceEntry, ProvenanceEventType } from "./types";
import type { DisplaySource } from "../ExtractedFieldsTable/fieldProjection";

// ─── Event config ─────────────────────────────────────────────────────────────

interface EventConfig {
  label: string;
  icon: React.ElementType;
  dotColor: string;
  lineColor: string;
  badgeColor: string;
}

const EVENT_CONFIG: Record<ProvenanceEventType, EventConfig> = {
  extracted: {
    label:      "Extracted from document",
    icon:       Download,
    dotColor:   "bg-blue-500",
    lineColor:  "bg-blue-200",
    badgeColor: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  },
  conflict_detected: {
    label:      "Conflict detected",
    icon:       AlertTriangle,
    dotColor:   "bg-rose-500",
    lineColor:  "bg-rose-200",
    badgeColor: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  },
  conflict_resolved: {
    label:      "Conflict resolved",
    icon:       GitBranch,
    dotColor:   "bg-emerald-500",
    lineColor:  "bg-emerald-200",
    badgeColor: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  confirmed: {
    label:      "Confirmed by reporter",
    icon:       CheckCircle2,
    dotColor:   "bg-emerald-400",
    lineColor:  "bg-emerald-200",
    badgeColor: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  },
  manual_edit: {
    label:      "Manual edit",
    icon:       PenLine,
    dotColor:   "bg-slate-400",
    lineColor:  "bg-slate-200",
    badgeColor: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
};

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: DisplaySource }) {
  const map: Record<DisplaySource, string> = {
    "Notice":          "bg-blue-50 text-blue-700",
    "Job Sheet":       "bg-cyan-50 text-cyan-700",
    "Reporter Profile":"bg-teal-50 text-teal-700",
    "Record":          "bg-slate-100 text-slate-600",
    "Computed":        "bg-orange-50 text-orange-700",
    "Manual":          "bg-slate-50 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${map[source]}`}>
      <FileText className="h-2.5 w-2.5 shrink-0" />
      {source}
    </span>
  );
}

// ─── Single timeline event ────────────────────────────────────────────────────

function TimelineEvent({
  entry,
  isLast,
}: {
  entry: ProvenanceEntry;
  isLast: boolean;
}) {
  const cfg = EVENT_CONFIG[entry.event_type];
  const Icon = cfg.icon;
  const date = new Date(entry.resolved_at);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.dotColor} shadow-sm`}
        >
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        {!isLast && (
          <div className={`mt-1 w-0.5 flex-1 ${cfg.lineColor} min-h-[20px]`} />
        )}
      </div>

      {/* Content */}
      <div className="pb-6 pt-0.5 min-w-0 flex-1">
        {/* Event type + time */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cfg.badgeColor}`}>
            {cfg.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />
            {dateStr} {timeStr}
          </span>
          <span className="text-[11px] text-slate-400">by {entry.resolution_user}</span>
        </div>

        {/* Value card */}
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          {entry.event_type === "conflict_resolved" ? (
            // Show both sides for resolved events
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                    Accepted
                  </p>
                  <p className="font-semibold text-slate-900 break-words">
                    {entry.winning_value}
                  </p>
                  <div className="mt-1">
                    <SourceBadge source={entry.source} />
                  </div>
                </div>
              </div>
              {entry.rejected_value && (
                <div className="flex items-start gap-2 border-t border-slate-100 pt-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                      Rejected
                    </p>
                    <p className="text-sm text-slate-400 line-through break-words">
                      {entry.rejected_value}
                    </p>
                    {entry.rejected_source && (
                      <div className="mt-1">
                        <SourceBadge source={entry.rejected_source} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : entry.event_type === "conflict_detected" ? (
            // Show both conflicting values for detected events
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Primary value</p>
                <p className="font-medium text-slate-800 break-words">{entry.value}</p>
                <div className="mt-1">
                  <SourceBadge source={entry.source} />
                </div>
              </div>
              {entry.rejected_value && (
                <div className="border-t border-slate-100 pt-2">
                  <p className="text-xs text-slate-500 mb-0.5">Conflicting value</p>
                  <p className="font-medium text-rose-700 break-words">{entry.rejected_value}</p>
                  {entry.rejected_source && (
                    <div className="mt-1">
                      <SourceBadge source={entry.rejected_source} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Simple single-value event
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-slate-800 break-words">{entry.value || "—"}</p>
              <div className="shrink-0">
                <SourceBadge source={entry.source} />
              </div>
            </div>
          )}

          {/* Confidence */}
          {entry.confidence_score !== null && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full ${
                      entry.confidence_score >= 0.9
                        ? "bg-emerald-500"
                        : entry.confidence_score >= 0.7
                        ? "bg-amber-400"
                        : "bg-red-400"
                    }`}
                    style={{ width: `${Math.round(entry.confidence_score * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] tabular-nums text-slate-400">
                  {Math.round(entry.confidence_score * 100)}% confidence
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Clock className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600">No history yet</p>
      <p className="mt-1 text-xs text-slate-400">
        Events will appear here as the field is extracted, conflicted, or confirmed.
      </p>
    </div>
  );
}

// ─── ProvenanceViewer ─────────────────────────────────────────────────────────

interface Props {
  caseId: string;
  fieldPath: string;
  fieldLabel: string;
  onClose: () => void;
}

export function ProvenanceViewer({ caseId, fieldPath, fieldLabel, onClose }: Props) {
  const { state, loadHistory } = useConflict();
  const history = selectFieldHistory(state, fieldPath);
  const activeConflict = state.active[fieldPath];

  // Load from Supabase when the viewer opens
  useEffect(() => {
    loadHistory(caseId, fieldPath);
  }, [caseId, fieldPath, loadHistory]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 bg-white px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900">{fieldLabel}</h3>
            {activeConflict ? (
              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                Unresolved
              </span>
            ) : history.some((e) => e.event_type === "conflict_resolved") ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{fieldPath}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label="Close provenance viewer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Active conflict banner */}
      {activeConflict && (
        <div className="border-b border-rose-200 bg-rose-50 px-5 py-3">
          <p className="text-xs font-semibold text-rose-700">
            This field has an unresolved conflict. Use the Resolve button in the table
            or the Conflict Resolution Modal to select the correct value.
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {history.length === 0 ? (
          <EmptyHistory />
        ) : (
          <div>
            {/* Newest-first label */}
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Most recent first — {history.length} event{history.length !== 1 ? "s" : ""}
            </p>
            {history.map((entry, i) => (
              <TimelineEvent
                key={entry.id}
                entry={entry}
                isLast={i === history.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer summary */}
      {history.length > 0 && (
        <div className="border-t border-slate-200 bg-white px-5 py-3">
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>
              {history.filter((e) => e.event_type === "conflict_resolved").length} resolution
              {history.filter((e) => e.event_type === "conflict_resolved").length !== 1 ? "s" : ""}
            </span>
            <span className="text-slate-300">·</span>
            <span>
              First seen:{" "}
              {new Date(
                history[history.length - 1].resolved_at,
              ).toLocaleDateString()}
            </span>
            <span className="text-slate-300">·</span>
            <span>
              Last updated:{" "}
              {new Date(history[0].resolved_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Pin, PinOff, Trash2, Plus, Search,
  AlertTriangle, ChevronDown, ChevronUp, Zap, LayoutList,
} from "lucide-react";
import { getLatestAutoSeedAudit } from "../../api/transcriptionService";
import { useKeyterms } from "./keytermStore";
import { DeepgramPayloadPreview } from "./DeepgramPayloadPreview";
import type { ManagedKeyterm, KeytermSource, KeytermView, AddKeytermForm } from "./types";
import { DEEPGRAM_MAX_TERMS, DEEPGRAM_MAX_TOKENS } from "./types";
import type { KeytermCategory } from "../../types/case";
import { useIntake } from "../../context/useIntake";
import { deriveKeytermsWithBudget, shouldAutoSeedDerivedKeyterms } from "../../lib/keytermDerivation";
import { shouldSuggestLowercaseKeyterm } from "../../lib/keyterms/manualKeytermHint";
import { mergeManagedDerivedKeyterms } from "../../lib/keyterms/managedKeyterms";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: KeytermCategory[] = [
  "proper_name", "company", "legal_term", "technical", "location", "other",
];

const SOURCES: KeytermSource[] = [
  "UFM Metadata", "Notice", "Scheduling Notes", "Contact Library", "Manual", "Learned",
];

const CATEGORY_LABEL: Record<KeytermCategory, string> = {
  proper_name: "Proper Name",
  company:     "Company",
  legal_term:  "Legal Term",
  technical:   "Technical",
  location:    "Location",
  other:       "Other",
};

const CATEGORY_COLOR: Record<KeytermCategory, string> = {
  proper_name: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  company:     "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  legal_term:  "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  technical:   "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  location:    "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  other:       "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
};

const SOURCE_COLOR: Record<KeytermSource, string> = {
  "Case Record":       "bg-emerald-100 text-emerald-800",
  "UFM Metadata":     "bg-blue-100 text-blue-800",
  "Notice":           "bg-sky-100 text-sky-800",
  "Scheduling Notes": "bg-cyan-100 text-cyan-800",
  "Contact Library":  "bg-teal-100 text-teal-800",
  "Manual":           "bg-slate-100 text-slate-700",
  "Learned":          "bg-orange-100 text-orange-800",
};

// ─── Limit gauge ──────────────────────────────────────────────────────────────

function LimitGauge({
  value, max, label, warningAt,
}: {
  value: number; max: number; label: string; warningAt: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const near = pct >= warningAt * 100;
  const over = value > max;
  const barColor = over ? "bg-red-500" : near ? "bg-amber-400" : "bg-emerald-500";
  const textColor = over ? "text-red-700" : near ? "text-amber-700" : "text-slate-700";

  return (
    <div className="flex min-w-[160px] flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${textColor}`}>
          {value} / {max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: KeytermCategory }) {
  return (
    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLOR[category]}`}>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: KeytermSource }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SOURCE_COLOR[source]}`}>
      {source}
    </span>
  );
}

// ─── Boost slider ─────────────────────────────────────────────────────────────

function BoostSlider({ id, boost }: { id: string; boost: number }) {
  const { setBoost } = useKeyterms();
  const pct = Math.round(boost * 10) / 10;
  const color = boost >= 0.8 ? "accent-emerald-500" : boost >= 0.6 ? "accent-amber-400" : "accent-slate-400";
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0} max={1} step={0.1}
        value={boost}
        onChange={(e) => setBoost(id, parseFloat(e.target.value))}
        className={`h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-slate-200 ${color}`}
        title={`Boost: ${pct}`}
      />
      <span className="w-6 tabular-nums text-[11px] text-slate-500">{pct.toFixed(1)}</span>
    </div>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: number }) {
  const color =
    priority >= 80 ? "text-emerald-600" :
    priority >= 50 ? "text-amber-600" :
                     "text-slate-400";
  return (
    <span className={`tabular-nums text-[11px] font-bold ${color}`} title="Priority score">
      P{priority}
    </span>
  );
}

// ─── Single keyterm row ───────────────────────────────────────────────────────

function KeytermRow({ term }: { term: ManagedKeyterm }) {
  const { toggleSelect, togglePin, deleteTerm } = useKeyterms();
  const isExcluded = !term.selected;

  return (
    <div
      className={`group flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 transition-colors last:border-0 ${
        isExcluded ? "opacity-50" : ""
      } ${term.pinned ? "bg-amber-50/40" : "hover:bg-slate-50/80"}`}
    >
      {/* Pin indicator */}
      {term.pinned && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Pinned" />
      )}

      {/* Enable/disable toggle */}
      <button
        type="button"
        onClick={() => toggleSelect(term.id)}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          term.selected
            ? "border-blue-500 bg-blue-500"
            : "border-slate-300 hover:border-slate-400"
        }`}
        title={term.selected ? "Deselect (exclude from request)" : "Select (include in request)"}
      >
        {term.selected && (
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>

      {/* Term name */}
      <span
        className={`min-w-0 flex-1 truncate text-sm font-medium ${
          isExcluded ? "text-slate-400 line-through" : "text-slate-800"
        }`}
        title={term.term}
      >
        {term.term}
      </span>

      {/* Token count */}
      <span className="shrink-0 tabular-nums text-[11px] text-slate-400" title="Token count">
        {term.token_count}T
      </span>

      {/* Priority */}
      <PriorityBadge priority={term.priority} />

      {/* Category */}
      <CategoryBadge category={term.category} />

      {/* Source */}
      <SourceBadge source={term.source} />

      {/* Boost */}
      <BoostSlider id={term.id} boost={term.boost} />

      {/* Actions — show on hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => togglePin(term.id)}
          title={term.pinned ? "Unpin (allow pruning)" : "Pin (protect from pruning)"}
          className={`rounded p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
            term.pinned
              ? "text-amber-500 hover:bg-amber-100"
              : "text-slate-400 hover:bg-slate-100 hover:text-amber-500"
          }`}
        >
          {term.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => deleteTerm(term.id)}
          title="Delete keyterm"
          className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Add keyterm form ─────────────────────────────────────────────────────────

function AddKeytermForm({
  onClose,
  record,
}: {
  onClose: () => void;
  record: ReturnType<typeof useIntake>["record"];
}) {
  const { addTerm } = useKeyterms();
  const [form, setForm] = useState<AddKeytermForm>({
    term:     "",
    boost:    0.5,
    category: "proper_name",
    source:   "Manual",
    notes:    "",
  });
  const showLowercaseHint = shouldSuggestLowercaseKeyterm(form.term, record);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.term.trim()) return;
    addTerm(form);
    setForm({ term: "", boost: 0.5, category: "proper_name", source: "Manual", notes: "" });
    onClose();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-slate-200 bg-slate-50 px-4 py-4"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        Add New Keyterm
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Term */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Term <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={form.term}
            onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
            placeholder="e.g. Meridian Infrastructure Partners"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
          {showLowercaseHint && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span>Technical or common terms should be lowercase — Deepgram reproduces capitalization exactly.</span>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, term: current.term.toLowerCase() }))}
                className="shrink-0 rounded-md border border-amber-300 bg-white px-2 py-1 font-semibold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                make lowercase
              </button>
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as KeytermCategory }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>

        {/* Source */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Source</label>
          <select
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as KeytermSource }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          >
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Boost */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Boost: {form.boost.toFixed(1)}
          </label>
          <input
            type="range"
            min={0} max={1} step={0.1}
            value={form.boost}
            onChange={(e) => setForm((f) => ({ ...f, boost: parseFloat(e.target.value) }))}
            className="w-full accent-blue-500"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
            <span>0.0 general</span>
            <span>0.7 important</span>
            <span>1.0 critical</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Notes (internal)</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional note for reporter"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 focus:outline-none"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!form.term.trim()}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 disabled:opacity-40"
        >
          Add Keyterm
        </button>
      </div>
    </form>
  );
}

// ─── View tab bar ─────────────────────────────────────────────────────────────

function ViewTabs() {
  const { state, setView, state: { terms } } = useKeyterms();

  const counts: Record<KeytermView, number> = {
    all:      terms.length,
    selected: terms.filter((t) => t.selected).length,
    pinned:   terms.filter((t) => t.pinned).length,
    excluded: terms.filter((t) => !t.selected).length,
  };

  const tabs: { view: KeytermView; label: string }[] = [
    { view: "all",      label: "All" },
    { view: "selected", label: "Selected" },
    { view: "pinned",   label: "Pinned" },
    { view: "excluded", label: "Excluded" },
  ];

  return (
    <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
      {tabs.map(({ view, label }) => (
        <button
          key={view}
          type="button"
          onClick={() => setView(view)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors focus:outline-none ${
            state.view === view
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {label}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              state.view === view ? "bg-slate-100 text-slate-600" : "text-slate-400"
            }`}
          >
            {counts[view]}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Prune notification ───────────────────────────────────────────────────────

function PruneNotice() {
  const { state } = useKeyterms();
  if (state.lastPruned.length === 0) return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
      <p className="text-xs text-amber-800">
        <span className="font-semibold">{state.lastPruned.length} term{state.lastPruned.length !== 1 ? "s" : ""} auto-deselected</span>
        {" "}to stay within Deepgram limits. Pinned terms were preserved.
      </p>
    </div>
  );
}

// ─── Limit warning banner ────────────────────────────────────────────────────

function LimitWarning() {
  const { limits, prune } = useKeyterms();
  if (limits.withinTermLimit && limits.withinTokenLimit) return null;

  return (
    <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
      <p className="flex-1 text-xs text-red-800">
        {!limits.withinTermLimit && (
          <span className="font-semibold">
            Term limit exceeded by {limits.termOverage}.{" "}
          </span>
        )}
        {!limits.withinTokenLimit && (
          <span className="font-semibold">
            Token limit exceeded by {limits.tokenOverage}.{" "}
          </span>
        )}
        Pinned terms will be protected.
      </p>
      <button
        type="button"
        onClick={prune}
        className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
      >
        Auto-Prune
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ view }: { view: KeytermView }) {
  const messages: Record<KeytermView, string> = {
    all:      "No keyterms yet. Add a term using the button above.",
    selected: "No selected keyterms. Check the All tab and enable terms.",
    pinned:   "No pinned keyterms. Pin important terms to protect them from pruning.",
    excluded: "No excluded terms. Deselected terms will appear here.",
  };
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <LayoutList className="mb-3 h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">{messages[view]}</p>
    </div>
  );
}

function AutoSeedAuditPanel({
  audit,
}: {
  audit: NonNullable<Awaited<ReturnType<typeof getLatestAutoSeedAudit>>>;
}) {
  if (
    audit.added_terms.length === 0
    && audit.already_present_terms.length === 0
    && audit.dropped_for_cap_terms.length === 0
  ) {
    return null;
  }

  return (
    <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
      <div className="flex items-center gap-2">
        <span className="font-semibold uppercase tracking-[0.18em] text-emerald-700">Last Auto-Seed Audit</span>
        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-emerald-700">
          {audit.final_auto_seeded_terms.length} added to request
        </span>
      </div>
      {audit.added_terms.length > 0 && (
        <p className="mt-2">
          <span className="font-semibold">Added:</span>
          {" "}
          {audit.added_terms.join(", ")}
        </p>
      )}
      {audit.already_present_terms.length > 0 && (
        <p className="mt-1">
          <span className="font-semibold">Already present:</span>
          {" "}
          {audit.already_present_terms.join(", ")}
        </p>
      )}
      {audit.dropped_for_cap_terms.length > 0 && (
        <p className="mt-1 text-amber-800">
          <span className="font-semibold">Dropped for cap:</span>
          {" "}
          {audit.dropped_for_cap_terms.join(", ")}
        </p>
      )}
    </div>
  );
}

// ─── Column header row ────────────────────────────────────────────────────────

function ColumnHeaders() {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-1.5">
      <span className="w-4 shrink-0" />
      <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Term</span>
      <span className="w-6 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tok</span>
      <span className="w-7 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Pri</span>
      <span className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</span>
      <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Source</span>
      <span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Boost</span>
      <span className="w-14 shrink-0" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DeepgramKeytermManager() {
  const {
    state, limits, visibleTerms, setSearch, togglePayload, load,
  } = useKeyterms();
  const { record } = useIntake();

  const [showAddForm, setShowAddForm] = useState(false);
  const autoSeededCaseIdsRef = useRef(new Set<string>());
  const [lastDerivedSummary, setLastDerivedSummary] = useState<{
    included: number;
    dropped: number;
    estimatedTokens: number;
  } | null>(null);
  const [latestAutoSeedAudit, setLatestAutoSeedAudit] = useState<Awaited<ReturnType<typeof getLatestAutoSeedAudit>>>(null);

  function applyDerivedKeyterms() {
    const result = deriveKeytermsWithBudget(record);
    const merged = mergeManagedDerivedKeyterms(state.terms, result.included);
    const addedCount = merged.length - state.terms.length;
    load(merged);
    setLastDerivedSummary({
      included: addedCount,
      dropped: result.dropped.length,
      estimatedTokens: result.estimatedTokens,
    });
    return result;
  }

  useEffect(() => {
    const alreadyAttempted = autoSeededCaseIdsRef.current.has(record.case_id);
    if (!shouldAutoSeedDerivedKeyterms(record, alreadyAttempted)) {
      return;
    }

    applyDerivedKeyterms();
    autoSeededCaseIdsRef.current.add(record.case_id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.case_id, record.deepgram.keyterms, record.witnesses, record.attorneys]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const audit = await getLatestAutoSeedAudit(record.case_id);
        if (!cancelled) {
          setLatestAutoSeedAudit(audit);
        }
      } catch {
        if (!cancelled) {
          setLatestAutoSeedAudit(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [record.case_id]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* ── Top toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <ViewTabs />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={state.search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms…"
            className="w-44 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Limit gauges */}
          <div className="flex items-center gap-4 border-r border-slate-200 pr-3">
            <LimitGauge
              value={limits.termCount}
              max={DEEPGRAM_MAX_TERMS}
              label="Selected Terms"
              warningAt={0.8}
            />
            <LimitGauge
              value={limits.tokenCount}
              max={DEEPGRAM_MAX_TOKENS}
              label="Token Usage"
              warningAt={0.8}
            />
          </div>

          {/* Payload preview toggle */}
          <button
            type="button"
            onClick={togglePayload}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              state.showPayload
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            {state.showPayload ? "Hide Payload" : "View Request"}
            {state.showPayload
              ? <ChevronUp className="h-3.5 w-3.5 opacity-60" />
              : <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            }
          </button>

          <button
            type="button"
            onClick={() => applyDerivedKeyterms()}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Generate from case data
          </button>

          {/* Add keyterm */}
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 ${
              showAddForm
                ? "bg-slate-200 text-slate-700"
                : "bg-slate-900 text-white hover:bg-slate-700"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Keyterm
          </button>
        </div>
      </div>

      {lastDerivedSummary && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          Generated {lastDerivedSummary.included} derived term{lastDerivedSummary.included !== 1 ? "s" : ""} from case data.
          {lastDerivedSummary.dropped > 0 ? ` ${lastDerivedSummary.dropped} dropped for budget.` : ""}
          {" "}Estimated token usage: {lastDerivedSummary.estimatedTokens}/{DEEPGRAM_MAX_TOKENS}.
        </div>
      )}

      {latestAutoSeedAudit && <AutoSeedAuditPanel audit={latestAutoSeedAudit} />}

      {/* ── Limit warning ── */}
      <LimitWarning />

      {/* ── Prune notice ── */}
      <PruneNotice />

      {/* ── Payload preview panel ── */}
      {state.showPayload && (
        <div className="border-b border-slate-200">
          <DeepgramPayloadPreview />
        </div>
      )}

      {/* ── Add form ── */}
      {showAddForm && <AddKeytermForm onClose={() => setShowAddForm(false)} record={record} />}

      {/* ── Column headers ── */}
      <ColumnHeaders />

      {/* ── Term list ── */}
      <div className="flex-1 overflow-y-auto">
        {visibleTerms.length === 0 ? (
          <EmptyState view={state.view} />
        ) : (
          visibleTerms.map((term) => <KeytermRow key={term.id} term={term} />)
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-slate-700">{state.terms.length}</strong> total keyterms
          </span>
          <span>
            <strong className="text-blue-700">{limits.termCount}</strong> selected
          </span>
          <span>
            <strong className="text-amber-700">
              {state.terms.filter((t) => t.pinned).length}
            </strong> pinned
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {state.terms.some((t) => t.pinned) && (
            <>
              <Pin className="h-3 w-3 text-amber-500" />
              <span className="text-amber-700">Pinned terms immune to pruning</span>
            </>
          )}
          {limits.withinTermLimit && limits.withinTokenLimit && limits.termCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.485 1.929a1 1 0 0 1 0 1.414l-7.07 7.071a1 1 0 0 1-1.415 0L1.515 6.929a1 1 0 1 1 1.414-1.414L6 8.586l6.07-6.071a1 1 0 0 1 1.415 0z" />
              </svg>
              Ready for Deepgram
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

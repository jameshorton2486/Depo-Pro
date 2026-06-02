// App.tsx — standalone dev preview only.
// Production entry: main.tsx → mountEditor().
import { useState } from "react";
import { ExtractedFieldsTable } from "./components/ExtractedFieldsTable/ExtractedFieldsTable";
import { mockCaseRecord, mockConflictAlternates } from "./components/ExtractedFieldsTable/mockRecord";
import { ConflictProvider, useConflict, selectActiveConflicts } from "./components/conflict/conflictStore";

const DEMO_CASE_ID = "case_mock_001";

// ─── Active conflicts summary banner ─────────────────────────────────────────

function ConflictSummaryBanner() {
  const { state, openModal } = useConflict();
  const active = selectActiveConflicts(state);
  if (active.length === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100">
        <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-rose-800">
          {active.length} unresolved conflict{active.length !== 1 ? "s" : ""} — certification is blocked
        </p>
        <p className="text-xs text-rose-600 mt-0.5">
          {active.map((c) => c.field_label).join(", ")}
        </p>
      </div>
      <button
        type="button"
        onClick={() => openModal(active[0].field_path)}
        className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1"
      >
        Resolve Now
      </button>
    </div>
  );
}

// ─── Inner page (inside provider so it can use hooks) ─────────────────────────

function IntakePage() {
  const [tab, setTab] = useState<"table" | "guide">("table");

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">DEPO-PRO</p>
            <p className="text-sm font-semibold text-slate-800">Smith v. Meridian Infrastructure Partners</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              Stage 1 — Intake
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              Case No. 2024-CV-08821
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Extracted Fields Review
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review all extracted metadata. Resolve conflicts, confirm values, and verify required fields before proceeding to Stage 2.
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit shadow-sm">
          {(["table", "guide"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors focus:outline-none ${
                tab === t
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "table" ? "Fields Review" : "System Guide"}
            </button>
          ))}
        </div>

        {tab === "table" ? (
          <>
            <ConflictSummaryBanner />
            <ExtractedFieldsTable
              caseId={DEMO_CASE_ID}
              record={mockCaseRecord}
              conflictAlternates={mockConflictAlternates}
            />
          </>
        ) : (
          <GuidePanel />
        )}
      </main>
    </div>
  );
}

// ─── System guide panel ───────────────────────────────────────────────────────

function GuidePanel() {
  const sections = [
    {
      title: "Conflict Resolution",
      color: "rose",
      items: [
        "Conflicts occur when two document sources disagree on the same field value.",
        "The system never silently resolves conflicts — operator selection is always required.",
        "Click the Resolve button in the Conflict column to open the resolution modal.",
        "Each resolution is stored permanently with timestamp and operator identity.",
        "Fields with active conflicts are blocked from the Confirmed state.",
      ],
    },
    {
      title: "Provenance History",
      color: "blue",
      items: [
        "Every field maintains a full audit trail of all extraction, conflict, and resolution events.",
        "Click the history icon (clock) on any row to open the Provenance Viewer panel.",
        "Resolved conflicts show both the accepted value and the rejected value in the timeline.",
        "History is persisted to Supabase and survives page reloads.",
      ],
    },
    {
      title: "Field Confirmation",
      color: "emerald",
      items: [
        "Use the Confirm button on rows with status Needs Confirmation to mark values as verified.",
        "Confirm All Visible bulk-confirms all non-conflicted visible rows.",
        "Fields with active conflicts cannot be confirmed until the conflict is resolved.",
        "Required fields (marked *) must be confirmed before Stage 6 Certification.",
      ],
    },
    {
      title: "Sources",
      color: "cyan",
      items: [
        "Notice — extracted from the Notice of Deposition document.",
        "Job Sheet — extracted from the scheduling/job sheet (location, times).",
        "Reporter Profile — imported from the reporter's stored profile.",
        "Manual — entered directly by the operator.",
        "Computed — derived from other field values.",
      ],
    },
  ];

  const colorMap: Record<string, string> = {
    rose:    "border-rose-200 bg-rose-50",
    blue:    "border-blue-200 bg-blue-50",
    emerald: "border-emerald-200 bg-emerald-50",
    cyan:    "border-cyan-200 bg-cyan-50",
  };
  const titleMap: Record<string, string> = {
    rose:    "text-rose-800",
    blue:    "text-blue-800",
    emerald: "text-emerald-800",
    cyan:    "text-cyan-800",
  };
  const dotMap: Record<string, string> = {
    rose:    "bg-rose-400",
    blue:    "bg-blue-400",
    emerald: "bg-emerald-400",
    cyan:    "bg-cyan-400",
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {sections.map((s) => (
        <div
          key={s.title}
          className={`rounded-xl border p-5 ${colorMap[s.color]}`}
        >
          <h3 className={`mb-3 text-sm font-bold ${titleMap[s.color]}`}>{s.title}</h3>
          <ul className="space-y-1.5">
            {s.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotMap[s.color]}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ConflictProvider>
      <IntakePage />
    </ConflictProvider>
  );
}

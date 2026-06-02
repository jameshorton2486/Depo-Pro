// App.tsx — standalone dev preview only.
// Production entry: main.tsx → mountEditor().
import { useState } from "react";
import { ExtractedFieldsTable } from "./components/ExtractedFieldsTable/ExtractedFieldsTable";
import { mockCaseRecord, mockConflictAlternates } from "./components/ExtractedFieldsTable/mockRecord";
import { ConflictProvider, useConflict, selectActiveConflicts } from "./components/conflict/conflictStore";
import { DeepgramKeytermManager } from "./components/DeepgramKeytermManager/DeepgramKeytermManager";
import { KeytermProvider } from "./components/DeepgramKeytermManager/keytermStore";
import type { ManagedKeyterm } from "./components/DeepgramKeytermManager/types";
import { countTokens } from "./lib/keytermRanker";

const DEMO_CASE_ID = "case_mock_001";

// ─── Mock keyterms seed data ──────────────────────────────────────────────────

function mk(
  term: string,
  boost: number,
  category: ManagedKeyterm["category"],
  source: ManagedKeyterm["source"],
  selected = true,
  pinned = false,
  confidence = 0.85,
): ManagedKeyterm {
  return {
    id:          `seed_${term.replace(/\s+/g, "_").toLowerCase()}`,
    term,
    boost,
    category,
    source,
    notes:       "",
    selected,
    pinned,
    priority:    0,
    confidence,
    token_count: countTokens(term),
  };
}

const SEED_KEYTERMS: ManagedKeyterm[] = [
  mk("Smith v. Meridian Infrastructure Partners", 0.7, "legal_term",  "UFM Metadata", true,  true,  1.0),
  mk("Junior Hernandez",                          0.9, "proper_name", "UFM Metadata", true,  true,  1.0),
  mk("Yunior Hernandez",                          0.8, "proper_name", "Notice",       true,  false, 0.79),
  mk("Meridian Infrastructure Partners",          0.7, "company",     "UFM Metadata", true,  false, 1.0),
  mk("Rebecca Thornton",                          0.8, "proper_name", "UFM Metadata", true,  false, 0.94),
  mk("David Morales",                             0.7, "proper_name", "UFM Metadata", true,  false, 0.81),
  mk("Thornton and Associates",                   0.6, "company",     "UFM Metadata", true,  false, 0.92),
  mk("Superior Court of California",              0.5, "legal_term",  "UFM Metadata", true,  false, 0.88),
  mk("Pacific Reporting Services",                0.5, "company",     "UFM Metadata", true,  false, 1.0),
  mk("Jennifer Castillo",                         0.6, "proper_name", "UFM Metadata", true,  false, 1.0),
  mk("Los Angeles",                               0.5, "location",    "Notice",       true,  false, 0.96),
  mk("350 South Grand Avenue",                    0.4, "location",    "Scheduling Notes", true, false, 0.85),
  mk("examining attorney",                        0.5, "legal_term",  "Manual",       true,  false, 1.0),
  mk("opposing counsel",                          0.5, "legal_term",  "Manual",       true,  false, 1.0),
  mk("deposition",                                0.3, "legal_term",  "Manual",       true,  false, 1.0),
  mk("cross-examination",                         0.4, "legal_term",  "Manual",       true,  false, 1.0),
  mk("infrastructure project",                    0.5, "technical",   "Notice",       true,  false, 0.72),
  mk("CSR",                                       0.6, "legal_term",  "UFM Metadata", true,  false, 1.0),
  mk("stipulation",                               0.4, "legal_term",  "Learned",      false, false, 0.7),
  mk("voir dire",                                 0.4, "legal_term",  "Learned",      false, false, 0.7),
];

// ─── Conflict summary banner ──────────────────────────────────────────────────

function ConflictSummaryBanner() {
  const { state, openModal } = useConflict();
  const active = selectActiveConflicts(state);
  if (active.length === 0) return null;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100">
        <svg className="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-rose-800">
          {active.length} unresolved conflict{active.length !== 1 ? "s" : ""} — certification is blocked
        </p>
        <p className="mt-0.5 text-xs text-rose-600">{active.map((c) => c.field_label).join(", ")}</p>
      </div>
      <button
        type="button"
        onClick={() => openModal(active[0].field_path)}
        className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none"
      >
        Resolve Now
      </button>
    </div>
  );
}

// ─── Top nav ──────────────────────────────────────────────────────────────────

function TopNav({ activeTab }: { activeTab: string }) {
  return (
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
            {activeTab === "fields" ? "Fields Review" : "Keyterm Manager"}
          </span>
        </div>
      </div>
    </header>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function IntakePage() {
  const [tab, setTab] = useState<"fields" | "keyterms">("fields");

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <TopNav activeTab={tab} />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Case Intake
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review extracted fields, resolve conflicts, and configure Deepgram keyterms before beginning transcription.
          </p>
        </div>

        {/* Tab bar */}
        <div className="mb-5 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit shadow-sm">
          {([
            { id: "fields",   label: "Extracted Fields Review" },
            { id: "keyterms", label: "Deepgram Keyterm Manager" },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors focus:outline-none ${
                tab === id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "fields" ? (
          <>
            <ConflictSummaryBanner />
            <ExtractedFieldsTable
              caseId={DEMO_CASE_ID}
              record={mockCaseRecord}
              conflictAlternates={mockConflictAlternates}
            />
          </>
        ) : (
          <DeepgramKeytermManager />
        )}
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ConflictProvider>
      <KeytermProvider initialTerms={SEED_KEYTERMS}>
        <IntakePage />
      </KeytermProvider>
    </ConflictProvider>
  );
}

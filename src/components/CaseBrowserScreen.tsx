import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileAudio2, FileSearch, FolderOpen, ListMusic, Plus, Search } from "lucide-react";
import { listRecentCases, type CaseBrowserSummary } from "../api/caseService";
import { caseStatusFromStage, matchesCaseSearch } from "../lib/caseLifecycle";
import { useCase } from "../context/CaseContext";
import { AuthStatusChip } from "./AuthGate/AuthGate";

function StatusChip({
  stage,
  certified,
}: {
  stage: CaseBrowserSummary["stage"];
  certified: boolean;
}) {
  const status = caseStatusFromStage(stage, certified);
  const classes =
    status.tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status.tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}>
      {status.label}
    </span>
  );
}

function CaseCard({
  summary,
  onOpen,
}: {
  summary: CaseBrowserSummary;
  onOpen: (summary: CaseBrowserSummary) => Promise<void>;
}) {
  const updatedLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(summary.updated_at));

  return (
    <button
      type="button"
      onClick={() => void onOpen(summary)}
      className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{summary.caseName}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{summary.case_id}</p>
        </div>
        <StatusChip stage={summary.stage} certified={summary.certified} />
      </div>

      <div className="space-y-1 text-xs text-slate-600">
        <p className="line-clamp-2">{summary.caseStyle || "No case style saved yet."}</p>
        <p>{summary.witnessName ? `Witness: ${summary.witnessName}` : "Witness not entered yet."}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
          <FileAudio2 size={12} className={summary.hasAudio ? "text-blue-600" : "text-slate-400"} />
          {summary.hasAudio ? "Audio" : "No Audio"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
          <ListMusic size={12} className={summary.hasTranscript ? "text-blue-600" : "text-slate-400"} />
          {summary.hasTranscript ? "Transcript" : "No Transcript"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
          <FolderOpen size={12} className={summary.exhibitCount > 0 ? "text-blue-600" : "text-slate-400"} />
          {summary.exhibitCount} exhibit{summary.exhibitCount === 1 ? "" : "s"}
        </span>
      </div>

      <p className="text-[11px] text-slate-400">Updated {updatedLabel}</p>
    </button>
  );
}

export function CaseBrowserScreen() {
  const { browserQuery, setBrowserQuery, openCase, createAndOpen } = useCase();
  const [recentCases, setRecentCases] = useState<CaseBrowserSummary[]>([]);
  const [openCaseId, setOpenCaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecentCases() {
      setLoading(true);
      setError(null);

      try {
        const summaries = await listRecentCases();
        if (!cancelled) {
          setRecentCases(summaries);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecentCases();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCases = useMemo(
    () => recentCases.filter((item) => matchesCaseSearch(item, browserQuery)),
    [browserQuery, recentCases],
  );

  async function handleOpen(summary: CaseBrowserSummary) {
    setOpenError(null);
    await openCase(summary.case_id, summary.stage);
  }

  async function handleOpenById() {
    const normalized = openCaseId.trim();
    if (!normalized) {
      return;
    }

    setOpenError(null);

    try {
      await openCase(normalized);
    } catch (openByIdError) {
      setOpenError(openByIdError instanceof Error ? openByIdError.message : String(openByIdError));
    }
  }

  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-5 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Case Browser</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Open a saved case or start a new deposition.</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Case content stays in Supabase. This screen only selects the active case identity for the single mounted editor shell.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void createAndOpen()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <Plus size={16} />
              New Deposition
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <AuthStatusChip />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_300px]">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <input
                value={browserQuery}
                onChange={(event) => setBrowserQuery(event.target.value)}
                placeholder="Search by case style, witness, or case ID"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <input
                value={openCaseId}
                onChange={(event) => setOpenCaseId(event.target.value)}
                placeholder="Open by case ID"
                className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => void handleOpenById()}
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Open
              </button>
            </div>
          </div>

          {openError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle size={14} />
              {openError}
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading recent cases...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
            Failed to load recent cases: {error}
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <FileSearch className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {recentCases.length === 0 ? "No cases yet." : "No matches for that search."}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {recentCases.length === 0
                ? "Create the first deposition case to start capturing durable Intake data."
                : "Try a different witness name, case style, or case ID."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCases.map((summary) => (
              <CaseCard key={summary.case_id} summary={summary} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

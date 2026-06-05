import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, FileCheck2 } from "lucide-react";
import { workspaceApi } from "../../api/workspaceService";
import { useIntake } from "../../context/IntakeContext";
import { useStage } from "../../context/StageContext";

interface PersistedCertificationState {
  certificationDate: string | null;
  certificationStatement: string;
  checklist: {
    review_complete: boolean;
    speaker_mapping_complete: boolean;
    confidence_review_complete: boolean;
    exhibits_complete: boolean;
    ufm_complete: boolean;
  };
}

const DEFAULT_STATEMENT =
  "I certify that the transcript has been reviewed and is ready for export.";

function storageKey(jobId: string) {
  return `depo-pro.certification.${jobId}.v1`;
}

function readCertification(jobId: string): PersistedCertificationState | null {
  try {
    const raw = localStorage.getItem(storageKey(jobId));
    return raw ? (JSON.parse(raw) as PersistedCertificationState) : null;
  } catch {
    return null;
  }
}

function writeCertification(jobId: string, value: PersistedCertificationState) {
  try {
    localStorage.setItem(storageKey(jobId), JSON.stringify(value));
  } catch {
    // Best-effort local persistence only.
  }
}

export function CertificationScreen({ jobId }: { jobId: string }) {
  const { record } = useIntake();
  const { setStage } = useStage();
  const [loading, setLoading] = useState(true);
  const [persisted, setPersisted] = useState<PersistedCertificationState>({
    certificationDate: null,
    certificationStatement: DEFAULT_STATEMENT,
    checklist: {
      review_complete: false,
      speaker_mapping_complete: false,
      confidence_review_complete: false,
      exhibits_complete: false,
      ufm_complete: false,
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const stored = readCertification(jobId);
      const certify = await workspaceApi.getCertifyStatus(jobId).catch(() => null);
      if (cancelled) return;

      setPersisted(
        stored ?? {
          certificationDate: null,
          certificationStatement: DEFAULT_STATEMENT,
          checklist: {
            review_complete: certify?.review_complete ?? false,
            speaker_mapping_complete: certify?.speaker_mapping_complete ?? false,
            confidence_review_complete: certify?.confidence_review_complete ?? false,
            exhibits_complete: false,
            ufm_complete: false,
          },
        }
      );
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (loading) return;
    writeCertification(jobId, persisted);
  }, [jobId, loading, persisted]);

  const checklistEntries = useMemo(
    () => [
      ["review_complete", "Transcript review complete"],
      ["speaker_mapping_complete", "Speaker mapping complete"],
      ["confidence_review_complete", "Confidence review complete"],
      ["exhibits_complete", "Exhibits reviewed"],
      ["ufm_complete", "UFM insertions reviewed"],
    ] as const,
    []
  );

  const allComplete = checklistEntries.every(
    ([key]) => persisted.checklist[key] && persisted.certificationStatement.trim().length > 0
  );

  useEffect(() => {
    if (!allComplete || persisted.certificationDate) return;
    setPersisted((current) => ({
      ...current,
      certificationDate: new Date().toISOString().slice(0, 10),
    }));
  }, [allComplete, persisted.certificationDate]);

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <FileCheck2 size={18} className="text-blue-700" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage 6</p>
            <h1 className="text-lg font-semibold text-slate-900">Certification</h1>
          </div>
          <span className="ml-auto text-xs text-slate-500">{record.caption.case_name.value || jobId}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-4xl space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Certification Checklist</h2>
                <p className="text-xs text-slate-500">Complete the required checks before export.</p>
              </div>
              {persisted.certificationDate && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Certified {persisted.certificationDate}
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading certification status…</p>
            ) : (
              <div className="space-y-3">
                {checklistEntries.map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={persisted.checklist[key]}
                      onChange={(e) =>
                        setPersisted((current) => ({
                          ...current,
                          checklist: {
                            ...current.checklist,
                            [key]: e.target.checked,
                          },
                          certificationDate: null,
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Certification Statement</h2>
            <textarea
              value={persisted.certificationStatement}
              onChange={(e) =>
                setPersisted((current) => ({
                  ...current,
                  certificationStatement: e.target.value,
                  certificationDate: null,
                }))
              }
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className={allComplete ? "text-emerald-600" : "text-slate-300"} />
              <p className="text-sm font-medium text-slate-800">
                {allComplete
                  ? "Certification complete. Export is now available."
                  : "Complete all checklist items and the statement to continue to export."}
              </p>
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            type="button"
            onClick={() => setStage("workspace")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft size={13} />
            Back to Workspace
          </button>

          <button
            type="button"
            onClick={() => setStage("export")}
            disabled={!allComplete}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to Export
            <ChevronRight size={13} />
          </button>
        </div>
      </footer>
    </div>
  );
}

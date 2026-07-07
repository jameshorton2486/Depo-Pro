import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, FileCheck2 } from "lucide-react";
import { saveCase } from "../../api/caseService";
import { workspaceApi } from "../../api/workspaceService";
import { useCase } from "../../context/useCase";
import { useIntake } from "../../context/useIntake";
import { useStage } from "../../context/StageContext";
import { isCaseUfmReady } from "../../lib/ufm/requiredFields";
import type { CaseCertification } from "../../types/case";
import { WorkflowStageNav } from "../WorkflowStageNav";
import { WorkspaceSidebar } from "../WorkspaceSidebar/WorkspaceSidebar";

const DEFAULT_STATEMENT =
  "I certify that the transcript has been reviewed and is ready for export.";

function buildDefaultCertification(): CaseCertification {
  return {
    certification_date: null,
    certification_statement: DEFAULT_STATEMENT,
    checklist: {
      review_complete: false,
      speaker_mapping_complete: false,
      confidence_review_complete: false,
      exhibits_complete: false,
      ufm_complete: false,
    },
    signature_hash: null,
  };
}

export function CertificationScreen({ jobId }: { jobId: string }) {
  const { registerNavigationGuard } = useCase();
  const { record, setCertification, dirty } = useIntake();
  const { setStage } = useStage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const certification = record.certification ?? buildDefaultCertification();
  const zeroExhibitsAffirmed = useMemo(
    () => record.exhibits.length === 0 && record.stage_completion.exhibits,
    [record.exhibits.length, record.stage_completion.exhibits],
  );
  const exhibitsHaveRequiredData = useMemo(
    () => zeroExhibitsAffirmed
      || (record.exhibits.length > 0 && record.exhibits.every((exhibit) => exhibit.label.trim().length > 0 && Boolean(exhibit.file_url || exhibit.filename))),
    [record.exhibits, zeroExhibitsAffirmed],
  );
  const ufmHasRequiredData = useMemo(() => isCaseUfmReady(record), [record]);
  const derivedExhibitsComplete = useMemo(
    () => record.stage_completion.exhibits && exhibitsHaveRequiredData,
    [exhibitsHaveRequiredData, record.stage_completion.exhibits],
  );
  const derivedUfmComplete = useMemo(
    () => record.stage_completion.ufm && ufmHasRequiredData,
    [record.stage_completion.ufm, ufmHasRequiredData],
  );

  const persistCertification = useCallback(async () => {
    setSaving(true);
    try {
      await saveCase(record);
    } finally {
      setSaving(false);
    }
  }, [record]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (record.certification) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const certify = await workspaceApi.getCertifyStatus(jobId).catch(() => null);
      if (cancelled) return;

      setCertification({
        certification_date: null,
        certification_statement: DEFAULT_STATEMENT,
        checklist: {
          review_complete: certify?.review_complete ?? false,
          speaker_mapping_complete: certify?.speaker_mapping_complete ?? false,
          confidence_review_complete: certify?.confidence_review_complete ?? false,
          exhibits_complete: false,
          ufm_complete: false,
        },
        signature_hash: null,
      });
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId, record.certification, setCertification]);

  useEffect(() => {
    if (loading || !record.certification) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void persistCertification();
    }, 400);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [loading, persistCertification, record.certification]);

  useEffect(() => {
    registerNavigationGuard({
      dirty: dirty || saving,
      save: persistCertification,
    });

    return () => {
      registerNavigationGuard(null);
    };
  }, [dirty, persistCertification, registerNavigationGuard, saving]);

  const updateCertification = useCallback((next: CaseCertification) => {
    setCertification(next);
  }, [setCertification]);

  const checklistEntries = useMemo(
    () => [
      ["review_complete", "Transcript review complete"],
      ["speaker_mapping_complete", "Speaker mapping complete"],
      ["confidence_review_complete", "Confidence review complete"],
      ["exhibits_complete", "Exhibits reviewed"],
      ["ufm_complete", "UFM insertions reviewed"],
    ] as const,
    [],
  );

  useEffect(() => {
    if (!record.certification) {
      return;
    }

    if (
      certification.checklist.exhibits_complete === derivedExhibitsComplete
      && certification.checklist.ufm_complete === derivedUfmComplete
    ) {
      return;
    }

    updateCertification({
      ...certification,
      checklist: {
        ...certification.checklist,
        exhibits_complete: derivedExhibitsComplete,
        ufm_complete: derivedUfmComplete,
      },
      certification_date: null,
    });
  }, [
    certification,
    derivedExhibitsComplete,
    derivedUfmComplete,
    record.certification,
    updateCertification,
  ]);

  const allComplete = checklistEntries.every(
    ([key]) => certification.checklist[key] && certification.certification_statement.trim().length > 0,
  );

  useEffect(() => {
    if (!record.certification || !allComplete || certification.certification_date) {
      return;
    }

    updateCertification({
      ...certification,
      certification_date: new Date().toISOString().slice(0, 10),
    });
  }, [allComplete, certification, record.certification, updateCertification]);

  async function handleNavigate(stage: "workspace" | "export") {
    await persistCertification();
    setStage(stage);
  }

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <WorkflowStageNav jobId={jobId} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceSidebar />

        <div className="flex min-h-0 flex-1 flex-col">
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
                  {certification.certification_date && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Certified {certification.certification_date}
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
                          checked={certification.checklist[key]}
                          disabled={key === "exhibits_complete" || key === "ufm_complete"}
                          onChange={(e) =>
                            updateCertification({
                              ...certification,
                              checklist: {
                                ...certification.checklist,
                                [key]: e.target.checked,
                              },
                              certification_date: null,
                            })
                          }
                        />
                        <span>{label}</span>
                        {(key === "exhibits_complete" || key === "ufm_complete") && (
                          <span className="ml-auto text-xs text-slate-400">
                            Derived
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Certification Statement</h2>
                <textarea
                  value={certification.certification_statement}
                  onChange={(e) =>
                    updateCertification({
                      ...certification,
                      certification_statement: e.target.value,
                      certification_date: null,
                    })
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
                onClick={() => void handleNavigate("workspace")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft size={13} />
                Back to Workspace
              </button>

              <button
                type="button"
                onClick={() => void handleNavigate("export")}
                disabled={!allComplete}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Export
                <ChevronRight size={13} />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

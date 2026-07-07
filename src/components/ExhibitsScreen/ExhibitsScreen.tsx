import { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, FileText, Paperclip, Plus, Trash2 } from "lucide-react";
import { saveCase } from "../../api/caseService";
import { useCase } from "../../context/useCase";
import { useIntake } from "../../context/useIntake";
import { useStage } from "../../context/StageContext";
import { WorkflowStageNav } from "../WorkflowStageNav";
import { WorkspaceSidebar } from "../WorkspaceSidebar/WorkspaceSidebar";

function buildExhibitLabel(index: number) {
  return `Exhibit ${index + 1}`;
}

export function ExhibitsScreen({ jobId }: { jobId: string }) {
  const { record, addExhibit, updateExhibit, removeExhibit, setStageComplete, dirty } = useIntake();
  const { setStage } = useStage();
  const { registerNavigationGuard } = useCase();

  const exhibitsComplete = useMemo(
    () => record.exhibits.length === 0 || record.exhibits.every((exhibit) => exhibit.label.trim().length > 0),
    [record.exhibits],
  );

  async function persist() {
    const nextRecord = {
      ...record,
      stage: "exhibits" as const,
      stage_completion: {
        ...record.stage_completion,
        exhibits: exhibitsComplete,
      },
    };
    setStageComplete("exhibits", exhibitsComplete);
    await saveCase(nextRecord);
  }

  useEffect(() => {
    registerNavigationGuard({
      dirty,
      save: persist,
    });

    return () => {
      registerNavigationGuard(null);
    };
  }, [dirty, registerNavigationGuard, exhibitsComplete, record]);

  function handleAddExhibit() {
    addExhibit({
      label: buildExhibitLabel(record.exhibits.length),
      description: "",
      filename: null,
      file_url: null,
      marked_by: null,
      admitted: false,
      page_reference: null,
      line_reference: null,
    });
  }

  async function handleContinue() {
    await persist();
    setStage("ufm");
  }

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <WorkflowStageNav jobId={jobId} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceSidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <Paperclip size={18} className="text-blue-700" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage 4</p>
                <h1 className="text-lg font-semibold text-slate-900">Exhibits</h1>
              </div>
              <span className="ml-auto text-xs text-slate-500">{record.caption.case_name.value || jobId}</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Exhibit Register</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Track each exhibit here before certification and export.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExhibit}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus size={13} />
                    Add Exhibit
                  </button>
                </div>
              </section>

              {record.exhibits.length === 0 ? (
                <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                  <FileText size={26} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">No exhibits added yet.</p>
                  <p className="mt-1 text-sm text-slate-500">Continue if this deposition has no exhibits, or add them here before moving on.</p>
                </section>
              ) : (
                <section className="space-y-4">
                  {record.exhibits.map((exhibit, index) => (
                    <article key={exhibit.exhibit_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm text-slate-700">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Label</span>
                          <input
                            value={exhibit.label}
                            onChange={(event) => updateExhibit(exhibit.exhibit_id, { label: event.target.value })}
                            placeholder={buildExhibitLabel(index)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Filename</span>
                          <input
                            value={exhibit.filename ?? ""}
                            onChange={(event) => updateExhibit(exhibit.exhibit_id, { filename: event.target.value || null })}
                            placeholder="exhibit-1.pdf"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-slate-700 md:col-span-2">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Description</span>
                          <textarea
                            value={exhibit.description}
                            onChange={(event) => updateExhibit(exhibit.exhibit_id, { description: event.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">File URL</span>
                          <input
                            value={exhibit.file_url ?? ""}
                            onChange={(event) => updateExhibit(exhibit.exhibit_id, { file_url: event.target.value || null })}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Marked By</span>
                          <select
                            value={exhibit.marked_by ?? ""}
                            onChange={(event) => updateExhibit(exhibit.exhibit_id, { marked_by: event.target.value ? event.target.value as "PLAINTIFF" | "DEFENDANT" | "COURT" : null })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="">Select</option>
                            <option value="PLAINTIFF">Plaintiff</option>
                            <option value="DEFENDANT">Defendant</option>
                            <option value="COURT">Court</option>
                          </select>
                        </label>
                        <label className="text-sm text-slate-700">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Page Reference</span>
                          <input
                            type="number"
                            min={1}
                            value={exhibit.page_reference ?? ""}
                            onChange={(event) => updateExhibit(exhibit.exhibit_id, { page_reference: event.target.value ? Number(event.target.value) : null })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Line Reference</span>
                          <input
                            type="number"
                            min={1}
                            value={exhibit.line_reference ?? ""}
                            onChange={(event) => updateExhibit(exhibit.exhibit_id, { line_reference: event.target.value ? Number(event.target.value) : null })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={exhibit.admitted}
                            onChange={(event) => updateExhibit(exhibit.exhibit_id, { admitted: event.target.checked })}
                          />
                          Admitted
                        </label>
                        <button
                          type="button"
                          onClick={() => removeExhibit(exhibit.exhibit_id)}
                          className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              )}
            </div>
          </div>

          <footer className="border-t border-slate-200 bg-white px-5 py-3">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
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
                onClick={() => void handleContinue()}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Continue to UFM
                <ChevronRight size={13} />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

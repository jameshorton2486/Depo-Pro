import { useState } from "react";
import { FileText, ChevronRight, User, Briefcase, MapPin, Calendar, Users, Shield, FileCheck } from "lucide-react";
import type { IntakeData } from "../../types";
import { useStage } from "../../context/StageContext";

const EMPTY: IntakeData = {
  caseName: "",
  caseNumber: "",
  court: "",
  deponentName: "",
  deponentRole: "WITNESS",
  depositionDate: "",
  location: "",
  examiningAttorney: "",
  opposingAttorney: "",
  reporterName: "",
  reporterCertNumber: "",
  notes: "",
};

interface Props {
  jobId: string;
  onComplete: (data: IntakeData) => void;
}

export function IntakeScreen({ jobId, onComplete }: Props) {
  const { setStage } = useStage();
  const [form, setForm] = useState<IntakeData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof IntakeData, string>>>({});

  function set<K extends keyof IntakeData>(key: K, value: IntakeData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function validate(): boolean {
    const next: Partial<Record<keyof IntakeData, string>> = {};
    if (!form.caseName.trim())        next.caseName        = "Required";
    if (!form.caseNumber.trim())      next.caseNumber      = "Required";
    if (!form.court.trim())           next.court           = "Required";
    if (!form.deponentName.trim())    next.deponentName    = "Required";
    if (!form.depositionDate)         next.depositionDate  = "Required";
    if (!form.reporterName.trim())    next.reporterName    = "Required";
    if (!form.reporterCertNumber.trim()) next.reporterCertNumber = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onComplete(form);
    setStage("editor");
  }

  return (
    <div className="depo-editor h-full flex flex-col bg-slate-50 text-slate-900">
      {/* Header — same chrome as Toolbar */}
      <header className="h-12 bg-slate-900 text-white flex items-center gap-4 px-4 shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-400" />
          <span className="text-sm font-semibold tracking-wide">DEPO-PRO</span>
          <span className="text-slate-500 text-sm">|</span>
          <span className="font-mono text-xs text-slate-400">{jobId}</span>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <span className="text-xs text-slate-400">Stage</span>
          <div className="flex items-center gap-1 text-xs">
            <span className="px-2 py-0.5 rounded bg-blue-700 text-blue-100 font-semibold">1 Intake</span>
            <ChevronRight size={12} className="text-slate-600" />
            <span className="px-2 py-0.5 rounded text-slate-500">2 Review</span>
            <ChevronRight size={12} className="text-slate-600" />
            <span className="px-2 py-0.5 rounded text-slate-500">3 Certify</span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deposition Intake</h1>
            <p className="mt-1 text-sm text-slate-500">
              Complete all required fields before opening the transcript editor. Fields marked with an asterisk are required.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-8">

            {/* ── Case Information ── */}
            <Section icon={<Briefcase size={15} />} title="Case Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Case Name" required error={errors.caseName}>
                  <input
                    type="text"
                    placeholder="Smith v. Meridian Infrastructure Partners"
                    value={form.caseName}
                    onChange={(e) => set("caseName", e.target.value)}
                    className={inputCls(!!errors.caseName)}
                  />
                </Field>
                <Field label="Case Number" required error={errors.caseNumber}>
                  <input
                    type="text"
                    placeholder="2024-CV-08821"
                    value={form.caseNumber}
                    onChange={(e) => set("caseNumber", e.target.value)}
                    className={inputCls(!!errors.caseNumber)}
                  />
                </Field>
              </div>
              <Field label="Court / Jurisdiction" required error={errors.court}>
                <input
                  type="text"
                  placeholder="Superior Court of California, County of Los Angeles"
                  value={form.court}
                  onChange={(e) => set("court", e.target.value)}
                  className={inputCls(!!errors.court)}
                />
              </Field>
            </Section>

            {/* ── Deponent ── */}
            <Section icon={<User size={15} />} title="Deponent">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Deponent Name" required error={errors.deponentName}>
                  <input
                    type="text"
                    placeholder="Jonathan Michael Hargrove"
                    value={form.deponentName}
                    onChange={(e) => set("deponentName", e.target.value)}
                    className={inputCls(!!errors.deponentName)}
                  />
                </Field>
                <Field label="Deponent Role">
                  <select
                    value={form.deponentRole}
                    onChange={(e) => set("deponentRole", e.target.value as IntakeData["deponentRole"])}
                    className={inputCls(false)}
                  >
                    <option value="WITNESS">Fact Witness</option>
                    <option value="EXPERT">Expert Witness</option>
                    <option value="PARTY">Party</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
              </div>
            </Section>

            {/* ── Session Details ── */}
            <Section icon={<Calendar size={15} />} title="Session Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Deposition Date" required error={errors.depositionDate}>
                  <input
                    type="date"
                    value={form.depositionDate}
                    onChange={(e) => set("depositionDate", e.target.value)}
                    className={inputCls(!!errors.depositionDate)}
                  />
                </Field>
                <Field label="Location">
                  <input
                    type="text"
                    placeholder="550 S. Hope St., Suite 2300, Los Angeles, CA"
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>
            </Section>

            {/* ── Counsel ── */}
            <Section icon={<Users size={15} />} title="Counsel Present">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Examining Attorney">
                  <input
                    type="text"
                    placeholder="Jane R. Doe, Esq."
                    value={form.examiningAttorney}
                    onChange={(e) => set("examiningAttorney", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Opposing Attorney">
                  <input
                    type="text"
                    placeholder="Robert T. Hayes, Esq."
                    value={form.opposingAttorney}
                    onChange={(e) => set("opposingAttorney", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>
            </Section>

            {/* ── Reporter Certification ── */}
            <Section icon={<Shield size={15} />} title="Court Reporter">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Reporter Name" required error={errors.reporterName}>
                  <input
                    type="text"
                    placeholder="Patricia L. Monroe, CSR"
                    value={form.reporterName}
                    onChange={(e) => set("reporterName", e.target.value)}
                    className={inputCls(!!errors.reporterName)}
                  />
                </Field>
                <Field label="Certificate Number" required error={errors.reporterCertNumber}>
                  <input
                    type="text"
                    placeholder="CSR-12345"
                    value={form.reporterCertNumber}
                    onChange={(e) => set("reporterCertNumber", e.target.value)}
                    className={inputCls(!!errors.reporterCertNumber)}
                  />
                </Field>
              </div>
            </Section>

            {/* ── Notes ── */}
            <Section icon={<MapPin size={15} />} title="Special Instructions">
              <Field label="Notes">
                <textarea
                  rows={3}
                  placeholder="Interpreter present, multiple objections expected, exhibit binders pre-marked…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className={`${inputCls(false)} resize-none`}
                />
              </Field>
            </Section>

            {/* ── Submit ── */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-400">
                <span className="text-red-500">*</span> Required fields
              </p>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold rounded transition-colors"
              >
                <FileCheck size={14} />
                Open Transcript Editor
                <ChevronRight size={14} />
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-slate-500">{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean): string {
  return [
    "w-full px-3 py-2 text-sm bg-white border rounded",
    "placeholder:text-slate-400 text-slate-900",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    "transition-colors",
    hasError ? "border-red-400 bg-red-50" : "border-slate-300 hover:border-slate-400",
  ].join(" ");
}

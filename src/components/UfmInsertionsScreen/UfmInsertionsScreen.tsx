import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, FileStack } from "lucide-react";
import { saveCase } from "../../api/caseService";
import { listContacts } from "../../api/contactService";
import { listFirms } from "../../api/firmService";
import { getMyProfile } from "../../api/reporterProfileService";
import { useCase } from "../../context/useCase";
import { useIntake } from "../../context/useIntake";
import { useStage } from "../../context/StageContext";
import { buildUfmMetadata, summarizeUfmEnvelope } from "../../lib/ufm/buildUfmMetadata";
import { isMockMode } from "../../lib/runtime/mode";
import { listMockContacts, listMockFirms } from "../../mocks/directoryStore";
import type { Contact } from "../../types/contact";
import type { Firm } from "../../types/firm";
import type { ReporterProfile } from "../../types/reporterProfile";
import { WorkflowStageNav } from "../WorkflowStageNav";
import { WorkspaceSidebar } from "../WorkspaceSidebar/WorkspaceSidebar";

const MOCK_REPORTER_PROFILE: ReporterProfile = {
  owner_user_id: "mock-reporter-profile",
  display_name: "Miah Bardot",
  csr_number: "12129",
  csr_cert_expiration: "2027-12-31",
  firm_registration_number: "FR-9001",
  initials: "MB",
  realtime_capable: true,
  remote_swear_authority: true,
  notary_commission_expiration: "2027-12-31",
  preferred_signature_block: "Miah Bardot, CSR 12129",
  created_at: "2026-06-07T00:00:00.000Z",
  updated_at: "2026-06-07T00:00:00.000Z",
};

export function UfmInsertionsScreen({ jobId }: { jobId: string }) {
  const { activeProvenance, registerNavigationGuard } = useCase();
  const { record, setStageComplete, dirty } = useIntake();
  const { setStage } = useStage();
  const [reporterProfile, setReporterProfile] = useState<ReporterProfile | null>(isMockMode() ? MOCK_REPORTER_PROFILE : null);
  const [directoryContacts, setDirectoryContacts] = useState<Contact[]>(isMockMode() ? listMockContacts() : []);
  const [directoryFirms, setDirectoryFirms] = useState<Firm[]>(isMockMode() ? listMockFirms() : []);

  useEffect(() => {
    if (isMockMode()) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      getMyProfile().catch(() => null),
      listContacts().catch(() => []),
      listFirms().catch(() => []),
    ]).then(([profile, contacts, firms]) => {
      if (cancelled) {
        return;
      }
      setReporterProfile(profile);
      setDirectoryContacts(contacts);
      setDirectoryFirms(firms);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const envelope = useMemo(() => buildUfmMetadata({
    record,
    provenance: activeProvenance,
    reporterProfile,
    directoryContacts,
    directoryFirms,
  }), [activeProvenance, directoryContacts, directoryFirms, record, reporterProfile]);
  const summary = useMemo(() => summarizeUfmEnvelope(envelope), [envelope]);
  const isReady = envelope.missing_required_fields.length === 0;

  async function persist() {
    const nextRecord = {
      ...record,
      stage: "ufm" as const,
      stage_completion: {
        ...record.stage_completion,
        ufm: isReady,
      },
    };
    setStageComplete("ufm", isReady);
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
  }, [dirty, isReady, registerNavigationGuard, record]);

  async function handleContinue() {
    await persist();
    setStage("certification");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(JSON.stringify(envelope, null, 2));
  }

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <WorkflowStageNav jobId={jobId} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceSidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <FileStack size={18} className="text-blue-700" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage 5</p>
                <h1 className="text-lg font-semibold text-slate-900">UFM Insertions</h1>
              </div>
              <span className="ml-auto text-xs text-slate-500">{record.caption.case_name.value || jobId}</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">UFM Readiness</h2>
                    <p className="mt-1 text-sm text-slate-600">{summary.summaryLine}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy size={13} />
                    Copy Payload
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Populated</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.populatedCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Missing Required</p>
                    <p className="mt-1 text-2xl font-semibold text-rose-700">{summary.missingRequiredCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting Confirmation</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-700">{summary.awaitingConfirmationCount}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Missing Required Fields</h2>
                {envelope.missing_required_fields.length === 0 ? (
                  <p className="mt-2 text-sm text-emerald-700">All required UFM fields are present.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {envelope.missing_required_fields.map((field) => (
                      <li key={field} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                        {field}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-950 p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Generated UFM Payload</h2>
                  <span className="text-xs text-slate-400">{envelope.computed_at}</span>
                </div>
                <pre className="max-h-[28rem] overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-200">
                  {JSON.stringify(envelope, null, 2)}
                </pre>
              </section>
            </div>
          </div>

          <footer className="border-t border-slate-200 bg-white px-5 py-3">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              <button
                type="button"
                onClick={() => setStage("exhibits")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft size={13} />
                Back to Exhibits
              </button>
              <button
                type="button"
                onClick={() => void handleContinue()}
                disabled={!isReady}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Certification
                <ChevronRight size={13} />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

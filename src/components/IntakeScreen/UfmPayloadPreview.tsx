import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { listContacts } from "../../api/contactService";
import { listFirms } from "../../api/firmService";
import { getMyProfile } from "../../api/reporterProfileService";
import { useCase } from "../../context/useCase";
import { useIntake } from "../../context/useIntake";
import { isMockMode } from "../../lib/runtime/mode";
import { listMockContacts, listMockFirms } from "../../mocks/directoryStore";
import { buildUfmMetadata, summarizeUfmEnvelope } from "../../lib/ufm/buildUfmMetadata";
import type { Contact } from "../../types/contact";
import type { Firm } from "../../types/firm";
import type { ReporterProfile } from "../../types/reporterProfile";

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

const MOCK_DIRECTORY_CONTACTS: Contact[] = listMockContacts();
const MOCK_DIRECTORY_FIRMS: Firm[] = listMockFirms();

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

export function UfmPayloadPreview() {
  const { record } = useIntake();
  const { activeProvenance } = useCase();
  const [reporterProfile, setReporterProfile] = useState<ReporterProfile | null>(isMockMode() ? MOCK_REPORTER_PROFILE : null);
  const [directoryContacts, setDirectoryContacts] = useState<Contact[]>(isMockMode() ? MOCK_DIRECTORY_CONTACTS : []);
  const [directoryFirms, setDirectoryFirms] = useState<Firm[]>(isMockMode() ? MOCK_DIRECTORY_FIRMS : []);

  useEffect(() => {
    if (isMockMode()) {
      setReporterProfile(MOCK_REPORTER_PROFILE);
      setDirectoryContacts(MOCK_DIRECTORY_CONTACTS);
      setDirectoryFirms(MOCK_DIRECTORY_FIRMS);
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
  const summary = summarizeUfmEnvelope(envelope);

  return (
    <div className="bg-slate-900 px-4 py-4 text-slate-100">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">UFM Metadata Preview</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {summary.populatedCount} populated · {summary.missingRequiredCount} missing required · {summary.awaitingConfirmationCount} awaiting confirmation
          </p>
        </div>
        <CopyButton text={JSON.stringify(envelope, null, 2)} />
      </div>
      <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
        {summary.summaryLine}
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-800/60 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
        {JSON.stringify(envelope, null, 2)}
      </pre>
    </div>
  );
}

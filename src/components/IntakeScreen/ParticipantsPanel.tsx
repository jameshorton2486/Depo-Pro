import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Mic, Phone, Plus, Scale, Search, User2, Video, X } from "lucide-react";

import { getMyProfile } from "../../api/reporterProfileService";
import { getFirm, searchFirms, upsertFirm } from "../../api/firmService";
import { useIntake } from "../../context/useIntake";
import { useContactStore } from "../../store/contactStore";
import type { Contact, ContactInsert, ContactType } from "../../types/contact";
import type { Firm } from "../../types/firm";
import type { AttorneyRole, ParticipantRole } from "../../types/case";
import {
  digitsOnly,
  formatPhoneDisplay,
  formatReporterDateDisplay,
  getReporterFormattingWarnings,
  parseReporterDateToIso,
} from "./reporterFieldFormatting";

type PanelCategory =
  | "attorney"
  | "interpreter"
  | "videographer"
  | "reporter"
  | "scheduler"
  | "paralegal"
  | "legal_assistant"
  | "records_custodian"
  | "corporate_representative"
  | "participant";

type FieldKind = "text" | "email" | "tel" | "textarea" | "select" | "checkbox";

type Option = { label: string; value: string };

type FieldConfig = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: Option[];
};

type DrawerDraft = {
  name: string;
  organization: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  firmQuery: string;
  firmName: string;
  firmAddress: string;
  firmCity: string;
  firmState: string;
  firmZip: string;
  firmMainPhone: string;
  firmFax: string;
  attorneyBarNumber: string;
  attorneyExtension: string;
  attorneyFax: string;
  attorneyAssistantName: string;
  attorneyAssistantEmail: string;
  attorneyAppearanceLabel: string;
  attorneyRepresentingPreset: "plaintiff" | "defendant" | "third_party" | "other";
  attorneyRepresentingParty: string;
  attorneyFunction: AttorneyRole;
  attorneyTimeUsed: string;
  interpreterCertified: boolean;
  interpreterCertNumber: string;
  interpreterCertificationAuthority: string;
  interpreterCertificationExpiration: string;
  interpreterRemoteCapable: boolean;
  interpreterAgency: string;
  interpreterAgencyContact: string;
  interpreterDefaultLanguages: string;
  interpreterOathAdministered: "unknown" | "yes" | "no";
  interpreterLanguageFrom: string;
  interpreterLanguageTo: string;
  videographerCertNumber: string;
  videographerRoleTitle: string;
  genericRoleInProceeding: string;
  reporterCsrNumber: string;
  reporterCsrExpiration: string;
  reporterFirmRegistration: string;
};

const CATEGORY_META: Record<PanelCategory, { label: string; type: ContactType; icon: typeof Scale; participantRole?: ParticipantRole }> = {
  attorney: { label: "Attorney", type: "attorney", icon: Scale },
  interpreter: { label: "Interpreter", type: "interpreter", icon: User2 },
  videographer: { label: "Videographer", type: "videographer", icon: Video },
  reporter: { label: "Reporter", type: "reporter", icon: Mic },
  scheduler: { label: "Scheduler", type: "scheduler", icon: User2, participantRole: "OTHER" },
  paralegal: { label: "Paralegal", type: "paralegal", icon: User2, participantRole: "PARALEGAL" },
  legal_assistant: { label: "Legal Assistant", type: "legal_assistant", icon: User2, participantRole: "OTHER" },
  records_custodian: { label: "Records Custodian", type: "records_custodian", icon: User2, participantRole: "OTHER" },
  corporate_representative: { label: "Corporate Representative", type: "corporate_representative", icon: User2, participantRole: "OTHER" },
  participant: { label: "Other Participant", type: "participant", icon: User2, participantRole: "OTHER" },
};

const ATTORNEY_DIRECTORY_FIELDS: FieldConfig[] = [
  { key: "name", label: "Attorney Name", kind: "text" },
  { key: "phone", label: "Direct Phone", kind: "tel" },
  { key: "attorneyExtension", label: "Extension", kind: "text" },
  { key: "attorneyFax", label: "Fax", kind: "tel" },
  { key: "email", label: "Email", kind: "email" },
  { key: "attorneyBarNumber", label: "SBOT / Bar Number", kind: "text" },
  { key: "attorneyAssistantName", label: "Assistant Name", kind: "text" },
  { key: "attorneyAssistantEmail", label: "Assistant Email", kind: "email" },
  { key: "attorneyAppearanceLabel", label: "Preferred Appearance Label", kind: "text" },
];

const ATTORNEY_CASE_FIELDS: FieldConfig[] = [
  {
    key: "attorneyRepresentingPreset",
    label: "Representing",
    kind: "select",
    options: [
      { value: "plaintiff", label: "Plaintiff" },
      { value: "defendant", label: "Defense" },
      { value: "third_party", label: "Third Party" },
      { value: "other", label: "Other" },
    ],
  },
  { key: "attorneyRepresentingParty", label: "Specific Party", kind: "text" },
  {
    key: "attorneyFunction",
    label: "Function",
    kind: "select",
    options: [
      { value: "EXAMINING", label: "Examining" },
      { value: "OPPOSING", label: "Cross Examining" },
      { value: "CO_COUNSEL", label: "Appearing" },
      { value: "OTHER", label: "Custodial / Other" },
    ],
  },
  { key: "attorneyTimeUsed", label: "Time Used", kind: "text" },
];

const INTERPRETER_DIRECTORY_FIELDS: FieldConfig[] = [
  { key: "name", label: "Interpreter Name", kind: "text" },
  { key: "phone", label: "Phone", kind: "tel" },
  { key: "email", label: "Email", kind: "email" },
  { key: "interpreterCertified", label: "Certified", kind: "checkbox" },
  { key: "interpreterCertNumber", label: "Certification Number", kind: "text" },
  { key: "interpreterCertificationAuthority", label: "Certification Authority", kind: "text" },
  { key: "interpreterCertificationExpiration", label: "Certification Expiration", kind: "text" },
  { key: "interpreterRemoteCapable", label: "Remote Capable", kind: "checkbox" },
  { key: "interpreterAgency", label: "Agency", kind: "text" },
  { key: "interpreterAgencyContact", label: "Agency Contact", kind: "text" },
  { key: "interpreterDefaultLanguages", label: "Default Languages", kind: "text" },
];

const INTERPRETER_CASE_FIELDS: FieldConfig[] = [
  {
    key: "interpreterOathAdministered",
    label: "Oath Administered",
    kind: "select",
    options: [
      { value: "unknown", label: "Unknown" },
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  { key: "interpreterLanguageFrom", label: "Language From", kind: "text" },
  { key: "interpreterLanguageTo", label: "Language To", kind: "text" },
];

const VIDEOGRAPHER_DIRECTORY_FIELDS: FieldConfig[] = [
  { key: "name", label: "Videographer Name", kind: "text" },
  { key: "phone", label: "Phone", kind: "tel" },
  { key: "email", label: "Email", kind: "email" },
  { key: "videographerCertNumber", label: "Certification Number", kind: "text" },
  { key: "videographerRoleTitle", label: "Role Title", kind: "text" },
];

const GENERIC_DIRECTORY_FIELDS: FieldConfig[] = [
  { key: "name", label: "Name", kind: "text" },
  { key: "organization", label: "Organization", kind: "text" },
  { key: "phone", label: "Phone", kind: "tel" },
  { key: "email", label: "Email", kind: "email" },
  { key: "notes", label: "Directory Notes", kind: "textarea" },
];

const GENERIC_CASE_FIELDS: FieldConfig[] = [
  { key: "genericRoleInProceeding", label: "Role In This Proceeding", kind: "text" },
];

const REPORTER_DIRECTORY_FIELDS: FieldConfig[] = [
  { key: "name", label: "Reporter Name", kind: "text" },
  { key: "phone", label: "Phone", kind: "tel" },
  { key: "email", label: "Email", kind: "email" },
  { key: "reporterCsrNumber", label: "CSR Number", kind: "text" },
  { key: "reporterCsrExpiration", label: "CSR Expiration", kind: "text" },
  { key: "reporterFirmRegistration", label: "Firm Registration", kind: "text" },
];

function manualField<T>(value: T) {
  return {
    value,
    source: "manual" as const,
    confirmed: true,
    conflict: false,
    confidence_score: null,
  };
}

function defaultDraft(): DrawerDraft {
  return {
    name: "",
    organization: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    firmQuery: "",
    firmName: "",
    firmAddress: "",
    firmCity: "",
    firmState: "",
    firmZip: "",
    firmMainPhone: "",
    firmFax: "",
    attorneyBarNumber: "",
    attorneyExtension: "",
    attorneyFax: "",
    attorneyAssistantName: "",
    attorneyAssistantEmail: "",
    attorneyAppearanceLabel: "",
    attorneyRepresentingPreset: "plaintiff",
    attorneyRepresentingParty: "",
    attorneyFunction: "OTHER",
    attorneyTimeUsed: "",
    interpreterCertified: false,
    interpreterCertNumber: "",
    interpreterCertificationAuthority: "",
    interpreterCertificationExpiration: "",
    interpreterRemoteCapable: false,
    interpreterAgency: "",
    interpreterAgencyContact: "",
    interpreterDefaultLanguages: "",
    interpreterOathAdministered: "unknown",
    interpreterLanguageFrom: "",
    interpreterLanguageTo: "",
    videographerCertNumber: "",
    videographerRoleTitle: "",
    genericRoleInProceeding: "",
    reporterCsrNumber: "",
    reporterCsrExpiration: "",
    reporterFirmRegistration: "",
  };
}

function buildRepresentingValue(preset: DrawerDraft["attorneyRepresentingPreset"], partyName: string): string | null {
  const normalizedPartyName = partyName.trim().replace(/\s+/g, " ");
  if (!normalizedPartyName) {
    if (preset === "plaintiff") return "FOR THE PLAINTIFF";
    if (preset === "defendant") return "FOR THE DEFENDANT";
    if (preset === "third_party") return "FOR THE THIRD PARTY";
    return null;
  }
  if (preset === "plaintiff") return `FOR PLAINTIFF ${normalizedPartyName.toUpperCase()}`;
  if (preset === "defendant") return `FOR DEFENDANT ${normalizedPartyName.toUpperCase()}`;
  if (preset === "third_party") return `FOR THIRD PARTY ${normalizedPartyName.toUpperCase()}`;
  return normalizedPartyName;
}

function buildDrawerDescription(category: PanelCategory, drawerMode: "pick" | "create", hasSelection: boolean) {
  const label = CATEGORY_META[category].label;
  if (drawerMode === "pick" && hasSelection) {
    return category === "reporter"
      ? `Use the selected ${label.toLowerCase()} for this case.`
      : `Add the selected ${label.toLowerCase()} to this case.`;
  }
  if (drawerMode === "create") {
    return category === "reporter"
      ? `Save this ${label.toLowerCase()} to the reusable directory, then use it for this case.`
      : `Save this ${label.toLowerCase()} to the reusable directory, then add it to this case.`;
  }
  return `Pick a saved directory entry or create a new one, then capture case-specific details.`;
}

function buildSaveActionLabel(category: PanelCategory, drawerMode: "pick" | "create", hasSelection: boolean) {
  const label = CATEGORY_META[category].label;
  if (drawerMode === "pick" && hasSelection) {
    return category === "reporter" ? `Use ${label} for This Case` : `Add ${label} to Case`;
  }
  return category === "reporter"
    ? `Save ${label} to Directory + Use for This Case`
    : `Save ${label} to Directory + Add to Case`;
}

function directoryFieldsFor(category: PanelCategory) {
  if (category === "attorney") return ATTORNEY_DIRECTORY_FIELDS;
  if (category === "interpreter") return INTERPRETER_DIRECTORY_FIELDS;
  if (category === "videographer") return VIDEOGRAPHER_DIRECTORY_FIELDS;
  if (category === "reporter") return REPORTER_DIRECTORY_FIELDS;
  return GENERIC_DIRECTORY_FIELDS;
}

function caseFieldsFor(category: PanelCategory) {
  if (category === "attorney") return ATTORNEY_CASE_FIELDS;
  if (category === "interpreter") return INTERPRETER_CASE_FIELDS;
  if (category === "reporter" || category === "videographer") return [];
  return GENERIC_CASE_FIELDS;
}

function mergeDraftWithAutoFill(current: DrawerDraft, incoming: Partial<DrawerDraft>): DrawerDraft {
  const defaults = defaultDraft();
  const merged: DrawerDraft = { ...defaults, ...incoming };

  (Object.keys(current) as Array<keyof DrawerDraft>).forEach((key) => {
    if (JSON.stringify(current[key]) !== JSON.stringify(defaults[key])) {
      merged[key] = current[key] as never;
    }
  });

  return merged;
}

function applyContactToDraft(contact: Contact): Partial<DrawerDraft> {
  const details = contact.details;
  const draft: Partial<DrawerDraft> = {
    name: contact.name,
    organization: contact.organization,
    phone: details.kind === "attorney" ? (details.direct_phone ?? contact.phone) : contact.phone,
    email: contact.email,
    address: contact.address,
    notes: contact.notes,
  };

  if (details.kind === "attorney") {
    draft.attorneyBarNumber = details.bar_number ?? "";
    draft.attorneyExtension = details.extension ?? "";
    draft.attorneyFax = details.fax ?? "";
    draft.attorneyAssistantName = details.assistant_name ?? "";
    draft.attorneyAssistantEmail = details.assistant_email ?? "";
    draft.attorneyAppearanceLabel = details.preferred_appearance_label ?? "";
  } else if (details.kind === "interpreter") {
    draft.interpreterCertified = details.certified;
    draft.interpreterCertNumber = details.cert_number ?? "";
    draft.interpreterCertificationAuthority = details.certification_authority ?? "";
    draft.interpreterCertificationExpiration = details.certification_expiration ?? "";
    draft.interpreterRemoteCapable = details.remote_capable;
    draft.interpreterAgency = details.agency ?? "";
    draft.interpreterAgencyContact = details.agency_contact ?? "";
    draft.interpreterDefaultLanguages = details.default_languages.join(", ");
  } else if (details.kind === "videographer") {
    draft.videographerCertNumber = details.cert_number ?? "";
    draft.videographerRoleTitle = details.role_title ?? "";
  } else if (details.kind === "reporter") {
    draft.reporterCsrNumber = details.csr_number ?? "";
    draft.reporterCsrExpiration = formatReporterDateDisplay(details.csr_cert_expiration ?? "");
    draft.reporterFirmRegistration = details.firm_registration_number ?? "";
  }

  return draft;
}

function buildContactInsert(category: PanelCategory, draft: DrawerDraft, selectedFirmId: string | null): ContactInsert {
  const type = CATEGORY_META[category].type;
  const base: ContactInsert = {
    type,
    name: draft.name.trim(),
    organization: draft.organization.trim(),
    phone: type === "reporter" ? digitsOnly(draft.phone, 10) : draft.phone.trim(),
    email: draft.email.trim(),
    address: draft.address.trim(),
    notes: draft.notes.trim(),
    firm_id: selectedFirmId,
  };

  if (type === "attorney") {
    return {
      ...base,
      details: {
        bar_number: draft.attorneyBarNumber.trim() || null,
        direct_phone: draft.phone.trim() || null,
        extension: draft.attorneyExtension.trim() || null,
        fax: draft.attorneyFax.trim() || null,
        assistant_name: draft.attorneyAssistantName.trim() || null,
        assistant_email: draft.attorneyAssistantEmail.trim() || null,
        preferred_appearance_label: draft.attorneyAppearanceLabel.trim() || null,
      },
    };
  }

  if (type === "interpreter") {
    return {
      ...base,
      details: {
        certified: draft.interpreterCertified,
        cert_number: draft.interpreterCertNumber.trim() || null,
        certification_authority: draft.interpreterCertificationAuthority.trim() || null,
        certification_expiration: draft.interpreterCertificationExpiration.trim() || null,
        remote_capable: draft.interpreterRemoteCapable,
        agency: draft.interpreterAgency.trim() || null,
        agency_contact: draft.interpreterAgencyContact.trim() || null,
        default_languages: draft.interpreterDefaultLanguages.split(",").map((value) => value.trim()).filter(Boolean),
      },
    };
  }

  if (type === "videographer") {
    return {
      ...base,
      details: {
        cert_number: draft.videographerCertNumber.trim() || null,
        role_title: draft.videographerRoleTitle.trim() || null,
      },
    };
  }

  if (type === "reporter") {
    return {
      ...base,
      details: {
        csr_number: digitsOnly(draft.reporterCsrNumber) || null,
        csr_cert_expiration: parseReporterDateToIso(draft.reporterCsrExpiration),
        firm_registration_number: digitsOnly(draft.reporterFirmRegistration) || null,
      },
    };
  }

  return base;
}

function DrawerField({
  config,
  draft,
  category,
  onChange,
}: {
  config: FieldConfig;
  draft: DrawerDraft;
  category: PanelCategory | null;
  onChange: (key: keyof DrawerDraft, value: string | boolean) => void;
}) {
  const value = draft[config.key as keyof DrawerDraft];
  const inputValue = (() => {
    if (typeof value !== "string") {
      return "";
    }
    if (config.kind === "tel" && category === "reporter" && config.key === "phone") {
      return formatPhoneDisplay(value);
    }
    return value;
  })();

  if (config.kind === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(config.key as keyof DrawerDraft, event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        {config.label}
      </label>
    );
  }

  if (config.kind === "select") {
    return (
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        <span>{config.label}</span>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(config.key as keyof DrawerDraft, event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {config.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (config.kind === "textarea") {
    return (
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        <span>{config.label}</span>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(config.key as keyof DrawerDraft, event.target.value)}
          className="min-h-[72px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      <span>{config.label}</span>
      <input
        type={config.kind === "email" ? "email" : config.kind === "tel" ? "tel" : "text"}
        value={inputValue}
        onChange={(event) => onChange(config.key as keyof DrawerDraft, event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </label>
  );
}

export function ParticipantsPanel() {
  const {
    record,
    addAttorney,
    removeAttorney,
    addInterpreter,
    removeInterpreter,
    addVideographer,
    removeVideographer,
    addParticipant,
    removeParticipant,
    updateField,
  } = useIntake();
  const { contacts, search, upsertDirectory, useContact: markContactUsed } = useContactStore();
  const [drawerCategory, setDrawerCategory] = useState<PanelCategory | null>(null);
  const [drawerMode, setDrawerMode] = useState<"pick" | "create">("pick");
  const [contactQuery, setContactQuery] = useState("");
  const [firmResults, setFirmResults] = useState<Firm[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [draft, setDraft] = useState<DrawerDraft>(defaultDraft());
  const [profilePending, setProfilePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!drawerCategory || drawerMode !== "pick") {
      return;
    }
    void search(contactQuery, CATEGORY_META[drawerCategory].type);
  }, [contactQuery, drawerCategory, drawerMode, search]);

  useEffect(() => {
    if (!selectedContact?.firm_id) {
      setSelectedFirm(null);
      return;
    }

    void getFirm(selectedContact.firm_id)
      .then((firm) => setSelectedFirm(firm))
      .catch(() => setSelectedFirm(null));
  }, [selectedContact]);

  useEffect(() => {
    if (!draft.firmQuery.trim()) {
      setFirmResults([]);
      return;
    }
    void searchFirms(draft.firmQuery)
      .then(setFirmResults)
      .catch(() => setFirmResults([]));
  }, [draft.firmQuery]);

  const visibleContacts = useMemo(
    () => contacts.filter((contact) => !drawerCategory || contact.type === CATEGORY_META[drawerCategory].type),
    [contacts, drawerCategory],
  );

  function openDrawer(category: PanelCategory) {
    setDrawerCategory(category);
    setDrawerMode("pick");
    setContactQuery("");
    setSelectedContact(null);
    setSelectedFirm(null);
    setDraft(defaultDraft());
    setError(null);
  }

  function closeDrawer() {
    setDrawerCategory(null);
    setDrawerMode("pick");
    setSelectedContact(null);
    setSelectedFirm(null);
    setDraft(defaultDraft());
    setError(null);
  }

  function handleDraftChange(key: keyof DrawerDraft, value: string | boolean) {
    setDraft((current) => {
      if (typeof value !== "string") {
        return { ...current, [key]: value };
      }

      if (drawerCategory === "reporter") {
        if (key === "phone") {
          return { ...current, [key]: digitsOnly(value, 10) };
        }
        if (key === "reporterCsrNumber" || key === "reporterFirmRegistration") {
          return { ...current, [key]: digitsOnly(value) };
        }
        if (key === "reporterCsrExpiration") {
          return { ...current, [key]: formatReporterDateDisplay(value) };
        }
      }

      return { ...current, [key]: value };
    });
  }

  function handlePickContact(contact: Contact) {
    setSelectedContact(contact);
    setDraft((current) => mergeDraftWithAutoFill(current, applyContactToDraft(contact)));
    setDrawerMode("pick");
    setError(null);
  }

  async function resolveFirm(): Promise<Firm | null> {
    if (!(drawerCategory === "attorney" || drawerCategory === "videographer")) {
      return null;
    }
    if (selectedContact?.firm_id && drawerMode === "pick") {
      return selectedFirm;
    }
    if (!draft.firmName.trim()) {
      return null;
    }
    const result = await upsertFirm({
      name: draft.firmName.trim(),
      address: draft.firmAddress.trim(),
      city: draft.firmCity.trim(),
      state: draft.firmState.trim(),
      zip: draft.firmZip.trim(),
      main_phone: draft.firmMainPhone.trim(),
      fax: draft.firmFax.trim(),
    });
    if (result.conflicts.length > 0) {
      throw new Error(`Firm conflict: ${result.conflicts.map((conflict) => conflict.field).join(", ")}`);
    }
    return result.firm;
  }

  function applyReporterFromDirectory(contact: Contact, firm: Firm | null) {
    const details = contact.details.kind === "reporter" ? contact.details : null;
    updateField("reporter.name", contact.name, "manual", null, true);
    updateField("reporter.cert_number", details?.csr_number ?? "", "manual", null, true);
    updateField("reporter.license_expiration", details?.csr_cert_expiration ?? null, "manual", null, true);
    updateField("reporter.firm_registration_number", details?.firm_registration_number ?? null, "manual", null, true);
    updateField("reporter.firm", firm?.name ?? (contact.organization || null), "manual", null, true);
    updateField("reporter.firm_address", firm?.address ?? (contact.address || null), "manual", null, true);
    updateField("reporter.phone", contact.phone || null, "manual", null, true);
    updateField("reporter.email", contact.email || null, "manual", null, true);
  }

  async function handleUseMyProfile() {
    setProfilePending(true);
    setError(null);
    try {
      const profile = await getMyProfile();
      if (!profile) {
        setError("No reporter profile found for the signed-in user.");
        return;
      }
      updateField("reporter.name", profile.display_name ?? "", "imported", null, true);
      updateField("reporter.cert_number", profile.csr_number ?? "", "imported", null, true);
      updateField("reporter.license_expiration", profile.csr_cert_expiration ?? null, "imported", null, true);
      updateField("reporter.firm_registration_number", profile.firm_registration_number ?? null, "imported", null, true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setProfilePending(false);
    }
  }

  async function handleSave() {
    if (!drawerCategory) return;
    setSaving(true);
    setError(null);
    try {
      if (drawerCategory === "reporter") {
        if (drawerMode === "pick" && selectedContact) {
          applyReporterFromDirectory(selectedContact, selectedFirm);
          closeDrawer();
          return;
        }
        const contactResult = await upsertDirectory(buildContactInsert(drawerCategory, draft, null));
        if (contactResult.conflicts.length > 0) {
          throw new Error(`Reporter conflict: ${contactResult.conflicts.map((conflict) => conflict.field).join(", ")}`);
        }
        applyReporterFromDirectory(contactResult.contact, null);
        closeDrawer();
        return;
      }

      const resolvedFirm = await resolveFirm();
      const contactResult =
        drawerMode === "pick" && selectedContact
          ? { contact: selectedContact, conflicts: [], created: false }
          : await upsertDirectory(buildContactInsert(drawerCategory, draft, resolvedFirm?.id ?? null));

      if (contactResult.conflicts.length > 0) {
        throw new Error(`Contact conflict: ${contactResult.conflicts.map((conflict) => conflict.field).join(", ")}`);
      }

      const contact = contactResult.contact;
      if (drawerCategory === "attorney") {
        if (drawerMode === "pick" && selectedContact) {
          await markContactUsed(selectedContact.id);
        }

        addAttorney({
          name: manualField(draft.name.trim() || contact.name),
          firm: manualField(resolvedFirm?.name ?? (draft.firmName.trim() || (contact.organization || null))),
          role: manualField(draft.attorneyFunction),
          function: manualField(draft.attorneyFunction),
          representing: manualField(buildRepresentingValue(draft.attorneyRepresentingPreset, draft.attorneyRepresentingParty)),
          bar_number: manualField(draft.attorneyBarNumber.trim() || null),
          address: resolvedFirm?.address || null,
          city: resolvedFirm?.city || null,
          state: resolvedFirm?.state || null,
          zip: resolvedFirm?.zip || null,
          time_used: draft.attorneyTimeUsed.trim() || null,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
        });
      } else if (drawerCategory === "interpreter") {
        const details = contact.details.kind === "interpreter" ? contact.details : null;
        addInterpreter({
          name: manualField(contact.name),
          language_from: draft.interpreterLanguageFrom.trim(),
          language_to: draft.interpreterLanguageTo.trim(),
          oath_administered:
            draft.interpreterOathAdministered === "unknown" ? null : draft.interpreterOathAdministered === "yes",
          certified: details?.certified ?? false,
          cert_number: details?.cert_number ?? null,
          agency: details?.agency ?? (contact.organization || null),
          email: contact.email || null,
          phone: contact.phone || null,
        });
      } else if (drawerCategory === "videographer") {
        const details = contact.details.kind === "videographer" ? contact.details : null;
        addVideographer({
          name: manualField(contact.name),
          firm: manualField(resolvedFirm?.name ?? (contact.organization || null)),
          role_title: details?.role_title ?? null,
          cert_number: details?.cert_number ?? null,
          email: contact.email || null,
          phone: contact.phone || null,
        });
      } else {
        addParticipant({
          name: manualField(contact.name),
          role: CATEGORY_META[drawerCategory].participantRole ?? "OTHER",
          organization: resolvedFirm?.name ?? (contact.organization || null),
          email: contact.email || null,
          phone: contact.phone || null,
          role_in_this_proceeding: draft.genericRoleInProceeding.trim() || null,
          notes: contact.notes || null,
        });
      }

      closeDrawer();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setSaving(false);
    }
  }

  const directoryFields = drawerCategory ? directoryFieldsFor(drawerCategory) : [];
  const caseFields = drawerCategory ? caseFieldsFor(drawerCategory) : [];
  const reporterWarnings = drawerCategory === "reporter"
    ? getReporterFormattingWarnings({
      phone: draft.phone,
      csrExpiration: draft.reporterCsrExpiration,
    })
    : [];
  const drawerDescription = drawerCategory
    ? buildDrawerDescription(drawerCategory, drawerMode, Boolean(selectedContact))
    : "";
  const saveActionLabel = drawerCategory
    ? buildSaveActionLabel(drawerCategory, drawerMode, Boolean(selectedContact))
    : "Save";

  useEffect(() => {
    if (!drawerCategory || typeof document === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerCategory]);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Participants</h2>
          <p className="text-xs text-slate-500">Directory-backed counsel, attendees, and reporter selection</p>
        </div>
        <button
          type="button"
          onClick={handleUseMyProfile}
          disabled={profilePending}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {profilePending ? "Loading..." : "Use My Reporter Profile"}
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Mic size={12} />
            Reporter
          </div>
          <div className="text-sm text-slate-800">
            <div className="font-semibold">{record.reporter.name.value || "No reporter selected"}</div>
            <div className="text-xs text-slate-500">CSR {record.reporter.cert_number.value || "—"} · Firm Reg. {record.reporter.firm_registration_number.value || "—"}</div>
          </div>
          <button
            type="button"
            onClick={() => openDrawer("reporter")}
            className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Choose Alternate Reporter
          </button>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4">
          <CategoryCard label="Attorneys" icon={Scale} onAdd={() => openDrawer("attorney")}>
            {record.attorneys.map((attorney) => (
              <EntryCard
                key={attorney.attorney_id}
                title={attorney.name.value}
                subtitle={attorney.representing.value || attorney.firm.value || "No representing party"}
                onRemove={() => removeAttorney(attorney.attorney_id)}
              />
            ))}
          </CategoryCard>

          <CategoryCard label="Interpreters" icon={User2} onAdd={() => openDrawer("interpreter")}>
            {record.interpreters.map((interpreter) => (
              <EntryCard
                key={interpreter.interpreter_id}
                title={interpreter.name.value}
                subtitle={`${interpreter.language_from || "—"} → ${interpreter.language_to || "—"}`}
                onRemove={() => removeInterpreter(interpreter.interpreter_id)}
              />
            ))}
          </CategoryCard>

          <CategoryCard label="Videographers" icon={Video} onAdd={() => openDrawer("videographer")}>
            {record.videographers.map((videographer) => (
              <EntryCard
                key={videographer.videographer_id}
                title={videographer.name.value}
                subtitle={videographer.firm.value || "No firm linked"}
                onRemove={() => removeVideographer(videographer.videographer_id)}
              />
            ))}
          </CategoryCard>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Other Participants</div>
            <div className="flex flex-wrap gap-2">
              {(["scheduler", "paralegal", "legal_assistant", "records_custodian", "corporate_representative", "participant"] as PanelCategory[]).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => openDrawer(category)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Add {CATEGORY_META[category].label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {record.participants.map((participant) => (
              <EntryCard
                key={participant.participant_id}
                title={participant.name.value}
                subtitle={participant.role_in_this_proceeding || participant.organization || participant.role}
                onRemove={() => removeParticipant(participant.participant_id)}
              />
            ))}
          </div>
        </div>
      </div>

      {drawerCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="participant-modal-title">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <h3 id="participant-modal-title" className="text-sm font-semibold text-slate-900">Add {CATEGORY_META[drawerCategory].label}</h3>
                <p className="text-xs text-slate-500">{drawerDescription}</p>
              </div>
              <button type="button" onClick={closeDrawer} className="rounded-lg p-1 text-slate-500 hover:bg-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/80 px-5 py-4">
              <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
                <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <Search size={14} className="text-slate-400" />
                <input
                  value={contactQuery}
                  onChange={(event) => setContactQuery(event.target.value)}
                  placeholder={`Search ${CATEGORY_META[drawerCategory].label.toLowerCase()} directory`}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDrawerMode("create");
                  setSelectedContact(null);
                  setSelectedFirm(null);
                  setDraft(defaultDraft());
                }}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={12} />
                Create New Directory Entry
              </button>
              <div className="space-y-2">
                {visibleContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handlePickContact(contact)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      selectedContact?.id === contact.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{contact.name}</div>
                    <div className="text-xs text-slate-500">{contact.organization || contact.email || contact.phone || "Saved directory entry"}</div>
                  </button>
                ))}
              </div>
            </div>

                <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  {drawerMode === "pick" && selectedContact ? (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-slate-800">
                      <div className="font-semibold">{selectedContact.name}</div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                        {selectedContact.email && <span className="flex items-center gap-1"><Mail size={12} />{selectedContact.email}</span>}
                        {selectedContact.phone && <span className="flex items-center gap-1"><Phone size={12} />{selectedContact.phone}</span>}
                        {(selectedFirm?.name || selectedContact.organization) && (
                          <span className="flex items-center gap-1"><Building2 size={12} />{selectedFirm?.name || selectedContact.organization}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {directoryFields.map((config) => (
                          <DrawerField key={config.key} config={config} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                        ))}
                      </div>

                      {(drawerCategory === "attorney" || drawerCategory === "videographer") && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Firm Directory</div>
                          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                            <DrawerField config={{ key: "firmQuery", label: "Search Firms", kind: "text" }} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                            <DrawerField config={{ key: "firmName", label: "Firm Name", kind: "text" }} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                            <DrawerField config={{ key: "firmAddress", label: "Address", kind: "text" }} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                            <DrawerField config={{ key: "firmCity", label: "City", kind: "text" }} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                            <DrawerField config={{ key: "firmState", label: "State", kind: "text" }} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                            <DrawerField config={{ key: "firmZip", label: "ZIP", kind: "text" }} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                            <DrawerField config={{ key: "firmMainPhone", label: "Main Phone", kind: "tel" }} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                            <DrawerField config={{ key: "firmFax", label: "Fax", kind: "tel" }} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                          </div>
                          {firmResults.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {firmResults.map((firm) => (
                                <button
                                  key={firm.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedFirm(firm);
                                    setDraft((current) => ({
                                      ...current,
                                      firmName: firm.name,
                                      firmAddress: firm.address,
                                      firmCity: firm.city,
                                      firmState: firm.state,
                                      firmZip: firm.zip,
                                      firmMainPhone: firm.main_phone,
                                      firmFax: firm.fax,
                                    }));
                                  }}
                                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                                >
                                  <div className="font-semibold">{firm.name}</div>
                                  <div className="text-xs text-slate-500">{firm.address || firm.city || "Saved firm"}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {caseFields.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Case-Specific Fields</div>
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {caseFields.map((config) => (
                          <DrawerField key={config.key} config={config} draft={draft} category={drawerCategory} onChange={handleDraftChange} />
                        ))}
                      </div>
                    </div>
                  )}

                  {reporterWarnings.length > 0 && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      {reporterWarnings.join(" ")}
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-4">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || (!selectedContact && !draft.name.trim())}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : saveActionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CategoryCard({
  label,
  icon: Icon,
  onAdd,
  children,
}: {
  label: string;
  icon: typeof Scale;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[18rem] min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 break-words text-xs font-semibold uppercase tracking-wide text-slate-500">
          <div className="flex items-center gap-2">
          <Icon size={12} />
          {label}
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Add
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function EntryCard({
  title,
  subtitle,
  onRemove,
}: {
  title: string;
  subtitle: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="break-words text-sm font-semibold text-slate-900">{title || "Unnamed"}</div>
        <div className="break-words text-xs text-slate-500">{subtitle}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// IntakeScreen — Stage 1 of the DEPO-PRO workflow.
//
// Layout:
//   Top    — Workflow stage nav bar + Case status banner
//   Center — Document Intake panel (left: uploads, right: Extracted Fields Review Table)
//   Bottom — Deepgram Keyterm Manager
//   Footer — Actions: View Deepgram Request · View UFM Payload · Save Intake · Proceed

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  AlertTriangle, CheckCircle2, Clock,
  ChevronRight, Save, Zap, Package, Users, Search,
  X, UserPlus, Mic, Scale, Video, User2, ChevronDown, ChevronUp,
} from "lucide-react";

import type { CaseAudioRecord, CaseFileRecord } from "../../api/fileService";
import { useIntake } from "../../context/useIntake";
import { useCase } from "../../context/useCase";
import { useStage } from "../../context/StageContext";
import { useConflict, selectActiveConflicts } from "../conflict/conflictStore";
import { ExtractedFieldsTable } from "../ExtractedFieldsTable/ExtractedFieldsTable";
import { projectFieldRows } from "../ExtractedFieldsTable/fieldProjection";
import { DeepgramKeytermManager } from "../DeepgramKeytermManager/DeepgramKeytermManager";
import { DeepgramPayloadPreview } from "../DeepgramKeytermManager/DeepgramPayloadPreview";
import { useKeyterms } from "../DeepgramKeytermManager/keytermStore";
import { mockConflictAlternates } from "../ExtractedFieldsTable/mockRecord";
import { isMockMode } from "../../lib/runtime/mode";
import { saveCase } from "../../api/caseService";
import { loadCaseBundle as loadPersistedBundle } from "../../api/caseLoadService";
import { useContactStore } from "../../store/contactStore";
import { evaluateIntake, type IntakeFileState, type IntakeValidationResult } from "../../validation/intakeValidation";
import type { Contact, ContactType } from "../../types/contact";
import {
  emptyCaseRecord,
  type CaseRecord,
  type CaseSaveSource,
  type FieldSource,
  type ParticipantRole,
} from "../../types/case";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { DocumentUploadPanel } from "./DocumentUploadPanel";
import { resolveHydration } from "./hydration";
import { serializeManagedKeyterms } from "../../lib/keyterms/managedKeyterms";
import { UfmPayloadPreview } from "./UfmPayloadPreview";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { WorkflowStageNav } from "../WorkflowStageNav";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  jobId: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const INTAKE_AUTOSAVE_DELAY_MS = 10_000;

function manualField<T>(value: T) {
  return {
    value,
    source: "manual" as const,
    confirmed: true,
    conflict: false,
    confidence_score: null,
  };
}

function mapDisplaySourceToFieldSource(source: string): FieldSource {
  if (source === "Notice" || source === "Job Sheet") return "extracted";
  if (source === "Reporter Profile") return "imported";
  return "manual";
}

function mapParticipantRole(type: ContactType): ParticipantRole {
  switch (type) {
    case "interpreter":
      return "INTERPRETER";
    case "videographer":
      return "VIDEOGRAPHER";
    case "participant":
    case "attorney":
    case "firm":
    case "reporter":
    case "scheduler":
    case "paralegal":
    case "legal_assistant":
    case "records_custodian":
    case "corporate_representative":
      return "OTHER";
  }
}

function sameInterpreterContact(contact: Contact, interpreterName: string) {
  return contact.name === interpreterName;
}

function sameVideographerContact(contact: Contact, videographerName: string) {
  return contact.name === videographerName;
}

function sameAttorneyContact(contact: Contact, attorneyName: string) {
  return contact.name === attorneyName;
}

type AttorneyRepresentingPreset = "plaintiff" | "defendant" | "intervenor" | "other";

type AttorneySelectionDraft = {
  mode: "add" | "replace";
  contact: Contact;
  attorneyId: string | null;
  preset: AttorneyRepresentingPreset;
  partyName: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function formatPhoneInput(value: string) {
  const digits = digitsOnly(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function buildRepresentingValue(
  preset: AttorneyRepresentingPreset,
  partyName: string,
): string | null {
  const normalizedPartyName = partyName.trim().replace(/\s+/g, " ");
  if (preset === "other") {
    return normalizedPartyName ? `FOR ${normalizedPartyName.toUpperCase()}` : null;
  }

  if (normalizedPartyName) {
    if (preset === "plaintiff") {
      return `FOR PLAINTIFF ${normalizedPartyName.toUpperCase()}`;
    }
    if (preset === "defendant") {
      return `FOR DEFENDANT ${normalizedPartyName.toUpperCase()}`;
    }
    return `FOR INTERVENOR / THIRD PARTY ${normalizedPartyName.toUpperCase()}`;
  }

  if (preset === "plaintiff") return "FOR THE PLAINTIFF";
  if (preset === "defendant") return "FOR THE DEFENDANT";
  return "FOR THE INTERVENOR / THIRD PARTY";
}

function guessRepresentingPreset(value: string | null | undefined): AttorneyRepresentingPreset {
  const normalized = (value ?? "").toUpperCase();
  if (normalized.includes("PLAINTIFF")) return "plaintiff";
  if (normalized.includes("DEFENDANT")) return "defendant";
  if (normalized.includes("INTERVENOR") || normalized.includes("THIRD PARTY")) return "intervenor";
  return "other";
}

function attorneyBadgeLabel(representing: string | null, role: string) {
  return representing || role;
}

function sortCaseAudioRecords(audioRecords: CaseAudioRecord[]): CaseAudioRecord[] {
  return [...audioRecords].sort(
    (left, right) => left.source_index - right.source_index || (left.uploaded_at ?? "").localeCompare(right.uploaded_at ?? ""),
  );
}

// ─── Case status banner ───────────────────────────────────────────────────────

function CaseStatusBanner({
  validation,
  conflictAlternates,
}: {
  validation: IntakeValidationResult;
  conflictAlternates: typeof mockConflictAlternates;
}) {
  const { state: conflictState } = useConflict();
  const activeConflicts = selectActiveConflicts(conflictState);
  const { record } = useIntake();

  const conflictCount  = activeConflicts.length;
  const visibleUnconfirmedCount = projectFieldRows(record, conflictAlternates).filter(
    (row) => row.value !== "" && row.status === "Needs Confirmation" && row.source !== "manual",
  ).length;

  const caseName = record.caption.case_name.value || "New Case";
  const caseNo   = record.caption.case_number.value || "—";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
      {/* Case identity */}
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Stage 1 — Intake</p>
        <h1 className="truncate text-base font-bold text-slate-900">{caseName}</h1>
        <p className="text-xs text-slate-500">Case No. {caseNo}</p>
      </div>

      {/* Status chips */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          Case Readiness: {validation.readinessScore}%{validation.missingLabels.length > 0 ? ` - Missing: ${validation.missingLabels.slice(0, 3).join(", ")}${validation.missingLabels.length > 3 ? ` and ${validation.missingLabels.length - 3} more` : ""}` : ""}
        </span>
        {conflictCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <AlertTriangle size={12} />
            {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
          </span>
        )}
        {validation.failCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            <AlertTriangle size={12} />
            {validation.failCount} required
          </span>
        )}
        {validation.warningCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock size={12} />
            {validation.warningCount} warning{validation.warningCount !== 1 ? "s" : ""}
          </span>
        )}
        {visibleUnconfirmedCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock size={12} />
            {visibleUnconfirmedCount} fields awaiting confirmation
          </span>
        )}
        {conflictCount === 0 && validation.canProceed && visibleUnconfirmedCount === 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={12} />
            Ready to proceed
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Contact picker ───────────────────────────────────────────────────────────

interface ContactPickerProps {
  type: ContactType;
  label: string;
  icon: React.ReactNode;
  onSelect: (contact: Contact) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function ContactPicker({
  type,
  label,
  icon,
  onSelect,
  open: controlledOpen,
  onOpenChange,
}: ContactPickerProps) {
  const { contacts, loading, error, search, create } = useContactStore();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [query, setQuery]     = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    organization: "",
    phone: "",
    email: "",
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const createFormRef = useRef<HTMLFormElement | null>(null);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = useCallback((value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(open) : value;
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }, [controlledOpen, onOpenChange, open]);

  useEffect(() => {
    if (open && !creating) {
      search(query, type);
    }
  }, [creating, open, query, type, search]);

  useEffect(() => {
    if (!open) return;

    function handleDocumentMouseDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      if (createFormRef.current?.contains(target)) return;
      setOpen(false);
      setCreating(false);
      setCreateError(null);
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [open, setOpen]);

  function handleSelect(c: Contact) {
    setSelected(c);
    setOpen(false);
    setQuery("");
    setCreating(false);
    setCreateError(null);
    setDraft({ name: "", organization: "", phone: "", email: "" });
    onSelect(c);
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft.name.trim()) return;

    setCreatePending(true);
    setCreateError(null);
    try {
      const created = await create({
        type,
        name: draft.name.trim(),
        organization: draft.organization.trim(),
        phone: draft.phone,
        email: draft.email.trim(),
        address: "",
        notes: "",
      });
      handleSelect(created);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatePending(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          selected
            ? "border-emerald-300 bg-emerald-50 text-slate-800"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
        }`}
      >
        <span className="shrink-0 text-slate-400">{icon}</span>
        <span className="flex-1 truncate text-sm">
          {selected ? selected.name : `Select ${label}`}
        </span>
        {selected && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelected(null); }}
            className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X size={12} />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          {creating ? (
            <form
              ref={createFormRef}
              onSubmit={handleCreateSubmit}
              className="p-3"
            >
              <div className="space-y-2">
                <input
                  autoFocus
                  id={`${type}-create-name`}
                  name={`${type}_name`}
                  autoComplete="name"
                  data-contact-picker-input="true"
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
                  placeholder={`${label} name`}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <input
                  id={`${type}-create-organization`}
                  name={`${type}_organization`}
                  autoComplete="organization"
                  data-contact-picker-input="true"
                  type="text"
                  value={draft.organization}
                  onChange={(e) => setDraft((current) => ({ ...current, organization: e.target.value }))}
                  placeholder="Organization"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <input
                  id={`${type}-create-phone`}
                  name={`${type}_phone`}
                  autoComplete="tel"
                  data-contact-picker-input="true"
                  inputMode="tel"
                  type="tel"
                  value={formatPhoneInput(draft.phone)}
                  onChange={(e) => setDraft((current) => ({ ...current, phone: digitsOnly(e.target.value) }))}
                  placeholder="Phone"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <input
                  id={`${type}-create-email`}
                  name={`${type}_email`}
                  autoComplete="email"
                  data-contact-picker-input="true"
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((current) => ({ ...current, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>
              {createError && (
                <p className="mt-2 text-xs text-rose-600">{createError}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={createPending || !draft.name.trim()}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {createPending ? "Creating..." : `Create ${label}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setCreateError(null);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Search */}
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <Search size={12} className="shrink-0 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}s…`}
                  className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Results */}
              <div className="max-h-48 overflow-y-auto">
                {loading && (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">Loading…</p>
                )}
                {!loading && error && (
                  <p className="px-3 py-4 text-center text-xs text-rose-600">
                    Contact library unavailable. Check Supabase configuration.
                  </p>
                )}
                {!loading && !error && contacts.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">No contacts found</p>
                )}
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                      {c.organization && (
                        <p className="truncate text-[11px] text-slate-500">{c.organization}</p>
                      )}
                    </div>
                    {c.times_used > 0 && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        ×{c.times_used}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Create new */}
              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(true);
                    setCreateError(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <UserPlus size={12} className="text-slate-400" />
                  Create new {label.toLowerCase()}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Appearances panel ────────────────────────────────────────────────────────

export function LegacyAppearancesPanel() {
  const {
    record,
    addAttorney,
    updateAttorney,
    removeAttorney,
    addInterpreter,
    updateInterpreter,
    removeInterpreter,
    addVideographer,
    updateVideographer,
    removeVideographer,
    addParticipant,
  } = useIntake();
  const [addingAttorney, setAddingAttorney] = useState(false);
  const [pendingAttorney, setPendingAttorney] = useState<AttorneySelectionDraft | null>(null);
  const [replacingAttorneyId, setReplacingAttorneyId] = useState<string | null>(null);
  const [replacingInterpreterId, setReplacingInterpreterId] = useState<string | null>(null);
  const [replacingVideographerId, setReplacingVideographerId] = useState<string | null>(null);

  function handleSelect(type: ContactType, contact: Contact) {
    if (type === "interpreter") {
      addInterpreter({
        name: manualField(contact.name),
        language_from: "",
        language_to: "",
        oath_administered: null,
        certified: false,
        cert_number: null,
        agency: contact.organization || null,
        email: contact.email || null,
        phone: contact.phone || null,
      });
      return;
    }

    if (type === "videographer") {
      addVideographer({
        name: manualField(contact.name),
        firm: manualField(contact.organization || null),
        role_title: null,
        cert_number: null,
        email: contact.email || null,
        phone: contact.phone || null,
      });
      return;
    }

    if (type === "participant") {
      addParticipant({
        name: manualField(contact.name),
        role: mapParticipantRole(type),
        organization: contact.organization || null,
        email: contact.email || null,
        phone: contact.phone || null,
        role_in_this_proceeding: null,
        notes: contact.notes || null,
      });
    }
  }

  function handleAttorneyReplace(attorneyId: string, contact: Contact) {
    const attorney = record.attorneys.find((entry) => entry.attorney_id === attorneyId);
    if (!attorney || sameAttorneyContact(contact, attorney.name.value)) {
      setReplacingAttorneyId(null);
      return;
    }

    setPendingAttorney({
      mode: "replace",
      contact,
      attorneyId,
      preset: guessRepresentingPreset(attorney.representing.value),
      partyName: "",
    });
  }

  function handleAttorneyAdd(contact: Contact) {
    setPendingAttorney({
      mode: "add",
      contact,
      attorneyId: null,
      preset: "plaintiff",
      partyName: "",
    });
    setAddingAttorney(false);
  }

  function handleAttorneySelectionCancel() {
    setAddingAttorney(false);
    setReplacingAttorneyId(null);
    setPendingAttorney(null);
  }

  function commitAttorneySelection() {
    if (!pendingAttorney) return;

    const representingValue = buildRepresentingValue(
      pendingAttorney.preset,
      pendingAttorney.partyName,
    );

    const patch = {
      name: manualField(pendingAttorney.contact.name),
      firm: manualField(pendingAttorney.contact.organization || null),
      representing: manualField(representingValue),
      address: pendingAttorney.contact.address || null,
      email: pendingAttorney.contact.email || null,
      phone: pendingAttorney.contact.phone || null,
    };

    if (pendingAttorney.mode === "replace" && pendingAttorney.attorneyId) {
      updateAttorney(pendingAttorney.attorneyId, patch);
      setReplacingAttorneyId(null);
    } else {
      addAttorney({
        ...patch,
        role: manualField("OTHER"),
        bar_number: manualField(null),
        city: null,
        state: null,
        zip: null,
        time_used: null,
      });
      setAddingAttorney(false);
    }

    setPendingAttorney(null);
  }

  function handleInterpreterReplace(interpreterId: string, contact: Contact) {
    const interpreter = record.interpreters.find((entry) => entry.interpreter_id === interpreterId);
    if (!interpreter || sameInterpreterContact(contact, interpreter.name.value)) {
      setReplacingInterpreterId(null);
      return;
    }

        updateInterpreter(interpreterId, {
          name: manualField(contact.name),
          agency: contact.organization || null,
          email: contact.email || null,
          phone: contact.phone || null,
    });
    setReplacingInterpreterId(null);
  }

  function handleVideographerReplace(videographerId: string, contact: Contact) {
    const videographer = record.videographers.find((entry) => entry.videographer_id === videographerId);
    if (!videographer || sameVideographerContact(contact, videographer.name.value)) {
      setReplacingVideographerId(null);
      return;
    }

    updateVideographer(videographerId, {
      name: manualField(contact.name),
      firm: manualField(contact.organization || null),
      email: contact.email || null,
      phone: contact.phone || null,
    });
    setReplacingVideographerId(null);
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Users size={14} className="text-slate-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Appearances &amp; Contacts
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* Attorneys */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Scale size={11} />
            Attorneys
          </p>
          <div className="space-y-2">
            {record.attorneys.length > 0 ? (
              <>
                {record.attorneys.map((a) => (
                  replacingAttorneyId === a.attorney_id ? (
                    <div key={a.attorney_id} className="space-y-2">
                      <ContactPicker
                        type="attorney"
                        label="Attorney"
                        icon={<Scale size={13} />}
                        open
                        onOpenChange={(open) => {
                          if (!open) {
                            handleAttorneySelectionCancel();
                          }
                        }}
                        onSelect={(contact) => handleAttorneyReplace(a.attorney_id, contact)}
                      />
                      {pendingAttorney?.mode === "replace" && pendingAttorney.attorneyId === a.attorney_id && (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Party Represented
                          </p>
                          <div className="mt-2 space-y-2">
                            <select
                              value={pendingAttorney.preset}
                              onChange={(e) =>
                                setPendingAttorney((current) =>
                                  current
                                    ? { ...current, preset: e.target.value as AttorneyRepresentingPreset }
                                    : current,
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                            >
                              <option value="plaintiff">Plaintiff</option>
                              <option value="defendant">Defendant</option>
                              <option value="intervenor">Intervenor / Third Party</option>
                              <option value="other">Other</option>
                            </select>
                            <input
                              type="text"
                              value={pendingAttorney.partyName}
                              onChange={(e) =>
                                setPendingAttorney((current) =>
                                  current ? { ...current, partyName: e.target.value } : current,
                                )
                              }
                              placeholder="Specific party name"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                            />
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={commitAttorneySelection}
                              className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
                            >
                              Save Attorney
                            </button>
                            <button
                              type="button"
                              onClick={handleAttorneySelectionCancel}
                              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={a.attorney_id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium text-slate-800">{a.name.value}</span>
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {attorneyBadgeLabel(a.representing.value, a.role.value)}
                      </span>
                    </div>
                    {a.address && (
                      <p className="mt-1 text-[11px] text-slate-500">{a.address}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReplacingAttorneyId(a.attorney_id)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAttorney(a.attorney_id)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                ))}
                {addingAttorney && pendingAttorney === null && (
                  <ContactPicker
                    type="attorney"
                    label="Attorney"
                    icon={<Scale size={13} />}
                    open
                    onOpenChange={(open) => {
                      if (!open) {
                        handleAttorneySelectionCancel();
                      }
                    }}
                    onSelect={handleAttorneyAdd}
                  />
                )}
                {pendingAttorney?.mode === "add" && (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Party Represented
                    </p>
                    <div className="mt-2 space-y-2">
                      <select
                        value={pendingAttorney.preset}
                        onChange={(e) =>
                          setPendingAttorney((current) =>
                            current
                              ? { ...current, preset: e.target.value as AttorneyRepresentingPreset }
                              : current,
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                      >
                        <option value="plaintiff">Plaintiff</option>
                        <option value="defendant">Defendant</option>
                        <option value="intervenor">Intervenor / Third Party</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="text"
                        value={pendingAttorney.partyName}
                        onChange={(e) =>
                          setPendingAttorney((current) =>
                            current ? { ...current, partyName: e.target.value } : current,
                          )
                        }
                        placeholder="Specific party name"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={commitAttorneySelection}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
                      >
                        Save Attorney
                      </button>
                      <button
                        type="button"
                        onClick={handleAttorneySelectionCancel}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <ContactPicker
                  type="attorney"
                  label="Attorney"
                  icon={<Scale size={13} />}
                  open={!pendingAttorney && addingAttorney}
                  onOpenChange={(open) => {
                    if (!open) {
                      handleAttorneySelectionCancel();
                    }
                  }}
                  onSelect={handleAttorneyAdd}
                />
                {pendingAttorney?.mode === "add" && (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Party Represented
                    </p>
                    <div className="mt-2 space-y-2">
                      <select
                        value={pendingAttorney.preset}
                        onChange={(e) =>
                          setPendingAttorney((current) =>
                            current
                              ? { ...current, preset: e.target.value as AttorneyRepresentingPreset }
                              : current,
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                      >
                        <option value="plaintiff">Plaintiff</option>
                        <option value="defendant">Defendant</option>
                        <option value="intervenor">Intervenor / Third Party</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="text"
                        value={pendingAttorney.partyName}
                        onChange={(e) =>
                          setPendingAttorney((current) =>
                            current ? { ...current, partyName: e.target.value } : current,
                          )
                        }
                        placeholder="Specific party name"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={commitAttorneySelection}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
                      >
                        Save Attorney
                      </button>
                      <button
                        type="button"
                        onClick={handleAttorneySelectionCancel}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!addingAttorney && pendingAttorney === null && (
              <button
                type="button"
                onClick={() => setAddingAttorney(true)}
                className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                + Add Attorney
              </button>
            )}
          </div>
        </div>

        {/* Interpreter */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Mic size={11} />
            Interpreter
          </p>
          {record.interpreters.length === 0 ? (
            <ContactPicker
              type="interpreter"
              label="Interpreter"
              icon={<Mic size={13} />}
              onSelect={(contact) => handleSelect("interpreter", contact)}
            />
          ) : (
            record.interpreters.map((i) => (
              replacingInterpreterId === i.interpreter_id ? (
                <ContactPicker
                  key={i.interpreter_id}
                  type="interpreter"
                  label="Interpreter"
                  icon={<Mic size={13} />}
                  onSelect={(contact) => handleInterpreterReplace(i.interpreter_id, contact)}
                />
              ) : (
                <div key={i.interpreter_id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Mic size={13} className="text-slate-400" />
                    <span className="flex-1 text-sm text-slate-800">{i.name.value}</span>
                  </div>
                  {(i.language_from || i.language_to) && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {i.language_from || "Unknown"} to {i.language_to || "Unknown"}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">Oath</span>
                    <button
                      type="button"
                      onClick={() => updateInterpreter(i.interpreter_id, { oath_administered: true })}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${i.oath_administered === true ? "bg-emerald-100 text-emerald-700" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => updateInterpreter(i.interpreter_id, { oath_administered: false })}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${i.oath_administered === false ? "bg-rose-100 text-rose-700" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"}`}
                    >
                      No
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReplacingInterpreterId(i.interpreter_id)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => removeInterpreter(i.interpreter_id)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            ))
          )}
        </div>

        {/* Videographer */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Video size={11} />
            Videographer
          </p>
          {record.videographers.length === 0 ? (
            <ContactPicker
              type="videographer"
              label="Videographer"
              icon={<Video size={13} />}
              onSelect={(contact) => handleSelect("videographer", contact)}
            />
          ) : (
            record.videographers.map((v) => (
              replacingVideographerId === v.videographer_id ? (
                <ContactPicker
                  key={v.videographer_id}
                  type="videographer"
                  label="Videographer"
                  icon={<Video size={13} />}
                  onSelect={(contact) => handleVideographerReplace(v.videographer_id, contact)}
                />
              ) : (
                <div key={v.videographer_id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Video size={13} className="text-slate-400" />
                    <span className="flex-1 text-sm text-slate-800">{v.name.value}</span>
                  </div>
                  {v.role_title && (
                    <p className="mt-1 text-[11px] text-slate-500">{v.role_title}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReplacingVideographerId(v.videographer_id)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => removeVideographer(v.videographer_id)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            ))
          )}
        </div>

        {/* Other participants */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <User2 size={11} />
            Other Participants
          </p>
          <ContactPicker
            type="participant"
            label="Participant"
            icon={<User2 size={13} />}
            onSelect={(contact) => handleSelect("participant", contact)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Gate 1 status card ───────────────────────────────────────────────────────

function GateStatusCard({
  validation,
  persisted,
  dirty,
  saveState,
  savedAt,
  onNavigate,
}: {
  validation: IntakeValidationResult;
  persisted: boolean;
  dirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  savedAt: string | null;
  onNavigate: (fieldPath: string | null) => void;
}) {
  const [warningsOpen, setWarningsOpen] = useState(false);
  const failItems = [...validation.items.filter((item) => item.tier === "FAIL")].sort(
    (a, b) => Number(a.satisfied) - Number(b.satisfied),
  );
  const warningItems = validation.items.filter((item) => item.tier === "WARNING" && !item.satisfied);

  return (
    <div className={`rounded-xl border p-4 ${validation.canProceed ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/50"}`}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
        Gate 1 — Transcript Creation
      </p>
      <div className="mb-3 flex items-center gap-2">
        <CaseStatusBadge persisted={persisted} dirty={dirty} saveState={saveState} savedAt={savedAt} />
      </div>
      <div className="space-y-1.5">
        {failItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.fieldPath)}
            className="flex w-full items-start gap-2 rounded-md text-left transition-colors hover:bg-white/60"
          >
            {item.satisfied ? (
              <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle size={13} className="shrink-0 text-amber-500" />
            )}
            <span className={`flex-1 text-xs ${item.satisfied ? "text-slate-700" : "font-medium text-amber-700"}`}>
              {item.label}
              {item.detail && !item.satisfied && (
                <span className="block text-[10px] font-normal text-slate-500">{item.detail}</span>
              )}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 border-t border-slate-200/70 pt-3">
        <button
          type="button"
          onClick={() => setWarningsOpen((value) => !value)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"
        >
          {warningsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Warnings ({validation.warningCount})
        </button>
        {warningsOpen && (
          <div className="mt-2 space-y-1.5">
            {warningItems.length === 0 ? (
              <p className="text-xs text-slate-500">No outstanding warnings.</p>
            ) : (
              warningItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.fieldPath)}
                  className="block w-full rounded-md text-left text-xs text-amber-800 transition-colors hover:bg-white/60"
                >
                  {item.label}
                  {item.detail && <span className="block text-[10px] text-slate-500">{item.detail}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Intake footer ────────────────────────────────────────────────────────────

function IntakeFooter({
  onSave,
  onProceed,
  canProceed,
  remainingRequiredCount,
  dirty,
  persisted,
  saveState,
  saveError,
}: {
  onSave: () => Promise<void>;
  onProceed: () => Promise<void>;
  canProceed: boolean;
  remainingRequiredCount: number;
  dirty: boolean;
  persisted: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
}) {
  const [showPayload, setShowPayload] = useState(false);
  const [showUfmPayload, setShowUfmPayload] = useState(false);
  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save Failed"
          : "Save Intake";

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white">
      {/* Deepgram payload inline panel */}
      {showPayload && (
        <div className="border-b border-slate-200">
          <DeepgramPayloadPreview />
        </div>
      )}
      {showUfmPayload && (
        <div className="border-b border-slate-200">
          <UfmPayloadPreview />
        </div>
      )}
      {saveError && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-red-800">
            <span className="font-semibold">Save failed.</span>
            <span className="text-red-700">{saveError}</span>
            <button
              type="button"
              onClick={onSave}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              Retry Save
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        {/* Left: utility actions */}
        <button
          type="button"
          onClick={() => setShowPayload((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none ${
            showPayload
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Zap size={13} />
          {showPayload ? "Hide" : "View"} Deepgram Request
        </button>

        <button
          type="button"
          onClick={() => setShowUfmPayload((value) => !value)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none"
          title="Preview the best-available UFM metadata payload"
        >
          <Package size={13} />
          {showUfmPayload ? "Hide" : "View"} UFM Payload
        </button>

        {/* Right: primary actions */}
        <div className="ml-auto flex items-center gap-2">
          {dirty && saveState !== "saving" && (
            <span className="text-[11px] font-medium text-amber-700">
              Unsaved changes
            </span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={(persisted && !dirty) || saveState === "saving"}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-40"
          >
            <Save size={13} />
            {saveLabel}
          </button>

          <button
            type="button"
            onClick={onProceed}
            disabled={!canProceed}
            title={!canProceed ? `${remainingRequiredCount} required items remaining.` : undefined}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Proceed to Transcript Creation
            <ChevronRight size={13} />
          </button>
          {!canProceed && (
            <span className="text-[11px] text-amber-700">
              {remainingRequiredCount} required item{remainingRequiredCount !== 1 ? "s" : ""} remaining.
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

// ─── Main IntakeScreen ────────────────────────────────────────────────────────

export function IntakeScreen({ jobId }: Props) {
  const {
    record,
    dirty,
    editSeq,
    loadCase,
    setKeyterms,
    updateField,
    confirmField,
    confirmAll,
    resolveConflict,
  } = useIntake();
  const { state: keytermState } = useKeyterms();
  const { setStage } = useStage();
  const { registerNavigationGuard } = useCase();
  const mockMode = isMockMode();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [caseFiles, setCaseFiles] = useState<CaseFileRecord[]>([]);
  const [caseAudio, setCaseAudio] = useState<CaseAudioRecord[]>([]);
  const [revealExtractedFieldsVersion, setRevealExtractedFieldsVersion] = useState(0);
  const recordRef = useRef(record);
  const dirtyRef = useRef(dirty);
  const editSeqRef = useRef(editSeq);
  const recordCaseIdRef = useRef(record.case_id);
  const saveStateRef = useRef<SaveState>("idle");
  const savePromiseRef = useRef<Promise<CaseRecord> | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);

  const intakeFileState = useMemo<IntakeFileState>(() => ({
    hasNotice: caseFiles.some((file) => file.file_type === "notice"),
    hasScheduling: caseFiles.some((file) => file.file_type === "scheduling"),
    hasSupporting: caseFiles.some((file) => file.file_type === "supporting"),
    hasAudio: caseAudio.length > 0,
  }), [caseAudio, caseFiles]);

  const intakeValidation = useMemo(() => evaluateIntake(record, intakeFileState), [intakeFileState, record]);
  const conflictAlternates = useMemo<Record<string, { value: string; source: string }>>(
    () => (mockMode ? mockConflictAlternates : {}),
    [mockMode],
  );

  useEffect(() => {
    recordRef.current = record;
    dirtyRef.current = dirty;
    editSeqRef.current = editSeq;
    recordCaseIdRef.current = record.case_id;
  }, [dirty, editSeq, record]);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    let cancelled = false;

    function shouldAbortHydration(caseId: string) {
      if (cancelled) return true;
      return dirtyRef.current && recordCaseIdRef.current === caseId;
    }

    async function hydrateCase() {
      if (shouldAbortHydration(jobId)) {
        return;
      }

      const caseId = recordCaseIdRef.current || jobId;

      try {
        const persistedBundle = await loadPersistedBundle(caseId);
        if (shouldAbortHydration(caseId)) return;

        const hydration = resolveHydration(persistedBundle);
        if (hydration.mode === "row") {
          if (shouldAbortHydration(caseId)) return;
          setPersisted(true);
          setSavedAt(hydration.bundle.record.updated_at);
          setCaseFiles(hydration.bundle.files);
          setCaseAudio(sortCaseAudioRecords(hydration.bundle.audio));
          setSaveState("saved");
          setSaveError(null);
          loadCase(hydration.bundle.record);
          return;
        }
      } catch (error) {
        console.error("[DEPO-PRO] Case load failed", {
          operation: "loadCaseBundle",
          caseId,
          message: error instanceof Error ? error.message : String(error),
        });
      }

      if (shouldAbortHydration(caseId)) return;
      setPersisted(false);
      setSavedAt(null);
      setCaseFiles([]);
      setCaseAudio([]);
      setSaveState("idle");
      setSaveError(null);
      loadCase(emptyCaseRecord(caseId, new Date().toISOString()));
    }

    void hydrateCase();

    return () => {
      cancelled = true;
    };
  }, [dirty, jobId, loadCase, record.case_id]);

  useEffect(() => {
    if (dirty && saveState !== "saving") {
      setSaveState("idle");
    }
  }, [dirty, saveState]);

  useEffect(() => {
    const serialized = serializeManagedKeyterms(keytermState.terms);
    if (JSON.stringify(serialized) === JSON.stringify(record.deepgram.keyterms)) {
      return;
    }
    setKeyterms(serialized);
  }, [keytermState.terms, record.deepgram.keyterms, setKeyterms]);

  const canProceed = intakeValidation.canProceed;

  const handleNavigateToField = useCallback((fieldPath: string | null) => {
    if (!fieldPath) return;
    const selector = `[data-field-path="${fieldPath.replace(/"/g, '\\"')}"]`;
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const originalBackground = element.style.backgroundColor;
    element.style.backgroundColor = "rgba(191, 219, 254, 0.7)";
    window.setTimeout(() => {
      element.style.backgroundColor = originalBackground;
    }, 1600);
  }, []);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  function withSaveMeta(
    currentRecord: CaseRecord,
    source: CaseSaveSource,
    seq: number,
    at: string,
  ): CaseRecord {
    return {
      ...currentRecord,
      _saveMeta: {
        source,
        at,
        seq,
      },
    };
  }

  const persistCase = useCallback(async (
    source: CaseSaveSource = "manual",
    recordOverride?: CaseRecord,
  ) => {
    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }

    clearAutosaveTimer();
    setSaveState("saving");
    setSaveError(null);
    const currentRecord = recordOverride ?? recordRef.current;
    const saveSeq = editSeqRef.current;
    const startedAt = new Date().toISOString();
    let savePromise: Promise<CaseRecord> | null = null;
    savePromise = (async () => {
      try {
        const savedRecord = await saveCase(withSaveMeta(currentRecord, source, saveSeq, startedAt));
        setPersisted(true);
        setSavedAt(savedRecord.updated_at);
        if (editSeqRef.current === saveSeq) {
          loadCase(savedRecord);
          setSaveState("saved");
          setSaveError(null);
        } else {
          setSaveState("idle");
        }
        return savedRecord;
      } catch (error) {
        console.error("[DEPO-PRO] Case save failed", {
          operation: "saveCase",
          caseId: currentRecord.case_id,
          message: error instanceof Error ? error.message : String(error),
        });
        setSaveState("error");
        const resolvedError = error instanceof Error ? error : new Error(String(error));
        setSaveError(resolvedError.message);
        throw resolvedError;
      } finally {
        if (savePromiseRef.current === savePromise) {
          savePromiseRef.current = null;
        }
      }
    })();
    savePromiseRef.current = savePromise;
    return savePromise;
  }, [clearAutosaveTimer, loadCase]);

  const handleSave = useCallback(async () => {
    try {
      await persistCase("manual");
    } catch {
      return;
    }
  }, [persistCase]);

  const handleProceed = useCallback(async () => {
    if (!canProceed) return;
    if (savePromiseRef.current) {
      try {
        await savePromiseRef.current;
      } catch {
        return;
      }
    } else if (dirtyRef.current || saveStateRef.current === "error") {
      try {
        await persistCase("manual");
      } catch {
        return;
      }
    }
    setStage("creation");
  }, [canProceed, persistCase, setStage]);

  const handleRevealExtractedFields = useCallback(() => {
    setRevealExtractedFieldsVersion((value) => value + 1);
  }, []);

  const persistCaseForUi = useCallback(async (recordOverride?: CaseRecord) => {
    await persistCase("manual", recordOverride);
  }, [persistCase]);

  const flushCaseForNavigation = useCallback(async () => {
    await persistCase("flush");
  }, [persistCase]);

  useEffect(() => {
    clearAutosaveTimer();

    if (!dirty || saveState === "saving") {
      return;
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void persistCase("autosave").catch(() => {
        return;
      });
    }, INTAKE_AUTOSAVE_DELAY_MS);

    return () => {
      clearAutosaveTimer();
    };
  }, [clearAutosaveTimer, dirty, editSeq, persistCase, saveState]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current && saveStateRef.current !== "saving") {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    if (mockMode) {
      return;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [mockMode]);

  useEffect(() => {
    registerNavigationGuard({
      dirty,
      save: flushCaseForNavigation,
    });

    return () => {
      registerNavigationGuard(null);
    };
  }, [dirty, flushCaseForNavigation, registerNavigationGuard]);

  return (
    <div className="depo-editor flex h-full flex-col bg-slate-100 text-slate-900">
      {/* ── Workflow stage nav ── */}
      <WorkflowStageNav jobId={jobId} />

      {/* ── Case status banner ── */}
      <CaseStatusBanner validation={intakeValidation} conflictAlternates={conflictAlternates} />

      {/* ── Main scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] space-y-5 px-5 py-5">
          {!persisted && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              New case - nothing saved yet.
            </div>
          )}

          {/* ── Row 1: Document upload (left) + Appearances (right) ── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,32rem)]">
            <DocumentUploadPanel
              files={caseFiles}
              audio={caseAudio}
              persisted={persisted}
              saveCaseRecord={persistCaseForUi}
              onAudioUploaded={(audioRecord) => {
                setCaseAudio((previous) => sortCaseAudioRecords([
                  ...previous.filter((entry) => entry.audio_id !== audioRecord.audio_id),
                  audioRecord,
                ]));
              }}
              onAudioReordered={(audioRecords) => {
                setCaseAudio(sortCaseAudioRecords(audioRecords));
              }}
              onAudioRemoved={(audioId) => {
                setCaseAudio((previous) => previous.filter((entry) => entry.audio_id !== audioId));
              }}
              onFileUploaded={(fileRecord) => {
                setCaseFiles((previous) => [fileRecord, ...previous.filter((entry) => entry.file_type !== fileRecord.file_type)]);
              }}
              onFileRemoved={(fileId) => {
                setCaseFiles((previous) => previous.filter((entry) => entry.file_id !== fileId));
              }}
              onRevealExtractedFields={handleRevealExtractedFields}
            />
            <div className="space-y-4">
              <ParticipantsPanel />
              <GateStatusCard
                validation={intakeValidation}
                persisted={persisted}
                dirty={dirty}
                saveState={saveState}
                savedAt={savedAt}
                onNavigate={handleNavigateToField}
              />
            </div>
          </div>

          {/* ── Row 2: Extracted Fields Review Table ── */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Extracted Fields Review
              </h2>
              <p className="text-[11px] text-slate-400">
                Review, confirm, and resolve conflicts before proceeding
              </p>
            </div>
            <ExtractedFieldsTable
              caseId={record.case_id || "case_intake"}
              record={record}
              conflictAlternates={conflictAlternates}
              revealUnconfirmedVersion={revealExtractedFieldsVersion}
              onUpdate={(rowId, value) => {
                updateField(rowId, value, "manual", null, true);
              }}
              onConfirm={(rowId) => {
                confirmField(rowId);
              }}
              onConfirmAll={() => {
                confirmAll();
              }}
              onResolveConflict={(rowId, value, source) => {
                resolveConflict(rowId, value, mapDisplaySourceToFieldSource(source));
              }}
            />
          </section>

          {/* ── Row 3: Deepgram Keyterm Manager ── */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Deepgram Keyterm Manager
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure keyterms for speech recognition boosting
              </p>
            </div>
            <DeepgramKeytermManager />
          </section>

        </div>
      </div>

      {/* ── Footer ── */}
      <IntakeFooter
        onSave={handleSave}
        onProceed={handleProceed}
        canProceed={canProceed}
        remainingRequiredCount={intakeValidation.failCount}
        dirty={dirty}
        persisted={persisted}
        saveState={saveState}
        saveError={saveError}
      />
    </div>
  );
}

// IntakeScreen — Stage 1 of the DEPO-PRO workflow.
//
// Layout:
//   Top    — Workflow stage nav bar + Case status banner
//   Center — Document Intake panel (left: uploads, right: Extracted Fields Review Table)
//   Bottom — Deepgram Keyterm Manager
//   Footer — Actions: View Deepgram Request · View UFM Payload · Save Intake · Proceed

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Upload, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, Save, Zap, Package, Users, Search,
  X, UserPlus, Mic, Scale, Video, User2,
} from "lucide-react";

import { useIntake, useIntakeValidation } from "../../context/IntakeContext";
import { useStage, STAGE_LABELS, STAGE_ORDER } from "../../context/StageContext";
import { useConflict, selectActiveConflicts } from "../conflict/conflictStore";
import { ExtractedFieldsTable } from "../ExtractedFieldsTable/ExtractedFieldsTable";
import { DeepgramKeytermManager } from "../DeepgramKeytermManager/DeepgramKeytermManager";
import { DeepgramPayloadPreview } from "../DeepgramKeytermManager/DeepgramPayloadPreview";
import { mockCaseRecord, mockConflictAlternates } from "../ExtractedFieldsTable/mockRecord";
import { useContactStore } from "../../store/contactStore";
import type { Contact, ContactType } from "../../types/contact";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  jobId: string;
}

interface UploadSlot {
  id: string;
  label: string;
  accept: string;
  description: string;
  file: File | null;
  status: "idle" | "uploading" | "done" | "error";
}

// ─── Workflow stage nav ───────────────────────────────────────────────────────

function WorkflowNav({ jobId }: { jobId: string }) {
  const { stage } = useStage();
  const currentIdx = STAGE_ORDER.indexOf(stage);

  return (
    <header className="flex h-12 shrink-0 items-center gap-0 border-b border-slate-800 bg-slate-900 px-4 text-white">
      {/* Branding */}
      <div className="flex items-center gap-2 border-r border-slate-700 pr-4 mr-3">
        <FileText size={15} className="text-blue-400" />
        <span className="text-sm font-bold tracking-wide text-white">DEPO-PRO</span>
        <span className="font-mono text-xs text-slate-500">{jobId}</span>
      </div>

      {/* Stage pills */}
      <div className="flex items-center gap-0 overflow-x-auto">
        {STAGE_ORDER.map((s, i) => {
          const isActive  = s === stage;
          const isPast    = i < currentIdx;
          const isFuture  = i > currentIdx;
          return (
            <div key={s} className="flex items-center">
              <span
                className={`whitespace-nowrap rounded px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  isActive  ? "bg-blue-700 text-blue-100" :
                  isPast    ? "text-emerald-400" :
                  isFuture  ? "text-slate-600" : ""
                }`}
              >
                {STAGE_LABELS[s]}
              </span>
              {i < STAGE_ORDER.length - 1 && (
                <ChevronRight size={11} className="mx-0.5 shrink-0 text-slate-700" />
              )}
            </div>
          );
        })}
      </div>
    </header>
  );
}

// ─── Case status banner ───────────────────────────────────────────────────────

function CaseStatusBanner() {
  const validation = useIntakeValidation();
  const { state: conflictState } = useConflict();
  const activeConflicts = selectActiveConflicts(conflictState);
  const { record } = useIntake();

  const conflictCount  = activeConflicts.length;
  const missingCount   = validation.missing.length;
  const unconfirmedCnt = validation.unconfirmed.length;

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
        {conflictCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <AlertTriangle size={12} />
            {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
          </span>
        )}
        {missingCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            <AlertTriangle size={12} />
            {missingCount} missing
          </span>
        )}
        {unconfirmedCnt > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock size={12} />
            {unconfirmedCnt} unconfirmed
          </span>
        )}
        {conflictCount === 0 && missingCount === 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={12} />
            Ready to proceed
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Upload slot ──────────────────────────────────────────────────────────────

function UploadCard({
  slot,
  onDrop,
}: {
  slot: UploadSlot;
  onDrop: (id: string, file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onDrop(slot.id, files[0]);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition-all ${
        dragging          ? "border-blue-400 bg-blue-50/60" :
        slot.status === "done"  ? "border-emerald-300 bg-emerald-50/40" :
        slot.status === "error" ? "border-red-300 bg-red-50/40" :
        "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <input
        type="file"
        accept={slot.accept}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        {slot.status === "done"  ? <CheckCircle2 size={18} className="text-emerald-500" /> :
         slot.status === "error" ? <AlertTriangle size={18} className="text-red-500" /> :
         <Upload size={18} className="text-slate-400 transition-colors group-hover:text-slate-600" />}
      </div>

      <p className="text-center text-xs font-semibold text-slate-700">{slot.label}</p>
      <p className="mt-0.5 text-center text-[11px] text-slate-400">{slot.description}</p>

      {slot.file && (
        <p className="mt-2 max-w-full truncate rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
          {slot.file.name}
        </p>
      )}

      {slot.status === "idle" && !slot.file && (
        <p className="mt-2 text-[11px] text-slate-400">
          Drag & drop or <span className="text-blue-600 underline">browse</span>
        </p>
      )}
    </div>
  );
}

// ─── Document upload panel ────────────────────────────────────────────────────

function DocumentUploadPanel() {
  const [slots, setSlots] = useState<UploadSlot[]>([
    {
      id: "notice",
      label: "Notice of Deposition",
      accept: ".pdf,.doc,.docx",
      description: "PDF or Word document",
      file: null,
      status: "idle",
    },
    {
      id: "scheduling",
      label: "Scheduling Notes / Job Sheet",
      accept: ".pdf,.doc,.docx,.txt",
      description: "PDF, Word, or plain text",
      file: null,
      status: "idle",
    },
    {
      id: "supporting",
      label: "Supporting Documents",
      accept: ".pdf,.doc,.docx,.txt,.jpg,.png",
      description: "Any supporting material",
      file: null,
      status: "idle",
    },
    {
      id: "audio",
      label: "Audio / Video Recording",
      accept: "audio/*,video/*",
      description: "MP3, WAV, MP4, M4A…",
      file: null,
      status: "idle",
    },
  ]);

  function handleDrop(id: string, file: File) {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, file, status: "done" as const } : s,
      ),
    );
  }

  const audioSlot = slots.find((s) => s.id === "audio");
  const hasAudio  = audioSlot?.status === "done";

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Upload size={14} className="text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Document Intake</span>
        </div>
        {hasAudio && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 size={12} />
            Audio ready
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {slots.map((slot) => (
          <UploadCard key={slot.id} slot={slot} onDrop={handleDrop} />
        ))}
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
}

function ContactPicker({ type, label, icon, onSelect }: ContactPickerProps) {
  const { contacts, loading, search } = useContactStore();
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);

  useEffect(() => {
    if (open) {
      search(query, type);
    }
  }, [open, query, type, search]);

  function handleSelect(c: Contact) {
    setSelected(c);
    setOpen(false);
    setQuery("");
    onSelect(c);
  }

  return (
    <div className="relative">
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
            {!loading && contacts.length === 0 && (
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
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <UserPlus size={12} className="text-slate-400" />
              Create new {label.toLowerCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Appearances panel ────────────────────────────────────────────────────────

function AppearancesPanel() {
  const { record } = useIntake();

  function handleSelect(contact: Contact) {
    // Contact selected — in production this would populate the IntakeContext fields.
    // For the MVP the contact data is displayed but integration with the reducer
    // happens in a later pass when the parser is wired.
    void contact;
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
              record.attorneys.map((a) => (
                <div key={a.attorney_id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="flex-1 text-sm font-medium text-slate-800">{a.name.value}</span>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">
                    {a.role.value}
                  </span>
                </div>
              ))
            ) : (
              <ContactPicker
                type="attorney"
                label="Attorney"
                icon={<Scale size={13} />}
                onSelect={handleSelect}
              />
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
              onSelect={handleSelect}
            />
          ) : (
            record.interpreters.map((i) => (
              <div key={i.interpreter_id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <Mic size={13} className="text-slate-400" />
                <span className="text-sm text-slate-800">{i.name.value}</span>
              </div>
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
              onSelect={handleSelect}
            />
          ) : (
            record.videographers.map((v) => (
              <div key={v.videographer_id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <Video size={13} className="text-slate-400" />
                <span className="text-sm text-slate-800">{v.name.value}</span>
              </div>
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
            onSelect={handleSelect}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Gate 1 status card ───────────────────────────────────────────────────────

interface GateCheck {
  label: string;
  met: boolean;
  required: boolean;
}

function GateStatusCard({
  checks,
  onProceed,
}: {
  checks: GateCheck[];
  onProceed: () => void;
}) {
  const blockers = checks.filter((c) => c.required && !c.met);
  const canProceed = blockers.length === 0;

  return (
    <div className={`rounded-xl border p-4 ${canProceed ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/50"}`}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
        Gate 1 — Transcript Creation
      </p>
      <div className="space-y-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2">
            {c.met ? (
              <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
            ) : c.required ? (
              <AlertTriangle size={13} className="shrink-0 text-amber-500" />
            ) : (
              <Clock size={13} className="shrink-0 text-slate-400" />
            )}
            <span className={`text-xs ${c.met ? "text-slate-700" : c.required ? "font-medium text-amber-700" : "text-slate-500"}`}>
              {c.label}
            </span>
            {!c.required && !c.met && (
              <span className="ml-auto text-[10px] text-slate-400">optional</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Intake footer ────────────────────────────────────────────────────────────

function IntakeFooter({
  onSave,
  onProceed,
  canProceed,
  dirty,
}: {
  onSave: () => void;
  onProceed: () => void;
  canProceed: boolean;
  dirty: boolean;
}) {
  const [showPayload, setShowPayload] = useState(false);

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white">
      {/* Deepgram payload inline panel */}
      {showPayload && (
        <div className="border-b border-slate-200">
          <DeepgramPayloadPreview />
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
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none"
          title="UFM payload generation is implemented at Stage 5"
        >
          <Package size={13} />
          View UFM Payload
        </button>

        {/* Right: primary actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-40"
          >
            <Save size={13} />
            Save Intake
          </button>

          <button
            type="button"
            onClick={onProceed}
            disabled={!canProceed}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Proceed to Transcript Creation
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </footer>
  );
}

// ─── Main IntakeScreen ────────────────────────────────────────────────────────

export function IntakeScreen({ jobId }: Props) {
  const { record, dirty, validation } = useIntake();
  const { setStage } = useStage();
  const { state: conflictState } = useConflict();

  const activeConflicts = selectActiveConflicts(conflictState);

  // Initialise intake with the mock case record on first render.
  // When the document parser is wired in a later pass, this will be replaced
  // by the parsed data from the uploaded Notice of Deposition.
  const { loadCase } = useIntake();
  useEffect(() => {
    loadCase(mockCaseRecord);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gate 1 checks ──────────────────────────────────────────────────────────
  const hasWitness  = record.witnesses.length > 0;
  const hasAudio    = false; // populated when audio upload is wired
  const hasCaseName = !!record.caption.case_name.value;
  const hasDate     = !!record.session.deposition_date.value;
  const noConflicts = activeConflicts.length === 0;
  const noMissing   = validation.missing.length === 0;

  const gateChecks: GateCheck[] = [
    { label: "Case record created",         met: hasCaseName,  required: true  },
    { label: "Witness / deponent present",  met: hasWitness,   required: true  },
    { label: "No unresolved conflicts",     met: noConflicts,  required: true  },
    { label: "Required fields complete",    met: noMissing,    required: true  },
    { label: "Deposition date set",         met: hasDate,      required: false },
    { label: "Audio file uploaded",         met: hasAudio,     required: false },
  ];

  const canProceed = gateChecks.filter((c) => c.required).every((c) => c.met);

  const handleSave = useCallback(() => {
    // Persistence will be wired to Supabase in a later pass.
    // For now we just acknowledge with the dirty flag.
  }, []);

  const handleProceed = useCallback(() => {
    if (!canProceed) return;
    setStage("creation");
  }, [canProceed, setStage]);

  return (
    <div className="depo-editor flex h-full flex-col bg-slate-100 text-slate-900">
      {/* ── Workflow stage nav ── */}
      <WorkflowNav jobId={jobId} />

      {/* ── Case status banner ── */}
      <CaseStatusBanner />

      {/* ── Main scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] space-y-5 px-5 py-5">

          {/* ── Row 1: Document upload (left) + Appearances (right) ── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
            <DocumentUploadPanel />
            <div className="space-y-4">
              <AppearancesPanel />
              <GateStatusCard checks={gateChecks} onProceed={handleProceed} />
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
              conflictAlternates={mockConflictAlternates}
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
        dirty={dirty}
      />
    </div>
  );
}

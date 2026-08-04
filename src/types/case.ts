import { canonicalizePhoneNumber } from "../lib/canonical/PhoneNumberPolicy";
import { COURT_POLICY_ID, ORGANIZATION_POLICY_ID, PERSON_NAME_POLICY_ID, canonicalizeGovernedName } from "../lib/canonical/NamePolicies";
import { canonicalValue } from "../lib/canonical/FieldResult";

// UFM Case Data Model — UI-only types, not part of the API contract.
// Field names match docs/architecture/UFM_DATA_DICTIONARY.md.
// Do not import from src/api/types.ts here; this model is independent.

// ─── Primitives ──────────────────────────────────────────────────────────────

export type ISODate = string;   // "YYYY-MM-DD"
export type ISOTime = string;   // "HH:MM"
export type ISODateTime = string; // "YYYY-MM-DDTHH:MM:SSZ"

export type CaseId = string;    // "case_20240314_001"

export type CaseSaveSource = "manual" | "autosave" | "flush";

export interface CaseSaveMeta {
  source: CaseSaveSource;
  at: ISODateTime;
  seq: number;
}

// ─── Extracted field wrapper ─────────────────────────────────────────────────
// Wraps any value that may have been extracted from an uploaded document
// (Notice of Deposition, intake notes) rather than entered manually.

export type FieldSource = "manual" | "extracted" | "imported";

export interface ExtractedField<T> {
  value: T;
  source: FieldSource;
  confirmed: boolean;      // reporter has explicitly confirmed this value
  conflict: boolean;       // value conflicts with another source
  confidence_score: number | null; // 0.0–1.0 if source === "extracted", else null
}

// ─── Proceeding type ─────────────────────────────────────────────────────────

export type ProceedingType =
  | "freelance_deposition"
  | "official_court_record";

// ─── Enums / union types ─────────────────────────────────────────────────────

export type DeponentRole   = "WITNESS" | "PARTY" | "EXPERT" | "OTHER";
export type AttorneyRole   = "EXAMINING" | "OPPOSING" | "CO_COUNSEL" | "OTHER";
export type AttorneyFunction =
  | "APPEARANCE_ONLY"
  | "EXAMINING_ATTORNEY"
  | "DEFENDING_ATTORNEY"
  | "CUSTODIAL_ATTORNEY"
  | "CROSS_EXAMINATION";
export type AttorneyFunctionValue = AttorneyFunction[] | AttorneyRole;
export type ReportingMethod = "machine_shorthand" | "zoom" | "in_person" | "audio_recording";
export type LocationType = "zoom" | "in_person" | "hybrid" | "phone";
export type JurisdictionType = "texas_state" | "federal" | "state" | "other";
export type PartyRole = "plaintiff" | "defendant" | "third_party" | "cross_plaintiff" | "cross_defendant" | "witness" | "other";
export type ParticipantRole =
  | "REPORTER"
  | "ATTORNEY"
  | "WITNESS"
  | "INTERPRETER"
  | "VIDEOGRAPHER"
  | "PARALEGAL"
  | "OBSERVER"
  | "OTHER";
export type ExhibitMarkedBy = "PLAINTIFF" | "DEFENDANT" | "COURT";
export type KeytermCategory =
  | "proper_name"
  | "company"
  | "legal_term"
  | "technical"
  | "location"
  | "other";

// ─── Case Caption ─────────────────────────────────────────────────────────────

export interface CaseCaption {
  case_name:    ExtractedField<string>;
  case_style:   ExtractedField<string>;
  case_number:  ExtractedField<string>;
  court_name:   ExtractedField<string>;
  judicial_district: ExtractedField<string | null>;
  division:     ExtractedField<string | null>;
  county:       ExtractedField<string>;
  state:        ExtractedField<string>;
  jurisdiction_type: ExtractedField<JurisdictionType | null>;
  venue:        ExtractedField<string>;
  department:   ExtractedField<string | null>;
  judge_name:   ExtractedField<string | null>;
}

export interface CaseParty {
  party_id: string;
  name: ExtractedField<string>;
  role: ExtractedField<PartyRole>;
  role_modifier: ExtractedField<string | null>;
  entity_type: ExtractedField<string | null>;
  fka_or_dba: ExtractedField<string | null>;
}

// ─── Firm ────────────────────────────────────────────────────────────────────

export interface Firm {
  firm_id:   string;
  name:      string;
  address:   string | null;
  city:      string | null;
  state:     string | null;
  zip:       string | null;
  phone:     string | null;
  fax:       string | null;
  email:     string | null;
  website:   string | null;
}

export interface LawFirm {
  law_firm_id: string;
  name: ExtractedField<string>;
  address: ExtractedField<string | null>;
  city: ExtractedField<string | null>;
  state: ExtractedField<string | null>;
  zip: ExtractedField<string | null>;
  phone: ExtractedField<string | null>;
  fax: ExtractedField<string | null>;
  email: ExtractedField<string | null>;
  represented_party: ExtractedField<string | null>;
}

// ─── Attorney ────────────────────────────────────────────────────────────────

export interface Attorney {
  attorney_id:  string;
  name:         ExtractedField<string>;
  firm:         ExtractedField<string | null>;
  role:         ExtractedField<AttorneyRole>;
  function?:    ExtractedField<AttorneyFunctionValue>;
  representing: ExtractedField<string | null>; // "Plaintiff", "Defendant", etc.
  bar_number:   ExtractedField<string | null>;
  address:      string | null;
  city:         string | null;
  state:        string | null;
  zip:          string | null;
  time_used:    string | null; // Post-record certificate field; not edited at Intake.
  email:        string | null;
  phone:        string | null;
}

// ─── Witness ─────────────────────────────────────────────────────────────────

export interface Witness {
  witness_id:  string;
  name:        ExtractedField<string>;
  role:        ExtractedField<DeponentRole>;
  title:       ExtractedField<string | null>;  // professional title
  employer:    ExtractedField<string | null>;
  prefix_suffix:    string | null;
  party_affiliation: ExtractedField<"plaintiff" | "defendant" | "third_party" | null>;
  is_corporate_rep: boolean;
  corporate_entity: string | null;
  read_and_sign: ExtractedField<"read_and_sign" | "waived" | null>;
  requires_interpreter: ExtractedField<boolean | null>;
  requires_videographer: ExtractedField<boolean | null>;
  spelling_corrections: Array<{ original: string; corrected: string; noted_on_record: boolean }>;
  email:       string | null;
  phone:       string | null;
}

// ─── Interpreter ─────────────────────────────────────────────────────────────

export interface Interpreter {
  interpreter_id:    string;
  name:              ExtractedField<string>;
  language_from:     string;   // ISO 639-1, e.g. "es"
  language_to:       string;   // ISO 639-1, e.g. "en"
  oath_administered: boolean | null;
  certified:         boolean;
  cert_number:       string | null;
  agency:            string | null;
  email:             string | null;
  phone:             string | null;
}

// ─── Videographer ────────────────────────────────────────────────────────────

export interface Videographer {
  videographer_id: string;
  name:            ExtractedField<string>;
  firm:            ExtractedField<string | null>;
  role_title:      string | null;
  cert_number:     string | null;
  email:           string | null;
  phone:           string | null;
}

// ─── General participant (any named attendee not covered above) ───────────────

export interface Participant {
  participant_id: string;
  name:           ExtractedField<string>;
  role:           ParticipantRole;
  organization:   string | null;
  email:          string | null;
  phone:          string | null;
  role_in_this_proceeding: string | null;
  notes:          string | null;
}

// ─── Court Reporter ──────────────────────────────────────────────────────────

export interface Reporter {
  name:             ExtractedField<string>;
  cert_number:      ExtractedField<string>;
  cert_state:       ExtractedField<string>;    // two-letter state code
  firm:             ExtractedField<string | null>;
  license_expiration:       ExtractedField<ISODate | null>;
  firm_registration_number: ExtractedField<string | null>;
  firm_address:             ExtractedField<string | null>;
  email:            string | null;
  phone:            string | null;
  notary_required:  boolean;
  notary_name:      string | null;
  notary_commission_expiry: ISODate | null;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  deposition_date:   ExtractedField<ISODate>;
  start_time:        ExtractedField<ISOTime | null>;
  end_time:          ExtractedField<ISOTime | null>;
  location_type:     ExtractedField<LocationType | null>;
  location_address:  ExtractedField<string>;
  location_city:     ExtractedField<string>;
  location_county:   ExtractedField<string>;
  location_state:    ExtractedField<string>;
  location_zip:      ExtractedField<string | null>;
  reporting_method:  ExtractedField<ReportingMethod | null>;
  is_remote:         boolean;
  remote_platform:   ExtractedField<string | null>;
}

// ─── Proceeding ──────────────────────────────────────────────────────────────

export interface Proceeding {
  proceeding_type:  ProceedingType;
  // freelance_deposition fields
  ordering_firm:    string | null;   // firm that ordered the transcript
  ordering_contact: string | null;
  // official_court_record fields
  clerk_name:       string | null;
  clerk_badge:      string | null;
  filing_deadline:  ISODate | null;
  notes:            string | null;
}

export interface SchedulingMetadata {
  proceeding_type: ExtractedField<string | null>;
  remote_platform: ExtractedField<string | null>;
  noticing_party: ExtractedField<string | null>;
  ordered_by: ExtractedField<string | null>;
  scheduler: ExtractedField<string | null>;
  scheduling_contact: ExtractedField<string | null>;
  service_type: ExtractedField<string | null>;
  time_zone: ExtractedField<string | null>;
  remote_location: ExtractedField<string | null>;
}

export interface ServiceMetadata {
  certificate_of_service: ExtractedField<boolean | null>;
  service_date: ExtractedField<ISODate | null>;
  served_parties: ExtractedField<string[]>;
  service_emails: ExtractedField<string[]>;
}

export interface ReporterRequestMetadata {
  certified_reporter_required: ExtractedField<boolean | null>;
  stenographic_recording: ExtractedField<boolean | null>;
  audiovisual_recording: ExtractedField<boolean | null>;
  realtime_requested: ExtractedField<boolean | null>;
  expedited_delivery: ExtractedField<boolean | null>;
  rush_delivery: ExtractedField<boolean | null>;
  daily_copy: ExtractedField<boolean | null>;
  rough_draft: ExtractedField<boolean | null>;
}

// ─── Transcript format ────────────────────────────────────────────────────────

export interface TranscriptFormat {
  lines_per_page:       number;  // UFM CA default: 25
  chars_per_line:       number;  // UFM CA default: 58
  first_page_number:    number;  // usually 1
  include_line_numbers: boolean;
  include_timestamps:   boolean;
  font_family:          string;  // "Courier New"
  font_size_pt:         number;  // 12
}

// ─── Exhibit ─────────────────────────────────────────────────────────────────

export interface CaseExhibit {
  exhibit_id:      string;
  label:           string;              // "Exhibit 1"
  description:     string;
  filename:        string | null;       // local filename in exhibits/files/
  file_url:        string | null;       // populated after upload
  marked_by:       ExhibitMarkedBy | null;
  admitted:        boolean;
  page_reference:  number | null;       // transcript page where first referenced
  line_reference:  number | null;       // transcript line where first referenced
}

// ─── Certification ───────────────────────────────────────────────────────────

export interface CaseCertification {
  certification_date:      ISODate | null;
  certification_statement: string;
  checklist: {
    review_complete:           boolean;
    speaker_mapping_complete:  boolean;
    confidence_review_complete: boolean;
    exhibits_complete:         boolean;
    ufm_complete:              boolean;
  };
  signature_hash: string | null;
}

// ─── Audio ───────────────────────────────────────────────────────────────────

export interface CaseAudio {
  audio_id:          string;
  original_filename: string;
  mime_type:         string;          // "audio/mpeg", "video/mp4", etc.
  duration_seconds:  number | null;   // populated after upload / analysis
  file_size_bytes:   number | null;
  uploaded_at:       ISODateTime | null;
  media_url:         string | null;   // local path or remote URL served to WaveSurfer
}

// ─── Deepgram configuration + keyterms ───────────────────────────────────────

export interface DeepgramKeyterm {
  term:       string;
  boost:      number;            // 0.0–1.0, default 0.5
  category:   KeytermCategory;
  notes:      string;
}

export interface DeepgramConfig {
  model:             string;     // "nova-3"
  language:          string;     // "en-US"
  punctuate:         boolean;
  utterances:        boolean;
  diarize:           boolean;
  diarize_version:   string;
  speaker_count:     number | null;  // null = auto-detect
  smart_format:      boolean;
  numerals:          boolean;
  keyterms:          DeepgramKeyterm[];
}

// ─── Stage completion tracking ───────────────────────────────────────────────

export type WorkflowStage =
  | "intake"
  | "creation"
  | "workspace"
  | "exhibits"
  | "ufm"
  | "certification"
  | "export";

export interface StageCompletion {
  intake:        boolean;
  creation:      boolean;
  workspace:     boolean;
  exhibits:      boolean;
  ufm:           boolean;
  certification: boolean;
  export:        boolean;
}

// ─── Top-level Case Record ────────────────────────────────────────────────────

export interface CaseRecord {
  version:    "1.0";
  case_id:    CaseId;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  _saveMeta?: CaseSaveMeta;

  proceeding_type: ProceedingType;

  caption:    CaseCaption;
  session:    Session;
  proceeding: Proceeding;
  scheduling: SchedulingMetadata;
  service:    ServiceMetadata;
  reporter_requests: ReporterRequestMetadata;
  reporter:   Reporter;
  format:     TranscriptFormat;

  // Named participants
  parties:       CaseParty[];
  law_firms:     LawFirm[];
  witnesses:     Witness[];
  attorneys:     Attorney[];
  interpreters:  Interpreter[];
  videographers: Videographer[];
  participants:  Participant[];  // any other named attendees

  // Case materials
  audio:         CaseAudio | null;
  exhibits:      CaseExhibit[];
  deepgram:      DeepgramConfig;

  // Workflow state
  stage:             WorkflowStage;
  stage_completion:  StageCompletion;

  // Certification — populated at Stage 6
  certification: CaseCertification | null;

  // Freeform reporter notes
  notes: string;
}

// ─── Factory defaults ─────────────────────────────────────────────────────────
// Used when creating a new case so every field is present and typed correctly.

function extractedEmpty<T>(value: T): ExtractedField<T> {
  return { value, source: "manual", confirmed: false, conflict: false, confidence_score: null };
}

export function defaultTranscriptFormat(): TranscriptFormat {
  return {
    lines_per_page:       25,
    chars_per_line:       58,
    first_page_number:    1,
    include_line_numbers: true,
    include_timestamps:   false,
    font_family:          "Courier New",
    font_size_pt:         12,
  };
}

export function defaultDeepgramConfig(): DeepgramConfig {
  return {
    model:           "nova-3",
    language:        "en-US",
    punctuate:       true,
    utterances:      true,
    diarize:         true,
    diarize_version: "latest",
    speaker_count:   null,
    smart_format:    true,
    numerals:        false,
    keyterms:        [],
  };
}

export function defaultStageCompletion(): StageCompletion {
  return {
    intake:        false,
    creation:      false,
    workspace:     false,
    exhibits:      false,
    ufm:           false,
    certification: false,
    export:        false,
  };
}

export function emptyCaseRecord(case_id: CaseId, now: ISODateTime): CaseRecord {
  return {
    version:         "1.0",
    case_id,
    created_at:      now,
    updated_at:      now,
    proceeding_type: "freelance_deposition",

    caption: {
      case_name:   extractedEmpty(""),
      case_style:  extractedEmpty(""),
      case_number: extractedEmpty(""),
      court_name:  extractedEmpty(""),
      judicial_district: extractedEmpty(null),
      division: extractedEmpty(null),
      county:      extractedEmpty(""),
      state:       extractedEmpty(""),
      jurisdiction_type: extractedEmpty<JurisdictionType | null>(null),
      venue:       extractedEmpty(""),
      department:  extractedEmpty(null),
      judge_name:  extractedEmpty(null),
    },

    session: {
      deposition_date:  extractedEmpty(""),
      start_time:       extractedEmpty(null),
      end_time:         extractedEmpty(null),
      location_type:    extractedEmpty<LocationType | null>(null),
      location_address: extractedEmpty(""),
      location_city:    extractedEmpty(""),
      location_county:  extractedEmpty(""),
      location_state:   extractedEmpty(""),
      location_zip:     extractedEmpty(null),
      reporting_method: extractedEmpty(null),
      is_remote:        false,
      remote_platform:  extractedEmpty(null),
    },

    proceeding: {
      proceeding_type:  "freelance_deposition",
      ordering_firm:    null,
      ordering_contact: null,
      clerk_name:       null,
      clerk_badge:      null,
      filing_deadline:  null,
      notes:            null,
    },

    scheduling: {
      proceeding_type: extractedEmpty(null),
      remote_platform: extractedEmpty(null),
      noticing_party: extractedEmpty(null),
      ordered_by: extractedEmpty(null),
      scheduler: extractedEmpty(null),
      scheduling_contact: extractedEmpty(null),
      service_type: extractedEmpty(null),
      time_zone: extractedEmpty(null),
      remote_location: extractedEmpty(null),
    },

    service: {
      certificate_of_service: extractedEmpty<boolean | null>(null),
      service_date: extractedEmpty<ISODate | null>(null),
      served_parties: extractedEmpty<string[]>([]),
      service_emails: extractedEmpty<string[]>([]),
    },

    reporter_requests: {
      certified_reporter_required: extractedEmpty<boolean | null>(null),
      stenographic_recording: extractedEmpty<boolean | null>(null),
      audiovisual_recording: extractedEmpty<boolean | null>(null),
      realtime_requested: extractedEmpty<boolean | null>(null),
      expedited_delivery: extractedEmpty<boolean | null>(null),
      rush_delivery: extractedEmpty<boolean | null>(null),
      daily_copy: extractedEmpty<boolean | null>(null),
      rough_draft: extractedEmpty<boolean | null>(null),
    },

    reporter: {
      name:                     extractedEmpty(""),
      cert_number:              extractedEmpty(""),
      cert_state:               extractedEmpty(""),
      firm:                     extractedEmpty(null),
      license_expiration:       extractedEmpty(null),
      firm_registration_number: extractedEmpty(null),
      firm_address:             extractedEmpty(null),
      email:                    null,
      phone:                    null,
      notary_required:          false,
      notary_name:              null,
      notary_commission_expiry: null,
    },

    format:        defaultTranscriptFormat(),
    parties:       [],
    law_firms:     [],
    witnesses:     [],
    attorneys:     [],
    interpreters:  [],
    videographers: [],
    participants:  [],
    audio:         null,
    exhibits:      [],
    deepgram:      defaultDeepgramConfig(),

    stage:            "intake",
    stage_completion: defaultStageCompletion(),
    certification:    null,
    notes:            "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeFieldSource(value: unknown): FieldSource {
  return value === "manual" || value === "extracted" || value === "imported" ? value : "manual";
}

function normalizeExtractedField<T>(
  input: unknown,
  fallback: ExtractedField<T>,
  isValidValue: (value: unknown) => value is T,
): ExtractedField<T> {
  if (isRecord(input) && hasOwn(input, "value")) {
    const value = isValidValue(input.value) ? input.value : fallback.value;
    return {
      value,
      source: normalizeFieldSource(input.source),
      confirmed: typeof input.confirmed === "boolean" ? input.confirmed : fallback.confirmed,
      conflict: typeof input.conflict === "boolean" ? input.conflict : fallback.conflict,
      confidence_score: typeof input.confidence_score === "number" ? input.confidence_score : fallback.confidence_score,
    };
  }

  if (isValidValue(input)) {
    return {
      ...fallback,
      value: input,
    };
  }

  return fallback;
}

function normalizeStringField(input: unknown, fallback = extractedEmpty("")): ExtractedField<string> {
  return normalizeExtractedField(input, fallback, (value): value is string => typeof value === "string");
}

function normalizeNullableStringField(
  input: unknown,
  fallback = extractedEmpty<string | null>(null),
): ExtractedField<string | null> {
  return normalizeExtractedField(input, fallback, (value): value is string | null => typeof value === "string" || value === null);
}

function normalizeNullableRoleField<T extends string>(
  input: unknown,
  fallback: ExtractedField<T | null>,
  allowed: readonly T[],
): ExtractedField<T | null> {
  return normalizeExtractedField(
    input,
    fallback,
    (value): value is T | null => value === null || (typeof value === "string" && allowed.includes(value as T)),
  );
}

function normalizeBoolean(input: unknown, fallback = false): boolean {
  return typeof input === "boolean" ? input : fallback;
}

function normalizeNullableString(input: unknown, fallback: string | null = null): string | null {
  return typeof input === "string" ? input : fallback;
}

function normalizePhoneValue(input: unknown, fallback: string | null = null): string | null {
  return canonicalValue(canonicalizePhoneNumber(normalizeNullableString(input, fallback)));
}

function normalizePhoneField(
  input: unknown,
  fallback = extractedEmpty<string | null>(null),
): ExtractedField<string | null> {
  const normalized = normalizeNullableStringField(input, fallback);
  return { ...normalized, value: canonicalValue(canonicalizePhoneNumber(normalized.value)) };
}
function normalizeGovernedField<T extends string | null>(
  input: unknown,
  fallback: ExtractedField<T>,
  policyId: string,
): ExtractedField<T> {
  const normalized = normalizeExtractedField(input, fallback, (value): value is T => typeof value === "string" || value === null);
  return { ...normalized, value: canonicalValue(canonicalizeGovernedName(policyId, normalized.value)) as T };
}

function normalizeGovernedValue(input: unknown, policyId: string): string | null {
  return canonicalValue(canonicalizeGovernedName(policyId, normalizeNullableString(input)));
}

function normalizeStringArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeNumber(input: unknown, fallback: number): number {
  return typeof input === "number" && Number.isFinite(input) ? input : fallback;
}

function normalizeNullableNumber(input: unknown, fallback: number | null = null): number | null {
  return typeof input === "number" && Number.isFinite(input) ? input : fallback;
}

function coerceArray(
  value: unknown,
  path: string,
  coercedPaths: Set<string>,
): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (isRecord(value)) {
    coercedPaths.add(path);
    return [value];
  }

  if (value !== undefined && value !== null) {
    coercedPaths.add(path);
  }

  return [];
}

function normalizeArrayField<T>(
  value: unknown,
  path: string,
  coercedPaths: Set<string>,
  normalizeItem: (item: unknown, index: number) => T,
): T[] {
  return coerceArray(value, path, coercedPaths).map((item, index) => normalizeItem(item, index));
}

function normalizeAttorney(attorney: Attorney): Attorney {
  return {
    ...attorney,
    address: attorney.address ?? null,
    city: attorney.city ?? null,
    state: attorney.state ?? null,
    zip: attorney.zip ?? null,
    time_used: attorney.time_used ?? null,
  };
}

function emptyParty(partyId: string): CaseParty {
  return {
    party_id: partyId,
    name: extractedEmpty(""),
    role: extractedEmpty<PartyRole>("other"),
    role_modifier: extractedEmpty(null),
    entity_type: extractedEmpty(null),
    fka_or_dba: extractedEmpty(null),
  };
}

function normalizePartyRole(
  input: unknown,
  fallback = extractedEmpty<PartyRole>("other"),
): ExtractedField<PartyRole> {
  return normalizeExtractedField(
    input,
    fallback,
    (value): value is PartyRole =>
      value === "plaintiff"
      || value === "defendant"
      || value === "third_party"
      || value === "cross_plaintiff"
      || value === "cross_defendant"
      || value === "witness"
      || value === "other",
  );
}

function normalizePartyFromUnknown(party: unknown, fallbackId: string): CaseParty {
  const defaults = emptyParty(fallbackId);
  const source = isRecord(party) ? party : null;
  const partyId = source && typeof source.party_id === "string" && source.party_id.trim() ? source.party_id : fallbackId;

  return {
    ...defaults,
    party_id: partyId,
    name: normalizeGovernedField(source?.name, defaults.name, PERSON_NAME_POLICY_ID),
    role: normalizePartyRole(source?.role, defaults.role),
    role_modifier: normalizeNullableStringField(source?.role_modifier, defaults.role_modifier),
    entity_type: normalizeNullableStringField(source?.entity_type, defaults.entity_type),
    fka_or_dba: normalizeNullableStringField(source?.fka_or_dba, defaults.fka_or_dba),
  };
}

function emptyLawFirm(lawFirmId: string): LawFirm {
  return {
    law_firm_id: lawFirmId,
    name: extractedEmpty(""),
    address: extractedEmpty(null),
    city: extractedEmpty(null),
    state: extractedEmpty(null),
    zip: extractedEmpty(null),
    phone: extractedEmpty(null),
    fax: extractedEmpty(null),
    email: extractedEmpty(null),
    represented_party: extractedEmpty(null),
  };
}

function normalizeLawFirmFromUnknown(lawFirm: unknown, fallbackId: string): LawFirm {
  const defaults = emptyLawFirm(fallbackId);
  const source = isRecord(lawFirm) ? lawFirm : null;
  const lawFirmId = source && typeof source.law_firm_id === "string" && source.law_firm_id.trim() ? source.law_firm_id : fallbackId;

  return {
    ...defaults,
    law_firm_id: lawFirmId,
    name: normalizeGovernedField(source?.name, defaults.name, ORGANIZATION_POLICY_ID),
    address: normalizeNullableStringField(source?.address, defaults.address),
    city: normalizeNullableStringField(source?.city, defaults.city),
    state: normalizeNullableStringField(source?.state, defaults.state),
    zip: normalizeNullableStringField(source?.zip, defaults.zip),
    phone: normalizePhoneField(source?.phone, defaults.phone),
    fax: normalizePhoneField(source?.fax, defaults.fax),
    email: normalizeNullableStringField(source?.email, defaults.email),
    represented_party: normalizeNullableStringField(source?.represented_party, defaults.represented_party),
  };
}

function emptyWitness(witnessId: string): Witness {
  return {
    witness_id: witnessId,
    name: extractedEmpty(""),
    role: extractedEmpty<DeponentRole>("WITNESS"),
    title: extractedEmpty(null),
    employer: extractedEmpty(null),
    prefix_suffix: null,
    party_affiliation: extractedEmpty(null),
    is_corporate_rep: false,
    corporate_entity: null,
    read_and_sign: extractedEmpty(null),
    requires_interpreter: extractedEmpty<boolean | null>(null),
    requires_videographer: extractedEmpty<boolean | null>(null),
    spelling_corrections: [],
    email: null,
    phone: null,
  };
}

function readLegacyWitnessName(record: Record<string, unknown>): string | null {
  if (typeof record.deponentName === "string" && record.deponentName.trim()) {
    return record.deponentName;
  }

  if (typeof record.witness_name === "string" && record.witness_name.trim()) {
    return record.witness_name;
  }

  const witness = isRecord(record.witness) ? record.witness : null;
  if (witness && typeof witness.name === "string" && witness.name.trim()) {
    return witness.name;
  }

  const depositionDetails = isRecord(record.depositionDetails) ? record.depositionDetails : null;
  const deponent = depositionDetails && isRecord(depositionDetails.deponent) ? depositionDetails.deponent : null;
  if (deponent && typeof deponent.name === "string" && deponent.name.trim()) {
    return deponent.name;
  }

  return null;
}

function normalizeWitnessRole(input: unknown, fallback = extractedEmpty<DeponentRole>("WITNESS")): ExtractedField<DeponentRole> {
  return normalizeExtractedField(
    input,
    fallback,
    (value): value is DeponentRole =>
      value === "WITNESS" || value === "PARTY" || value === "EXPERT" || value === "OTHER",
  );
}

function normalizeWitness(witness: unknown, fallbackId: string, legacyFallbacks?: { name?: string | null; role?: unknown }): Witness {
  const defaults = emptyWitness(fallbackId);
  const source = isRecord(witness) ? witness : null;
  const witnessId = source && typeof source.witness_id === "string" && source.witness_id.trim() ? source.witness_id : fallbackId;
  const normalized = {
    ...defaults,
    ...source,
    witness_id: witnessId,
    name: normalizeGovernedField(source?.name ?? legacyFallbacks?.name ?? defaults.name, defaults.name, PERSON_NAME_POLICY_ID),
    role: normalizeWitnessRole(source?.role ?? legacyFallbacks?.role ?? defaults.role, defaults.role),
    title: normalizeNullableStringField(source?.title, defaults.title),
    employer: normalizeGovernedField(source?.employer, defaults.employer, ORGANIZATION_POLICY_ID),
    prefix_suffix: normalizeNullableString(source?.prefix_suffix),
    party_affiliation: normalizeNullableRoleField(
      source?.party_affiliation,
      defaults.party_affiliation,
      ["plaintiff", "defendant", "third_party"] as const,
    ),
    is_corporate_rep: normalizeBoolean(source?.is_corporate_rep),
    corporate_entity: normalizeGovernedValue(source?.corporate_entity, ORGANIZATION_POLICY_ID),
    read_and_sign: normalizeNullableRoleField(
      source?.read_and_sign,
      defaults.read_and_sign,
      ["read_and_sign", "waived"] as const,
    ),
    requires_interpreter: normalizeNullableBooleanField(source?.requires_interpreter, defaults.requires_interpreter),
    requires_videographer: normalizeNullableBooleanField(source?.requires_videographer, defaults.requires_videographer),
    spelling_corrections: normalizeStringArray<{ original: string; corrected: string; noted_on_record: boolean }>(
      source?.spelling_corrections,
    ),
    email: normalizeNullableString(source?.email),
    phone: normalizePhoneValue(source?.phone),
  };

  return {
    ...normalized,
    prefix_suffix: normalized.prefix_suffix ?? null,
    party_affiliation: normalized.party_affiliation ?? extractedEmpty(null),
    is_corporate_rep: normalized.is_corporate_rep ?? false,
    corporate_entity: normalized.corporate_entity ?? null,
    read_and_sign: normalized.read_and_sign ?? extractedEmpty(null),
    requires_interpreter: normalized.requires_interpreter ?? extractedEmpty(null),
    requires_videographer: normalized.requires_videographer ?? extractedEmpty(null),
    spelling_corrections: normalized.spelling_corrections ?? [],
  };
}

function normalizeInterpreter(interpreter: Interpreter): Interpreter {
  return {
    ...interpreter,
    oath_administered: interpreter.oath_administered ?? null,
  };
}

function normalizeVideographer(videographer: Videographer): Videographer {
  return {
    ...videographer,
    role_title: videographer.role_title ?? null,
  };
}

function emptyAttorney(attorneyId: string): Attorney {
  return {
    attorney_id: attorneyId,
    name: extractedEmpty(""),
    firm: extractedEmpty(null),
    role: extractedEmpty<AttorneyRole>("OTHER"),
    function: extractedEmpty<AttorneyFunctionValue>([]),
    representing: extractedEmpty(null),
    bar_number: extractedEmpty(null),
    address: null,
    city: null,
    state: null,
    zip: null,
    time_used: null,
    email: null,
    phone: null,
  };
}

function isAttorneyFunction(value: unknown): value is AttorneyFunction {
  return value === "APPEARANCE_ONLY"
    || value === "EXAMINING_ATTORNEY"
    || value === "DEFENDING_ATTORNEY"
    || value === "CUSTODIAL_ATTORNEY"
    || value === "CROSS_EXAMINATION";
}

function normalizeAttorneyFunctionArray(input: unknown[]): AttorneyFunction[] {
  const seen = new Set<AttorneyFunction>();
  for (const value of input) {
    if (isAttorneyFunction(value)) {
      seen.add(value);
    }
  }

  const order: AttorneyFunction[] = [
    "APPEARANCE_ONLY",
    "EXAMINING_ATTORNEY",
    "DEFENDING_ATTORNEY",
    "CUSTODIAL_ATTORNEY",
    "CROSS_EXAMINATION",
  ];

  return order.filter((value) => seen.has(value));
}

function deriveLegacyAttorneyRoleFromFunctionValue(value: AttorneyFunctionValue | undefined): AttorneyRole {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first === "APPEARANCE_ONLY") return "CO_COUNSEL";
    if (first === "EXAMINING_ATTORNEY") return "EXAMINING";
    if (first === "DEFENDING_ATTORNEY") return "OPPOSING";
    if (first === "CUSTODIAL_ATTORNEY") return "OTHER";
    if (first === "CROSS_EXAMINATION") return "OPPOSING";
    return "OTHER";
  }

  return value ?? "OTHER";
}

function normalizeAttorneyRole(
  input: unknown,
  fallback = extractedEmpty<AttorneyRole>("OTHER"),
): ExtractedField<AttorneyRole> {
  return normalizeExtractedField(
    input,
    fallback,
    (value): value is AttorneyRole =>
      value === "EXAMINING" || value === "OPPOSING" || value === "CO_COUNSEL" || value === "OTHER",
  );
}

function normalizeAttorneyFunction(
  input: unknown,
  fallback = extractedEmpty<AttorneyFunctionValue>([]),
): ExtractedField<AttorneyFunctionValue> {
  return normalizeExtractedField(
    input,
    fallback,
    (value): value is AttorneyFunctionValue => {
      if (value === "EXAMINING" || value === "OPPOSING" || value === "CO_COUNSEL" || value === "OTHER") {
        return true;
      }
      return Array.isArray(value) && normalizeAttorneyFunctionArray(value).length === value.length;
    },
  );
}

function normalizeNullableBooleanField(
  input: unknown,
  fallback = extractedEmpty<boolean | null>(null),
): ExtractedField<boolean | null> {
  return normalizeExtractedField(
    input,
    fallback,
    (value): value is boolean | null => typeof value === "boolean" || value === null,
  );
}

function normalizeStringArrayField(
  input: unknown,
  fallback = extractedEmpty<string[]>([]),
): ExtractedField<string[]> {
  return normalizeExtractedField(
    input,
    fallback,
    (value): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string"),
  );
}

function normalizeAttorneyFromUnknown(attorney: unknown, fallbackId: string): Attorney {
  const defaults = emptyAttorney(fallbackId);
  const source = isRecord(attorney) ? attorney : null;
  const attorneyId = source && typeof source.attorney_id === "string" && source.attorney_id.trim() ? source.attorney_id : fallbackId;
  const functionField = normalizeAttorneyFunction(source?.function ?? source?.role, defaults.function);
  const derivedRole = deriveLegacyAttorneyRoleFromFunctionValue(functionField.value);

  return normalizeAttorney({
    ...defaults,
    attorney_id: attorneyId,
    name: normalizeGovernedField(source?.name, defaults.name, PERSON_NAME_POLICY_ID),
    firm: normalizeGovernedField(source?.firm, defaults.firm, ORGANIZATION_POLICY_ID),
    role: normalizeAttorneyRole(source?.role ?? derivedRole, defaults.role),
    function: functionField,
    representing: normalizeNullableStringField(source?.representing, defaults.representing),
    bar_number: normalizeNullableStringField(source?.bar_number, defaults.bar_number),
    address: normalizeNullableString(source?.address),
    city: normalizeNullableString(source?.city),
    state: normalizeNullableString(source?.state),
    zip: normalizeNullableString(source?.zip),
    time_used: normalizeNullableString(source?.time_used),
    email: normalizeNullableString(source?.email),
    phone: normalizePhoneValue(source?.phone),
  });
}

function emptyInterpreter(interpreterId: string): Interpreter {
  return {
    interpreter_id: interpreterId,
    name: extractedEmpty(""),
    language_from: "",
    language_to: "",
    oath_administered: null,
    certified: false,
    cert_number: null,
    agency: null,
    email: null,
    phone: null,
  };
}

function normalizeInterpreterFromUnknown(interpreter: unknown, fallbackId: string): Interpreter {
  const defaults = emptyInterpreter(fallbackId);
  const source = isRecord(interpreter) ? interpreter : null;
  const interpreterId = source && typeof source.interpreter_id === "string" && source.interpreter_id.trim() ? source.interpreter_id : fallbackId;

  return normalizeInterpreter({
    ...defaults,
    interpreter_id: interpreterId,
    name: normalizeGovernedField(source?.name, defaults.name, PERSON_NAME_POLICY_ID),
    language_from: typeof source?.language_from === "string" ? source.language_from : defaults.language_from,
    language_to: typeof source?.language_to === "string" ? source.language_to : defaults.language_to,
    oath_administered: typeof source?.oath_administered === "boolean" ? source.oath_administered : null,
    certified: normalizeBoolean(source?.certified),
    cert_number: normalizeNullableString(source?.cert_number),
    agency: normalizeGovernedValue(source?.agency, ORGANIZATION_POLICY_ID),
    email: normalizeNullableString(source?.email),
    phone: normalizePhoneValue(source?.phone),
  });
}

function emptyVideographer(videographerId: string): Videographer {
  return {
    videographer_id: videographerId,
    name: extractedEmpty(""),
    firm: extractedEmpty(null),
    role_title: null,
    cert_number: null,
    email: null,
    phone: null,
  };
}

function normalizeVideographerFromUnknown(videographer: unknown, fallbackId: string): Videographer {
  const defaults = emptyVideographer(fallbackId);
  const source = isRecord(videographer) ? videographer : null;
  const videographerId = source && typeof source.videographer_id === "string" && source.videographer_id.trim()
    ? source.videographer_id
    : fallbackId;

  return normalizeVideographer({
    ...defaults,
    videographer_id: videographerId,
    name: normalizeGovernedField(source?.name, defaults.name, PERSON_NAME_POLICY_ID),
    firm: normalizeGovernedField(source?.firm, defaults.firm, ORGANIZATION_POLICY_ID),
    role_title: normalizeNullableString(source?.role_title),
    cert_number: normalizeNullableString(source?.cert_number),
    email: normalizeNullableString(source?.email),
    phone: normalizePhoneValue(source?.phone),
  });
}

function emptyParticipant(participantId: string): Participant {
  return {
    participant_id: participantId,
    name: extractedEmpty(""),
    role: "OTHER",
    organization: null,
    email: null,
    phone: null,
    role_in_this_proceeding: null,
    notes: null,
  };
}

function normalizeParticipantFromUnknown(participant: unknown, fallbackId: string): Participant {
  const defaults = emptyParticipant(fallbackId);
  const source = isRecord(participant) ? participant : null;
  const participantId = source && typeof source.participant_id === "string" && source.participant_id.trim()
    ? source.participant_id
    : fallbackId;
  const role = source?.role;

  return {
    ...defaults,
    participant_id: participantId,
    name: normalizeGovernedField(source?.name, defaults.name, PERSON_NAME_POLICY_ID),
    role:
      role === "REPORTER"
      || role === "ATTORNEY"
      || role === "WITNESS"
      || role === "INTERPRETER"
      || role === "VIDEOGRAPHER"
      || role === "PARALEGAL"
      || role === "OBSERVER"
      || role === "OTHER"
        ? role
        : defaults.role,
    organization: normalizeGovernedValue(source?.organization, ORGANIZATION_POLICY_ID),
    email: normalizeNullableString(source?.email),
    phone: normalizePhoneValue(source?.phone),
    role_in_this_proceeding: normalizeNullableString(source?.role_in_this_proceeding),
    notes: normalizeNullableString(source?.notes),
  };
}

function emptyExhibit(exhibitId: string): CaseExhibit {
  return {
    exhibit_id: exhibitId,
    label: "",
    description: "",
    filename: null,
    file_url: null,
    marked_by: null,
    admitted: false,
    page_reference: null,
    line_reference: null,
  };
}

function normalizeExhibitFromUnknown(exhibit: unknown, fallbackId: string): CaseExhibit {
  const defaults = emptyExhibit(fallbackId);
  const source = isRecord(exhibit) ? exhibit : null;
  const exhibitId = source && typeof source.exhibit_id === "string" && source.exhibit_id.trim() ? source.exhibit_id : fallbackId;
  const markedBy = source?.marked_by;

  return {
    ...defaults,
    exhibit_id: exhibitId,
    label: typeof source?.label === "string" ? source.label : defaults.label,
    description: typeof source?.description === "string" ? source.description : defaults.description,
    filename: normalizeNullableString(source?.filename),
    file_url: normalizeNullableString(source?.file_url),
    marked_by: markedBy === "PLAINTIFF" || markedBy === "DEFENDANT" || markedBy === "COURT" ? markedBy : null,
    admitted: normalizeBoolean(source?.admitted),
    page_reference: normalizeNullableNumber(source?.page_reference),
    line_reference: normalizeNullableNumber(source?.line_reference),
  };
}

function normalizeKeytermCategory(input: unknown, fallback: KeytermCategory = "other"): KeytermCategory {
  return input === "proper_name"
    || input === "company"
    || input === "legal_term"
    || input === "technical"
    || input === "location"
    || input === "other"
    ? input
    : fallback;
}

function normalizeDeepgramKeytermFromUnknown(keyterm: unknown): DeepgramKeyterm {
  const source = isRecord(keyterm) ? keyterm : null;
  return {
    term: typeof source?.term === "string" ? source.term : "",
    boost: typeof source?.boost === "number" && Number.isFinite(source.boost) ? source.boost : 0.5,
    category: normalizeKeytermCategory(source?.category),
    notes: typeof source?.notes === "string" ? source.notes : "",
  };
}

function normalizeCaseAudioFromUnknown(audio: unknown): CaseAudio | null {
  if (!isRecord(audio)) {
    return null;
  }

  return {
    audio_id: typeof audio.audio_id === "string" ? audio.audio_id : "",
    original_filename: typeof audio.original_filename === "string" ? audio.original_filename : "",
    mime_type: typeof audio.mime_type === "string" ? audio.mime_type : "",
    duration_seconds: normalizeNullableNumber(audio.duration_seconds),
    file_size_bytes: normalizeNullableNumber(audio.file_size_bytes),
    uploaded_at: typeof audio.uploaded_at === "string" ? audio.uploaded_at : null,
    media_url: normalizeNullableString(audio.media_url),
  };
}

function normalizeCaption(source: unknown, defaults: CaseCaption): CaseCaption {
  const caption = isRecord(source) ? source : null;
  return {
    case_name: normalizeStringField(caption?.case_name, defaults.case_name),
    case_style: normalizeStringField(caption?.case_style, defaults.case_style),
    case_number: normalizeStringField(caption?.case_number, defaults.case_number),
    court_name: normalizeGovernedField(caption?.court_name, defaults.court_name, COURT_POLICY_ID),
    judicial_district: normalizeNullableStringField(caption?.judicial_district, defaults.judicial_district),
    division: normalizeNullableStringField(caption?.division, defaults.division),
    county: normalizeStringField(caption?.county, defaults.county),
    state: normalizeStringField(caption?.state, defaults.state),
    jurisdiction_type: normalizeNullableRoleField(
      caption?.jurisdiction_type,
      defaults.jurisdiction_type,
      ["texas_state", "federal", "state", "other"] as const,
    ),
    venue: normalizeStringField(caption?.venue, defaults.venue),
    department: normalizeNullableStringField(caption?.department, defaults.department),
    judge_name: normalizeGovernedField(caption?.judge_name, defaults.judge_name, PERSON_NAME_POLICY_ID),
  };
}

function normalizeSession(source: unknown, defaults: Session): Session {
  const session = isRecord(source) ? source : null;
  return {
    deposition_date: normalizeStringField(session?.deposition_date, defaults.deposition_date),
    start_time: normalizeNullableStringField(session?.start_time, defaults.start_time),
    end_time: normalizeNullableStringField(session?.end_time, defaults.end_time),
    location_type: normalizeNullableRoleField(session?.location_type, defaults.location_type, ["zoom", "in_person", "hybrid", "phone"] as const),
    location_address: normalizeStringField(session?.location_address, defaults.location_address),
    location_city: normalizeStringField(session?.location_city, defaults.location_city),
    location_county: normalizeStringField(session?.location_county, defaults.location_county),
    location_state: normalizeStringField(session?.location_state, defaults.location_state),
    location_zip: normalizeNullableStringField(session?.location_zip, defaults.location_zip),
    reporting_method: normalizeNullableRoleField(
      session?.reporting_method,
      defaults.reporting_method,
      ["machine_shorthand", "zoom", "in_person", "audio_recording"] as const,
    ),
    is_remote: normalizeBoolean(session?.is_remote),
    remote_platform: normalizeNullableStringField(session?.remote_platform, defaults.remote_platform),
  };
}

function normalizeProceeding(source: unknown, defaults: Proceeding): Proceeding {
  const proceeding = isRecord(source) ? source : null;
  return {
    proceeding_type: proceeding?.proceeding_type === "freelance_deposition" || proceeding?.proceeding_type === "official_court_record"
      ? proceeding.proceeding_type
      : defaults.proceeding_type,
    ordering_firm: normalizeGovernedValue(proceeding?.ordering_firm, ORGANIZATION_POLICY_ID),
    ordering_contact: normalizeGovernedValue(proceeding?.ordering_contact, PERSON_NAME_POLICY_ID),
    clerk_name: normalizeGovernedValue(proceeding?.clerk_name, PERSON_NAME_POLICY_ID),
    clerk_badge: normalizeNullableString(proceeding?.clerk_badge),
    filing_deadline: normalizeNullableString(proceeding?.filing_deadline),
    notes: normalizeNullableString(proceeding?.notes),
  };
}

function normalizeScheduling(source: unknown, defaults: SchedulingMetadata): SchedulingMetadata {
  const scheduling = isRecord(source) ? source : null;
  return {
    proceeding_type: normalizeNullableStringField(scheduling?.proceeding_type, defaults.proceeding_type),
    remote_platform: normalizeNullableStringField(scheduling?.remote_platform, defaults.remote_platform),
    noticing_party: normalizeNullableStringField(scheduling?.noticing_party, defaults.noticing_party),
    ordered_by: normalizeNullableStringField(scheduling?.ordered_by, defaults.ordered_by),
    scheduler: normalizeGovernedField(scheduling?.scheduler, defaults.scheduler, PERSON_NAME_POLICY_ID),
    scheduling_contact: normalizeGovernedField(scheduling?.scheduling_contact, defaults.scheduling_contact, PERSON_NAME_POLICY_ID),
    service_type: normalizeNullableStringField(scheduling?.service_type, defaults.service_type),
    time_zone: normalizeNullableStringField(scheduling?.time_zone, defaults.time_zone),
    remote_location: normalizeNullableStringField(scheduling?.remote_location, defaults.remote_location),
  };
}

function normalizeService(source: unknown, defaults: ServiceMetadata): ServiceMetadata {
  const service = isRecord(source) ? source : null;
  return {
    certificate_of_service: normalizeNullableBooleanField(service?.certificate_of_service, defaults.certificate_of_service),
    service_date: normalizeNullableStringField(service?.service_date, defaults.service_date),
    served_parties: normalizeStringArrayField(service?.served_parties, defaults.served_parties),
    service_emails: normalizeStringArrayField(service?.service_emails, defaults.service_emails),
  };
}

function normalizeReporterRequests(source: unknown, defaults: ReporterRequestMetadata): ReporterRequestMetadata {
  const requests = isRecord(source) ? source : null;
  return {
    certified_reporter_required: normalizeNullableBooleanField(requests?.certified_reporter_required, defaults.certified_reporter_required),
    stenographic_recording: normalizeNullableBooleanField(requests?.stenographic_recording, defaults.stenographic_recording),
    audiovisual_recording: normalizeNullableBooleanField(requests?.audiovisual_recording, defaults.audiovisual_recording),
    realtime_requested: normalizeNullableBooleanField(requests?.realtime_requested, defaults.realtime_requested),
    expedited_delivery: normalizeNullableBooleanField(requests?.expedited_delivery, defaults.expedited_delivery),
    rush_delivery: normalizeNullableBooleanField(requests?.rush_delivery, defaults.rush_delivery),
    daily_copy: normalizeNullableBooleanField(requests?.daily_copy, defaults.daily_copy),
    rough_draft: normalizeNullableBooleanField(requests?.rough_draft, defaults.rough_draft),
  };
}

function normalizeReporter(source: unknown, defaults: Reporter): Reporter {
  const reporter = isRecord(source) ? source : null;
  return {
    name: normalizeGovernedField(reporter?.name, defaults.name, PERSON_NAME_POLICY_ID),
    cert_number: normalizeStringField(reporter?.cert_number, defaults.cert_number),
    cert_state: normalizeStringField(reporter?.cert_state, defaults.cert_state),
    firm: normalizeGovernedField(reporter?.firm, defaults.firm, ORGANIZATION_POLICY_ID),
    license_expiration: normalizeNullableStringField(reporter?.license_expiration, defaults.license_expiration),
    firm_registration_number: normalizeNullableStringField(reporter?.firm_registration_number, defaults.firm_registration_number),
    firm_address: normalizeNullableStringField(reporter?.firm_address, defaults.firm_address),
    email: normalizeNullableString(reporter?.email),
    phone: normalizePhoneValue(reporter?.phone),
    notary_required: normalizeBoolean(reporter?.notary_required),
    notary_name: normalizeGovernedValue(reporter?.notary_name, PERSON_NAME_POLICY_ID),
    notary_commission_expiry: normalizeNullableString(reporter?.notary_commission_expiry),
  };
}

function normalizeTranscriptFormat(source: unknown, defaults: TranscriptFormat): TranscriptFormat {
  const format = isRecord(source) ? source : null;
  return {
    lines_per_page: normalizeNumber(format?.lines_per_page, defaults.lines_per_page),
    chars_per_line: normalizeNumber(format?.chars_per_line, defaults.chars_per_line),
    first_page_number: normalizeNumber(format?.first_page_number, defaults.first_page_number),
    include_line_numbers: typeof format?.include_line_numbers === "boolean" ? format.include_line_numbers : defaults.include_line_numbers,
    include_timestamps: typeof format?.include_timestamps === "boolean" ? format.include_timestamps : defaults.include_timestamps,
    font_family: typeof format?.font_family === "string" ? format.font_family : defaults.font_family,
    font_size_pt: normalizeNumber(format?.font_size_pt, defaults.font_size_pt),
  };
}

function normalizeStageCompletion(source: unknown, defaults: StageCompletion): StageCompletion {
  const stageCompletion = isRecord(source) ? source : null;
  return {
    intake: typeof stageCompletion?.intake === "boolean" ? stageCompletion.intake : defaults.intake,
    creation: typeof stageCompletion?.creation === "boolean" ? stageCompletion.creation : defaults.creation,
    workspace: typeof stageCompletion?.workspace === "boolean" ? stageCompletion.workspace : defaults.workspace,
    exhibits: typeof stageCompletion?.exhibits === "boolean" ? stageCompletion.exhibits : defaults.exhibits,
    ufm: typeof stageCompletion?.ufm === "boolean" ? stageCompletion.ufm : defaults.ufm,
    certification: typeof stageCompletion?.certification === "boolean" ? stageCompletion.certification : defaults.certification,
    export: typeof stageCompletion?.export === "boolean" ? stageCompletion.export : defaults.export,
  };
}

function normalizeDeepgram(source: unknown, defaults: DeepgramConfig, coercedPaths: Set<string>): DeepgramConfig {
  const deepgram = isRecord(source) ? source : null;
  return {
    model: typeof deepgram?.model === "string" ? deepgram.model : defaults.model,
    language: typeof deepgram?.language === "string" ? deepgram.language : defaults.language,
    punctuate: typeof deepgram?.punctuate === "boolean" ? deepgram.punctuate : defaults.punctuate,
    utterances: typeof deepgram?.utterances === "boolean" ? deepgram.utterances : defaults.utterances,
    diarize: typeof deepgram?.diarize === "boolean" ? deepgram.diarize : defaults.diarize,
    diarize_version: typeof deepgram?.diarize_version === "string" ? deepgram.diarize_version : defaults.diarize_version,
    speaker_count: deepgram?.speaker_count === null || typeof deepgram?.speaker_count === "number" ? deepgram.speaker_count : defaults.speaker_count,
    smart_format: typeof deepgram?.smart_format === "boolean" ? deepgram.smart_format : defaults.smart_format,
    numerals: typeof deepgram?.numerals === "boolean" ? deepgram.numerals : defaults.numerals,
    keyterms: normalizeArrayField(
      deepgram?.keyterms,
      "deepgram.keyterms",
      coercedPaths,
      (keyterm) => normalizeDeepgramKeytermFromUnknown(keyterm),
    ),
  };
}

function normalizeWitnesses(record: Record<string, unknown>, coercedPaths: Set<string>): Witness[] {
  const legacyName = readLegacyWitnessName(record);
  const legacyRole = record.deponentRole;
  const rawWitnesses = record.witnesses;

  if (Array.isArray(rawWitnesses)) {
    return rawWitnesses.map((witness, index) =>
      normalizeWitness(witness, `witness_${index + 1}`, index === 0 ? { name: legacyName, role: legacyRole } : undefined),
    );
  }

  if (isRecord(rawWitnesses)) {
    coercedPaths.add("witnesses");
    return [normalizeWitness(rawWitnesses, "witness_1", { name: legacyName, role: legacyRole })];
  }

  if (rawWitnesses !== undefined && rawWitnesses !== null) {
    coercedPaths.add("witnesses");
  }

  if (legacyName) {
    coercedPaths.add("witnesses");
    return [normalizeWitness({}, "witness_1", { name: legacyName, role: legacyRole })];
  }

  return [];
}

const warnedLegacyCaseIds = new Set<string>();

export function normalizeCaseRecord(record: unknown): CaseRecord {
  const source = isRecord(record) ? record : {};
  const caseId = typeof source.case_id === "string" ? source.case_id : "";
  const createdAt = typeof source.created_at === "string" ? source.created_at : new Date().toISOString();
  const defaults = emptyCaseRecord(caseId, createdAt);
  const coercedPaths = new Set<string>();

  const normalized: CaseRecord = {
    ...defaults,
    version: source.version === "1.0" ? "1.0" : defaults.version,
    case_id: caseId,
    created_at: createdAt,
    updated_at: typeof source.updated_at === "string" ? source.updated_at : defaults.updated_at,
    _saveMeta: isRecord(source._saveMeta)
      && typeof source._saveMeta.source === "string"
      && typeof source._saveMeta.at === "string"
      && typeof source._saveMeta.seq === "number"
        ? {
            source: source._saveMeta.source === "manual" || source._saveMeta.source === "autosave" || source._saveMeta.source === "flush"
              ? source._saveMeta.source
              : defaults._saveMeta?.source ?? "manual",
            at: source._saveMeta.at,
            seq: source._saveMeta.seq,
          }
        : undefined,
    proceeding_type:
      source.proceeding_type === "freelance_deposition" || source.proceeding_type === "official_court_record"
        ? source.proceeding_type
        : defaults.proceeding_type,
    caption: normalizeCaption(source.caption, defaults.caption),
    session: normalizeSession(source.session, defaults.session),
    proceeding: normalizeProceeding(source.proceeding, defaults.proceeding),
    scheduling: normalizeScheduling(source.scheduling, defaults.scheduling),
    service: normalizeService(source.service, defaults.service),
    reporter_requests: normalizeReporterRequests(source.reporter_requests, defaults.reporter_requests),
    reporter: normalizeReporter(source.reporter, defaults.reporter),
    format: normalizeTranscriptFormat(source.format, defaults.format),
    parties: normalizeArrayField(source.parties, "parties", coercedPaths, (party, index) =>
      normalizePartyFromUnknown(party, `party_${index + 1}`),
    ),
    law_firms: normalizeArrayField(source.law_firms, "law_firms", coercedPaths, (lawFirm, index) =>
      normalizeLawFirmFromUnknown(lawFirm, `firm_${index + 1}`),
    ),
    witnesses: normalizeWitnesses(source, coercedPaths),
    attorneys: normalizeArrayField(source.attorneys, "attorneys", coercedPaths, (attorney, index) =>
      normalizeAttorneyFromUnknown(attorney, `attorney_${index + 1}`),
    ),
    interpreters: normalizeArrayField(source.interpreters, "interpreters", coercedPaths, (interpreter, index) =>
      normalizeInterpreterFromUnknown(interpreter, `interpreter_${index + 1}`),
    ),
    videographers: normalizeArrayField(source.videographers, "videographers", coercedPaths, (videographer, index) =>
      normalizeVideographerFromUnknown(videographer, `videographer_${index + 1}`),
    ),
    participants: normalizeArrayField(source.participants, "participants", coercedPaths, (participant, index) =>
      normalizeParticipantFromUnknown(participant, `participant_${index + 1}`),
    ),
    audio: normalizeCaseAudioFromUnknown(source.audio),
    exhibits: normalizeArrayField(source.exhibits, "exhibits", coercedPaths, (exhibit, index) =>
      normalizeExhibitFromUnknown(exhibit, `exhibit_${index + 1}`),
    ),
    deepgram: normalizeDeepgram(source.deepgram, defaults.deepgram, coercedPaths),
    stage:
      source.stage === "intake"
      || source.stage === "creation"
      || source.stage === "workspace"
      || source.stage === "exhibits"
      || source.stage === "ufm"
      || source.stage === "certification"
      || source.stage === "export"
        ? source.stage
        : defaults.stage,
    stage_completion: normalizeStageCompletion(source.stage_completion, defaults.stage_completion),
    certification: isRecord(source.certification) ? {
      certification_date: typeof source.certification.certification_date === "string" ? source.certification.certification_date : null,
      certification_statement: typeof source.certification.certification_statement === "string"
        ? source.certification.certification_statement
        : defaults.certification?.certification_statement ?? "",
      checklist: isRecord(source.certification.checklist)
        ? {
            review_complete: normalizeBoolean(source.certification.checklist.review_complete),
            speaker_mapping_complete: normalizeBoolean(source.certification.checklist.speaker_mapping_complete),
            confidence_review_complete: normalizeBoolean(source.certification.checklist.confidence_review_complete),
            exhibits_complete: normalizeBoolean(source.certification.checklist.exhibits_complete),
            ufm_complete: normalizeBoolean(source.certification.checklist.ufm_complete),
          }
        : {
            review_complete: false,
            speaker_mapping_complete: false,
            confidence_review_complete: false,
            exhibits_complete: false,
            ufm_complete: false,
          },
      signature_hash: normalizeNullableString(source.certification.signature_hash),
    } : null,
    notes: typeof source.notes === "string" ? source.notes : defaults.notes,
  };

  const deduped = repairParticipantCollections(normalized, coercedPaths);

  if (coercedPaths.size > 0 && !warnedLegacyCaseIds.has(deduped.case_id)) {
    warnedLegacyCaseIds.add(deduped.case_id);
    console.warn("[DEPO-PRO] Normalized legacy case payload", {
      case_id: deduped.case_id,
      coercedPaths: [...coercedPaths],
    });
  }

  return deduped;
}

function repairParticipantCollections(record: CaseRecord, coercedPaths: Set<string>): CaseRecord {
  const dedupedParties = dedupeParties(record.parties, coercedPaths);
  const dedupedAttorneys = dedupeAttorneys(record.attorneys, coercedPaths);
  const dedupedParticipants = dedupeParticipants(record.participants, coercedPaths);
  const dedupedInterpreters = dedupeInterpreters(record.interpreters, coercedPaths);
  const dedupedVideographers = dedupeVideographers(record.videographers, coercedPaths);
  const dedupedWitnesses = dedupeWitnesses(record.witnesses, coercedPaths);

  const partyNames = new Set(dedupedParties.map((party) => normalizeComparableName(party.name.value)).filter(Boolean));
  const healedAttorneys = dedupedAttorneys.filter((attorney) => {
    const normalizedName = normalizeComparableName(attorney.name.value);
    if (!normalizedName || !partyNames.has(normalizedName)) {
      return true;
    }

    if (looksLikePartyLeak(attorney)) {
      coercedPaths.add("attorneys.party_leak");
      return false;
    }

    return true;
  });

  if (
    dedupedParties === record.parties
    && dedupedAttorneys === record.attorneys
    && dedupedParticipants === record.participants
    && dedupedInterpreters === record.interpreters
    && dedupedVideographers === record.videographers
    && dedupedWitnesses === record.witnesses
    && healedAttorneys === dedupedAttorneys
  ) {
    return record;
  }

  return {
    ...record,
    parties: dedupedParties,
    attorneys: healedAttorneys,
    participants: dedupedParticipants,
    interpreters: dedupedInterpreters,
    videographers: dedupedVideographers,
    witnesses: dedupedWitnesses,
  };
}

function normalizeComparableName(value: string | null | undefined): string {
  const normalized = normalizeNullableString(value, "") ?? "";
  return normalized.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function normalizeComparableValue(value: unknown): string {
  if (typeof value === "string") {
    return normalizeComparableName(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableValue(item)).filter(Boolean).sort().join("|");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (value == null) {
    return "";
  }

  return String(value).toLowerCase().trim();
}

function normalizeComparableFieldValue<T>(field: ExtractedField<T>): string {
  return normalizeComparableValue(field.value);
}

function buildCompositeKey(name: string | null | undefined, roleBearingValues: unknown[]): string {
  const normalizedName = normalizeComparableName(name);
  if (!normalizedName) {
    return "";
  }

  return [normalizedName, ...roleBearingValues.map((value) => normalizeComparableValue(value))].join("|");
}

function isMeaningfulString(value: string | null | undefined): boolean {
  return (normalizeNullableString(value, "") ?? "").length > 0;
}

function mergeExtractedFieldIfEmpty<T>(current: ExtractedField<T>, incoming: ExtractedField<T>): ExtractedField<T> {
  const currentValue = current.value;
  if (typeof currentValue === "string" || currentValue == null) {
    return isMeaningfulString(currentValue as string | null | undefined) ? current : incoming;
  }

  if (Array.isArray(currentValue)) {
    return currentValue.length > 0 ? current : incoming;
  }

  return currentValue == null ? incoming : current;
}

function dedupeParties(parties: CaseParty[], coercedPaths: Set<string>): CaseParty[] {
  const deduped: CaseParty[] = [];
  const byName = new Map<string, CaseParty>();

  for (const party of parties) {
    const key = normalizeComparableName(party.name.value);
    if (!key) {
      deduped.push(party);
      continue;
    }

    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, party);
      deduped.push(party);
      continue;
    }

    coercedPaths.add("parties");
    existing.role = mergeExtractedFieldIfEmpty(existing.role, party.role);
    existing.role_modifier = mergeExtractedFieldIfEmpty(existing.role_modifier, party.role_modifier);
    existing.entity_type = mergeExtractedFieldIfEmpty(existing.entity_type, party.entity_type);
    existing.fka_or_dba = mergeExtractedFieldIfEmpty(existing.fka_or_dba, party.fka_or_dba);
  }

  return deduped.length === parties.length ? parties : deduped;
}

function dedupeAttorneys(attorneys: Attorney[], coercedPaths: Set<string>): Attorney[] {
  const deduped: Attorney[] = [];
  const byCompositeKey = new Map<string, Attorney>();

  for (const attorney of attorneys) {
    const key = buildCompositeKey(attorney.name.value, [
      normalizeComparableFieldValue(attorney.representing),
      normalizeComparableFieldValue(attorney.function ?? attorney.role),
      normalizeComparableFieldValue(attorney.firm),
    ]);
    if (!key) {
      deduped.push(attorney);
      continue;
    }

    const existing = byCompositeKey.get(key);
    if (!existing) {
      byCompositeKey.set(key, attorney);
      deduped.push(attorney);
      continue;
    }

    coercedPaths.add("attorneys");
    existing.firm = mergeExtractedFieldIfEmpty(existing.firm, attorney.firm);
    existing.role = mergeExtractedFieldIfEmpty(existing.role, attorney.role);
    existing.function = mergeExtractedFieldIfEmpty(existing.function ?? existing.role, attorney.function ?? attorney.role);
    existing.representing = mergeExtractedFieldIfEmpty(existing.representing, attorney.representing);
    existing.bar_number = mergeExtractedFieldIfEmpty(existing.bar_number, attorney.bar_number);
    if (!existing.address) existing.address = attorney.address;
    if (!existing.city) existing.city = attorney.city;
    if (!existing.state) existing.state = attorney.state;
    if (!existing.zip) existing.zip = attorney.zip;
    if (!existing.email) existing.email = attorney.email;
    if (!existing.phone) existing.phone = attorney.phone;
    if (!existing.time_used) existing.time_used = attorney.time_used;
  }

  return deduped.length === attorneys.length ? attorneys : deduped;
}

function dedupeWitnesses(witnesses: Witness[], coercedPaths: Set<string>): Witness[] {
  const deduped: Witness[] = [];
  const byCompositeKey = new Map<string, Witness>();

  for (const witness of witnesses) {
    const key = buildCompositeKey(witness.name.value, [
      normalizeComparableFieldValue(witness.role),
      normalizeComparableFieldValue(witness.title),
      normalizeComparableFieldValue(witness.employer),
      witness.prefix_suffix,
      normalizeComparableFieldValue(witness.party_affiliation),
      witness.is_corporate_rep,
      witness.corporate_entity,
      normalizeComparableFieldValue(witness.read_and_sign),
      normalizeComparableFieldValue(witness.requires_interpreter),
      normalizeComparableFieldValue(witness.requires_videographer),
    ]);
    if (!key) {
      deduped.push(witness);
      continue;
    }

    const existing = byCompositeKey.get(key);
    if (!existing) {
      byCompositeKey.set(key, witness);
      deduped.push(witness);
      continue;
    }

    coercedPaths.add("witnesses");
    existing.role = mergeExtractedFieldIfEmpty(existing.role, witness.role);
    existing.title = mergeExtractedFieldIfEmpty(existing.title, witness.title);
    existing.employer = mergeExtractedFieldIfEmpty(existing.employer, witness.employer);
    existing.party_affiliation = mergeExtractedFieldIfEmpty(existing.party_affiliation, witness.party_affiliation);
    existing.read_and_sign = mergeExtractedFieldIfEmpty(existing.read_and_sign, witness.read_and_sign);
    existing.requires_interpreter = mergeExtractedFieldIfEmpty(existing.requires_interpreter, witness.requires_interpreter);
    existing.requires_videographer = mergeExtractedFieldIfEmpty(existing.requires_videographer, witness.requires_videographer);
    if (!existing.prefix_suffix) existing.prefix_suffix = witness.prefix_suffix;
    if (!existing.corporate_entity) existing.corporate_entity = witness.corporate_entity;
    if (!existing.email) existing.email = witness.email;
    if (!existing.phone) existing.phone = witness.phone;
    if (existing.spelling_corrections.length === 0 && witness.spelling_corrections.length > 0) {
      existing.spelling_corrections = witness.spelling_corrections;
    }
  }

  return deduped.length === witnesses.length ? witnesses : deduped;
}

function dedupeInterpreters(interpreters: Interpreter[], coercedPaths: Set<string>): Interpreter[] {
  const deduped: Interpreter[] = [];
  const byCompositeKey = new Map<string, Interpreter>();

  for (const interpreter of interpreters) {
    const key = buildCompositeKey(interpreter.name.value, [
      interpreter.language_from,
      interpreter.language_to,
      interpreter.oath_administered,
      interpreter.certified,
      interpreter.cert_number,
      interpreter.agency,
    ]);
    if (!key) {
      deduped.push(interpreter);
      continue;
    }

    const existing = byCompositeKey.get(key);
    if (!existing) {
      byCompositeKey.set(key, interpreter);
      deduped.push(interpreter);
      continue;
    }

    coercedPaths.add("interpreters");
    if (!existing.language_from) existing.language_from = interpreter.language_from;
    if (!existing.language_to) existing.language_to = interpreter.language_to;
    if (existing.oath_administered == null) existing.oath_administered = interpreter.oath_administered;
    if (!existing.certified) existing.certified = interpreter.certified;
    if (!existing.cert_number) existing.cert_number = interpreter.cert_number;
    if (!existing.agency) existing.agency = interpreter.agency;
    if (!existing.email) existing.email = interpreter.email;
    if (!existing.phone) existing.phone = interpreter.phone;
  }

  return deduped.length === interpreters.length ? interpreters : deduped;
}

function dedupeVideographers(videographers: Videographer[], coercedPaths: Set<string>): Videographer[] {
  const deduped: Videographer[] = [];
  const byCompositeKey = new Map<string, Videographer>();

  for (const videographer of videographers) {
    const key = buildCompositeKey(videographer.name.value, [
      normalizeComparableFieldValue(videographer.firm),
      videographer.role_title,
      videographer.cert_number,
    ]);
    if (!key) {
      deduped.push(videographer);
      continue;
    }

    const existing = byCompositeKey.get(key);
    if (!existing) {
      byCompositeKey.set(key, videographer);
      deduped.push(videographer);
      continue;
    }

    coercedPaths.add("videographers");
    existing.firm = mergeExtractedFieldIfEmpty(existing.firm, videographer.firm);
    if (!existing.role_title) existing.role_title = videographer.role_title;
    if (!existing.cert_number) existing.cert_number = videographer.cert_number;
    if (!existing.email) existing.email = videographer.email;
    if (!existing.phone) existing.phone = videographer.phone;
  }

  return deduped.length === videographers.length ? videographers : deduped;
}

function dedupeParticipants(participants: Participant[], coercedPaths: Set<string>): Participant[] {
  const deduped: Participant[] = [];
  const byCompositeKey = new Map<string, Participant>();

  for (const participant of participants) {
    const key = buildCompositeKey(participant.name.value, [
      participant.role,
      participant.organization,
      participant.role_in_this_proceeding,
    ]);
    if (!key) {
      deduped.push(participant);
      continue;
    }

    const existing = byCompositeKey.get(key);
    if (!existing) {
      byCompositeKey.set(key, participant);
      deduped.push(participant);
      continue;
    }

    coercedPaths.add("participants");
    if (existing.role === "OTHER" && participant.role !== "OTHER") existing.role = participant.role;
    if (!existing.organization) existing.organization = participant.organization;
    if (!existing.email) existing.email = participant.email;
    if (!existing.phone) existing.phone = participant.phone;
    if (!existing.role_in_this_proceeding) existing.role_in_this_proceeding = participant.role_in_this_proceeding;
    if (!existing.notes) existing.notes = participant.notes;
  }

  return deduped.length === participants.length ? participants : deduped;
}

function looksLikePartyLeak(attorney: Attorney): boolean {
  return !isMeaningfulString(attorney.firm.value)
    && !isMeaningfulString(attorney.bar_number.value)
    && !isMeaningfulString(attorney.address)
    && !isMeaningfulString(attorney.city)
    && !isMeaningfulString(attorney.state)
    && !isMeaningfulString(attorney.zip)
    && !isMeaningfulString(attorney.email)
    && !isMeaningfulString(attorney.phone);
}

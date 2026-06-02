// UFM Case Data Model — UI-only types, not part of the API contract.
// Field names match docs/architecture/UFM_DATA_DICTIONARY.md.
// Do not import from src/api/types.ts here; this model is independent.

// ─── Primitives ──────────────────────────────────────────────────────────────

export type ISODate = string;   // "YYYY-MM-DD"
export type ISOTime = string;   // "HH:MM"
export type ISODateTime = string; // "YYYY-MM-DDTHH:MM:SSZ"

export type CaseId = string;    // "case_20240314_001"

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
  case_number:  ExtractedField<string>;
  court_name:   ExtractedField<string>;
  department:   ExtractedField<string | null>;
  judge_name:   ExtractedField<string | null>;
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

// ─── Attorney ────────────────────────────────────────────────────────────────

export interface Attorney {
  attorney_id:  string;
  name:         ExtractedField<string>;
  firm:         ExtractedField<string | null>;
  role:         ExtractedField<AttorneyRole>;
  representing: ExtractedField<string | null>; // "Plaintiff", "Defendant", etc.
  bar_number:   ExtractedField<string | null>;
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
  email:       string | null;
  phone:       string | null;
}

// ─── Interpreter ─────────────────────────────────────────────────────────────

export interface Interpreter {
  interpreter_id:    string;
  name:              ExtractedField<string>;
  language_from:     string;   // ISO 639-1, e.g. "es"
  language_to:       string;   // ISO 639-1, e.g. "en"
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
  notes:          string | null;
}

// ─── Court Reporter ──────────────────────────────────────────────────────────

export interface Reporter {
  name:             ExtractedField<string>;
  cert_number:      ExtractedField<string>;
  cert_state:       ExtractedField<string>;    // two-letter state code
  firm:             ExtractedField<string | null>;
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
  location_address:  ExtractedField<string>;
  location_city:     ExtractedField<string>;
  location_state:    ExtractedField<string>;
  location_zip:      ExtractedField<string | null>;
  is_remote:         boolean;
  remote_platform:   string | null;  // "Zoom", "Teams", etc.
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
  model:             string;     // "nova-2-legal"
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

  proceeding_type: ProceedingType;

  caption:    CaseCaption;
  session:    Session;
  proceeding: Proceeding;
  reporter:   Reporter;
  format:     TranscriptFormat;

  // Named participants
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
    model:           "nova-2-legal",
    language:        "en-US",
    punctuate:       true,
    utterances:      true,
    diarize:         true,
    diarize_version: "latest",
    speaker_count:   null,
    smart_format:    false,
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
      case_number: extractedEmpty(""),
      court_name:  extractedEmpty(""),
      department:  extractedEmpty(null),
      judge_name:  extractedEmpty(null),
    },

    session: {
      deposition_date:  extractedEmpty(""),
      start_time:       extractedEmpty(null),
      end_time:         extractedEmpty(null),
      location_address: extractedEmpty(""),
      location_city:    extractedEmpty(""),
      location_state:   extractedEmpty(""),
      location_zip:     extractedEmpty(null),
      is_remote:        false,
      remote_platform:  null,
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

    reporter: {
      name:                     extractedEmpty(""),
      cert_number:              extractedEmpty(""),
      cert_state:               extractedEmpty(""),
      firm:                     extractedEmpty(null),
      email:                    null,
      phone:                    null,
      notary_required:          false,
      notary_name:              null,
      notary_commission_expiry: null,
    },

    format:        defaultTranscriptFormat(),
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

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE TYPES FOR SUPABASE
// ═══════════════════════════════════════════════════════════════════════════
// TypeScript types matching Supabase database schema
// This file should be placed at: types/database.ts
//
// NOTE: In production, generate these types automatically using:
// npx supabase gen types typescript --project-id <your-project-id> > types/database.ts

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS (matching Postgres enum types)
// ═══════════════════════════════════════════════════════════════════════════
// NOTE: These enums must match the Postgres enum types in your Supabase database.
// Generate types automatically using:
// npx supabase gen types typescript --project-id <your-project-id> > types/database.ts

export type UserRole =
  | 'REPORTER'
  | 'SCOPIST'
  | 'ADMIN'
  | 'ATTORNEY'
  | 'PARALEGAL'
  | 'AGENCY'
  | 'AGENCY_ADMIN'
  | 'FIRM_ADMIN';

export type JobStatus =
  | 'CREATED'
  | 'FILES_UPLOADED'
  | 'ENHANCING_AUDIO'
  | 'TRANSCRIBING'
  | 'AI_REVIEWING'
  | 'READY_FOR_EDIT'
  | 'ASSIGNED'
  | 'IN_EDIT'
  | 'SUBMITTED_FOR_REVIEW'
  | 'IN_REVIEW'
  | 'SCOPIST_COMPLETE'
  | 'REVIEW_COMPLETE'
  | 'COMPLETED'
  | 'CANCELLED';

export type FileType =
  | 'AUDIO'
  | 'VIDEO'
  | 'NOTICE'
  | 'COURT_ORDER'
  | 'ROUGH_TRANSCRIPT'
  | 'EXHIBIT'
  | 'FINAL_TRANSCRIPT';

export type TranscriptionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ERROR'
  | 'CANCELLED';

export type EditType =
  | 'WORD_CORRECTION'
  | 'SPEAKER_ASSIGNMENT'
  | 'PUNCTUATION'
  | 'INAUDIBLE_MARK'
  | 'FORMATTING';

export type AssignmentStatus =
  | 'INVITED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EXPIRED'
  | 'RELEASED';

export type NotificationType =
  | 'JOB_ASSIGNED'
  | 'TRANSCRIPTION_COMPLETE'
  | 'AI_REVIEW_COMPLETE'
  | 'SCOPIST_ACCEPTED'
  | 'SCOPIST_DECLINED'
  | 'SCOPIST_SUBMITTED'
  | 'REPORTER_REVIEWED'
  | 'JOB_COMPLETE'
  | 'SYSTEM_ERROR'
  | 'MESSAGE_RECEIVED';

export type CaseStatus = 'ACTIVE' | 'CLOSED' | 'SETTLED' | 'ARCHIVED';

export type CaseRole = 'ATTORNEY' | 'PARALEGAL' | 'REPORTER';

export type CalendarEventStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CONVERTED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'EXTERNAL_BLOCK';

export type EventType =
  | 'DEPOSITION'
  | 'HEARING'
  | 'ARBITRATION'
  | 'MEDIATION'
  | 'EUO'
  | 'STATEMENT'
  | 'OTHER';

export type AvailabilityType = 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE';

export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID';

export type BillingServiceType =
  | 'TRANSCRIPTION_AUTOMATED'
  | 'MODEL_UPGRADE'
  | 'HUMAN_REVIEW_CONFIDENCE'
  | 'HUMAN_REVIEW_FULL'
  | 'FORENSIC_AUDIO_RX';

export type BillingUnit = 'PER_MINUTE' | 'PER_WORD' | 'PER_FILE' | 'PER_HOUR';

export type AudioProcessingMode = 'AUTOMATED' | 'MANUAL_RX';

export type ASRModelTier = 'STANDARD' | 'ENHANCED';

// ═══════════════════════════════════════════════════════════════════════════
// TABLE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  // Aliases for backward compatibility
  firstName?: string;
  lastName?: string;
  firmId?: string;
  role: UserRole;
  firm_id: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  photo: string | null;
  timezone: string;
  agency_name: string | null;
  csr_number: string | null;
  specialties: string[];
  experience_level: string | null;
  availability: boolean;
  default_transcript_settings: Record<string, unknown> | null;
  notification_preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  deleted_at: string | null;
  agency_id: string | null;
}

export interface Firm {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  agency_id: string | null;
}

export interface Job {
  id: string;
  title: string;
  case_name: string;
  case_number: string | null;
  deposition_date: string;
  // Aliases for backward compatibility
  caseName?: string;
  caseNumber?: string | null;
  depositionDate?: string;
  location: string | null;
  zoom_link: string | null;
  status: JobStatus;
  firm_id: string | null;
  created_by_id: string;
  assigned_to_id: string | null;
  case_id: string | null;
  transcription_model_type: string | null;
  transcription_completed_at: string | null;
  error_message: string | null;
  notes: string | null;
  internal_notes: string | null;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  due_date: string | null;
  scopist_id: string | null;
  deleted_at: string | null;
  agency_id: string | null;
  audio_processing_mode: AudioProcessingMode;
  asr_model_tier: ASRModelTier;
  pricing_snapshot_id: string | null;
  audio_duration_minutes: number | null;
  audio_duration_seconds: number | null;
}

export interface JobFile {
  id: string;
  job_id: string;
  type: FileType;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_url: string;
  storage_path: string;
  extracted_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  job_id: string;
  version: string;
  version_number: number;
  content: string;
  content_json: Record<string, unknown>;
  word_count: number | null;
  page_count: number | null;
  average_confidence: number | null;
  speaker_count: number | null;
  ai_changes: Record<string, unknown> | null;
  ai_flags: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Transcription {
  id: string;
  job_id: string;
  full_transcript: string;
  deepgram_raw_json: string | null;
  words: Record<string, unknown>;
  utterances: Record<string, unknown> | null;
  flagged_segments: Record<string, unknown> | null;
  speaker_analysis: Record<string, unknown> | null;
  speaker_assignments: Record<string, unknown> | null;
  duration: number | null;
  word_count: number | null;
  flagged_word_count: number | null;
  average_confidence: number | null;
  speaker_count: number;
  model_used: string | null;
  status: TranscriptionStatus;
  version: number;
  created_at: string;
  updated_at: string;
  lock_reason: string | null;
  locked_at: string | null;
  locked_by: string | null;
  review_time_minutes: number | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
}

export interface TranscriptionEdit {
  id: string;
  transcription_id: string;
  editor_id: string;
  editor_email: string | null;
  editor_role: UserRole | null;
  edit_type: EditType;
  original_text: string | null;
  edited_text: string | null;
  position: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface JobAssignment {
  id: string;
  job_id: string;
  scopist_id: string;
  status: AssignmentStatus;
  invited_at: string;
  responded_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  scopist_notes: string | null;
  // Aliases for backward compatibility
  scopistId?: string;
  scopistNotes?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url: string | null;
  link_text: string | null;
  is_read: boolean;
  read_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  job_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor_user_id: string | null;
  firm_id: string | null;
  metadata: Record<string, unknown> | null;
  target_id: string;
  target_type: string;
}

export interface Case {
  id: string;
  firm_id: string;
  created_by_id: string;
  case_number: string;
  case_style: string;
  short_title: string | null;
  court_name: string | null;
  court_type: string | null;
  county: string | null;
  state: string;
  judge_assigned: string | null;
  plaintiffs: Record<string, unknown> | null;
  defendants: Record<string, unknown> | null;
  other_parties: Record<string, unknown> | null;
  status: CaseStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  firm_id: string;
  title: string;
  event_type: EventType;
  status: CalendarEventStatus;
  start_time: string;
  end_time: string;
  timezone: string;
  all_day: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  recurrence_end_date: string | null;
  parent_event_id: string | null;
  location: string | null;
  is_remote: boolean;
  meeting_link: string | null;
  job_id: string | null;
  assigned_reporter_id: string | null;
  requested_by_id: string | null;
  scheduled_by_id: string | null;
  notes: string | null;
  internal_notes: string | null;
  cancellation_reason: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  agency_id: string | null;
  ordering_attorney_id: string | null;
  last_rescheduled_at: string | null;
  last_rescheduled_by_id: string | null;
  reschedule_count: number;
  original_start_time: string | null;
}

export interface BillingAccount {
  id: string;
  firm_id: string;
  stripe_customer_id: string | null;
  billing_email: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  billing_account_id: string;
  invoice_number: string;
  stripe_invoice_id: string | null;
  period_start: string;
  period_end: string;
  total_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  status: InvoiceStatus;
  finalized_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  voided_by_user_id: string | null;
  void_reason: string | null;
  stripe_invoice_url: string | null;
  stripe_payment_intent_id: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE SCHEMA TYPE
// ═══════════════════════════════════════════════════════════════════════════

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id'>>;
      };
      firms: {
        Row: Firm;
        Insert: Omit<Firm, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Firm, 'id'>>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'status'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: JobStatus;
        };
        Update: Partial<Omit<Job, 'id'>>;
      };
      job_files: {
        Row: JobFile;
        Insert: Omit<JobFile, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<JobFile, 'id'>>;
      };
      transcripts: {
        Row: Transcript;
        Insert: Omit<Transcript, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Transcript, 'id'>>;
      };
      transcriptions: {
        Row: Transcription;
        Insert: Omit<Transcription, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Transcription, 'id'>>;
      };
      transcription_edits: {
        Row: TranscriptionEdit;
        Insert: Omit<TranscriptionEdit, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TranscriptionEdit, 'id'>>;
      };
      job_assignments: {
        Row: JobAssignment;
        Insert: Omit<JobAssignment, 'id' | 'invited_at'> & {
          id?: string;
          invited_at?: string;
        };
        Update: Partial<Omit<JobAssignment, 'id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Notification, 'id'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AuditLog, 'id'>>;
      };
      cases: {
        Row: Case;
        Insert: Omit<Case, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Case, 'id'>>;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CalendarEvent, 'id'>>;
      };
      billing_accounts: {
        Row: BillingAccount;
        Insert: Omit<BillingAccount, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BillingAccount, 'id'>>;
      };
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Invoice, 'id'>>;
      };
    };
    Enums: {
      user_role: UserRole;
      job_status: JobStatus;
      file_type: FileType;
      transcription_status: TranscriptionStatus;
      edit_type: EditType;
      assignment_status: AssignmentStatus;
      notification_type: NotificationType;
      case_status: CaseStatus;
      case_role: CaseRole;
      calendar_event_status: CalendarEventStatus;
      event_type: EventType;
      availability_type: AvailabilityType;
      invoice_status: InvoiceStatus;
      billing_service_type: BillingServiceType;
      billing_unit: BillingUnit;
      audio_processing_mode: AudioProcessingMode;
      asr_model_tier: ASRModelTier;
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════

// User with firm relation
export type UserWithFirm = User & {
  firm: Firm | null;
};

// Job with all relations
export type JobWithRelations = Job & {
  created_by?: User;
  firm?: Firm | null;
  files?: JobFile[];
  transcription?: Transcription | null;
  assignments?: JobAssignment[];
};

// Transcription with edits
export type TranscriptionWithEdits = Transcription & {
  edits?: TranscriptionEdit[];
};


// ============================================
// ENUM VALUE EXPORTS (for use as values, not just types)
// ============================================

export const UserRole = {
  ADMIN: 'ADMIN',
  COURT_REPORTER: 'COURT_REPORTER',
  SCOPIST: 'SCOPIST',
  ATTORNEY: 'ATTORNEY',
  AGENCY_ADMIN: 'AGENCY_ADMIN',
  VIDEOGRAPHER: 'VIDEOGRAPHER',
  INTERPRETER: 'INTERPRETER',
} as const

export const JobStatus = {
  CREATED: 'CREATED',
  FILES_UPLOADED: 'FILES_UPLOADED',
  ENHANCING_AUDIO: 'ENHANCING_AUDIO',
  TRANSCRIBING: 'TRANSCRIBING',
  AI_REVIEWING: 'AI_REVIEWING',
  READY_FOR_EDIT: 'READY_FOR_EDIT',
  ASSIGNED: 'ASSIGNED',
  IN_EDIT: 'IN_EDIT',
  SUBMITTED_FOR_REVIEW: 'SUBMITTED_FOR_REVIEW',
  IN_REVIEW: 'IN_REVIEW',
  SCOPIST_COMPLETE: 'SCOPIST_COMPLETE',
  REVIEW_COMPLETE: 'REVIEW_COMPLETE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

export const DepositionNoteType = {
  GENERAL: 'GENERAL',
  PROPER_NOUN: 'PROPER_NOUN',
  TECHNICAL_TERM: 'TECHNICAL_TERM',
  INSTRUCTION: 'INSTRUCTION',
  QUESTION: 'QUESTION',
} as const

export const ProperNounCategory = {
  PERSON: 'PERSON',
  PLACE: 'PLACE',
  ORGANIZATION: 'ORGANIZATION',
  PRODUCT: 'PRODUCT',
  MEDICAL: 'MEDICAL',
  LEGAL: 'LEGAL',
  OTHER: 'OTHER',
} as const

export const FileType = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  TRANSCRIPT: 'TRANSCRIPT',
  EXHIBIT: 'EXHIBIT',
  OTHER: 'OTHER',
} as const

export const Role = {
  ADMIN: 'ADMIN',
  COURT_REPORTER: 'COURT_REPORTER',
  REPORTER: 'COURT_REPORTER',
  SCOPIST: 'SCOPIST',
  ATTORNEY: 'ATTORNEY',
  AGENCY_ADMIN: 'AGENCY_ADMIN',
  VIDEOGRAPHER: 'VIDEOGRAPHER',
  INTERPRETER: 'INTERPRETER',
} as const;

export type RoleType = typeof Role[keyof typeof Role];

// Prisma-compatible type definitions
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Prisma {
  export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
  export type JsonObject = { [key: string]: JsonValue };
  export type JsonArray = JsonValue[];
  export type InputJsonValue = string | number | boolean | null | InputJsonObject | InputJsonArray;
  export type InputJsonObject = { [key: string]: InputJsonValue };
  export type InputJsonArray = InputJsonValue[];
  export const JsonNull = null;
  export const DbNull = null;

  export type CaseWhereInput = Record<string, any>;
  export type JobWhereInput = Record<string, any>;
  export type UserWhereInput = Record<string, any>;
  export type TranscriptWhereInput = Record<string, any>;

  export type CaseOrderByWithRelationInput = Record<string, 'asc' | 'desc'>;
  export type JobOrderByWithRelationInput = Record<string, 'asc' | 'desc'>;
  export type UserOrderByWithRelationInput = Record<string, 'asc' | 'desc'>;

  export type JobCreateInput = Record<string, any>;
  export type JobFileCreateInput = Record<string, any>;
  export type TranscriptCreateInput = Record<string, any>;
  export type TranscriptTokenCreateInput = Record<string, any>;
  export type UserUpdateInput = Record<string, any>;
  export type CalendarEventCreateInput = Record<string, any>;
  export type EventParticipantCreateInput = Record<string, any>;
  export type CalendarAuditLogUncheckedCreateInput = Record<string, any>;

  export type TransactionClient = any;
  export type TransactionIsolationLevel = 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
  export type PrismaClientOptions = Record<string, any>;

  export class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
    }
  }

  export class PrismaClientValidationError extends Error {}
}

export class PrismaClient {
  [key: string]: any;
}

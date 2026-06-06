export type ExtractionDocType = "nod" | "order" | "jobsheet";

export interface ExtractedConfidenceValue<T> {
  value: T | null;
  confidence: number | null;
}

export interface ExtractedAttorney {
  name: ExtractedConfidenceValue<string>;
  firm: ExtractedConfidenceValue<string>;
  representing: ExtractedConfidenceValue<string>;
  address: ExtractedConfidenceValue<string>;
  city: ExtractedConfidenceValue<string>;
  state: ExtractedConfidenceValue<string>;
  zip: ExtractedConfidenceValue<string>;
  phone: ExtractedConfidenceValue<string>;
  email: ExtractedConfidenceValue<string>;
  bar_number: ExtractedConfidenceValue<string>;
  side: ExtractedConfidenceValue<"plaintiff" | "defense" | "other">;
}

export interface ExtractedParticipant {
  name: ExtractedConfidenceValue<string>;
  role: ExtractedConfidenceValue<string>;
}

export interface ExtractedParty {
  name: ExtractedConfidenceValue<string>;
  role: ExtractedConfidenceValue<string>;
  role_modifier: ExtractedConfidenceValue<string | null>;
  entity_type: ExtractedConfidenceValue<string | null>;
  fka_or_dba: ExtractedConfidenceValue<string | null>;
}

export interface ExtractedLawFirm {
  name: ExtractedConfidenceValue<string>;
  address: ExtractedConfidenceValue<string | null>;
  city: ExtractedConfidenceValue<string | null>;
  state: ExtractedConfidenceValue<string | null>;
  zip: ExtractedConfidenceValue<string | null>;
  phone: ExtractedConfidenceValue<string | null>;
  fax: ExtractedConfidenceValue<string | null>;
  email: ExtractedConfidenceValue<string | null>;
  represented_party: ExtractedConfidenceValue<string | null>;
}

export interface ExtractedWitness {
  name: ExtractedConfidenceValue<string>;
  role: ExtractedConfidenceValue<string>;
  party_affiliation: ExtractedConfidenceValue<string>;
  read_and_sign: ExtractedConfidenceValue<string>;
  interpreter_required: ExtractedConfidenceValue<boolean>;
  videographer_required: ExtractedConfidenceValue<boolean>;
}

export interface ExtractedRemote {
  is_remote: ExtractedConfidenceValue<boolean>;
  platform: ExtractedConfidenceValue<string>;
}

export interface ExtractedLocation {
  address: ExtractedConfidenceValue<string>;
  city: ExtractedConfidenceValue<string>;
  state: ExtractedConfidenceValue<string>;
  zip: ExtractedConfidenceValue<string>;
}

export interface ExtractedSchedulingMetadata {
  proceeding_type: ExtractedConfidenceValue<string>;
  remote_platform: ExtractedConfidenceValue<string>;
  noticing_party: ExtractedConfidenceValue<string>;
  ordered_by: ExtractedConfidenceValue<string>;
  scheduler: ExtractedConfidenceValue<string>;
  scheduling_contact: ExtractedConfidenceValue<string>;
  service_type: ExtractedConfidenceValue<string>;
  time_zone: ExtractedConfidenceValue<string>;
  remote_location: ExtractedConfidenceValue<string>;
}

export interface ExtractedServiceMetadata {
  certificate_of_service: ExtractedConfidenceValue<boolean>;
  service_date: ExtractedConfidenceValue<string>;
  served_parties: ExtractedConfidenceValue<string[]>;
  service_emails: ExtractedConfidenceValue<string[]>;
}

export interface ExtractedReporterRequests {
  certified_reporter_required: ExtractedConfidenceValue<boolean>;
  stenographic_recording: ExtractedConfidenceValue<boolean>;
  audiovisual_recording: ExtractedConfidenceValue<boolean>;
  realtime_requested: ExtractedConfidenceValue<boolean>;
  expedited_delivery: ExtractedConfidenceValue<boolean>;
  rush_delivery: ExtractedConfidenceValue<boolean>;
  daily_copy: ExtractedConfidenceValue<boolean>;
  rough_draft: ExtractedConfidenceValue<boolean>;
}

export interface ExtractedNODFields {
  cause_number: ExtractedConfidenceValue<string>;
  case_style: ExtractedConfidenceValue<string>;
  plaintiff: ExtractedConfidenceValue<string>;
  defendants: ExtractedConfidenceValue<string[]>;
  court_name: ExtractedConfidenceValue<string>;
  district: ExtractedConfidenceValue<string>;
  division: ExtractedConfidenceValue<string>;
  county: ExtractedConfidenceValue<string>;
  state: ExtractedConfidenceValue<string>;
  jurisdiction_type: ExtractedConfidenceValue<string>;
  deposition_date: ExtractedConfidenceValue<string>;
  start_time: ExtractedConfidenceValue<string>;
  end_time: ExtractedConfidenceValue<string>;
  location: ExtractedLocation;
  remote: ExtractedRemote;
  reporting_method: ExtractedConfidenceValue<string>;
  witness: ExtractedWitness;
  parties: ExtractedParty[];
  attorneys: ExtractedAttorney[];
  law_firms: ExtractedLawFirm[];
  scheduling: ExtractedSchedulingMetadata;
  service: ExtractedServiceMetadata;
  reporter_requests: ExtractedReporterRequests;
  other_participants: ExtractedParticipant[];
}

export interface ExtractionUsage {
  input_tokens?: number;
  output_tokens?: number;
}

export interface ExtractionSuccess {
  fields: ExtractedNODFields;
  model: string;
  usage?: ExtractionUsage | null;
}

export interface ExtractionFailure {
  error: string;
}

export type ExtractionResponse = ExtractionSuccess | ExtractionFailure;

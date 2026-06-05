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

export interface ExtractedWitness {
  name: ExtractedConfidenceValue<string>;
  party_affiliation: ExtractedConfidenceValue<string>;
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
  deposition_date: ExtractedConfidenceValue<string>;
  start_time: ExtractedConfidenceValue<string>;
  end_time: ExtractedConfidenceValue<string>;
  location: ExtractedLocation;
  remote: ExtractedRemote;
  reporting_method: ExtractedConfidenceValue<string>;
  witness: ExtractedWitness;
  attorneys: ExtractedAttorney[];
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

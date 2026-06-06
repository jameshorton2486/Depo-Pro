import type { CaseRecord } from "../../types/case";
import { defaultTranscriptFormat, defaultDeepgramConfig, defaultStageCompletion } from "../../types/case";

function ef<T>(
  value: T,
  source: "manual" | "extracted" | "imported",
  confirmed: boolean,
  confidence_score: number | null,
  conflict = false,
): { value: T; source: typeof source; confirmed: boolean; conflict: boolean; confidence_score: number | null } {
  return { value, source, confirmed, conflict, confidence_score };
}

export const mockCaseRecord: CaseRecord = {
  version: "1.0",
  case_id: "case_mock_001",
  created_at: "2026-06-02T09:00:00Z",
  updated_at: "2026-06-02T10:30:00Z",
  proceeding_type: "freelance_deposition",

  caption: {
    case_name:   ef("Johnson v. Acme Logistics, LLC", "extracted", false, 0.97),
    case_style:  ef("TONY JOHNSON, Plaintiff vs. ACME LOGISTICS, LLC, Defendant", "extracted", false, 0.95),
    case_number: ef("2024-CV-08821",                             "extracted", false, 0.91),
    court_name:  ef("193rd Judicial District Court", "extracted", false, 0.88),
    judicial_district: ef("193rd", "extracted", false, 0.82),
    division:    ef(null, "manual", false, null),
    county:      ef("Dallas County", "extracted", false, 0.9),
    state:       ef("Texas", "extracted", false, 0.9),
    jurisdiction_type: ef("texas_state", "extracted", false, 0.86),
    venue:       ef("Dallas, Texas", "extracted", false, 0.84),
    department:  ef(null,  "manual", false, null),
    judge_name:  ef(null,        "manual",    false, null),
  },

  session: {
    deposition_date:  ef("2026-06-10",          "extracted", false, 0.99),
    // start_time and location fields use "extracted" source but path routes them to "Job Sheet"
    start_time:       ef("09:30",               "extracted", false, 0.82),
    end_time:         ef("16:45",               "extracted", false, 0.76),
    location_type:    ef("in_person",           "extracted", false, 0.8),
    location_address: ef("1415 N. Akard Street", "extracted", false, 0.85),
    location_city:    ef("Dallas",              "extracted", false, 0.96),
    location_county:  ef("Dallas County",       "extracted", false, 0.9),
    location_state:   ef("TX",                  "extracted", false, 0.98),
    location_zip:     ef("75201",               "extracted", false, 0.71),
    reporting_method: ef("in_person",           "extracted", false, 0.8),
    is_remote: false,
    remote_platform: ef(null, "manual", false, null),
  },

  proceeding: {
    proceeding_type:  "freelance_deposition",
    ordering_firm:    "Pacific Legal Group",
    ordering_contact: "Maria Reyes",
    clerk_name:       null,
    clerk_badge:      null,
    filing_deadline:  null,
    notes:            null,
  },

  scheduling: {
    proceeding_type: ef("Oral Deposition", "extracted", false, 0.74),
    remote_platform: ef(null, "manual", false, null),
    noticing_party: ef("Plaintiff", "extracted", false, 0.71),
    ordered_by: ef("Pacific Legal Group", "manual", false, null),
    scheduler: ef(null, "manual", false, null),
    scheduling_contact: ef(null, "manual", false, null),
    service_type: ef("CR_plus_Zoom", "manual", false, null),
    time_zone: ef("Central", "manual", false, null),
    remote_location: ef(null, "manual", false, null),
  },

  service: {
    certificate_of_service: ef(true, "extracted", false, 0.63),
    service_date: ef("2026-05-20", "extracted", false, 0.66),
    served_parties: ef(["Plaintiff", "Defendant"], "extracted", false, 0.61),
    service_emails: ef(["service@example.com"], "extracted", false, 0.61),
  },

  reporter_requests: {
    certified_reporter_required: ef(true, "extracted", false, 0.58),
    stenographic_recording: ef(true, "extracted", false, 0.74),
    audiovisual_recording: ef(false, "manual", false, null),
    realtime_requested: ef(false, "manual", false, null),
    expedited_delivery: ef(false, "manual", false, null),
    rush_delivery: ef(false, "manual", false, null),
    daily_copy: ef(false, "manual", false, null),
    rough_draft: ef(false, "manual", false, null),
  },

  reporter: {
    name:        ef("Jennifer L. Castillo, CSR",  "imported", false, null),
    cert_number: ef("CSR 12876",                  "imported", false, null),
    cert_state:  ef("TX",                         "imported", false, null),
    firm:        ef("Lone Star Reporting",        "imported", false, null),
    license_expiration: ef("2027-12-31",          "imported", false, null),
    firm_registration_number: ef("TX-FRN-20418", "imported", false, null),
    firm_address: ef("1201 Elm Street, Suite 900, Dallas, TX 75270", "imported", false, null),
    email: "jcastillo@pacificreporting.com",
    phone: "213-555-0182",
    notary_required: false,
    notary_name: null,
    notary_commission_expiry: null,
  },

  format: defaultTranscriptFormat(),

  parties: [
    {
      party_id: "party_mock_001",
      name: ef("Tony Johnson", "extracted", false, 0.94),
      role: ef("plaintiff", "extracted", false, 0.88),
      role_modifier: ef(null, "manual", false, null),
      entity_type: ef("individual", "extracted", false, 0.55),
      fka_or_dba: ef(null, "manual", false, null),
    },
    {
      party_id: "party_mock_002",
      name: ef("Acme Logistics, LLC", "extracted", false, 0.93),
      role: ef("defendant", "extracted", false, 0.88),
      role_modifier: ef(null, "manual", false, null),
      entity_type: ef("llc", "extracted", false, 0.62),
      fka_or_dba: ef(null, "manual", false, null),
    },
  ],

  law_firms: [
    {
      law_firm_id: "firm_mock_001",
      name: ef("Thornton & Associates", "extracted", false, 0.92),
      address: ef("500 North Akard Street", "extracted", false, 0.71),
      city: ef("Dallas", "extracted", false, 0.73),
      state: ef("TX", "extracted", false, 0.73),
      zip: ef("75201", "extracted", false, 0.73),
      phone: ef(null, "manual", false, null),
      fax: ef(null, "manual", false, null),
      email: ef(null, "manual", false, null),
      represented_party: ef("Plaintiff", "extracted", false, 0.81),
    },
  ],

  witnesses: [
    {
      witness_id: "wit_mock_001",
      name:     ef("Junior Hernandez",               "extracted", false, 0.79),
      role:     ef("WITNESS",                        "extracted", false, 0.95),
      title:    ef("Senior VP, Operations",          "extracted", false, 0.68),
      employer: ef("Meridian Infrastructure Partners", "extracted", false, 0.91),
      prefix_suffix: null,
      party_affiliation: ef("plaintiff",             "extracted", false, 0.84),
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: ef("read_and_sign",             "extracted", false, 0.77),
      requires_interpreter: ef(false, "manual", false, null),
      requires_videographer: ef(false, "manual", false, null),
      spelling_corrections: [],
      email: null,
      phone: null,
    },
  ],

  attorneys: [
    {
      attorney_id: "atty_mock_001",
      name:         ef("Rebecca A. Thornton, Esq.", "extracted", false, 0.94),
      firm:         ef("Thornton & Associates",     "extracted", false, 0.92),
      role:         ef("EXAMINING",                 "extracted", false, 0.97),
      representing: ef("Plaintiff",                 "extracted", false, 0.88),
      bar_number:   ef("CA-198432",                 "extracted", false, 0.76),
      address:      "500 North Akard Street",
      city:         "Dallas",
      state:        "TX",
      zip:          "75201",
      time_used:    null,
      email: null,
      phone: null,
    },
    {
      attorney_id: "atty_mock_002",
      name:         ef("David K. Morales, Esq.",   "extracted", false, 0.81),
      firm:         ef("Meridian Legal Dept.",      "extracted", false, 0.74),
      role:         ef("OPPOSING",                  "extracted", false, 0.89),
      representing: ef("Defendant",                 "extracted", false, 0.85),
      bar_number:   ef(null,                        "manual",    false, null),
      address:      "2100 Ross Avenue",
      city:         "Dallas",
      state:        "TX",
      zip:          "75201",
      time_used:    null,
      email: null,
      phone: null,
    },
  ],

  interpreters:  [],
  videographers: [],
  participants:  [],
  audio:         null,
  exhibits:      [],
  deepgram:      defaultDeepgramConfig(),
  stage:            "intake",
  stage_completion: defaultStageCompletion(),
  certification: null,
  notes: "",
};

// Alternate values for fields with conflicts — keyed by field path.
// The primary conflicting value lives on the record itself; this holds the other candidate.
export const mockConflictAlternates: Record<string, { value: string; source: string }> = {};

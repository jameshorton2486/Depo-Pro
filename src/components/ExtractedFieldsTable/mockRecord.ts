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
    county:      ef("Dallas County", "extracted", false, 0.9),
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
    remote_platform: null,
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

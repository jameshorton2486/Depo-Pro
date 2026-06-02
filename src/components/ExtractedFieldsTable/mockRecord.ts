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
    case_name:   ef("Smith v. Meridian Infrastructure Partners", "extracted", true,  0.97),
    case_number: ef("2024-CV-08821",                             "extracted", false, 0.91),
    court_name:  ef("Superior Court of California, County of Los Angeles", "extracted", false, 0.88),
    department:  ef("Dept. 32",  "extracted", false, 0.73),
    judge_name:  ef(null,        "manual",    false, null),
  },

  session: {
    deposition_date:  ef("2026-06-10",          "extracted", true,  0.99),
    // start_time and location fields use "extracted" source but path routes them to "Job Sheet"
    start_time:       ef("09:30",               "extracted", false, 0.82),
    end_time:         ef(null,                  "extracted", false, null),
    location_address: ef("350 S. Grand Avenue", "extracted", false, 0.85),
    location_city:    ef("Los Angeles",         "extracted", true,  0.96),
    location_state:   ef("CA",                  "extracted", true,  0.98),
    location_zip:     ef("90071",               "extracted", false, 0.71),
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
    name:        ef("Jennifer L. Castillo, CSR",  "imported", true,  null),
    cert_number: ef("CSR-14872",                  "imported", true,  null),
    cert_state:  ef("CA",                         "imported", true,  null),
    firm:        ef("Pacific Reporting Services", "imported", false, null),
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
      // Conflict: Notice says "Junior Hernandez", Job Sheet says "Yunior Hernandez"
      name:     ef("Junior Hernandez",               "extracted", false, 0.79, true),
      role:     ef("WITNESS",                        "extracted", true,  0.95),
      title:    ef("Senior VP, Operations",          "extracted", false, 0.68),
      employer: ef("Meridian Infrastructure Partners", "extracted", false, 0.91),
      email: null,
      phone: null,
    },
  ],

  attorneys: [
    {
      attorney_id: "atty_mock_001",
      name:         ef("Rebecca A. Thornton, Esq.", "extracted", true,  0.94),
      firm:         ef("Thornton & Associates",     "extracted", true,  0.92),
      role:         ef("EXAMINING",                 "extracted", true,  0.97),
      representing: ef("Plaintiff",                 "extracted", false, 0.88),
      bar_number:   ef("CA-198432",                 "extracted", false, 0.76),
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
export const mockConflictAlternates: Record<string, { value: string; source: string }> = {
  "witnesses[0].name": {
    value: "Yunior Hernandez",
    source: "Job Sheet",
  },
};

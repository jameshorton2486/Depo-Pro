import { describe, expect, it } from "vitest";
import { mockCaseRecord } from "../../components/ExtractedFieldsTable/mockRecord";
import type { ExtractedNODFields } from "./aiExtractionTypes";
import { applyExtraction } from "./applyExtraction";

function cloneRecord() {
  return structuredClone(mockCaseRecord);
}

function field<T>(value: T, confidence = 0.9) {
  return { value, confidence };
}

describe("applyExtraction", () => {
  it("preserves a normalized reporting method from the extraction response", () => {
    const fields: ExtractedNODFields = {
      cause_number: field("25-cv-00598-OLG"),
      case_style: field("Delia Garza v. Home Depot U.S.A., Inc. A/K/A The Home Depot and Shawn Herber"),
      plaintiff: field("Delia Garza"),
      defendants: field(["Home Depot U.S.A., Inc. A/K/A The Home Depot", "Shawn Herber"]),
      court_name: field("United States District Court"),
      district: field("Western District of Texas"),
      division: field("San Antonio Division"),
      county: field("Bexar County"),
      state: field("Texas"),
      jurisdiction_type: field("federal"),
      deposition_date: field("2026-04-30"),
      start_time: field("13:30"),
      end_time: field(null),
      location: {
        address: field(null),
        city: field(null),
        state: field(null),
        zip: field(null),
      },
      remote: {
        is_remote: field(true),
        platform: field("Zoom"),
      },
      reporting_method: field("machine_shorthand"),
      witness: {
        name: field("Heath Thomas"),
        role: field("witness"),
        party_affiliation: field("defendant"),
        read_and_sign: field("waived"),
        interpreter_required: field(false),
        videographer_required: field(false),
      },
      parties: [],
      attorneys: [],
      law_firms: [],
      scheduling: {
        proceeding_type: field("Oral Deposition"),
        remote_platform: field("Zoom"),
        noticing_party: field("Plaintiff"),
        ordered_by: field(null),
        scheduler: field(null),
        scheduling_contact: field(null),
        service_type: field(null),
        time_zone: field(null),
        remote_location: field(null),
      },
      service: {
        certificate_of_service: field(true),
        service_date: field("2026-04-10"),
        served_parties: field(["Plaintiff", "Defendant"]),
        service_emails: field(["service@example.com"]),
      },
      reporter_requests: {
        certified_reporter_required: field(true),
        stenographic_recording: field(true),
        audiovisual_recording: field(false),
        realtime_requested: field(false),
        expedited_delivery: field(false),
        rush_delivery: field(false),
        daily_copy: field(false),
        rough_draft: field(false),
      },
      other_participants: [],
    };

    const application = applyExtraction(fields, cloneRecord());
    const reportingMethodUpdate = application.fieldUpdates.find((update) => update.path === "session.reporting_method");

    expect(reportingMethodUpdate?.value).toBe("machine_shorthand");
  });
});

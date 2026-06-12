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

  it("routes extracted party names into parties, not attorneys", () => {
    const fields: ExtractedNODFields = {
      cause_number: field("25-cv-00598-OLG"),
      case_style: field("Delia Garza v. Home Depot U.S.A., Inc."),
      plaintiff: field("Delia Garza"),
      defendants: field(["Home Depot U.S.A., Inc."]),
      court_name: field("United States District Court"),
      district: field("Western District of Texas"),
      division: field("San Antonio Division"),
      county: field("Bexar County"),
      state: field("Texas"),
      jurisdiction_type: field("federal"),
      deposition_date: field("2026-04-30"),
      start_time: field("13:30"),
      end_time: field(null),
      location: { address: field(null), city: field(null), state: field(null), zip: field(null) },
      remote: { is_remote: field(true), platform: field("Zoom") },
      reporting_method: field("machine_shorthand"),
      witness: {
        name: field("Heath Thomas"),
        role: field("witness"),
        party_affiliation: field("defendant"),
        read_and_sign: field("waived"),
        interpreter_required: field(false),
        videographer_required: field(false),
      },
      parties: [
        { name: field("Delia Garza"), role: field("plaintiff"), role_modifier: field(null), entity_type: field(null), fka_or_dba: field(null) },
        { name: field("Home Depot U.S.A., Inc."), role: field("defendant"), role_modifier: field(null), entity_type: field(null), fka_or_dba: field(null) },
      ],
      attorneys: [
        {
          name: field("Delia Garza"),
          firm: field(null),
          representing: field(null),
          address: field(null),
          city: field(null),
          state: field(null),
          zip: field(null),
          phone: field(null),
          email: field(null),
          bar_number: field(null),
          side: field("plaintiff"),
        },
      ],
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
        served_parties: field(["Plaintiff"]),
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

    expect(application.attorneyAdds).toHaveLength(0);
    expect(application.partyAdds.map((add) => add.party.name.value)).toEqual([
      "Delia Garza",
      "Home Depot U.S.A., Inc.",
    ]);
  });

  it("collapses duplicate names within a single extracted collection", () => {
    const fields: ExtractedNODFields = {
      cause_number: field("25-cv-00598-OLG"),
      case_style: field("Case Style"),
      plaintiff: field(""),
      defendants: field([]),
      court_name: field("Court"),
      district: field("District"),
      division: field("Division"),
      county: field("County"),
      state: field("Texas"),
      jurisdiction_type: field("state"),
      deposition_date: field("2026-04-30"),
      start_time: field("13:30"),
      end_time: field(null),
      location: { address: field(null), city: field(null), state: field(null), zip: field(null) },
      remote: { is_remote: field(false), platform: field(null) },
      reporting_method: field("in_person"),
      witness: {
        name: field("Witness"),
        role: field("witness"),
        party_affiliation: field(null),
        read_and_sign: field(null),
        interpreter_required: field(false),
        videographer_required: field(false),
      },
      parties: [
        { name: field("Delia Garza"), role: field("plaintiff"), role_modifier: field(null), entity_type: field(null), fka_or_dba: field(null) },
        { name: field("DELIA GARZA"), role: field("plaintiff"), role_modifier: field("Individually"), entity_type: field("person"), fka_or_dba: field(null) },
      ],
      attorneys: [],
      law_firms: [],
      scheduling: {
        proceeding_type: field(null),
        remote_platform: field(null),
        noticing_party: field(null),
        ordered_by: field(null),
        scheduler: field(null),
        scheduling_contact: field(null),
        service_type: field(null),
        time_zone: field(null),
        remote_location: field(null),
      },
      service: {
        certificate_of_service: field(false),
        service_date: field(null),
        served_parties: field([]),
        service_emails: field([]),
      },
      reporter_requests: {
        certified_reporter_required: field(false),
        stenographic_recording: field(false),
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

    expect(application.partyAdds).toHaveLength(1);
    expect(application.partyAdds[0]?.party.role_modifier.value).toBe("Individually");
    expect(application.partyAdds[0]?.party.entity_type.value).toBe("person");
  });

  it("preserves the same name across different collections", () => {
    const fields: ExtractedNODFields = {
      cause_number: field("25-cv-00598-OLG"),
      case_style: field("Case Style"),
      plaintiff: field("Delia Garza"),
      defendants: field([]),
      court_name: field("Court"),
      district: field("District"),
      division: field("Division"),
      county: field("County"),
      state: field("Texas"),
      jurisdiction_type: field("state"),
      deposition_date: field("2026-04-30"),
      start_time: field("13:30"),
      end_time: field(null),
      location: { address: field(null), city: field(null), state: field(null), zip: field(null) },
      remote: { is_remote: field(false), platform: field(null) },
      reporting_method: field("in_person"),
      witness: {
        name: field("Delia Garza"),
        role: field("witness"),
        party_affiliation: field("plaintiff"),
        read_and_sign: field(null),
        interpreter_required: field(false),
        videographer_required: field(false),
      },
      parties: [{ name: field("Delia Garza"), role: field("plaintiff"), role_modifier: field(null), entity_type: field(null), fka_or_dba: field(null) }],
      attorneys: [],
      law_firms: [],
      scheduling: {
        proceeding_type: field(null),
        remote_platform: field(null),
        noticing_party: field(null),
        ordered_by: field(null),
        scheduler: field(null),
        scheduling_contact: field(null),
        service_type: field(null),
        time_zone: field(null),
        remote_location: field(null),
      },
      service: {
        certificate_of_service: field(false),
        service_date: field(null),
        served_parties: field([]),
        service_emails: field([]),
      },
      reporter_requests: {
        certified_reporter_required: field(false),
        stenographic_recording: field(false),
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

    expect(application.partyAdds).toHaveLength(1);
    expect(application.witnessAdds).toHaveLength(0);
    expect(application.fieldUpdates.some((update) => update.path === "witnesses[0].name")).toBe(true);
  });

  it("backfills the canonical witness from a deponent cue when witness.name is empty", () => {
    const record = cloneRecord();
    record.witnesses = [];

    const fields: ExtractedNODFields = {
      cause_number: field("25-cv-00598-OLG"),
      case_style: field("Notice of Oral Deposition of Heath Thomas"),
      plaintiff: field("Delia Garza"),
      defendants: field(["Home Depot U.S.A., Inc."]),
      court_name: field("United States District Court"),
      district: field("Western District of Texas"),
      division: field("San Antonio Division"),
      county: field("Bexar County"),
      state: field("Texas"),
      jurisdiction_type: field("federal"),
      deposition_date: field("2026-04-30"),
      start_time: field("13:30"),
      end_time: field(null),
      location: { address: field(null), city: field(null), state: field(null), zip: field(null) },
      remote: { is_remote: field(true), platform: field("Zoom") },
      reporting_method: field("zoom"),
      witness: {
        name: field(""),
        role: field(null),
        party_affiliation: field("defendant"),
        read_and_sign: field("waived"),
        interpreter_required: field(false),
        videographer_required: field(false),
      },
      parties: [],
      attorneys: [],
      law_firms: [],
      scheduling: {
        proceeding_type: field("Oral Deposition of Heath Thomas"),
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
        served_parties: field(["Plaintiff"]),
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

    const application = applyExtraction(fields, record);

    expect(application.witnessAdds).toHaveLength(1);
    expect(application.witnessAdds[0]?.witness.name.value).toBe("Heath Thomas");
    expect(application.witnessAdds[0]?.witness.name.confidence_score).toBe(0.6);
    expect(application.witnessAdds[0]?.witness.role.value).toBe("WITNESS");
  });

  it("derives attorney roles deterministically from representation when side is absent", () => {
    const record = cloneRecord();
    record.attorneys = [];

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
      location: { address: field(null), city: field(null), state: field(null), zip: field(null) },
      remote: { is_remote: field(true), platform: field("Zoom") },
      reporting_method: field("zoom"),
      witness: {
        name: field("Heath Thomas"),
        role: field("witness"),
        party_affiliation: field("defendant"),
        read_and_sign: field("waived"),
        interpreter_required: field(false),
        videographer_required: field(false),
      },
      parties: [],
      attorneys: [
        {
          name: field("Steven A. Nunez"),
          firm: field("Brain and Spine Personal Injury Lawyers"),
          representing: field("Delia Garza"),
          address: field(null),
          city: field(null),
          state: field(null),
          zip: field(null),
          phone: field(null),
          email: field(null),
          bar_number: field(null),
          side: field(null),
        },
        {
          name: field("Karen M. Alvarado"),
          firm: field("Brothers, Alvarado, Piazza & Cozort, P.C."),
          representing: field("HOME DEPOT U.S.A., INC."),
          address: field(null),
          city: field(null),
          state: field(null),
          zip: field(null),
          phone: field(null),
          email: field(null),
          bar_number: field(null),
          side: field(null),
        },
      ],
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
        served_parties: field(["Plaintiff"]),
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

    const application = applyExtraction(fields, record);

    expect(application.attorneyAdds.map((entry) => ({
      name: entry.attorney.name.value,
      role: entry.attorney.role.value,
    }))).toEqual(
      expect.arrayContaining([
        { name: "Steven A. Nunez", role: "EXAMINING" },
        { name: "Karen M. Alvarado", role: "OPPOSING" },
      ]),
    );
  });
});

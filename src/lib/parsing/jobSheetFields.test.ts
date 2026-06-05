import { describe, expect, it } from "vitest";

import {
  isJobSheetWritableFieldPath,
  jobSheetAttorneyFields,
  jobSheetFieldPaths,
} from "./jobSheetFields";

describe("jobSheetFields", () => {
  it("allows the scoped JOB-owned and NOD/JOB-shared field paths", () => {
    expect(jobSheetFieldPaths).toEqual([
      "session.deposition_date",
      "session.start_time",
      "session.location_address",
      "session.location_city",
      "session.location_state",
      "session.location_zip",
      "session.reporting_method",
      "session.is_remote",
      "session.remote_platform",
      "witnesses[0].read_and_sign",
      "proceeding.ordering_firm",
      "proceeding.ordering_contact",
    ]);

    expect(jobSheetAttorneyFields).toEqual([
      "name",
      "firm",
      "address",
      "city",
      "state",
      "zip",
      "phone",
      "email",
    ]);
  });

  it("matches attorney array field paths only for the allowed contact subfields", () => {
    expect(isJobSheetWritableFieldPath("attorneys[0].name")).toBe(true);
    expect(isJobSheetWritableFieldPath("attorneys[3].firm")).toBe(true);
    expect(isJobSheetWritableFieldPath("attorneys[1].email")).toBe(true);
    expect(isJobSheetWritableFieldPath("attorneys[0].representing")).toBe(false);
    expect(isJobSheetWritableFieldPath("attorneys[0].role")).toBe(false);
    expect(isJobSheetWritableFieldPath("attorneys[0].bar_number")).toBe(false);
  });

  it("rejects PROFILE, COMPUTED, POST, and NOD-only paths per DATA_FIELD_REFERENCE §2.1", () => {
    const forbiddenPaths = [
      "reporter.firm_registration_number",
      "reporter.firm_address",
      "reporter.name",
      "reporter.cert_number",
      "caption.case_number",
      "caption.court_name",
      "caption.county",
      "caption.case_style",
      "witnesses[0].name",
      "witnesses[0].role",
      "session.end_time",
      "session.location_county",
      "certification.certification_date",
      "exhibits[0].page_reference",
    ];

    for (const path of forbiddenPaths) {
      expect(isJobSheetWritableFieldPath(path)).toBe(false);
    }
  });
});

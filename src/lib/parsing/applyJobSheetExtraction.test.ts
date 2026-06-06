import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
import { applyJobSheetExtraction } from "./applyJobSheetExtraction";
import type { ParsedReporterNotes } from "./parserTypes";

function buildParsedReporterNotes(): ParsedReporterNotes {
  return {
    reporter: {
      reporterName: "SA Legal Solutions",
      csrNumber: "1234",
      agency: "SA Legal Solutions",
      certifications: [],
    },
    jobDetails: {
      reporter: {
        reporterName: "SA Legal Solutions",
        csrNumber: "1234",
        agency: "SA Legal Solutions",
        certifications: [],
      },
      date: "05/07/2026",
      scheduledStartTime: "10:00 AM",
      location: "Via Zoom / San Antonio, TX",
      csr: true,
      readAndSign: false,
      signatureWaived: false,
      interpreter: false,
      conferenceRoom: false,
    },
    billing: {
      orderingAttorney: "Raul Garza",
      orderingFirm: "Goldman & Peterson",
      orderingAddress: "10100 Reunion Place Suite 800, San Antonio TX 78216",
      orderingPhone: "(210) 340-9800",
      orderingEmail: "Raul@LJGLaw.com",
      format: [],
      delivery: "",
      copyOrders: [],
    },
    deepgramKeyterms: [],
  };
}

describe("applyJobSheetExtraction", () => {
  it("maps via Zoom job-sheet locations to the zoom location type", () => {
    const record = emptyCaseRecord("case_job_sheet_zoom", "2026-06-05T18:00:00Z");
    const parsed = buildParsedReporterNotes();

    const result = applyJobSheetExtraction(parsed, record);
    const locationTypeUpdate = result.application.fieldUpdates.find(
      (update) => update.path === "session.location_type",
    );

    expect(locationTypeUpdate).toEqual({
      path: "session.location_type",
      value: "zoom",
      confidence_score: 0.7,
      label: "Location Type",
    });
  });
});

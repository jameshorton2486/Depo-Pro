// DOC-0328 — certified section model tests. Proves caption/appearances/certificate DTOs
// are read faithfully from the transported UFM envelope, indexes pass through from the
// finalized model, errata resolve over the pagination, and a null envelope yields a
// well-formed model with null/empty fields (no fabrication).
import { describe, expect, it } from "vitest";
import type { UfmMetadataEnvelope } from "../ufm/buildUfmMetadata";
import type { PaginationMap } from "./paginationContract";
import type { FinalizedTranscriptModel } from "./finalizedTranscriptModel";
import { buildCertifiedSections } from "./certifiedSectionModel";

function pagination(): PaginationMap {
  return {
    linesPerPage: 25,
    firstNumberedPage: 1,
    lines: [{ ref: { page: 7, line: 3 }, paragraph_id: "p5", utterance_id: "u5", isContinuation: false }],
    sections: [],
    exhibits: [],
  };
}

function envelope(): UfmMetadataEnvelope {
  return {
    case_id: "case-x",
    computed_at: "2026-07-22T00:00:00.000Z",
    ufm_metadata: {
      cause_number: "2026-CI-01234",
      caption: "JANE DOE vs. ACME CORP.",
      court: "District Court",
      judicial_district: "285th Judicial District",
      county: "Bexar",
      state: "Texas",
      deponent: "JANE DOE",
      deposition_date: "2026-07-22",
      start_time: "9:00 a.m.",
      end_time: "11:30 a.m.",
      address: "123 Main St, San Antonio, Texas",
      location_type: "office",
      csr_name: "MARY REPORTER",
      csr_license: "CSR-9999",
      firm_registration: "FIRM-123",
      csr_cert_expiration: "2027-12-31",
      appearances: [
        { category: "attorney", name: "MR. SMITH", firm: "Smith LLP", role: "ATTORNEY", representing: "Plaintiff", bar_number: "12345", email: "s@x.com", phone: "555-1000" },
        { category: "attorney", name: "MS. JONES", firm: "Jones PC", role: "ATTORNEY", representing: "Defendant", bar_number: "67890" },
      ],
    },
    field_sources: {},
    field_confirmations: {},
    missing_required_fields: [],
  } as unknown as UfmMetadataEnvelope;
}

function model(metadata: UfmMetadataEnvelope | null): FinalizedTranscriptModel {
  return {
    transcriptId: "t-x",
    lineTypeAuthority: { persistedLineTypeApplied: false, reviewedCorrectionCount: 0 },
    metadata,
    pagination: pagination(),
    examinationIndex: [{ kind: "EXAMINATION", examinerLabel: "MR. SMITH", page: 2 }],
    exhibitIndex: [{ exhibit_number: "1", marked: 5, offered: null, admitted: null, excluded: null }],
  };
}

describe("buildCertifiedSections", () => {
  it("reads caption fields from the transported envelope", () => {
    const sections = buildCertifiedSections(model(envelope()));
    expect(sections.caption.causeNumber).toBe("2026-CI-01234");
    expect(sections.caption.caption).toBe("JANE DOE vs. ACME CORP.");
    expect(sections.caption.county).toBe("Bexar");
    expect(sections.caption.deponent).toBe("JANE DOE");
    expect(sections.caption.location).toBe("123 Main St, San Antonio, Texas");
  });

  it("maps appearances defensively into typed entries", () => {
    const { appearances } = buildCertifiedSections(model(envelope()));
    expect(appearances.entries).toHaveLength(2);
    expect(appearances.entries[0]).toMatchObject({ name: "MR. SMITH", firm: "Smith LLP", barNumber: "12345", representing: "Plaintiff" });
    expect(appearances.entries[1]).toMatchObject({ name: "MS. JONES", representing: "Defendant", email: null, phone: null });
  });

  it("reads reporter certificate identity fields", () => {
    const { reporterCertificate } = buildCertifiedSections(model(envelope()));
    expect(reporterCertificate).toMatchObject({
      reporterName: "MARY REPORTER",
      csrLicense: "CSR-9999",
      firmRegistration: "FIRM-123",
      csrCertExpiration: "2027-12-31",
      deponent: "JANE DOE",
    });
  });

  it("passes the finalized indexes through unchanged", () => {
    const sections = buildCertifiedSections(model(envelope()));
    expect(sections.examinationIndex).toEqual([{ kind: "EXAMINATION", examinerLabel: "MR. SMITH", page: 2 }]);
    expect(sections.exhibitIndex).toEqual([{ exhibit_number: "1", marked: 5, offered: null, admitted: null, excluded: null }]);
  });

  it("resolves errata over the finalized pagination", () => {
    const sections = buildCertifiedSections(model(envelope()), {
      errataChanges: [{ utteranceId: "u5", from: "there", to: "their", reason: "typo" }],
    });
    expect(sections.errata).toEqual([{ page: 7, line: 3, from: "there", to: "their", reason: "typo" }]);
    expect(sections.unresolvedErrata).toEqual([]);
  });

  it("yields a well-formed model with null/empty fields for a null envelope (no fabrication)", () => {
    const sections = buildCertifiedSections(model(null));
    expect(sections.caption.causeNumber).toBeNull();
    expect(sections.caption.deponent).toBeNull();
    expect(sections.appearances.entries).toEqual([]);
    expect(sections.reporterCertificate.reporterName).toBeNull();
    // Indexes still flow from the finalized model even without metadata.
    expect(sections.examinationIndex).toHaveLength(1);
  });
});

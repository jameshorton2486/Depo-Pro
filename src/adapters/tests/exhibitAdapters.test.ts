import { describe, expect, it } from "vitest";
import type { CaseExhibit } from "../../types/case";
import { caseExhibitToExhibit } from "../exhibitAdapters";

const EXHIBIT: CaseExhibit = {
  exhibit_id: "ex_001",
  label: "Exhibit 1",
  description: "Bridge report",
  filename: "ex_001.pdf",
  file_url: null,
  marked_by: "PLAINTIFF",
  admitted: false,
  page_reference: null,
  line_reference: null,
};

describe("caseExhibitToExhibit", () => {
  it("passes through explicit file_url unchanged", () => {
    const mapped = caseExhibitToExhibit({ ...EXHIBIT, file_url: "/custom/report.pdf" });
    expect(mapped.file_url).toBe("/custom/report.pdf");
  });

  it("derives file_url from case id and filename when needed", () => {
    const mapped = caseExhibitToExhibit(EXHIBIT, { caseId: "case_20240602_001" });
    expect(mapped.file_url).toBe("cases/case_20240602_001/exhibits/files/ex_001.pdf");
  });

  it("uses a fallback when no file reference exists", () => {
    const mapped = caseExhibitToExhibit({ ...EXHIBIT, filename: null }, { fallbackUrl: "#" });
    expect(mapped.file_url).toBe("#");
  });
});

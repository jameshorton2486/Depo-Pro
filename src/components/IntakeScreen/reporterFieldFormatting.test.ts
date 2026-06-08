import { describe, expect, it } from "vitest";

import {
  digitsOnly,
  formatPhoneDisplay,
  formatReporterDateDisplay,
  getReporterFormattingWarnings,
  parseReporterDateToIso,
} from "./reporterFieldFormatting";

describe("reporterFieldFormatting", () => {
  it("formats phone digits for display", () => {
    expect(formatPhoneDisplay("2105550303")).toBe("(210) 555-0303");
    expect(formatPhoneDisplay("2105550")).toBe("(210) 555-0");
  });

  it("round-trips reporter expiration dates between ISO storage and display format", () => {
    expect(formatReporterDateDisplay("2027-12-31")).toBe("12/31/2027");
    expect(parseReporterDateToIso("12/31/2027")).toBe("2027-12-31");
  });

  it("strips non-digit reporter identifiers for canonical storage", () => {
    expect(digitsOnly("CSR-12129")).toBe("12129");
    expect(digitsOnly("FR-9001")).toBe("9001");
  });

  it("warns on invalid reporter date input without requiring a hard block", () => {
    expect(getReporterFormattingWarnings({
      phone: "2105550303",
      csrExpiration: "13/40/2027",
    })).toEqual(["CSR expiration should be a valid date in MM/DD/YYYY format."]);
  });
});

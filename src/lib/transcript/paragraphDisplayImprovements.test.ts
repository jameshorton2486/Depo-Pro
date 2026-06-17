import { describe, expect, it } from "vitest";

import { applyParagraphDisplayImprovements } from "./paragraphDisplayImprovements";

describe("applyParagraphDisplayImprovements", () => {
  it("normalizes safe deterministic transcript formatting patterns", () => {
    expect(
      applyParagraphDisplayImprovements(
        "doctor Etminan saw me at 01:27PM in the U. S. A. and charged fifty to sixty percent.",
      ),
    ).toBe("Dr. Etminan saw me at 1:27 p.m. in the U.S.A. and charged fifty to sixty percent.");
  });

  it("does not apply interpretive rewrites such as dedupe or numeric reconstruction", () => {
    expect(
      applyParagraphDisplayImprovements("The 4 64th unit was filed by PLLC, PLLC, PLLC and reviewed by M. D."),
    ).toBe("The 4 64th unit was filed by PLLC, PLLC, PLLC and reviewed by M.D.");
  });

  it("does not rewrite dates, cause numbers, or hyphenation that could alter meaning", () => {
    expect(
      applyParagraphDisplayImprovements(
        "Today's date is 04/24/2026. This is cause number C572224L. examination, examination of the doctor patient relationship.",
      ),
    ).toBe(
      "Today's date is 04/24/2026. This is cause number C572224L. examination, examination of the doctor patient relationship.",
    );
  });
});

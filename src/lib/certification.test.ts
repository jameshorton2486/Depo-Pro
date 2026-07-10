import { describe, expect, it } from "vitest";
import type { CaseCertification } from "../types/case";
import { isCertificationLocked, isCertificationReady } from "./certification";

const readyCertification: CaseCertification = {
  certification_date: null,
  certification_statement: "Reviewed and ready.",
  checklist: {
    review_complete: true,
    speaker_mapping_complete: true,
    confidence_review_complete: true,
    exhibits_complete: true,
    ufm_complete: true,
  },
  signature_hash: null,
};

describe("certification state", () => {
  it("distinguishes readiness from an explicit certification lock", () => {
    expect(isCertificationReady(readyCertification)).toBe(true);
    expect(isCertificationLocked(readyCertification)).toBe(false);
    expect(isCertificationLocked({ ...readyCertification, certification_date: "2026-07-10" })).toBe(true);
  });

  it("rejects incomplete or blank certification data", () => {
    expect(isCertificationReady(null)).toBe(false);
    expect(isCertificationReady({ ...readyCertification, certification_statement: "  " })).toBe(false);
    expect(isCertificationReady({
      ...readyCertification,
      checklist: { ...readyCertification.checklist, review_complete: false },
    })).toBe(false);
  });
});

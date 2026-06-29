import { describe, expect, it } from "vitest";

import {
  AMBIGUOUS_FLAGS,
  DETERMINISTIC_PHRASE_CORRECTIONS,
  DETERMINISTIC_TOKEN_CORRECTIONS,
  looksLikeImplausibleMoney,
  normalizeSlashDate,
} from "./correctionRegistry";

describe("DETERMINISTIC_TOKEN_CORRECTIONS", () => {
  it("contains C572224L correction", () => {
    const rule = DETERMINISTIC_TOKEN_CORRECTIONS.find((r) => r.match === "C572224L");
    expect(rule?.replacement).toBe("C-5722-24-L");
  });

  it("contains scroiliac correction", () => {
    const rule = DETERMINISTIC_TOKEN_CORRECTIONS.find((r) => r.match === "scroiliac");
    expect(rule?.replacement).toBe("sacroiliac");
  });

  it("Ramos correction requires preceding honorific", () => {
    const rule = DETERMINISTIC_TOKEN_CORRECTIONS.find((r) => r.match === "Ramos");
    expect(rule?.requiresPrecedingPattern).toBeDefined();
    expect(rule?.requiresPrecedingPattern?.test("Mr.")).toBe(true);
    expect(rule?.requiresPrecedingPattern?.test("The")).toBe(false);
  });

  it("mibis correction replaces with Miss", () => {
    const rule = DETERMINISTIC_TOKEN_CORRECTIONS.find((r) => r.match === "mibis");
    expect(rule?.replacement).toBe("Miss");
  });

  it("Maloney correction requires preceding honorific", () => {
    const rule = DETERMINISTIC_TOKEN_CORRECTIONS.find((r) => r.match === "Maloney");
    expect(rule?.replacement).toBe("Bentley");
    expect(rule?.requiresPrecedingPattern).toBeDefined();
    expect(rule?.requiresPrecedingPattern?.test("Mr.")).toBe(true);
    expect(rule?.requiresPrecedingPattern?.test("The")).toBe(false);
  });

  it("Maloney correction does not trigger without an honorific", () => {
    const rule = DETERMINISTIC_TOKEN_CORRECTIONS.find((r) => r.match === "Maloney");
    expect(rule?.requiresPrecedingPattern?.test("witness")).toBe(false);
  });

  it("Peterson correction requires preceding honorific", () => {
    const rule = DETERMINISTIC_TOKEN_CORRECTIONS.find((r) => r.match === "Peterson");
    expect(rule?.replacement).toBe("Bentley");
    expect(rule?.requiresPrecedingPattern).toBeDefined();
    expect(rule?.requiresPrecedingPattern?.test("Mr.")).toBe(true);
    expect(rule?.requiresPrecedingPattern?.test("The")).toBe(false);
  });

  it("Peterson correction does not trigger without an honorific", () => {
    const rule = DETERMINISTIC_TOKEN_CORRECTIONS.find((r) => r.match === "Peterson");
    expect(rule?.requiresPrecedingPattern?.test("witness")).toBe(false);
  });
});

describe("DETERMINISTIC_PHRASE_CORRECTIONS", () => {
  it("corrects visible therapy to physical therapy", () => {
    const rule = DETERMINISTIC_PHRASE_CORRECTIONS.find((r) => r.match === "visible therapy");
    expect(rule?.replacement).toBe("physical therapy");
  });

  it("corrects extra report to expert report", () => {
    const rule = DETERMINISTIC_PHRASE_CORRECTIONS.find((r) => r.match === "extra report");
    expect(rule?.replacement).toBe("expert report");
  });

  it("corrects lung the cervical to lumbar and the cervical", () => {
    const rule = DETERMINISTIC_PHRASE_CORRECTIONS.find((r) => r.match === "lung the cervical");
    expect(rule?.replacement).toBe("lumbar and the cervical");
  });

  it("corrects e u r spine j to Eur Spine J", () => {
    const rule = DETERMINISTIC_PHRASE_CORRECTIONS.find((r) => r.match === "e u r spine j");
    expect(rule?.replacement).toBe("Eur Spine J");
  });

  it("corrects curriculum of IT to curriculum vitae", () => {
    const rule = DETERMINISTIC_PHRASE_CORRECTIONS.find((r) => r.match === "curriculum of IT");
    expect(rule?.replacement).toBe("curriculum vitae");
  });

  it("corrects Addiction form to Objection. Form.", () => {
    const rule = DETERMINISTIC_PHRASE_CORRECTIONS.find((r) => r.match === "Addiction form");
    expect(rule?.replacement).toBe("Objection. Form.");
  });
});

describe("AMBIGUOUS_FLAGS", () => {
  it("flags accent as ambiguous", () => {
    const flag = AMBIGUOUS_FLAGS.find((f) => f.match === "accent");
    expect(flag?.likelyMeaning).toBe("accident");
  });

  it("flags raiding as ambiguous", () => {
    const flag = AMBIGUOUS_FLAGS.find((f) => f.match === "raiding");
    expect(flag?.likelyMeaning).toBe("radiating");
  });

  it("flags granted as ambiguous", () => {
    const flag = AMBIGUOUS_FLAGS.find((f) => f.match === "granted");
    expect(flag?.likelyMeaning).toBe("rear-ended");
  });
});

describe("normalizeSlashDate", () => {
  it("converts 04/24/2026 to April 24, 2026", () => {
    expect(normalizeSlashDate("04/24/2026")).toBe("April 24, 2026");
  });

  it("converts 09/15/2023 to September 15, 2023", () => {
    expect(normalizeSlashDate("09/15/2023")).toBe("September 15, 2023");
  });

  it("leaves non-date tokens unchanged", () => {
    expect(normalizeSlashDate("normal")).toBe("normal");
  });
});

describe("looksLikeImplausibleMoney", () => {
  it("flags $7.50 as implausible", () => {
    expect(looksLikeImplausibleMoney("$7.50")).toBe(true);
  });

  it("does not flag $750 as implausible", () => {
    expect(looksLikeImplausibleMoney("$750")).toBe(false);
  });

  it("does not flag $150.00 as implausible", () => {
    expect(looksLikeImplausibleMoney("$150.00")).toBe(false);
  });
});

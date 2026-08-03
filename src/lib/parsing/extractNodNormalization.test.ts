import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
import { applyExtraction } from "./applyExtraction";
import {
  GARZA_HEATH_THOMAS_RAW_FIXTURE,
  GOLDMAN_MONTES_NAVARRO_RAW_FIXTURE,
  HILL_BENITEZ_RAW_FIXTURE,
} from "./__fixtures__/extractNodRawFixtures";
import { normalizeFields } from "../../../supabase/functions/extract-nod/normalization.js";

function buildRecord() {
  return emptyCaseRecord("case_extract_nod_normalization", "2026-06-12T12:00:00.000Z");
}

function fieldUpdateValue(
  application: ReturnType<typeof applyExtraction>,
  path: string,
) {
  return application.fieldUpdates.find((update) => update.path === path)?.value;
}

describe("extract-nod normalization boundary", () => {
  it("coerces bare scalar caption fields and stringified defendants for the Garza notice", () => {
    const normalized = normalizeFields(GARZA_HEATH_THOMAS_RAW_FIXTURE);
    const application = applyExtraction(normalized, buildRecord());

    expect(normalized.cause_number.value).toBe("25-cv-00598-OLG");
    expect(normalized.court_name.value).toBe("UNITED STATES DISTRICT COURT");
    expect(normalized.district.value).toBe("WESTERN DISTRICT OF TEXAS");
    expect(normalized.division.value).toBe("SAN ANTONIO DIVISION");
    expect(normalized.deposition_date.value).toBe("2026-04-30");
    expect(normalized.start_time.value).toBe("13:30");
    expect(normalized.defendants.value).toEqual([
      "HOME DEPOT U.S.A., INC. A/K/A THE HOME DEPOT",
      "SHAWN HERBER",
    ]);
    expect(normalized.service.served_parties.value).toEqual([
      "Karen M. Alvarado",
      "BROTHERS, ALVARADO, PIAZZA & COZORT, P.C.",
      "Steven A. Nunez",
    ]);
    expect(normalized.service.service_emails.value).toEqual([
      "SERVICE-ALVARADO@BROTHERS-LAW.COM",
      "service@brainspine-law.com",
    ]);

    expect(fieldUpdateValue(application, "caption.case_number")).toBe("25-CV-00598-OLG");
    expect(fieldUpdateValue(application, "caption.judicial_district")).toBe("WESTERN DISTRICT OF TEXAS");
    expect(fieldUpdateValue(application, "caption.division")).toBe("SAN ANTONIO DIVISION");
    expect(fieldUpdateValue(application, "session.deposition_date")).toBe("2026-04-30");
    expect(fieldUpdateValue(application, "session.start_time")).toBe("13:30");
    expect(application.witnessAdds[0]?.witness.name.value).toBe("Heath Thomas");
  });

  it("derives non-OTHER attorney roles from title-cased side values on the Garza notice", () => {
    const normalized = normalizeFields(GARZA_HEATH_THOMAS_RAW_FIXTURE);
    const application = applyExtraction(normalized, buildRecord());

    const attorneyRoles = application.attorneyAdds.map((entry) => ({
      name: entry.attorney.name.value,
      role: entry.attorney.role.value,
      representing: entry.attorney.representing.value,
    }));

    expect(attorneyRoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Jacob D. Cukjati", role: "EXAMINING" }),
        expect.objectContaining({ name: "Curtis L. Cukjati", role: "EXAMINING" }),
        expect.objectContaining({ name: "Steven A. Nunez", role: "EXAMINING" }),
        expect.objectContaining({ name: "Karen M. Alvarado", role: "OPPOSING" }),
      ]),
    );
    expect(attorneyRoles.every((entry) => entry.role !== "OTHER")).toBe(true);
  });

  it("normalizes the Goldman notice packet into caption, witness, and party data", () => {
    const normalized = normalizeFields(GOLDMAN_MONTES_NAVARRO_RAW_FIXTURE);
    const application = applyExtraction(normalized, buildRecord());

    expect(normalized.cause_number.value).toBe("C-1628-25-E");
    expect(normalized.court_name.value).toBe("275TH JUDICIAL DISTRICT COURT");
    expect(normalized.county.value).toBe("Hidalgo County");
    expect(normalized.deposition_date.value).toBe("2026-05-07");
    expect(normalized.start_time.value).toBe("14:00");
    expect(normalized.witness.name.value).toBe("Alfredo Montes Navarro");
    expect(normalized.parties).toHaveLength(4);
    expect(normalized.attorneys).toHaveLength(2);

    expect(fieldUpdateValue(application, "caption.case_number")).toBe("C-1628-25-E");
    expect(fieldUpdateValue(application, "session.deposition_date")).toBe("2026-05-07");
    expect(fieldUpdateValue(application, "session.start_time")).toBe("14:00");
    expect(application.witnessAdds[0]?.witness.name.value).toBe("Alfredo Montes Navarro");
  });

  it("normalizes the Benitez notice transcript into witness and attorney data", () => {
    const normalized = normalizeFields(HILL_BENITEZ_RAW_FIXTURE);
    const application = applyExtraction(normalized, buildRecord());

    expect(normalized.cause_number.value).toBe("2025CI11923");
    expect(normalized.county.value).toBe("Bexar County");
    expect(normalized.deposition_date.value).toBe("2026-04-16");
    expect(normalized.start_time.value).toBe("10:03");
    expect(normalized.end_time.value).toBe("11:49");
    expect(normalized.witness.name.value).toBe("Frank Echevarria Benitez");
    expect(normalized.parties).toHaveLength(3);

    expect(fieldUpdateValue(application, "caption.case_number")).toBe("2025CI11923");
    expect(fieldUpdateValue(application, "session.deposition_date")).toBe("2026-04-16");
    expect(fieldUpdateValue(application, "session.start_time")).toBe("10:03");
    expect(application.witnessAdds[0]?.witness.name.value).toBe("Frank Echevarria Benitez");
    expect(application.attorneyAdds.map((entry) => entry.attorney.role.value)).toEqual(
      expect.arrayContaining(["EXAMINING", "OPPOSING"]),
    );
  });
});

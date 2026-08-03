import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
import { normalizeFields } from "../../../supabase/functions/extract-nod/normalization.js";
import { applyExtraction } from "./applyExtraction";

describe("canonical extracted name writers", () => {
  it("canonicalizes governed names without mutating evidence or recasing keyterms", () => {
    const fields = normalizeFields({
      court_name: "SYNTHETIC DISTRICT COURT",
      witness: { name: "AVERY QUILL" },
      attorneys: [{ name: "JORDAN VALE", firm: "FALCON, REED & VALE, P.C." }],
      law_firms: [{ name: "FALCON, REED & VALE, P.C." }],
    });
    const evidence = structuredClone(fields);
    const record = emptyCaseRecord("case_name_extraction", "2026-08-03T12:00:00.000Z");
    record.attorneys = [];
    record.law_firms = [];

    const application = applyExtraction(fields, record);

    expect(fields).toEqual(evidence);
    expect(application.fieldUpdates).toContainEqual(expect.objectContaining({
      path: "caption.court_name", value: "Synthetic District Court",
    }));
    expect(application.witnessAdds[0]?.witness.name.value).toBe("Avery Quill");
    expect(application.attorneyAdds[0]?.attorney.name.value).toBe("Jordan Vale");
    expect(application.attorneyAdds[0]?.attorney.firm.value).toBe("Falcon, Reed & Vale, P.C.");
    expect(application.lawFirmAdds[0]?.law_firm.name.value).toBe("Falcon, Reed & Vale, P.C.");
    expect(application.keyterms.map(({ term }) => term)).toEqual(expect.arrayContaining([
      "AVERY QUILL", "JORDAN VALE", "FALCON, REED & VALE, P.C.",
    ]));
  });
});

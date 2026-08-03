import { describe, expect, it } from "vitest";

import { canonicalizeContactInsertForWrite } from "./contactService";
import { canonicalizeFirmFields } from "./firmService";

describe("directory canonical name writers", () => {
  it("canonicalizes contact identity and organization without changing other fields", () => {
    const result = canonicalizeContactInsertForWrite({
      type: "attorney",
      name: "AVERY QUILL",
      organization: "FALCON, REED & VALE, P.C.",
      phone: "2105550101",
      email: "avery@example.com",
      address: "100 Synthetic Way",
      notes: "",
      details: { kind: "attorney" },
    });

    expect(result.name).toBe("Avery Quill");
    expect(result.organization).toBe("Falcon, Reed & Vale, P.C.");
    expect(result.email).toBe("avery@example.com");
  });

  it("canonicalizes reporting/law firm names independently of phone behavior", () => {
    const result = canonicalizeFirmFields({
      name: "NORTHSTAR REPORTING LLC",
      address: "100 Synthetic Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
      main_phone: "2105550102",
      fax: "2105550103",
    });

    expect(result.name).toBe("Northstar Reporting LLC");
    expect(result.main_phone).toBe("(210) 555-0102");
    expect(result.fax).toBe("(210) 555-0103");
  });
});

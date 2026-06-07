import { describe, expect, it } from "vitest";

import type { Contact, ContactInsert } from "../../types/contact";
import { emptyContactDetails } from "../../types/contact";
import type { Firm, FirmInsert } from "../../types/firm";
import { decideDirectoryContactUpsert, decideFirmUpsert } from "./mergeDirectoryRecords";

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact_1",
    type: "attorney",
    name: "Karen M. Alvarado",
    organization: "",
    phone: "",
    email: "",
    address: "",
    times_used: 0,
    notes: "",
    firm_id: null,
    details: emptyContactDetails("attorney"),
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:00:00.000Z",
    ...overrides,
  };
}

function makeFirm(overrides: Partial<Firm> = {}): Firm {
  return {
    id: "firm_1",
    name: "Brothers, Alvarado, Piazza & Cozort, P.C.",
    address: "",
    city: "",
    state: "",
    zip: "",
    main_phone: "",
    fax: "",
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:00:00.000Z",
    ...overrides,
  };
}

describe("directory merge decisions", () => {
  it("fills empty contact fields for same-type same-name matches", () => {
    const candidate: ContactInsert = {
      type: "attorney",
      name: "Karen M Alvarado",
      organization: "Brothers Law",
      phone: "",
      email: "",
      address: "",
      notes: "",
      details: {
        bar_number: "24012345",
      },
    };

    const decision = decideDirectoryContactUpsert([makeContact()], candidate);

    expect(decision.created).toBe(false);
    expect(decision.conflicts).toEqual([]);
    expect(decision.contact?.organization).toBe("Brothers Law");
    expect(decision.contact?.details).toMatchObject({
      kind: "attorney",
      bar_number: "24012345",
    });
  });

  it("surfaces contact conflicts instead of overwriting non-empty values", () => {
    const candidate: ContactInsert = {
      type: "attorney",
      name: "Karen M Alvarado",
      organization: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      details: {
        bar_number: "99999999",
      },
    };

    const decision = decideDirectoryContactUpsert([
      makeContact({
        details: {
          kind: "attorney",
          bar_number: "24012345",
          direct_phone: null,
          extension: null,
          fax: null,
          assistant_name: null,
          assistant_email: null,
          preferred_appearance_label: null,
        },
      }),
    ], candidate);

    expect(decision.conflicts).toEqual([
      {
        field: "details.bar_number",
        existingValue: "24012345",
        incomingValue: "99999999",
      },
    ]);
  });

  it("does not merge same-name contacts across different contact types", () => {
    const candidate: ContactInsert = {
      type: "reporter",
      name: "Karen M Alvarado",
      organization: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      details: {
        csr_number: "12129",
      },
    };

    const decision = decideDirectoryContactUpsert([makeContact()], candidate);

    expect(decision.created).toBe(true);
    expect(decision.payload?.type).toBe("reporter");
  });

  it("surfaces firm conflicts instead of overwriting populated firm blocks", () => {
    const candidate: FirmInsert = {
      name: "Brothers Alvarado Piazza & Cozort PC",
      address: "123 Main",
      city: "",
      state: "",
      zip: "",
      main_phone: "",
      fax: "",
    };

    const decision = decideFirmUpsert([
      makeFirm({
        address: "456 Elm",
      }),
    ], candidate);

    expect(decision.conflicts).toEqual([
      {
        field: "address",
        existingValue: "456 Elm",
        incomingValue: "123 Main",
      },
    ]);
  });
});

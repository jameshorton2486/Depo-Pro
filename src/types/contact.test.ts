import { describe, expect, it } from "vitest";

import { emptyContactDetails, normalizeContactDetails, normalizeContactInsert, normalizeContactRow } from "./contact";

describe("contact details normalization", () => {
  it("returns safe attorney defaults for malformed jsonb details", () => {
    const normalized = normalizeContactDetails("attorney", "bad-shape");

    expect(normalized).toEqual(emptyContactDetails("attorney"));
  });

  it("drops malformed interpreter detail fields to safe defaults", () => {
    const normalized = normalizeContactDetails("interpreter", {
      certified: "yes",
      cert_number: 1234,
      default_languages: ["es", 42, "en"],
    });

    expect(normalized).toEqual({
      kind: "interpreter",
      certified: false,
      cert_number: null,
      certification_authority: null,
      certification_expiration: null,
      remote_capable: false,
      agency: null,
      agency_contact: null,
      default_languages: ["es", "en"],
    });
  });

  it("normalizes contact rows on every read", () => {
    const row = normalizeContactRow({
      id: "contact_1",
      type: "attorney",
      name: "Karen Alvarado",
      organization: "Brothers Law",
      phone: "(210) 555-0101",
      email: "karen@example.com",
      address: "123 Main",
      times_used: 2,
      notes: "",
      details: {
        bar_number: "24012345",
        assistant_name: "Dana",
      },
      firm_id: 42,
      created_at: "2026-06-07T00:00:00.000Z",
      updated_at: "2026-06-07T00:00:00.000Z",
    });

    expect(row.firm_id).toBeNull();
    expect(row.details).toEqual({
      kind: "attorney",
      bar_number: "24012345",
      direct_phone: null,
      extension: null,
      fax: null,
      assistant_name: "Dana",
      assistant_email: null,
      preferred_appearance_label: null,
    });
  });

  it("normalizes insert payloads with default details and null firm link", () => {
    const normalized = normalizeContactInsert({
      type: "scheduler",
      name: "Tiffany Netcher",
      organization: "Goldman & Peterson",
      phone: "2105550101",
      email: "tiffany@example.com",
      address: "",
      notes: "",
    });

    expect(normalized.firm_id).toBeNull();
    expect(normalized.details).toEqual({ kind: "scheduler" });
  });
});

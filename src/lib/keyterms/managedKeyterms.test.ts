import { describe, expect, it } from "vitest";

import type { ManagedKeyterm } from "../../components/DeepgramKeytermManager/types";
import { mergeManagedDerivedKeyterms } from "./managedKeyterms";

function buildManagedManualTerm(): ManagedKeyterm {
  return {
    id: "kt_existing",
    term: "Existing Term",
    boost: 0.8,
    category: "proper_name",
    source: "Manual",
    notes: "manual",
    selected: true,
    pinned: false,
    priority: 0,
    confidence: 1,
    token_count: 2,
  };
}

describe("mergeManagedDerivedKeyterms", () => {
  it("preserves derived provenance notes when adding new keyterms", () => {
    const merged = mergeManagedDerivedKeyterms([buildManagedManualTerm()], [{
      term: "Heath Thomas",
      boost: 0.5,
      category: "proper_name",
      notes: "derived:witness",
    }]);

    expect(merged.find((term) => term.term === "Heath Thomas")?.notes).toBe("derived:witness");
  });
});

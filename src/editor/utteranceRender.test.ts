import { describe, expect, it } from "vitest";

import { getUtterancePrefix } from "./utteranceRender";

describe("utteranceRender", () => {
  it("prefers contract-owned line type over speaker-role inference for visible prefixes", () => {
    expect(getUtterancePrefix("WITNESS", "THE WITNESS", "Q")).toBe("Q.");
    expect(getUtterancePrefix("ATTORNEY", "MR. BENTLEY", "A")).toBe("A.");
  });

  it("falls back to abbreviated colloquy labels when no contract line type exists", () => {
    expect(getUtterancePrefix("OTHER", "THE VIDEOGRAPHER")).toBe("VIDEOGRAPH");
  });
});

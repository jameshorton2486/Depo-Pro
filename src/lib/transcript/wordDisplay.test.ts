import { describe, expect, it } from "vitest";
import { resolveWordDisplay } from "./wordDisplay";

describe("wordDisplay", () => {
  it("prefers pending ai_suggestion over working_text and raw_text", () => {
    expect(resolveWordDisplay({
      raw_text: "raiding",
      working_text: "raiding",
      ai_suggestion: "radiating",
      ai_suggestion_status: "pending",
    })).toEqual({
      displayText: "radiating",
      layer: "ai_suggestion",
      isPending: true,
    });
  });

  it("falls back from working_text to raw_text when no pending ai_suggestion exists", () => {
    expect(resolveWordDisplay({
      raw_text: "Maloney",
      working_text: "Bentley",
      ai_suggestion: "Bentley",
      ai_suggestion_status: "accepted",
    })).toEqual({
      displayText: "Bentley",
      layer: "working_text",
      isPending: false,
    });

    expect(resolveWordDisplay({
      raw_text: "Bentley",
      working_text: null,
      ai_suggestion: null,
      ai_suggestion_status: null,
    })).toEqual({
      displayText: "Bentley",
      layer: "raw_text",
      isPending: false,
    });
  });
});

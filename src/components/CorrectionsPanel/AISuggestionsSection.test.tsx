// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AISuggestionsSection } from "./AISuggestionsSection";

const { hooksMock } = vi.hoisted(() => ({
  hooksMock: {
    useAISuggestions: vi.fn(),
    useAcceptAISuggestion: vi.fn(),
    useRejectAISuggestion: vi.fn(),
    useAcceptAllAISuggestions: vi.fn(),
  },
}));

vi.mock("../../hooks/useAISuggestions", () => hooksMock);

describe("AISuggestionsSection", () => {
  beforeEach(() => {
    hooksMock.useAISuggestions.mockReset();
    hooksMock.useAcceptAISuggestion.mockReset();
    hooksMock.useRejectAISuggestion.mockReset();
    hooksMock.useAcceptAllAISuggestions.mockReset();

    hooksMock.useAcceptAISuggestion.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooksMock.useRejectAISuggestion.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooksMock.useAcceptAllAISuggestions.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("renders nothing when no suggestions are present", () => {
    hooksMock.useAISuggestions.mockReturnValue({ data: [], isLoading: false, refresh: vi.fn() });

    const { container } = render(<AISuggestionsSection transcriptId="tr_1" />);

    expect(container.textContent).toBe("");
  });

  it("renders high and lower confidence groups", () => {
    hooksMock.useAISuggestions.mockReturnValue({
      data: [
        {
          word_id: "w1",
          utterance_id: "utt1",
          raw_text: "raiding",
          ai_suggestion: "radiating",
          ai_suggestion_reason: "reason",
          ai_confidence: 0.91,
          utterance_raw_text: "The pain was raiding down the leg.",
        },
        {
          word_id: "w2",
          utterance_id: "utt2",
          raw_text: "accent",
          ai_suggestion: "accident",
          ai_suggestion_reason: "reason",
          ai_confidence: 0.88,
          utterance_raw_text: "He described the accent after the crash.",
        },
      ],
      isLoading: false,
      refresh: vi.fn(),
    });

    render(<AISuggestionsSection transcriptId="tr_1" />);

    expect(screen.getByText("High confidence")).toBeTruthy();
    expect(screen.getByText("Verify carefully")).toBeTruthy();
    expect(screen.getByText("Accept all 2 suggestions")).toBeTruthy();
  });
});

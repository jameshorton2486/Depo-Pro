import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AISuggestionsSection } from "./AISuggestionsSection";

const hooksMock = {
  useAISuggestions: vi.fn(),
  useAcceptAISuggestion: vi.fn(),
  useRejectAISuggestion: vi.fn(),
  useAcceptAllAISuggestions: vi.fn(),
};

vi.mock("../../hooks/useAISuggestions", () => hooksMock);

type ElementWithChildren = ReactElement<{ children?: ReactNode } & Record<string, unknown>>;

function visitElements(node: ReactNode, cb: (element: ElementWithChildren) => void) {
  if (!isValidElement(node)) {
    return;
  }

  const element = node as ElementWithChildren;
  cb(element);

  const children = element.props.children;
  if (Array.isArray(children)) {
    children.forEach((child) => visitElements(child, cb));
    return;
  }

  visitElements(children, cb);
}

function collectText(node: ReactNode): string {
  let text = "";

  visitElements(node, (element) => {
    const children = element.props.children;
    if (typeof children === "string") {
      text += children;
    }
  });

  return text;
}

describe("AISuggestionsSection", () => {
  it("renders null when no suggestions are present", () => {
    hooksMock.useAISuggestions.mockReturnValue({ data: [], isLoading: false, refresh: vi.fn() });
    hooksMock.useAcceptAISuggestion.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooksMock.useRejectAISuggestion.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooksMock.useAcceptAllAISuggestions.mockReturnValue({ mutate: vi.fn(), isPending: false });

    expect(AISuggestionsSection({ transcriptId: "tr_1" })).toBeNull();
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
    hooksMock.useAcceptAISuggestion.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooksMock.useRejectAISuggestion.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooksMock.useAcceptAllAISuggestions.mockReturnValue({ mutate: vi.fn(), isPending: false });

    const tree = AISuggestionsSection({ transcriptId: "tr_1" });

    expect(tree).not.toBeNull();
    expect(collectText(tree)).toContain("High confidence");
    expect(collectText(tree)).toContain("Verify carefully");
  });
});

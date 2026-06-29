import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AIReviewBanner } from "./AIReviewBanner";

const triggerAIReviewMock = vi.fn();

vi.mock("../../api/workspaceService", () => ({
  workspaceApi: {
    triggerAIReview: triggerAIReviewMock,
  },
}));

function renderBanner(props?: Partial<React.ComponentProps<typeof AIReviewBanner>>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <AIReviewBanner
        jobId="tr_123"
        pendingCount={3}
        autoAppliedCount={2}
        {...props}
      />,
    );
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("AIReviewBanner", () => {
  beforeEach(() => {
    triggerAIReviewMock.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns null when no pending or auto-applied suggestions exist", () => {
    const { container, cleanup } = renderBanner({
      jobId: "tr_123",
      pendingCount: 0,
      autoAppliedCount: 0,
    });

    expect(container.textContent).toBe("");
    cleanup();
  });

  it("renders suggestion counts when review results are available", () => {
    const { container, cleanup } = renderBanner();

    expect(container.textContent).toContain("3 suggestions need review. 2 auto-applied.");
    expect(container.textContent).toContain("Re-review");
    cleanup();
  });

  it("calls workspaceApi.triggerAIReview when Re-review is clicked", async () => {
    triggerAIReviewMock.mockResolvedValue({ status: "re-review triggered" });
    const { container, cleanup } = renderBanner();
    const button = container.querySelector("button");

    expect(button?.textContent).toContain("Re-review");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(triggerAIReviewMock).toHaveBeenCalledWith("tr_123");
    cleanup();
  });

  it("shows Re-reviewing while the request is pending and re-enables afterwards", async () => {
    let resolveRequest: (() => void) | null = null;
    triggerAIReviewMock.mockImplementation(() => new Promise<void>((resolve) => {
      resolveRequest = resolve;
    }));

    const { container, cleanup } = renderBanner();
    const button = container.querySelector("button");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Re-reviewing...");

    await act(async () => {
      resolveRequest?.();
    });

    expect(container.textContent).toContain("Re-review");
    cleanup();
  });
});

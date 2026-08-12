// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FormatCorrectBanner } from "./FormatCorrectBanner";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const {
  triggerAIReviewMock,
  saveNowMock,
  loadDocumentMock,
  confirmStructureMock,
  keepRawLabelsMock,
  useDocumentMock,
} = vi.hoisted(() => ({
  triggerAIReviewMock: vi.fn(),
  saveNowMock: vi.fn(),
  loadDocumentMock: vi.fn(),
  confirmStructureMock: vi.fn(),
  keepRawLabelsMock: vi.fn(),
  useDocumentMock: vi.fn(),
}));

vi.mock("../../api/workspaceService", () => ({
  workspaceApi: { triggerAIReview: triggerAIReviewMock },
}));

vi.mock("../../context/DocumentContext", () => ({
  useDocument: useDocumentMock,
}));

function setDocState(stateOverrides: Record<string, unknown> = {}) {
  useDocumentMock.mockReturnValue({
    state: {
      document: { job_id: "tr_1" },
      jobId: "tr_1",
      saving: false,
      structureConfirmed: false,
      ...stateOverrides,
    },
    confirmStructure: confirmStructureMock,
    keepRawLabels: keepRawLabelsMock,
    saveNow: saveNowMock,
    loadDocument: loadDocumentMock,
  });
}

function renderBanner(props: Partial<React.ComponentProps<typeof FormatCorrectBanner>> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<FormatCorrectBanner jobId="tr_1" {...props} />);
  });
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function dispatchClick(container: HTMLElement, testId: string) {
  const el = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function click(container: HTMLElement, testId: string) {
  act(() => {
    dispatchClick(container, testId);
  });
}

async function clickAsync(container: HTMLElement, testId: string) {
  await act(async () => {
    dispatchClick(container, testId);
  });
  // Flush the remaining awaited microtasks in run().
  await act(async () => {});
}

describe("FormatCorrectBanner", () => {
  beforeEach(() => {
    triggerAIReviewMock.mockReset().mockResolvedValue({ status: "ok" });
    saveNowMock.mockReset().mockResolvedValue(true);
    loadDocumentMock.mockReset().mockResolvedValue(undefined);
    confirmStructureMock.mockReset();
    keepRawLabelsMock.mockReset();
    useDocumentMock.mockReset();
    setDocState();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the Format and Correct Transcript trigger", () => {
    const { container, cleanup } = renderBanner();
    const trigger = container.querySelector('[data-testid="format-correct-trigger"]');
    expect(trigger?.textContent).toContain("Format and Correct Transcript");
    cleanup();
  });

  it("opens a confirmation dialog naming the cursor/scroll consequence", () => {
    const { container, cleanup } = renderBanner();
    click(container, "format-correct-trigger");
    act(() => {});
    expect(container.querySelector('[data-testid="format-correct-dialog"]')).not.toBeNull();
    expect(container.textContent).toContain("cursor and scroll position");
    cleanup();
  });

  it("runs confirmStructure → saveNow → loadDocument → triggerAIReview in order", async () => {
    const { container, cleanup } = renderBanner();
    click(container, "format-correct-trigger");
    act(() => {});
    await clickAsync(container, "format-correct-confirm");

    expect(confirmStructureMock).toHaveBeenCalledTimes(1);
    expect(keepRawLabelsMock).not.toHaveBeenCalled();
    expect(saveNowMock).toHaveBeenCalledTimes(1);
    // Reloads twice: the deterministic reformat reload, then again after the AI
    // review lands so the auto-applied corrections are shown.
    expect(loadDocumentMock).toHaveBeenCalledTimes(2);
    expect(triggerAIReviewMock).toHaveBeenCalledWith("tr_1");

    // save must precede reload, reload must precede AI review
    expect(saveNowMock.mock.invocationCallOrder[0]).toBeLessThan(
      loadDocumentMock.mock.invocationCallOrder[0],
    );
    expect(loadDocumentMock.mock.invocationCallOrder[0]).toBeLessThan(
      triggerAIReviewMock.mock.invocationCallOrder[0],
    );
    cleanup();
  });

  it("aborts reload and AI review when the save fails, and surfaces an error", async () => {
    saveNowMock.mockResolvedValue(false);
    const { container, cleanup } = renderBanner();
    click(container, "format-correct-trigger");
    act(() => {});
    await clickAsync(container, "format-correct-confirm");

    expect(saveNowMock).toHaveBeenCalledTimes(1);
    expect(loadDocumentMock).not.toHaveBeenCalled();
    expect(triggerAIReviewMock).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="format-correct-error"]')).not.toBeNull();
    cleanup();
  });

  it("surfaces a visible error when the AI review fails (format + reload preserved, not swallowed)", async () => {
    triggerAIReviewMock.mockRejectedValue(new Error("bridge unset"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container, cleanup } = renderBanner();
    click(container, "format-correct-trigger");
    act(() => {});
    await clickAsync(container, "format-correct-confirm");

    // The deterministic format + reload still completed before the AI ran.
    expect(saveNowMock).toHaveBeenCalledTimes(1);
    expect(loadDocumentMock).toHaveBeenCalledTimes(1);
    // The failure is NOT swallowed: the dialog stays open and shows the real message.
    const errorEl = container.querySelector('[data-testid="format-correct-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain("bridge unset");
    expect(container.querySelector('[data-testid="format-correct-dialog"]')).not.toBeNull();
    errorSpy.mockRestore();
    cleanup();
  });

  it("takes the Keep Raw Labels branch without applying inferred structure", async () => {
    const { container, cleanup } = renderBanner();
    click(container, "format-correct-trigger");
    act(() => {});
    await clickAsync(container, "format-correct-keep-raw");

    expect(keepRawLabelsMock).toHaveBeenCalledTimes(1);
    expect(confirmStructureMock).not.toHaveBeenCalled();
    expect(saveNowMock).toHaveBeenCalledTimes(1);
    expect(loadDocumentMock).toHaveBeenCalledTimes(2); // reformat reload + post-AI-review reload
    cleanup();
  });

  it("skips the structure choice once structure is already confirmed", async () => {
    setDocState({ structureConfirmed: true });
    const { container, cleanup } = renderBanner();
    click(container, "format-correct-trigger");
    act(() => {});

    // No Keep Raw Labels option after structure is confirmed
    expect(container.querySelector('[data-testid="format-correct-keep-raw"]')).toBeNull();

    await clickAsync(container, "format-correct-confirm");
    expect(confirmStructureMock).not.toHaveBeenCalled();
    expect(keepRawLabelsMock).not.toHaveBeenCalled();
    expect(saveNowMock).toHaveBeenCalledTimes(1);
    expect(loadDocumentMock).toHaveBeenCalledTimes(2); // reformat reload + post-AI-review reload
    cleanup();
  });
});

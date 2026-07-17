// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { OriginalTranscriptDialog } from "./OriginalTranscriptDialog";

const getOriginalDocumentMock = vi.fn();
const useIntakeMock = vi.fn();

vi.mock("../api/workspaceService", () => ({
  workspaceApi: {
    getOriginalDocument: (...args: unknown[]) => getOriginalDocumentMock(...args),
  },
}));

vi.mock("../context/useIntake", () => ({
  useIntake: () => useIntakeMock(),
}));

vi.mock("../lib/transcriptDownloads", () => ({
  buildFormattedTranscriptText: () => "Q. State your name.\nA. Maria Lopez.",
  buildWordTranscriptHtml: () => "<html></html>",
  buildWorkspaceTranscriptJson: () => "{}",
  downloadBlob: vi.fn(),
}));

async function renderDialog() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<OriginalTranscriptDialog caseId="case_1" onClose={() => {}} />);
  });
  // Flush the async getOriginalDocument load.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("OriginalTranscriptDialog", () => {
  beforeEach(() => {
    getOriginalDocumentMock.mockReset();
    useIntakeMock.mockReset();
    useIntakeMock.mockReturnValue({ record: null });
  });

  it("renders the original transcript text when a snapshot exists", async () => {
    getOriginalDocumentMock.mockResolvedValue({ words: [], utterances: [], speakers: [] });

    const { container, cleanup } = await renderDialog();

    const text = container.querySelector('[data-testid="original-transcript-text"]');
    expect(text?.textContent).toContain("State your name");
    expect(getOriginalDocumentMock).toHaveBeenCalledWith("case_1");

    cleanup();
  });

  it("shows a missing-snapshot message when no original exists", async () => {
    getOriginalDocumentMock.mockResolvedValue(null);

    const { container, cleanup } = await renderDialog();

    expect(container.querySelector('[data-testid="original-transcript-text"]')).toBeNull();
    expect(container.textContent).toContain("No original snapshot exists");

    cleanup();
  });
});

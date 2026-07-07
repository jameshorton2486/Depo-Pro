// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toolbar } from "./Toolbar";

const useDocumentMock = vi.fn();
const useEditorContextMock = vi.fn();
const useIntakeMock = vi.fn();

vi.mock("../../context/DocumentContext", () => ({
  useDocument: () => useDocumentMock(),
}));

vi.mock("../../context/EditorContext", () => ({
  useEditorContext: () => useEditorContextMock(),
}));

vi.mock("../../context/useIntake", () => ({
  useIntake: () => useIntakeMock(),
}));

vi.mock("../AuthGate/AuthGate", () => ({
  AuthStatusChip: () => <div data-testid="auth-status-chip" />,
}));

vi.mock("../../lib/transcriptDownloads", () => ({
  buildFormattedTranscriptText: () => "",
  buildWordTranscriptHtml: () => "",
  buildWorkspaceTranscriptJson: () => "{}",
  downloadBlob: vi.fn(),
}));

function renderToolbar() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<Toolbar jobId="job_123" onSave={vi.fn()} />);
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("Toolbar", () => {
  beforeEach(() => {
    useDocumentMock.mockReset();
    useEditorContextMock.mockReset();
    useIntakeMock.mockReset();

    useDocumentMock.mockReturnValue({
      state: {
        document: null,
        structureConfirmed: false,
        keepRawLabels: false,
        wordMap: {},
        saving: false,
        dirty: false,
        saveError: null,
        lastSavedAt: null,
        loading: false,
      },
    });
    useIntakeMock.mockReturnValue({
      record: null,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("toggles the tab-stop guides from the toolbar", () => {
    const setShowTabStops = vi.fn();
    useEditorContextMock.mockReturnValue({
      showInterpreterLayer: false,
      setShowInterpreterLayer: vi.fn(),
      showTabStops: false,
      setShowTabStops,
    });

    const { container, cleanup } = renderToolbar();
    const button = container.querySelector('[data-testid="toolbar-tab-stops-toggle"]');

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setShowTabStops).toHaveBeenCalledWith(true);
    cleanup();
  });
});

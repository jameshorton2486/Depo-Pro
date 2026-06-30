import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExportScreen } from "./ExportScreen";

const useDocumentMock = vi.fn();
const useIntakeMock = vi.fn();
const useStageMock = vi.fn();

vi.mock("../../context/DocumentContext", () => ({
  useDocument: () => useDocumentMock(),
}));

vi.mock("../../context/useIntake", () => ({
  useIntake: () => useIntakeMock(),
}));

vi.mock("../../context/StageContext", () => ({
  useStage: () => useStageMock(),
}));

vi.mock("../WorkflowStageNav", () => ({
  WorkflowStageNav: () => <div data-testid="workflow-stage-nav" />,
}));

vi.mock("../WorkspaceSidebar/WorkspaceSidebar", () => ({
  WorkspaceSidebar: () => <div data-testid="workspace-sidebar" />,
}));

function renderExportScreen() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<ExportScreen jobId="job_123" />);
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("ExportScreen", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useDocumentMock.mockReset();
    useIntakeMock.mockReset();
    useStageMock.mockReset();

    useDocumentMock.mockReturnValue({
      state: {
        document: {
          job_id: "job_123",
          media_url: "",
          duration: 0,
          speakers: [],
          utterances: [],
          words: [],
        },
      },
    });
    useStageMock.mockReturnValue({
      setStage: vi.fn(),
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ignores browser localStorage and keeps export gated when the case record is uncertified", () => {
    window.localStorage.setItem("depo-pro.certification.job_123.v1", JSON.stringify({
      certificationStatement: "stale browser state",
      checklist: {
        review_complete: true,
        speaker_mapping_complete: true,
        confidence_review_complete: true,
        exhibits_complete: true,
        ufm_complete: true,
      },
    }));

    useIntakeMock.mockReturnValue({
      record: {
        caption: {
          case_name: { value: "Example Case" },
          case_number: { value: "123" },
        },
        certification: null,
      },
    });

    const { container, cleanup } = renderExportScreen();

    expect(container.textContent).toContain("Certification must be completed before export actions can be used.");
    const buttons = Array.from(container.querySelectorAll("button"));
    const exportTxtButton = buttons.find((button) => button.textContent?.includes("Export TXT"));
    expect(exportTxtButton).toBeDefined();
    expect(exportTxtButton?.hasAttribute("disabled")).toBe(true);
    cleanup();
  });
});

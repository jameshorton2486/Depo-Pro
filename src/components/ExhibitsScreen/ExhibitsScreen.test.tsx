// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExhibitsScreen } from "./ExhibitsScreen";
import { emptyCaseRecord } from "../../types/case";

const saveCaseMock = vi.fn();
const useCaseMock = vi.fn();
const useIntakeMock = vi.fn();
const useStageMock = vi.fn();

vi.mock("../../api/caseService", () => ({
  saveCase: (...args: unknown[]) => saveCaseMock(...args),
}));

vi.mock("../../context/useCase", () => ({
  useCase: () => useCaseMock(),
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

function renderScreen() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<ExhibitsScreen jobId="job_123" />);
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("ExhibitsScreen", () => {
  beforeEach(() => {
    saveCaseMock.mockReset();
    useCaseMock.mockReset();
    useIntakeMock.mockReset();
    useStageMock.mockReset();

    saveCaseMock.mockResolvedValue(undefined);
    useCaseMock.mockReturnValue({
      registerNavigationGuard: vi.fn(),
    });
    useStageMock.mockReturnValue({
      setStage: vi.fn(),
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("persists Stage 4 completion and advances to UFM when exhibits are ready", async () => {
    const record = emptyCaseRecord("case_exhibits", "2026-07-05T00:00:00.000Z");
    record.caption.case_name.value = "Example Case";
    record.exhibits = [{
      exhibit_id: "ex_1",
      label: "Exhibit 1",
      description: "Contract",
      filename: "contract.pdf",
      file_url: null,
      marked_by: null,
      admitted: false,
      page_reference: null,
      line_reference: null,
    }];
    const setStageMock = vi.fn();
    useStageMock.mockReturnValue({
      setStage: setStageMock,
    });
    useIntakeMock.mockReturnValue({
      record,
      addExhibit: vi.fn(),
      updateExhibit: vi.fn(),
      removeExhibit: vi.fn(),
      setStageComplete: vi.fn(),
      dirty: false,
    });

    const { container, cleanup } = renderScreen();
    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Continue to UFM")
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(saveCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "exhibits",
        stage_completion: expect.objectContaining({
          exhibits: true,
        }),
      }),
    );
    expect(setStageMock).toHaveBeenCalledWith("ufm");
    cleanup();
  });

  it("allows Stage 4 completion for a confirmed no-exhibit deposition", async () => {
    const record = emptyCaseRecord("case_exhibits_none", "2026-07-05T00:00:00.000Z");
    record.caption.case_name.value = "No Exhibit Case";
    const setStageMock = vi.fn();
    useStageMock.mockReturnValue({
      setStage: setStageMock,
    });
    useIntakeMock.mockReturnValue({
      record,
      addExhibit: vi.fn(),
      updateExhibit: vi.fn(),
      removeExhibit: vi.fn(),
      setStageComplete: vi.fn(),
      dirty: false,
    });

    const { container, cleanup } = renderScreen();
    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Continue to UFM")
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(saveCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "exhibits",
        stage_completion: expect.objectContaining({
          exhibits: true,
        }),
      }),
    );
    expect(setStageMock).toHaveBeenCalledWith("ufm");
    cleanup();
  });

  it("keeps Stage 4 incomplete when exhibits exist but required labels are missing", async () => {
    const record = emptyCaseRecord("case_exhibits_incomplete", "2026-07-05T00:00:00.000Z");
    record.caption.case_name.value = "Incomplete Exhibit Case";
    record.exhibits = [{
      exhibit_id: "ex_1",
      label: "",
      description: "Contract",
      filename: "contract.pdf",
      file_url: null,
      marked_by: null,
      admitted: false,
      page_reference: null,
      line_reference: null,
    }];
    const setStageMock = vi.fn();
    useStageMock.mockReturnValue({
      setStage: setStageMock,
    });
    useIntakeMock.mockReturnValue({
      record,
      addExhibit: vi.fn(),
      updateExhibit: vi.fn(),
      removeExhibit: vi.fn(),
      setStageComplete: vi.fn(),
      dirty: false,
    });

    const { container, cleanup } = renderScreen();
    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Continue to UFM")
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(saveCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage_completion: expect.objectContaining({
          exhibits: false,
        }),
      }),
    );
    expect(setStageMock).toHaveBeenCalledWith("ufm");
    cleanup();
  });
});

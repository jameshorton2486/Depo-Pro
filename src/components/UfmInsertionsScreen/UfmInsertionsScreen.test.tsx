// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UfmInsertionsScreen } from "./UfmInsertionsScreen";
import { emptyCaseRecord } from "../../types/case";

const saveCaseMock = vi.fn();
const useCaseMock = vi.fn();
const useIntakeMock = vi.fn();
const useStageMock = vi.fn();
const buildUfmMetadataMock = vi.fn();
const summarizeUfmEnvelopeMock = vi.fn();

vi.mock("../../api/caseService", () => ({
  saveCase: (...args: unknown[]) => saveCaseMock(...args),
}));

vi.mock("../../api/contactService", () => ({
  listContacts: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../api/firmService", () => ({
  listFirms: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../api/reporterProfileService", () => ({
  getMyProfile: vi.fn().mockResolvedValue(null),
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

vi.mock("../../lib/ufm/buildUfmMetadata", () => ({
  buildUfmMetadata: (...args: unknown[]) => buildUfmMetadataMock(...args),
  summarizeUfmEnvelope: (...args: unknown[]) => summarizeUfmEnvelopeMock(...args),
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
    root.render(<UfmInsertionsScreen jobId="job_123" />);
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("UfmInsertionsScreen", () => {
  beforeEach(() => {
    saveCaseMock.mockReset();
    useCaseMock.mockReset();
    useIntakeMock.mockReset();
    useStageMock.mockReset();
    buildUfmMetadataMock.mockReset();
    summarizeUfmEnvelopeMock.mockReset();

    saveCaseMock.mockResolvedValue(undefined);
    useCaseMock.mockReturnValue({
      activeProvenance: [],
      registerNavigationGuard: vi.fn(),
    });
    useStageMock.mockReturnValue({
      setStage: vi.fn(),
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("disables certification advance while required UFM fields are missing", () => {
    const record = emptyCaseRecord("case_ufm", "2026-07-05T00:00:00.000Z");
    useIntakeMock.mockReturnValue({
      record,
      setStageComplete: vi.fn(),
      dirty: false,
    });
    buildUfmMetadataMock.mockReturnValue({
      case_id: record.case_id,
      computed_at: "2026-07-05T00:00:00.000Z",
      ufm_metadata: {},
      field_sources: {},
      field_confirmations: {},
      missing_required_fields: ["cause_number"],
    });
    summarizeUfmEnvelopeMock.mockReturnValue({
      populatedCount: 0,
      missingRequiredCount: 1,
      awaitingConfirmationCount: 0,
      summaryLine: "DRAFT - 1 required fields missing",
    });

    const { container, cleanup } = renderScreen();
    const continueButton = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Continue to Certification")
    );

    expect(continueButton?.hasAttribute("disabled")).toBe(true);
    expect(container.textContent).toContain("cause_number");
    cleanup();
  });

  it("persists Stage 5 completion and advances to certification when UFM is ready", async () => {
    const record = emptyCaseRecord("case_ufm_ready", "2026-07-05T00:00:00.000Z");
    const setStageMock = vi.fn();
    useStageMock.mockReturnValue({
      setStage: setStageMock,
    });
    useIntakeMock.mockReturnValue({
      record,
      setStageComplete: vi.fn(),
      dirty: false,
    });
    buildUfmMetadataMock.mockReturnValue({
      case_id: record.case_id,
      computed_at: "2026-07-05T00:00:00.000Z",
      ufm_metadata: { cause_number: "123" },
      field_sources: {},
      field_confirmations: {},
      missing_required_fields: [],
    });
    summarizeUfmEnvelopeMock.mockReturnValue({
      populatedCount: 12,
      missingRequiredCount: 0,
      awaitingConfirmationCount: 0,
      summaryLine: "READY - 0 awaiting confirmation",
    });

    const { container, cleanup } = renderScreen();
    const continueButton = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Continue to Certification")
    );

    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(saveCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "ufm",
        stage_completion: expect.objectContaining({
          ufm: true,
        }),
      }),
    );
    expect(setStageMock).toHaveBeenCalledWith("certification");
    cleanup();
  });
});

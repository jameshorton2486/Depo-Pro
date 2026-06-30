import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CertificationScreen } from "./CertificationScreen";
import { emptyCaseRecord } from "../../types/case";

const saveCaseMock = vi.fn();
const getCertifyStatusMock = vi.fn();
const useCaseMock = vi.fn();
const useIntakeMock = vi.fn();
const useStageMock = vi.fn();

vi.mock("../../api/caseService", () => ({
  saveCase: (...args: unknown[]) => saveCaseMock(...args),
}));

vi.mock("../../api/workspaceService", () => ({
  workspaceApi: {
    getCertifyStatus: (...args: unknown[]) => getCertifyStatusMock(...args),
  },
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

function buildReadyRecord() {
  const record = emptyCaseRecord("case_certify", "2026-06-30T12:00:00.000Z");
  record.caption.case_name.value = "Example Case";
  record.caption.case_number.value = "25-cv-00598-OLG";
  record.caption.court_name.value = "United States District Court";
  record.caption.county.value = "Bexar County";
  record.session.location_state.value = "TX";
  record.session.deposition_date.value = "2026-04-30";
  record.reporter.name.value = "Karen Reporter";
  record.reporter.cert_number.value = "CSR-12345";
  record.proceeding.ordering_contact = "Defense Counsel";
  record.exhibits = [{
    exhibit_id: "ex_1",
    label: "Exhibit 1",
    description: "Operative report",
    filename: "exhibit-1.pdf",
    file_url: null,
    marked_by: null,
    admitted: false,
    page_reference: null,
    line_reference: null,
  }];
  record.certification = {
    certification_date: null,
    certification_statement: "Ready for release.",
    checklist: {
      review_complete: true,
      speaker_mapping_complete: true,
      confidence_review_complete: true,
      exhibits_complete: false,
      ufm_complete: false,
    },
    signature_hash: null,
  };
  return record;
}

function renderScreen() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<CertificationScreen jobId="job_123" />);
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("CertificationScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveCaseMock.mockReset();
    getCertifyStatusMock.mockReset();
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
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("derives exhibits_complete and ufm_complete from the current case state", () => {
    const record = buildReadyRecord();
    const setCertification = vi.fn();
    useIntakeMock.mockReturnValue({
      record,
      setCertification,
      dirty: false,
    });

    const { cleanup } = renderScreen();

    expect(setCertification).toHaveBeenCalledWith(
      expect.objectContaining({
        checklist: expect.objectContaining({
          exhibits_complete: true,
          ufm_complete: true,
        }),
      }),
    );
    cleanup();
  });

  it("renders derived exhibit and ufm checklist rows as disabled when already aligned", () => {
    const record = buildReadyRecord();
    record.certification = {
      ...record.certification!,
      checklist: {
        ...record.certification!.checklist,
        exhibits_complete: true,
        ufm_complete: true,
      },
    };

    useIntakeMock.mockReturnValue({
      record,
      setCertification: vi.fn(),
      dirty: false,
    });

    const { container, cleanup } = renderScreen();
    const inputs = Array.from(container.querySelectorAll("input[type='checkbox']")) as HTMLInputElement[];

    expect(inputs[3]?.checked).toBe(true);
    expect(inputs[3]?.disabled).toBe(true);
    expect(inputs[4]?.checked).toBe(true);
    expect(inputs[4]?.disabled).toBe(true);
    expect(container.textContent).toContain("Derived");
    cleanup();
  });
});

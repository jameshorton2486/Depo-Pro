// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExportScreen } from "./ExportScreen";

const useDocumentMock = vi.fn();
const useIntakeMock = vi.fn();
const useStageMock = vi.fn();
const buildFormattedTranscriptTextMock = vi.fn();

vi.mock("../../api/client", () => ({
  exportAdapterTransport: {
    create: vi.fn(),
    get: vi.fn(),
    cancel: vi.fn(),
  },
}));
vi.mock("../../context/DocumentContext", () => ({
  useDocument: () => useDocumentMock(),
}));

vi.mock("../../context/useIntake", () => ({
  useIntake: () => useIntakeMock(),
}));

vi.mock("../../context/StageContext", () => ({
  useStage: () => useStageMock(),
}));

vi.mock("../../lib/transcriptDownloads", () => ({
  buildFormattedTranscriptText: (...args: unknown[]) => buildFormattedTranscriptTextMock(...args),
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
        structureConfirmed: false,
        keepRawLabels: false,
      },
    });
    useStageMock.mockReturnValue({
      setStage: vi.fn(),
    });
    buildFormattedTranscriptTextMock.mockReset();
    buildFormattedTranscriptTextMock.mockReturnValue("clean transcript");
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

  it("uses the clean transcript export helper for copy/export text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    useIntakeMock.mockReturnValue({
      record: {
        caption: {
          case_name: { value: "Example Case" },
          case_number: { value: "123" },
        },
        certification: {
          certification_date: "2026-06-30",
          certification_statement: "Ready",
          checklist: {
            review_complete: true,
            speaker_mapping_complete: true,
            confidence_review_complete: true,
            exhibits_complete: true,
            ufm_complete: true,
          },
          signature_hash: null,
        },
      },
    });

    const { container, cleanup } = renderExportScreen();
    const copyButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Copy Transcript")
    );

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(buildFormattedTranscriptTextMock).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith("clean transcript");
    cleanup();
  });

  it("blocks transcript copying until certification is persisted", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    useIntakeMock.mockReturnValue({
      record: {
        caption: { case_name: { value: "Example Case" }, case_number: { value: "123" } },
        certification: {
          certification_date: null,
          certification_statement: "Ready",
          checklist: {
            review_complete: true,
            speaker_mapping_complete: true,
            confidence_review_complete: true,
            exhibits_complete: true,
            ufm_complete: true,
          },
          signature_hash: null,
        },
      },
    });

    const { container, cleanup } = renderExportScreen();
    const copyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Copy Transcript"));

    expect(copyButton?.hasAttribute("disabled")).toBe(true);
    expect(writeText).not.toHaveBeenCalled();
    cleanup();
  });
  it("keeps export gated until a ready transcript is explicitly certified", () => {
    useIntakeMock.mockReturnValue({
      record: {
        caption: { case_name: { value: "Example Case" }, case_number: { value: "123" } },
        certification: {
          certification_date: null,
          certification_statement: "Ready",
          checklist: {
            review_complete: true,
            speaker_mapping_complete: true,
            confidence_review_complete: true,
            exhibits_complete: true,
            ufm_complete: true,
          },
          signature_hash: null,
        },
      },
    });

    const createObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });

    const { container, cleanup } = renderExportScreen();
    const buttons = Array.from(container.querySelectorAll("button"));
    const exportTxtButton = buttons.find((button) => button.textContent?.includes("Export TXT"));
    const exportPackageButton = buttons.find((button) => button.textContent?.includes("Export Package"));

    expect(exportTxtButton?.hasAttribute("disabled")).toBe(true);
    expect(exportPackageButton?.hasAttribute("disabled")).toBe(true);

    exportTxtButton?.removeAttribute("disabled");
    exportPackageButton?.removeAttribute("disabled");
    act(() => {
      exportTxtButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      exportPackageButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(createObjectURL).not.toHaveBeenCalled();
    cleanup();
  });

  it("enables formatter exports only for persisted certification", () => {
    useIntakeMock.mockReturnValue({
      record: {
        caption: { case_name: { value: "Example Case" }, case_number: { value: "123" } },
        certification: {
          certification_date: "2026-07-22",
          certification_statement: "Certified synthetic transcript",
          checklist: {
            review_complete: true,
            speaker_mapping_complete: true,
            confidence_review_complete: true,
            exhibits_complete: true,
            ufm_complete: true,
          },
          signature_hash: null,
        },
      },
    });

    const { container, cleanup } = renderExportScreen();
    const buttons = Array.from(container.querySelectorAll("button"));
    const docxButton = buttons.find((button) => button.textContent?.includes("Export DOCX"));
    const pdfButton = buttons.find((button) => button.textContent?.includes("Export PDF"));

    expect(container.textContent).toContain("Formatter Service Export");
    expect(docxButton?.hasAttribute("disabled")).toBe(false);
    expect(pdfButton?.hasAttribute("disabled")).toBe(false);
    cleanup();
  });
});
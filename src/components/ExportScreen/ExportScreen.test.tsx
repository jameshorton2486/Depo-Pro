// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExportScreen } from "./ExportScreen";

const useDocumentMock = vi.fn();
const useIntakeMock = vi.fn();
const useStageMock = vi.fn();
const buildFormattedTranscriptTextMock = vi.fn();
const downloadBlobMock = vi.fn();
const downloadWordTranscriptMock = vi.fn();
const openPrintPreviewMock = vi.fn();

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
  downloadBlob: (...args: unknown[]) => downloadBlobMock(...args),
  downloadWordTranscript: (...args: unknown[]) => downloadWordTranscriptMock(...args),
  openPrintPreview: (...args: unknown[]) => openPrintPreviewMock(...args),
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
        inclusionPages: null,
      },
    });
    useStageMock.mockReturnValue({
      setStage: vi.fn(),
    });
    buildFormattedTranscriptTextMock.mockReset();
    buildFormattedTranscriptTextMock.mockReturnValue("clean transcript");
    downloadBlobMock.mockReset();
    downloadWordTranscriptMock.mockReset();
    openPrintPreviewMock.mockReset();
    downloadBlobMock.mockReturnValue({ name: "artifact.txt", type: "text/plain", size: 10 });
    downloadWordTranscriptMock.mockReturnValue({ name: "artifact.doc", type: "application/msword", size: 100 });
    openPrintPreviewMock.mockReturnValue({ name: "artifact.pdf", type: "application/pdf (browser print)", size: 200 });
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

  it("runs the Word and PDF export helpers once certification is complete", async () => {
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
    const buttons = Array.from(container.querySelectorAll("button"));
    const wordButton = buttons.find((button) => button.textContent?.includes("Export Word"));
    const pdfButton = buttons.find((button) => button.textContent?.includes("Print / Save PDF"));

    await act(async () => {
      wordButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      pdfButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Word / PDF Export");
    expect(downloadWordTranscriptMock).toHaveBeenCalledWith(
      "job_123-transcript.doc",
      "Example Case",
      "clean transcript",
    );
    expect(openPrintPreviewMock).toHaveBeenCalledWith("Example Case", "clean transcript");
    cleanup();
  });

  it("passes persisted inclusion pages into transcript export formatting", () => {
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
        structureConfirmed: true,
        keepRawLabels: false,
        inclusionPages: {
          caption: "Example Case",
          appearances: [],
        },
      },
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

    const { cleanup } = renderExportScreen();
    expect(buildFormattedTranscriptTextMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        inclusionPages: {
          caption: "Example Case",
          appearances: [],
        },
      }),
    );
    cleanup();
  });
});

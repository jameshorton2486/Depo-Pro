// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExportScreen } from "./ExportScreen";

const useDocumentMock = vi.fn();
const useIntakeMock = vi.fn();
const useStageMock = vi.fn();
const buildFormattedTranscriptTextMock = vi.fn();
const exportTransportMocks = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  exportAdapterTransport: exportTransportMocks,
}));
vi.mock("../../lib/export/exportAdapter", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/export/exportAdapter")>();
  return {
    ...original,
    buildCanonicalExportRenderModel: () => ({
      transcriptId: "job_123",
      geometry: {
        format_box_width_inches: 6.5,
        left_margin_inches: 1.25,
        right_margin_inches: 0.75,
        line_spacing_points: 28,
        lines_per_page: 25,
      },
      lines: [{ content: "Q. Synthetic?", geometry: { role: "qa" } }],
      entityRegistryEntryCount: 0,
    }),
  };
});
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

function certifiedFixture() {
  return {
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
  };
}
describe("ExportScreen", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useDocumentMock.mockReset();
    useIntakeMock.mockReset();
    useStageMock.mockReset();
    exportTransportMocks.create.mockReset();
    exportTransportMocks.get.mockReset();
    exportTransportMocks.cancel.mockReset();

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
  it("disables formatter exports while the create request is pending", async () => {
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
    const completed = {
      jobId: "export-completed",
      transcriptId: "job_123",
      status: "COMPLETED" as const,
      artifacts: [],
      error: null,
    };
    let resolveCreate: ((job: typeof completed) => void) | null = null;
    exportTransportMocks.create.mockReturnValue(new Promise((resolve) => {
      resolveCreate = resolve;
    }));

    const { container, cleanup } = renderExportScreen();
    const docxButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Export DOCX"));
    if (!docxButton) throw new Error("expected DOCX export button");

    await act(async () => {
      docxButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(docxButton.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      docxButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(exportTransportMocks.create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate?.(completed);
      await Promise.resolve();
    });
    cleanup();
  });
  it("continues polling when queued cancellation fails", async () => {
    vi.useFakeTimers();
    useIntakeMock.mockReturnValue({
      record: {
        caption: { case_name: { value: "Example Case" }, case_number: { value: "123" } },
        certification: certifiedFixture(),
      },
    });
    const queued = { jobId: "export-queued", transcriptId: "job_123", status: "QUEUED" as const, artifacts: [], error: null };
    const completed = { ...queued, status: "COMPLETED" as const, artifacts: [], error: null };
    exportTransportMocks.create.mockResolvedValue(queued);
    exportTransportMocks.cancel.mockRejectedValue(new Error("export is already processing"));
    exportTransportMocks.get.mockResolvedValue(completed);

    const { container, cleanup } = renderExportScreen();
    const exportButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Export DOCX"));
    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const cancelButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Cancel Export"));
    await act(async () => {
      cancelButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(container.textContent).toContain("export is already processing");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(exportTransportMocks.get).toHaveBeenCalledWith("export-queued", "job_123");
    expect(container.textContent).toContain("Export completed");
    cleanup();
    vi.useRealTimers();
  });

  it("clears stale completed artifacts when a new formatter create fails", async () => {
    useIntakeMock.mockReturnValue({
      record: {
        caption: { case_name: { value: "Example Case" }, case_number: { value: "123" } },
        certification: certifiedFixture(),
      },
    });
    const completed = {
      jobId: "export-completed",
      transcriptId: "job_123",
      status: "COMPLETED" as const,
      artifacts: [{ format: "DOCX" as const, downloadUrl: "https://example.invalid/docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 12 }],
      error: null,
    };
    exportTransportMocks.create
      .mockResolvedValueOnce(completed)
      .mockRejectedValueOnce(new Error("formatter unavailable"));

    const { container, cleanup } = renderExportScreen();
    const exportButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Export DOCX"));
    if (!exportButton) throw new Error("expected DOCX export button");
    await act(async () => {
      exportButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(container.querySelectorAll("a")).toHaveLength(1);

    await act(async () => {
      exportButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(container.textContent).toContain("formatter unavailable");
    expect(container.querySelectorAll("a")).toHaveLength(0);
    cleanup();
  });
  it("re-enables formatter exports after polling fails", async () => {
    vi.useFakeTimers();
    useIntakeMock.mockReturnValue({
      record: {
        caption: { case_name: { value: "Example Case" }, case_number: { value: "123" } },
        certification: certifiedFixture(),
      },
    });
    const queued = { jobId: "export-queued", transcriptId: "job_123", status: "QUEUED" as const, artifacts: [], error: null };
    exportTransportMocks.create.mockResolvedValue(queued);
    exportTransportMocks.get.mockRejectedValue(new Error("network unavailable"));

    const { container, cleanup } = renderExportScreen();
    const exportButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Export DOCX"));
    if (!exportButton) throw new Error("expected DOCX export button");
    await act(async () => {
      exportButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(exportButton.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(container.textContent).toContain("network unavailable");
    expect(exportButton.hasAttribute("disabled")).toBe(false);

    await act(async () => {
      exportButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(exportTransportMocks.create).toHaveBeenCalledTimes(2);
    cleanup();
    vi.useRealTimers();
  });
  it("aborts formatter polling when the export screen unmounts", async () => {
    vi.useFakeTimers();
    useIntakeMock.mockReturnValue({
      record: {
        caption: { case_name: { value: "Example Case" }, case_number: { value: "123" } },
        certification: certifiedFixture(),
      },
    });
    const queued = { jobId: "export-queued", transcriptId: "job_123", status: "QUEUED" as const, artifacts: [], error: null };
    exportTransportMocks.create.mockResolvedValue(queued);

    const { container, cleanup } = renderExportScreen();
    const exportButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Export DOCX"));
    await act(async () => {
      exportButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    cleanup();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(exportTransportMocks.get).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

});
// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentUploadPanel } from "./DocumentUploadPanel";
import { emptyCaseRecord } from "../../types/case";

const fileServiceMocks = vi.hoisted(() => ({
  downloadCaseFile: vi.fn(),
  getSignedUrl: vi.fn(),
  reorderCaseAudio: vi.fn(),
  removeCaseAudio: vi.fn(),
  removeCaseFile: vi.fn(),
  uploadCaseAudio: vi.fn(),
  uploadCaseFile: vi.fn(),
}));

const intakeMock = vi.fn();
const conflictMock = vi.fn();
const keytermsMock = vi.fn();

vi.mock("../../api/fileService", () => fileServiceMocks);
vi.mock("../../context/useIntake", () => ({
  useIntake: () => intakeMock(),
}));
vi.mock("../conflict/conflictStore", () => ({
  useConflict: () => conflictMock(),
}));
vi.mock("../DeepgramKeytermManager/keytermStore", () => ({
  useKeyterms: () => keytermsMock(),
}));

function renderPanel() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const record = emptyCaseRecord("case_upload_cancel", "2026-07-24T00:00:00.000Z");

  intakeMock.mockReturnValue({
    record,
    applyExtraction: vi.fn(),
    setAudio: vi.fn(),
    setKeyterms: vi.fn(),
  });
  conflictMock.mockReturnValue({
    state: { history: {} },
    detectConflict: vi.fn(),
    recordExtraction: vi.fn(),
  });
  keytermsMock.mockReturnValue({
    state: { terms: [] },
    load: vi.fn(),
  });

  act(() => {
    root.render(
      <DocumentUploadPanel
        files={[]}
        audio={[]}
        persisted
        saveCaseRecord={vi.fn()}
        onAudioUploaded={vi.fn()}
        onAudioReordered={vi.fn()}
        onAudioRemoved={vi.fn()}
        onFileUploaded={vi.fn()}
        onFileRemoved={vi.fn()}
        onRevealExtractedFields={vi.fn()}
      />,
    );
  });

  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("DocumentUploadPanel audio upload cancellation", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("aborts an in-flight audio upload from the upload card", async () => {
    let capturedSignal: AbortSignal | undefined;
    fileServiceMocks.uploadCaseAudio.mockImplementation((_caseId: string, _file: File, options?: { signal?: AbortSignal }) => {
      capturedSignal = options?.signal;
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => {
          const error = new Error("Case audio upload cancelled.");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const { container, cleanup } = renderPanel();
    const audioInput = container.querySelector('input[accept="audio/*,video/*"]');
    expect(audioInput).toBeInstanceOf(HTMLInputElement);

    await act(async () => {
      Object.defineProperty(audioInput, "files", {
        configurable: true,
        value: [new File(["audio"], "source.m4a", { type: "audio/mp4" })],
      });
      audioInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const cancelButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Cancel upload");
    expect(cancelButton).toBeDefined();

    await act(async () => {
      cancelButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(capturedSignal?.aborted).toBe(true);
    expect(container.textContent).not.toContain("Case audio upload cancelled.");
    cleanup();
  });
});

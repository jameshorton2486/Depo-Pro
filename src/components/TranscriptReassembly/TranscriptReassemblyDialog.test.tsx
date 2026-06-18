import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  workspaceApi: {
    getTranscriptReassemblyPreview: vi.fn(),
    applyTranscriptReassembly: vi.fn(),
    restoreTranscriptReassembly: vi.fn(),
  },
  useDocument: vi.fn(),
}));

vi.mock("../../api/workspaceService", () => ({
  workspaceApi: mocks.workspaceApi,
}));

vi.mock("../../context/DocumentContext", () => ({
  useDocument: mocks.useDocument,
}));

import {
  buildRefineOverwriteMessage,
  TranscriptReassemblyDialog,
} from "./TranscriptReassemblyDialog";

function buildPreview(hasHumanWork: boolean) {
  return {
    currentAssemblyVersion: "persisted",
    latestAssemblyVersion: "latest",
    canApply: true,
    blockedReasons: [],
    currentMetrics: { mixedCanonicalUtterances: 4, utteranceCount: 20, speakerCount: 3, wordCount: 100 },
    candidateMetrics: { mixedCanonicalUtterances: 0, utteranceCount: 18, speakerCount: 3, wordCount: 100 },
    impacts: {
      reviewStateImpact: "none",
      suggestionsImpact: "none",
      auditImpact: "append-rebuild-event",
      certificationImpact: "none",
      exportImpact: "none",
    },
    previewToken: "preview-token",
    humanWorkSummary: {
      hasHumanWork,
      signals: hasHumanWork ? ["edited-words", "review-progress"] : [],
    },
  } as const;
}

describe("TranscriptReassemblyDialog", () => {
  let container: HTMLDivElement;
  let root: Root;
  let confirmMock: ReturnType<typeof vi.spyOn>;
  const saveNow = vi.fn(async () => undefined);
  const loadDocument = vi.fn(async () => undefined);

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    confirmMock = vi.spyOn(window, "confirm");
    saveNow.mockClear();
    loadDocument.mockClear();
    vi.clearAllMocks();
    mocks.useDocument.mockReturnValue({
      state: {
        currentTranscriptId: "tr_001",
        dirty: false,
        loading: false,
        saving: false,
        jobUpdatedAt: "2026-06-17T18:49:00.000Z",
      },
      saveNow,
      loadDocument,
    });
  });

  afterEach(() => {
    confirmMock.mockRestore();
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("requires explicit confirmation before applying when human work exists", async () => {
    confirmMock.mockReturnValue(false);
    mocks.workspaceApi.getTranscriptReassemblyPreview.mockResolvedValue(buildPreview(true));

    await act(async () => {
      root.render(<TranscriptReassemblyDialog />);
    });

    const [refineButton] = Array.from(container.querySelectorAll("button"));
    await act(async () => {
      refineButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const applyButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Apply Refinements");
    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("may overwrite existing human corrections or review work"));
    expect(mocks.workspaceApi.applyTranscriptReassembly).not.toHaveBeenCalled();
  });

  it("allows apply without confirmation when no human work exists and exposes one-step undo", async () => {
    confirmMock.mockReturnValue(true);
    mocks.workspaceApi.getTranscriptReassemblyPreview.mockResolvedValue(buildPreview(false));
    mocks.workspaceApi.applyTranscriptReassembly.mockResolvedValue({
      ok: true,
      updatedAt: "2026-06-17T18:50:00.000Z",
      currentMetrics: buildPreview(false).currentMetrics,
      candidateMetrics: buildPreview(false).candidateMetrics,
      undoSnapshot: {
        transcriptId: "tr_001",
        durationSeconds: 120,
        wordCount: 100,
        utteranceCount: 20,
        speakerCount: 3,
        avgConfidence: "0.9000",
        speakerMapConfirmed: false,
        speakers: [],
        utterances: [],
        words: [],
      },
    });
    mocks.workspaceApi.restoreTranscriptReassembly.mockResolvedValue({
      ok: true,
      updatedAt: "2026-06-17T18:51:00.000Z",
    });

    await act(async () => {
      root.render(<TranscriptReassemblyDialog />);
    });

    const [refineButton] = Array.from(container.querySelectorAll("button"));
    await act(async () => {
      refineButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const applyButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Apply Refinements");
    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(window.confirm).not.toHaveBeenCalled();
    expect(mocks.workspaceApi.applyTranscriptReassembly).toHaveBeenCalledWith("tr_001", "preview-token", {
      lastKnownUpdatedAt: "2026-06-17T18:49:00.000Z",
    });
    expect(loadDocument).toHaveBeenCalledTimes(1);

    const undoButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Undo Last Refine");
    expect(undoButton).toBeTruthy();

    await act(async () => {
      undoButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mocks.workspaceApi.restoreTranscriptReassembly).toHaveBeenCalledWith(
      "tr_001",
      expect.objectContaining({ transcriptId: "tr_001" }),
      { lastKnownUpdatedAt: "2026-06-17T18:49:00.000Z" },
    );
    expect(loadDocument).toHaveBeenCalledTimes(2);
  });
});

describe("buildRefineOverwriteMessage", () => {
  it("lists the detected human-work signals in the warning", () => {
    expect(buildRefineOverwriteMessage({
      hasHumanWork: true,
      signals: ["edited-words", "speaker-resolution"],
    })).toContain("Detected work: edited transcript text, speaker reassignment work.");
  });
});

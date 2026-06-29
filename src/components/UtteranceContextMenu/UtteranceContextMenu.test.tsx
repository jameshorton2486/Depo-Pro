import { act, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UtteranceContextMenu } from "./UtteranceContextMenu";

const saveSpeakersMock = vi.fn();
const updateSpeakersMock = vi.fn();
const setTranscriptVersionMock = vi.fn();
const setSpeakerMapConfirmedMock = vi.fn();

const documentState = {
  document: {
    job_id: "tr_123",
    speakers: [
      { speaker_id: "spk_001", display_name: "MR. CURRENT", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk_002", display_name: "MS. NEXT", deepgram_speaker: 1, role: "WITNESS" },
      { speaker_id: "spk_003", display_name: "THE REPORTER", deepgram_speaker: 2, role: "REPORTER" },
    ],
  },
  jobUpdatedAt: "2026-06-29T16:00:00.000Z",
};

vi.mock("../../context/DocumentContext", () => ({
  useDocument: () => ({
    state: documentState,
    updateSpeakers: updateSpeakersMock,
    setTranscriptVersion: setTranscriptVersionMock,
    setSpeakerMapConfirmed: setSpeakerMapConfirmedMock,
  }),
}));

vi.mock("../../api/workspaceService", () => ({
  workspaceApi: {
    saveSpeakers: saveSpeakersMock,
  },
}));

function renderMenu(props?: Partial<ComponentProps<typeof UtteranceContextMenu>>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onClose = props?.onClose ?? vi.fn();

  act(() => {
    root.render(
      <UtteranceContextMenu
        x={40}
        y={60}
        utteranceId="utt_123"
        currentSpeakerId="spk_001"
        onClose={onClose}
        {...props}
      />,
    );
  });

  return {
    container,
    root,
    onClose,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("UtteranceContextMenu", () => {
  beforeEach(() => {
    saveSpeakersMock.mockReset();
    updateSpeakersMock.mockReset();
    setTranscriptVersionMock.mockReset();
    setSpeakerMapConfirmedMock.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders speaker list excluding current speaker", () => {
    const { container, cleanup } = renderMenu();

    const buttons = Array.from(container.querySelectorAll("button"));
    const labels = buttons.map((button) => button.textContent ?? "");

    expect(labels.some((label) => label.includes("MR. CURRENT"))).toBe(false);
    expect(labels.some((label) => label.includes("MS. NEXT"))).toBe(true);
    expect(labels.some((label) => label.includes("THE REPORTER"))).toBe(true);

    cleanup();
  });

  it("closes on outside click", () => {
    const { onClose, cleanup } = renderMenu();

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
    cleanup();
  });

  it("closes on Escape", () => {
    const { onClose, cleanup } = renderMenu();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
    cleanup();
  });

  it("calls saveSpeakers with correct utterance_speaker_map", async () => {
    saveSpeakersMock.mockResolvedValue({
      updatedAt: "2026-06-29T16:05:00.000Z",
      speakerMapConfirmed: false,
      pipelineState: null,
    });
    const { container, cleanup } = renderMenu();
    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("MS. NEXT"),
    );

    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(saveSpeakersMock).toHaveBeenCalledWith(
      "tr_123",
      expect.objectContaining({
        utterance_speaker_map: [{
          utterance_id: "utt_123",
          speaker_id: "spk_002",
        }],
      }),
      expect.objectContaining({
        lastKnownUpdatedAt: "2026-06-29T16:00:00.000Z",
      }),
    );
    expect(updateSpeakersMock).toHaveBeenCalled();
    cleanup();
  });

  it("shows no other speakers when only one speaker exists", () => {
    documentState.document.speakers = [
      { speaker_id: "spk_001", display_name: "MR. CURRENT", deepgram_speaker: 0, role: "ATTORNEY" },
    ];

    const { container, cleanup } = renderMenu();

    expect(container.textContent).toContain("No other speakers available");

    cleanup();
    documentState.document.speakers = [
      { speaker_id: "spk_001", display_name: "MR. CURRENT", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk_002", display_name: "MS. NEXT", deepgram_speaker: 1, role: "WITNESS" },
      { speaker_id: "spk_003", display_name: "THE REPORTER", deepgram_speaker: 2, role: "REPORTER" },
    ];
  });
});

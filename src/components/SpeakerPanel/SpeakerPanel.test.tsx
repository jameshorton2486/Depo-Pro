// @vitest-environment jsdom
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { Speaker } from "../../api/types";
import { AddParticipantInlineForm } from "./AddParticipantInlineForm";
import {
  addParticipantToSpeakerList,
  getSpeakerClusterBadgeLabel,
  isAISuggestedSpeaker,
  shouldRelabelInEditor,
} from "./SpeakerPanel.helpers";

type ElementWithChildren = ReactElement<{ children?: ReactNode } & Record<string, unknown>>;

function visitElements(node: ReactNode, cb: (element: ElementWithChildren) => void) {
  if (!isValidElement(node)) {
    return;
  }

  const element = node as ElementWithChildren;
  cb(element);

  const children = element.props.children;
  if (Array.isArray(children)) {
    children.forEach((child) => visitElements(child, cb));
    return;
  }

  visitElements(children, cb);
}

function findByTestId(node: ReactNode, testId: string): ElementWithChildren {
  let match: ElementWithChildren | null = null;

  visitElements(node, (element) => {
    if (element.props["data-testid"] === testId) {
      match = element;
    }
  });

  if (!match) {
    throw new Error(`Missing element with data-testid="${testId}"`);
  }

  return match;
}

function maybeFindByTestId(node: ReactNode, testId: string): ElementWithChildren | null {
  try {
    return findByTestId(node, testId);
  } catch {
    return null;
  }
}

function baseSpeakers(): Speaker[] {
  return [
    { speaker_id: "spk_001", display_name: "THE REPORTER", deepgram_speaker: 0, role: "REPORTER" },
    { speaker_id: "spk_002", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
  ];
}

describe("SpeakerPanel", () => {
  it("renders a CUSTOM badge label for synthetic speakers", () => {
    expect(getSpeakerClusterBadgeLabel({
      speaker_id: "spk_custom",
      display_name: "THE VIDEOGRAPHER",
      deepgram_speaker: null,
      role: "OTHER",
    })).toBe("CUSTOM");
  });

  it("renders a numbered SPK badge label for diarized speakers", () => {
    expect(getSpeakerClusterBadgeLabel({
      speaker_id: "spk_001",
      display_name: "Speaker 1",
      deepgram_speaker: 1,
      role: "OTHER",
    })).toBe("SPK 1");
  });

  it("renders the Add button", () => {
    const tree = AddParticipantInlineForm({
      addingParticipant: false,
      newParticipantName: "",
      newParticipantRole: "OTHER",
      addingError: null,
      addingSaving: false,
      onStart: vi.fn(),
      onNameChange: vi.fn(),
      onRoleChange: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(findByTestId(tree, "speaker-panel-add-trigger")).toBeTruthy();
  });

  it("shows the inline form when addingParticipant is true", () => {
    const tree = AddParticipantInlineForm({
      addingParticipant: true,
      newParticipantName: "",
      newParticipantRole: "OTHER",
      addingError: null,
      addingSaving: false,
      onStart: vi.fn(),
      onNameChange: vi.fn(),
      onRoleChange: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(findByTestId(tree, "speaker-panel-add-form")).toBeTruthy();
    expect(findByTestId(tree, "speaker-panel-add-name")).toBeTruthy();
    expect(findByTestId(tree, "speaker-panel-add-role")).toBeTruthy();
  });

  it("hides the inline form when addingParticipant is false", () => {
    const tree = AddParticipantInlineForm({
      addingParticipant: false,
      newParticipantName: "",
      newParticipantRole: "OTHER",
      addingError: null,
      addingSaving: false,
      onStart: vi.fn(),
      onNameChange: vi.fn(),
      onRoleChange: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(maybeFindByTestId(tree, "speaker-panel-add-form")).toBeNull();
  });

  it("shows an error message when one is provided", () => {
    const tree = AddParticipantInlineForm({
      addingParticipant: true,
      newParticipantName: "",
      newParticipantRole: "OTHER",
      addingError: "Name is required.",
      addingSaving: false,
      onStart: vi.fn(),
      onNameChange: vi.fn(),
      onRoleChange: vi.fn(),
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(findByTestId(tree, "speaker-panel-add-error").props.children).toBe("Name is required.");
  });

  it("returns an updated speaker list after a successful synthetic speaker add", async () => {
    const newSpeaker: Speaker = {
      speaker_id: "spk_synthetic_1",
      display_name: "MR. RAMON",
      deepgram_speaker: null,
      role: "ATTORNEY",
    };
    const addSpeaker = vi.fn().mockResolvedValue(newSpeaker);

    const result = await addParticipantToSpeakerList({
      jobId: "job_123",
      displayName: "MR. RAMON",
      role: "ATTORNEY",
      speakers: baseSpeakers(),
      addSpeaker,
    });

    expect(addSpeaker).toHaveBeenCalledWith("job_123", {
      display_name: "MR. RAMON",
      role: "ATTORNEY",
    });
    expect(result[result.length - 1]).toEqual(newSpeaker);
  });

  it("rejects empty participant names before calling the API", async () => {
    const addSpeaker = vi.fn();

    await expect(addParticipantToSpeakerList({
      jobId: "job_123",
      displayName: "   ",
      role: "OTHER",
      speakers: baseSpeakers(),
      addSpeaker,
    })).rejects.toThrow("Name is required.");

    expect(addSpeaker).not.toHaveBeenCalled();
  });

  it("surfaces API errors from participant creation", async () => {
    const addSpeaker = vi.fn().mockRejectedValue(new Error("Failed to create speaker"));

    await expect(addParticipantToSpeakerList({
      jobId: "job_123",
      displayName: "THE VIDEOGRAPHER",
      role: "OTHER",
      speakers: baseSpeakers(),
      addSpeaker,
    })).rejects.toThrow("Failed to create speaker");
  });

  it("identifies speakers with ai_suggested metadata", () => {
    expect(isAISuggestedSpeaker({
      speaker_id: "spk_001",
      display_name: "MR. BENTLEY",
      deepgram_speaker: 1,
      role: "ATTORNEY",
      ai_suggested: true,
    })).toBe(true);

    expect(isAISuggestedSpeaker({
      speaker_id: "spk_002",
      display_name: "THE WITNESS",
      deepgram_speaker: 2,
      role: "WITNESS",
    })).toBe(false);
  });

  it("skips in-place relabeling when the role changes", () => {
    expect(shouldRelabelInEditor("OTHER", "ATTORNEY")).toBe(false);
  });

  it("keeps in-place relabeling for name-only changes", () => {
    expect(shouldRelabelInEditor("ATTORNEY", "ATTORNEY")).toBe(true);
    expect(shouldRelabelInEditor(undefined, undefined)).toBe(true);
  });
});

import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceTranscriptChooser } from "./WorkspaceTranscriptChooser";

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

describe("WorkspaceTranscriptChooser", () => {
  const transcripts = [
    {
      id: "row_1",
      transcript_id: "tr_original",
      case_id: "case_123",
      job_id: "job_1",
      media_url: null,
      duration: null,
      based_on: null,
      deepgram_request_id: null,
      session_id: null,
      source_filename: "etminan.mp3",
      media_kind: "audio" as const,
      status: "completed" as const,
      engine: "deepgram",
      transcription_source: "deepgram" as const,
      sequence_index: 0,
      duration_seconds: 4993.968,
      word_count: 12000,
      utterance_count: 1000,
      speaker_count: 8,
      avg_confidence: null,
      raw_storage_path: null,
      raw_checksum: null,
      last_error: null,
      speaker_map_confirmed: false,
      created_at: "2026-06-22T10:00:00.000Z",
      updated_at: "2026-06-22T10:05:00.000Z",
    },
    {
      id: "row_2",
      transcript_id: "tr_rerun",
      case_id: "case_123",
      job_id: "job_2",
      media_url: null,
      duration: null,
      based_on: null,
      deepgram_request_id: null,
      session_id: null,
      source_filename: "etminan.mp3",
      media_kind: "audio" as const,
      status: "completed" as const,
      engine: "deepgram",
      transcription_source: "deepgram" as const,
      sequence_index: 0,
      duration_seconds: 4993.968,
      word_count: 11900,
      utterance_count: 995,
      speaker_count: 8,
      avg_confidence: null,
      raw_storage_path: null,
      raw_checksum: null,
      last_error: null,
      speaker_map_confirmed: false,
      created_at: "2026-06-23T10:00:00.000Z",
      updated_at: "2026-06-23T10:05:00.000Z",
    },
  ];

  it("renders transcript choices and allows selecting one or returning to creation", () => {
    const onOpenTranscript = vi.fn();
    const onOpenTranscriptCreation = vi.fn();

    const tree = WorkspaceTranscriptChooser({
      transcripts,
      onOpenTranscript,
      onOpenTranscriptCreation,
    });

    expect(isValidElement(tree)).toBe(true);
    expect(findByTestId(tree, "workspace-transcript-chooser")).toBeTruthy();

    (findByTestId(tree, "workspace-transcript-option-tr_rerun").props.onClick as (() => void) | undefined)?.();
    (findByTestId(tree, "workspace-transcript-go-to-creation").props.onClick as (() => void) | undefined)?.();

    expect(onOpenTranscript).toHaveBeenCalledWith("tr_rerun");
    expect(onOpenTranscriptCreation).toHaveBeenCalledTimes(1);
  });
});

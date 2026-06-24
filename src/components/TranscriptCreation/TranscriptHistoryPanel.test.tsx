import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TranscriptHistoryPanel } from "./TranscriptHistoryPanel";

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

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!isValidElement(node)) {
    return "";
  }

  const element = node as ElementWithChildren;
  const children = element.props.children;
  if (Array.isArray(children)) {
    return children.map((child) => collectText(child)).join(" ");
  }

  return collectText(children);
}

describe("TranscriptHistoryPanel", () => {
  const transcripts = [
    {
      id: "job_2",
      case_id: "case_123",
      transcript_id: "tr_newer",
      owner_user_id: "user_1",
      status: "complete" as const,
      callback_token_hash: "hash",
      source_audio_id: "audio_1",
      source_index: 0,
      request_path: null,
      response_path: null,
      error: null,
      created_at: "2026-06-23T10:00:00.000Z",
      updated_at: "2026-06-23T10:05:00.000Z",
    },
    {
      id: "job_1",
      case_id: "case_123",
      transcript_id: "tr_original",
      owner_user_id: "user_1",
      status: "complete" as const,
      callback_token_hash: "hash",
      source_audio_id: "audio_1",
      source_index: 0,
      request_path: null,
      response_path: null,
      error: null,
      created_at: "2026-06-22T10:00:00.000Z",
      updated_at: "2026-06-22T10:05:00.000Z",
    },
  ];

  it("renders the transcript already exists summary and transcript options", () => {
    const tree = TranscriptHistoryPanel({
      audioFilename: "etminan.mp3",
      transcripts,
      selectedTranscriptId: "tr_original",
      onSelectTranscript: vi.fn(),
      onOpenWorkspace: vi.fn(),
      onRetranscribe: vi.fn(),
    });

    expect(isValidElement(tree)).toBe(true);
    expect(findByTestId(tree, "transcript-history-panel")).toBeTruthy();
    expect(findByTestId(tree, "transcript-history-summary")).toBeTruthy();
    expect(findByTestId(tree, "transcript-history-option-tr_original")).toBeTruthy();
    expect(findByTestId(tree, "transcript-history-option-tr_newer")).toBeTruthy();
    expect(collectText(tree)).toContain("Original");
    expect(collectText(tree)).toContain("Retranscription 1");
    expect(collectText(tree)).toContain("Current");
    expect(collectText(tree)).toContain("Complete");
  });

  it("fires select, open workspace, and retranscribe handlers", () => {
    const onSelectTranscript = vi.fn();
    const onOpenWorkspace = vi.fn();
    const onRetranscribe = vi.fn();

    const tree = TranscriptHistoryPanel({
      audioFilename: "etminan.mp3",
      transcripts,
      selectedTranscriptId: "tr_original",
      onSelectTranscript,
      onOpenWorkspace,
      onRetranscribe,
    });

    (findByTestId(tree, "transcript-history-option-tr_newer").props.onClick as (() => void) | undefined)?.();
    (findByTestId(tree, "transcript-history-open-workspace").props.onClick as (() => void) | undefined)?.();
    (findByTestId(tree, "transcript-history-retranscribe").props.onClick as (() => void) | undefined)?.();

    expect(onSelectTranscript).toHaveBeenCalledWith("tr_newer");
    expect(onOpenWorkspace).toHaveBeenCalledTimes(1);
    expect(onRetranscribe).toHaveBeenCalledTimes(1);
  });

  it("falls back to the oldest transcript as original even when input order is newest first", () => {
    const tree = TranscriptHistoryPanel({
      audioFilename: "etminan.mp3",
      transcripts,
      selectedTranscriptId: "tr_newer",
      onSelectTranscript: vi.fn(),
      onOpenWorkspace: vi.fn(),
      onRetranscribe: vi.fn(),
    });

    const originalOption = findByTestId(tree, "transcript-history-option-tr_original");
    const rerunOption = findByTestId(tree, "transcript-history-option-tr_newer");

    expect(collectText(originalOption)).toContain("Original");
    expect(collectText(rerunOption)).toContain("Retranscription 1");
  });
});

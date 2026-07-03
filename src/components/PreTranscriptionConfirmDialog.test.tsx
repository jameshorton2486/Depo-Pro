// @vitest-environment jsdom
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PreTranscriptionConfirmDialog } from "./PreTranscriptionConfirmDialog";

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

describe("PreTranscriptionConfirmDialog", () => {
  it("renders the case, audio, and keyterm blocks from props", () => {
    const tree = PreTranscriptionConfirmDialog({
      open: true,
      caseIdentity: {
        caseId: "case_123",
        caseName: "Garza v. Home Depot",
        caseStyle: "Delia Garza v. Home Depot USA, Inc.",
        witnessName: "Heath Thomas",
      },
      audio: {
        filename: "hearing.mp3",
        durationSeconds: 83.2,
        mimeType: "audio/mpeg",
      },
      keyterms: {
        count: 3,
        estimatedTokens: 12,
        sample: ["Heath Thomas", "Home Depot", "Shawn Herber"],
      },
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(isValidElement(tree)).toBe(true);
    expect(findByTestId(tree, "pre-transcription-confirm-case")).toBeTruthy();
    expect(findByTestId(tree, "pre-transcription-confirm-audio")).toBeTruthy();
    expect(findByTestId(tree, "pre-transcription-confirm-keyterms")).toBeTruthy();
  });

  it("disables confirm when audio is missing", () => {
    const tree = PreTranscriptionConfirmDialog({
      open: true,
      caseIdentity: {
        caseId: "case_123",
        caseName: null,
        caseStyle: null,
        witnessName: null,
      },
      audio: null,
      keyterms: {
        count: 0,
        estimatedTokens: 0,
        sample: [],
      },
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    const confirmButton = findByTestId(tree, "pre-transcription-confirm-start");
    expect(confirmButton.props.disabled).toBe(true);
  });

  it("fires confirm and cancel handlers from the buttons", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const tree = PreTranscriptionConfirmDialog({
      open: true,
      caseIdentity: {
        caseId: "case_123",
        caseName: "Garza v. Home Depot",
        caseStyle: "Garza",
        witnessName: "Heath Thomas",
      },
      audio: {
        filename: "hearing.mp3",
        durationSeconds: 83.2,
        mimeType: "audio/mpeg",
      },
      keyterms: {
        count: 2,
        estimatedTokens: 8,
        sample: ["Garza", "Home Depot"],
      },
      onConfirm,
      onCancel,
    });

    const cancelButton = findByTestId(tree, "pre-transcription-confirm-cancel");
    const confirmButton = findByTestId(tree, "pre-transcription-confirm-start");

    (cancelButton.props.onClick as (() => void) | undefined)?.();
    (confirmButton.props.onClick as (() => void) | undefined)?.();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

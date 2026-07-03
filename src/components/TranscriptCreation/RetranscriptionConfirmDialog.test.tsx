// @vitest-environment jsdom
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { RetranscriptionConfirmDialog } from "./RetranscriptionConfirmDialog";

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

describe("RetranscriptionConfirmDialog", () => {
  it("renders nothing when closed", () => {
    expect(RetranscriptionConfirmDialog({
      open: false,
      transcriptId: "tr_original",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    })).toBeNull();
  });

  it("renders source transcript and fires cancel/confirm handlers", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const tree = RetranscriptionConfirmDialog({
      open: true,
      transcriptId: "tr_original",
      onCancel,
      onConfirm,
    });

    expect(isValidElement(tree)).toBe(true);
    expect(findByTestId(tree, "retranscription-confirm-dialog")).toBeTruthy();
    expect(findByTestId(tree, "retranscription-confirm-source")).toBeTruthy();

    (findByTestId(tree, "retranscription-confirm-cancel").props.onClick as (() => void) | undefined)?.();
    (findByTestId(tree, "retranscription-confirm-start").props.onClick as (() => void) | undefined)?.();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

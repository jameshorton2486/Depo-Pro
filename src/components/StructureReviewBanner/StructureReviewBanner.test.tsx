// @vitest-environment jsdom
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { StructureReviewBanner } from "./StructureReviewBanner";

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
  let text = "";

  visitElements(node, (element) => {
    const children = element.props.children;
    if (typeof children === "string") {
      text += children;
    }
  });

  return text;
}

describe("StructureReviewBanner", () => {
  it("renders the banner copy and fires confirm and dismiss handlers", () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();

    const tree = StructureReviewBanner({ onConfirm, onDismiss });

    expect(isValidElement(tree)).toBe(true);
    expect(findByTestId(tree, "structure-review-banner")).toBeTruthy();
    expect(collectText(tree)).toContain("Depo-Pro has inferred speaker roles and Q./A. structure");

    (findByTestId(tree, "structure-review-confirm").props.onClick as (() => void) | undefined)?.();
    (findByTestId(tree, "structure-review-dismiss").props.onClick as (() => void) | undefined)?.();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

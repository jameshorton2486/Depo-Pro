import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { AIReviewBanner } from "./AIReviewBanner";

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

describe("AIReviewBanner", () => {
  it("returns null when no pending or auto-applied suggestions exist", () => {
    expect(AIReviewBanner({ pendingCount: 0, autoAppliedCount: 0 })).toBeNull();
  });

  it("renders suggestion counts when review results are available", () => {
    const tree = AIReviewBanner({ pendingCount: 3, autoAppliedCount: 2 });

    expect(isValidElement(tree)).toBe(true);
    expect(collectText(tree)).toContain("3 suggestions need review. 2 auto-applied.");
  });
});

import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { CaseScopedErrorBoundary } from "./CaseScopedErrorBoundary";

describe("CaseScopedErrorBoundary", () => {
  it("renders the fallback card after a child render failure", () => {
    const error = new Error("boom");
    const onBackToCases = vi.fn();
    const boundary = new CaseScopedErrorBoundary({
      children: null,
      onBackToCases,
    });

    boundary.state = CaseScopedErrorBoundary.getDerivedStateFromError(error);

    const rendered = boundary.render();

    expect(isValidElement(rendered)).toBe(true);
    if (!isValidElement(rendered)) {
      throw new Error("Boundary did not render a React element fallback.");
    }

    const props = rendered.props as { ["data-testid"]?: string };
    expect(props["data-testid"]).toBe("case-scoped-error-card");
  });
});

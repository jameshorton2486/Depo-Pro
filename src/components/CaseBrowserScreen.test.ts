import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CaseBrowserSummary } from "../api/caseService";
import { CaseCard } from "./CaseBrowserScreen";

function buildSummary(overrides: Partial<CaseBrowserSummary> = {}): CaseBrowserSummary {
  return {
    case_id: "case_123",
    stage: "workspace",
    updated_at: "2026-06-05T18:10:00.000Z",
    caseName: "Example Case",
    caseStyle: "Example v. Example",
    caseNumber: "123",
    witnessName: "Jane Doe",
    archived: false,
    hasAudio: true,
    hasTranscript: true,
    exhibitCount: 1,
    certified: false,
    speakerMapConfirmed: true,
    ...overrides,
  };
}

describe("CaseCard speaker-map badge", () => {
  it("renders the unconfirmed badge when the row is unconfirmed", () => {
    const html = renderToStaticMarkup(createElement(CaseCard, {
      summary: buildSummary({ speakerMapConfirmed: false }),
      onOpen: vi.fn(async () => undefined),
      onDelete: vi.fn(async () => undefined),
      deleting: false,
    }));

    expect(html).toContain("Speakers: Unconfirmed");
  });

  it("does not render the badge when the row is confirmed", () => {
    const html = renderToStaticMarkup(createElement(CaseCard, {
      summary: buildSummary({ speakerMapConfirmed: true }),
      onOpen: vi.fn(async () => undefined),
      onDelete: vi.fn(async () => undefined),
      deleting: false,
    }));

    expect(html).not.toContain("Speakers: Unconfirmed");
  });

  it("renders a delete control for each case card", () => {
    const html = renderToStaticMarkup(createElement(CaseCard, {
      summary: buildSummary(),
      onOpen: vi.fn(async () => undefined),
      onDelete: vi.fn(async () => undefined),
      deleting: false,
    }));

    expect(html).toContain("Delete case case_123");
  });
});

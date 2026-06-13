import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SpeakerMapStatusBadge } from "./SpeakerMapStatusBadge";

describe("SpeakerMapStatusBadge", () => {
  it("renders an unconfirmed badge when the speaker map is not confirmed", () => {
    const html = renderToStaticMarkup(createElement(SpeakerMapStatusBadge, { confirmed: false }));

    expect(html).toContain("speaker-map-status-badge");
    expect(html).toContain("Speakers: Unconfirmed");
  });

  it("renders nothing when the speaker map is confirmed", () => {
    const html = renderToStaticMarkup(createElement(SpeakerMapStatusBadge, { confirmed: true }));

    expect(html).toBe("");
  });
});

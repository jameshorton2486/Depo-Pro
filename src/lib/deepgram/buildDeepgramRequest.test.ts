import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildDeepgramRequest } from "./buildDeepgramRequest";

describe("buildDeepgramRequest", () => {
  it("builds the §3.1 preview envelope and wire query from one source of truth", () => {
    // Snapshot of the §3.1 request contract.
    const request = buildDeepgramRequest({
      caseId: "case_123",
      computedAt: "2026-06-05T22:30:00.000Z",
      keyterms: [
        {
          term: "  Raul   Garza ",
          boost: 0.9,
          category: "Person",
          source: "nod_parser",
          selected: true,
        },
        {
          term: "Goldman & Peterson",
          boost: 0.7,
          category: "Law Firm",
          source: "nod_parser",
          selected: true,
        },
      ],
    });

    expect(request.envelope).toEqual({
      case_id: "case_123",
      computed_at: "2026-06-05T22:30:00.000Z",
      deepgram_request: {
        model: "nova-3",
        language: "en-US",
        punctuate: "true",
        paragraphs: "true",
        diarize: "true",
        filler_words: "true",
        utterances: "true",
        smart_format: "true",
        utt_split: "1.2",
        mip_opt_out: "true",
      },
      keyterms: [
        { term: "Raul Garza", boost: 9, category: "Person", source: "nod_parser" },
        { term: "Goldman & Peterson", boost: 7, category: "Law Firm", source: "nod_parser" },
      ],
      keyterms_count: 2,
      estimated_token_usage: 7,
      estimated_token_cap: 500,
      keyterms_note: null,
    });
    expect(request.wireUrl).toContain("model=nova-3");
    expect(request.wireUrl).toContain("keyterm=Raul+Garza");
  });

  it("keeps boost/category/source off the wire query", () => {
    const request = buildDeepgramRequest({
      caseId: "case_456",
      keyterms: [
        {
          term: "Raul Garza",
          boost: 0.9,
          category: "Person",
          source: "nod_parser",
          selected: true,
        },
      ],
    });

    expect(request.wireQueryString).toContain("keyterm=Raul+Garza");
    expect(request.wireQueryString).not.toContain("boost");
    expect(request.wireQueryString).not.toContain("category");
    expect(request.wireQueryString).not.toContain("source");
    expect(request.wireQueryString).toContain("language=en-US");
    expect(request.wireQueryString).toContain("diarize=true");
    expect(request.wireQueryString).not.toContain("diarize_model");
    expect(request.wireQueryString).toContain("mip_opt_out=true");
    expect(request.wireQueryString).toContain("utt_split=1.2");
  });

  it("caps the wire request at 100 terms and reports the cut", () => {
    const request = buildDeepgramRequest({
      caseId: "case_cap",
      keyterms: Array.from({ length: 105 }, (_, index) => ({
        term: `Term ${index}`,
        boost: 0.5,
        category: "Other",
        source: "manual",
        selected: true,
      })),
    });

    expect(request.envelope.keyterms_count).toBe(105);
    expect(request.envelope.estimated_token_cap).toBe(500);
    expect(request.wireKeyterms).toHaveLength(100);
    expect(request.envelope.keyterms_note).toContain("5 keyterms");
  });

  it("keeps preview modules free of hardcoded nova literals", () => {
    const source = readFileSync(
      new URL("../../components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("nova-");
  });

  it("keeps the default request params aligned with the case defaults", async () => {
    const { defaultDeepgramConfig } = await import("../../types/case");
    const defaults = defaultDeepgramConfig();

    expect(defaults.model).toBe("nova-3");
    expect(defaults.diarize).toBe(true);
    expect(defaults.smart_format).toBe(true);
    expect(buildDeepgramRequest({ caseId: "case_defaults", keyterms: [] }).envelope.deepgram_request).toEqual(
      expect.objectContaining({
        model: "nova-3",
        language: "en-US",
        diarize: "true",
        smart_format: "true",
        utt_split: "1.2",
      }),
    );
  });
});

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
        punctuate: "true",
        diarize_model: "latest",
        filler_words: "true",
        numerals: "false",
        utterances: "true",
        utt_split: "0.8",
        smart_format: "true",
        language: "en",
        mip_opt_out: "true",
      },
      effective_config: { audio_profile: "clean", expected_speaker_count: null },
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
    expect(request.wireQueryString).toContain("diarize_model=latest");
    expect(request.wireQueryString).not.toContain("diarize=true");
    expect(request.wireQueryString).toContain("numerals=false");
    expect(request.wireQueryString).toContain("utt_split=0.8");
    expect(request.wireQueryString).toContain("language=en");
    expect(request.wireQueryString).toContain("mip_opt_out=true");
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

  it("keeps the default request params aligned on model and smart formatting", async () => {
    const { defaultDeepgramConfig } = await import("../../types/case");
    const defaults = defaultDeepgramConfig();

    expect(defaults.model).toBe("nova-3");
    expect(defaults.diarize).toBe(true);
    expect(defaults.smart_format).toBe(true);
    expect(buildDeepgramRequest({ caseId: "case_defaults", keyterms: [] }).envelope.deepgram_request).toEqual(
      expect.objectContaining({
        model: "nova-3",
        diarize_model: "latest",
        smart_format: "true",
      }),
    );
  });

  it("applies saved case transcription settings to the wire request", () => {
    const request = buildDeepgramRequest({
      caseId: "case_config",
      keyterms: [],
      config: {
        model: "nova-3", language: "en-US", punctuate: true, utterances: true, diarize: false,
        diarize_version: "latest", speaker_count: 4, smart_format: true, numerals: false,
        audio_profile: "remote", utterance_split_seconds: 1, keyterms: [],
      },
    });

    expect(request.envelope.effective_config).toEqual({ audio_profile: "remote", expected_speaker_count: 4 });
    expect(request.wireUrl).toContain("utt_split=1");
    expect(request.wireUrl).toContain("language=en-US");
    expect(request.wireUrl).not.toContain("diarize_model");
  });

  it("derives utt_split from the audio profile when the reporter left the factory value", () => {
    const baseConfig = {
      model: "nova-3", language: "en-US", punctuate: true, utterances: true, diarize: true,
      diarize_version: "latest", speaker_count: null, smart_format: true, numerals: false,
      utterance_split_seconds: 0.8, keyterms: [],
    };

    const remote = buildDeepgramRequest({
      caseId: "case_remote",
      keyterms: [],
      config: { ...baseConfig, audio_profile: "remote" },
    });
    expect(remote.wireQueryString).toContain("utt_split=1");

    const clean = buildDeepgramRequest({
      caseId: "case_clean",
      keyterms: [],
      config: { ...baseConfig, audio_profile: "clean" },
    });
    expect(clean.wireQueryString).toContain("utt_split=0.8");
  });

  it("respects an explicitly tuned utt_split over the audio profile default", () => {
    const request = buildDeepgramRequest({
      caseId: "case_explicit_split",
      keyterms: [],
      config: {
        model: "nova-3", language: "en-US", punctuate: true, utterances: true, diarize: true,
        diarize_version: "latest", speaker_count: null, smart_format: true, numerals: false,
        audio_profile: "telephone", utterance_split_seconds: 1.5, keyterms: [],
      },
    });

    expect(request.wireQueryString).toContain("utt_split=1.5");
  });
});

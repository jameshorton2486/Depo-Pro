import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import {
  buildBridgeParagraphs,
  generateBridgeCorrections,
  type BridgeReviewContext,
  type BridgeTransport,
} from "./aiCorrectionBridge";

function doc(): EditorDocument {
  return {
    job_id: "t1",
    media_url: "",
    duration: 10,
    speakers: [
      { speaker_id: "spk_000", display_name: "Speaker 0", deepgram_speaker: 0 },
      { speaker_id: "spk_001", display_name: "Speaker 1", deepgram_speaker: 1 },
    ],
    utterances: [
      { utterance_id: "utt_0", speaker_id: "spk_000", start_time: 0, end_time: 1, word_ids: ["w_0", "w_1"] },
      { utterance_id: "utt_1", speaker_id: "spk_001", start_time: 1, end_time: 2, word_ids: ["w_2"] },
    ],
    words: [
      { word_id: "w_0", text: "Bayer", raw_text: "Bayer", speaker_id: "spk_000", utterance_id: "utt_0", start_time: 0, end_time: 0.5, confidence: 0.62, reviewed: false, edited: false },
      { word_id: "w_1", text: "Imaging", raw_text: "Imaging", speaker_id: "spk_000", utterance_id: "utt_0", start_time: 0.5, end_time: 1, confidence: 0.9, reviewed: false, edited: false },
      { word_id: "w_2", text: "Yes", raw_text: "Yes", speaker_id: "spk_001", utterance_id: "utt_1", start_time: 1, end_time: 2, confidence: 0.99, reviewed: false, edited: false },
    ],
  };
}

const CONTEXT: BridgeReviewContext = {
  case: {
    causeNumber: "2025-CI-1", caseStyle: "A v. B", witnessName: "Jane Doe",
    examiningAttorney: "MR. OLVERA", opposingCounsel: "", reporterName: "Miah Bardot", jurisdiction: "Bexar",
  },
};

function mockTransport(payload: unknown): BridgeTransport {
  return {
    createMessage: async () => ({
      text: JSON.stringify(payload),
      tokensIn: 20000,
      tokensOut: 512,
      latencyMs: 1234,
    }),
  };
}

describe("buildBridgeParagraphs", () => {
  it("projects utterances to paragraphs with raw_text and SPEAKER labels", () => {
    const paras = buildBridgeParagraphs(doc());
    expect(paras).toHaveLength(2);
    expect(paras[0].speaker_label).toBe("SPEAKER 0");
    expect(paras[0].words.map((w) => w.text)).toEqual(["Bayer", "Imaging"]);
  });
});

describe("generateBridgeCorrections", () => {
  const base = {
    transcriptId: "t1",
    caseId: "c1",
    context: CONTEXT,
    paragraphs: buildBridgeParagraphs(doc()),
    generatedAt: "2026-07-29T00:00:00Z",
  };

  it("validates and stamps a good correction (id, provenance, pending review)", async () => {
    const transport = mockTransport({
      corrections: [
        {
          specialty: "proper_name_novel",
          location: { paragraph_id: "utt_0", start_word_id: "w_0", end_word_id: "w_0" },
          change: { type: "proper_name_correction", before: "Bayer", after: "Baer" },
          reason: "Phonetic match to 'Baer'; Deepgram confidence on 'Bayer' was 0.62.",
          reason_kind: "phonetic_similarity",
          confidence: 0.8,
          confidence_source: "phonetic_edit_distance_1",
        },
      ],
    });

    const result = await generateBridgeCorrections(base, "key", transport);
    expect(result.corrections).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    // Run-level cost accounting surfaced from the transport.
    expect(result.tokensIn).toBe(20000);
    expect(result.tokensOut).toBe(512);
    expect(result.latencyMs).toBe(1234);
    expect(result.contextHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    const corr = result.corrections[0];
    expect(corr.id).toMatch(/^corr_[0-9A-Z]{26}$/);
    expect(corr.provenance.source).toBe("ai");
    expect(corr.provenance.context_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(corr.review.state).toBe("pending");
    expect(corr.transcript_id).toBe("t1");
  });

  it("drops an invalid correction into rejected (generic reason)", async () => {
    const transport = mockTransport({
      corrections: [
        {
          specialty: "proper_name_novel",
          location: { paragraph_id: "utt_0", start_word_id: "w_0", end_word_id: "w_0" },
          change: { type: "proper_name_correction", before: "Bayer", after: "Baer" },
          reason: "improved clarity",
          reason_kind: "phonetic_similarity",
          confidence: 0.8,
        },
      ],
    });

    const result = await generateBridgeCorrections(base, "key", transport);
    expect(result.corrections).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].errors.some((e) => e.includes("too generic"))).toBe(true);
  });

  it("accepts a structural speaker correction", async () => {
    const transport = mockTransport({
      corrections: [
        {
          specialty: "speaker_reassignment",
          location: { paragraph_id: "utt_1", start_word_id: "w_2", end_word_id: "w_2" },
          change: { type: "speaker_reassignment", structural_change: { new_speaker_role: "WITNESS", display_name: "THE WITNESS" } },
          reason: "Single-word affirmation answering the preceding question; role is the deponent.",
          reason_kind: "structural_boundary",
          confidence: 0.7,
        },
      ],
    });

    const result = await generateBridgeCorrections(base, "key", transport);
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0].specialty).toBe("speaker_reassignment");
  });

  it("returns empty on non-JSON model output", async () => {
    const transport: BridgeTransport = {
      createMessage: async () => ({ text: "not json", tokensIn: 100, tokensOut: 5, latencyMs: 10 }),
    };
    const result = await generateBridgeCorrections(base, "key", transport);
    expect(result.corrections).toHaveLength(0);
    expect(result.rejected[0].errors[0]).toContain("not valid JSON");
  });
});

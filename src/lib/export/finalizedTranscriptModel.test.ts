// DOC-0328 — FinalizedTranscriptModel unit tests. Proves the canonical assembly
// transports metadata without fabricating it, reports the line_type authority, derives
// all coordinates from the ONE paginator (deep-equal with buildCanonicalPaginationMap),
// integrates the examination/exhibit index projections, and is reproducible.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Utterance, Word } from "../../api/types";
import type { UfmMetadataEnvelope } from "../ufm/buildUfmMetadata";
import { emptyCaseRecord } from "../../types/case";
import { buildCanonicalPaginationMap } from "./paginationProducer";
import { buildFinalizedTranscriptModel } from "./finalizedTranscriptModel";

const RECORD = () => emptyCaseRecord("case-final", "2026-07-22T00:00:00.000Z");

// A plain Q/A deposition with no examination header or exhibit action.
function plainDoc(nUtterances: number): EditorDocument {
  const utterances: Utterance[] = [];
  const words: Word[] = [];
  let t = 0;
  for (let i = 0; i < nUtterances; i += 1) {
    const uttId = `u${i}`;
    const isAtty = i % 2 === 0;
    const speaker = isAtty ? "spk-atty" : "spk-wit";
    const tokens = isAtty ? ["Question", "number", `${i}?`] : ["Answer", "number", `${i}.`];
    const wordIds: string[] = [];
    tokens.forEach((tok, k) => {
      const wid = `w_${i}_${k}`;
      wordIds.push(wid);
      words.push({ word_id: wid, text: tok, raw_text: tok, speaker_id: speaker, utterance_id: uttId, start_time: t, end_time: t + 0.4, confidence: 1, reviewed: false, edited: false });
      t += 0.5;
    });
    utterances.push({ utterance_id: uttId, speaker_id: speaker, start_time: t - 1.5, end_time: t, word_ids: wordIds });
  }
  return {
    job_id: "final", media_url: null, duration: t,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
    ],
    utterances, words,
  } as unknown as EditorDocument;
}

// A stub envelope — the model only transports it, so its contents are irrelevant here.
const METADATA_STUB = { case_id: "case-final", computed_at: "2026-07-22T00:00:00.000Z", ufm_metadata: {}, field_sources: {}, field_confirmations: {}, missing_required_fields: [] } as unknown as UfmMetadataEnvelope;

describe("buildFinalizedTranscriptModel", () => {
  it("transports the supplied metadata envelope verbatim and defaults to null", () => {
    const withMeta = buildFinalizedTranscriptModel(plainDoc(10), RECORD(), { metadata: METADATA_STUB });
    expect(withMeta.metadata).toBe(METADATA_STUB);

    const withoutMeta = buildFinalizedTranscriptModel(plainDoc(10), RECORD());
    expect(withoutMeta.metadata).toBeNull();
  });

  it("derives pagination from the ONE canonical paginator (no second authority)", () => {
    const model = buildFinalizedTranscriptModel(plainDoc(40), RECORD(), { persistedLineTypeEnabled: false });
    const direct = buildCanonicalPaginationMap(plainDoc(40), RECORD(), undefined, false);
    expect(model.pagination).toEqual(direct);
  });

  it("reports line_type authority: off with no corrections, on with corrections", () => {
    const off = buildFinalizedTranscriptModel(plainDoc(6), RECORD(), { persistedLineTypeEnabled: false });
    expect(off.lineTypeAuthority).toEqual({ persistedLineTypeApplied: false, reviewedCorrectionCount: 0 });
  });

  it("derives the examination index structurally (P1) and no exhibits for a Q/A transcript", () => {
    const model = buildFinalizedTranscriptModel(plainDoc(8), RECORD());
    expect(model.transcriptId).toBe("final");
    // Header-less Q/A now yields the synthesized EXAMINATION section (structural authority).
    expect(model.examinationIndex).toEqual([{ kind: "EXAMINATION", examinerLabel: "MR. SMITH", page: 1 }]);
    // No exhibit parentheticals -> empty exhibit index.
    expect(model.exhibitIndex).toEqual([]);
  });

  it("is reproducible: identical inputs -> identical model", () => {
    const a = buildFinalizedTranscriptModel(plainDoc(30), RECORD(), { metadata: METADATA_STUB, persistedLineTypeEnabled: false });
    const b = buildFinalizedTranscriptModel(plainDoc(30), RECORD(), { metadata: METADATA_STUB, persistedLineTypeEnabled: false });
    expect(b).toEqual(a);
  });
});

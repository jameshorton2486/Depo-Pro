// DOC-0328 — large-transcript (>1,000 utterance) finalized/certified validation (#14).
//
// Retrieval note (#13): the authoritative editor loader (supabase/functions/editor-api
// loadUtterances/loadWords) already paginates past PostgREST's 1,000-row cap with an
// explicit range loop, so >1,000-row retrieval is satisfied at HEAD and nothing was
// imported. This test validates the layer THIS run owns: that the FinalizedTranscriptModel
// / certified pagination itself does not cap, truncate, or misnumber a transcript far
// beyond the historical 1,000-row boundary — it is a pure in-memory proof over a
// >1,000-utterance document, independent of the DB.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Utterance, Word } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { lookupUtteranceRef } from "./paginationContract";
import { buildFinalizedTranscriptModel } from "./finalizedTranscriptModel";

const RECORD = () => emptyCaseRecord("case-large", "2026-07-22T00:00:00.000Z");
const N = 1050; // comfortably past the historical 1,000-row cap on both utterances and words

function largeDoc(n: number): EditorDocument {
  const utterances: Utterance[] = [];
  const words: Word[] = [];
  let t = 0;
  for (let i = 0; i < n; i += 1) {
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
    job_id: "large", media_url: null, duration: t,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
    ],
    utterances, words,
  } as unknown as EditorDocument;
}

describe("large-transcript finalized/certified validation (>1,000 utterances)", () => {
  const model = buildFinalizedTranscriptModel(largeDoc(N), RECORD());

  it("paginates every utterance with no truncation past the 1,000-row boundary", () => {
    const seen = new Set(model.pagination.lines.map((l) => l.utterance_id).filter((id): id is string => id !== null));
    expect(seen.size).toBe(N);
    // The very first and very LAST utterances both resolve — the tail is not dropped.
    expect(lookupUtteranceRef(model.pagination, "u0")).not.toBeNull();
    expect(lookupUtteranceRef(model.pagination, `u${N - 1}`)).not.toBeNull();
  });

  it("spans many certified pages with within-page coherent coordinates", () => {
    const maxPage = Math.max(...model.pagination.lines.map((l) => l.ref.page));
    expect(maxPage).toBeGreaterThanOrEqual(40); // ~1050 / 25 lines-per-page
    const lpp = model.pagination.linesPerPage;
    for (const line of model.pagination.lines) {
      expect(line.ref.line).toBeGreaterThanOrEqual(1);
      expect(line.ref.line).toBeLessThanOrEqual(lpp);
    }
  });

  it("advances monotonically in reading order across every page boundary", () => {
    const lines = model.pagination.lines;
    for (let i = 1; i < lines.length; i += 1) {
      const prev = lines[i - 1].ref;
      const cur = lines[i].ref;
      const forward = cur.page > prev.page || (cur.page === prev.page && cur.line >= prev.line);
      expect(forward).toBe(true);
    }
  });

  it("is deterministic at scale: identical inputs -> identical pagination", () => {
    const again = buildFinalizedTranscriptModel(largeDoc(N), RECORD());
    expect(again.pagination).toEqual(model.pagination);
  });
});

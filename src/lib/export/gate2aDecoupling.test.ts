// GATE 2A / 2B decoupling — durable regression evidence (DOC-0331 §T).
//
// Proves the invariants that make Gate 2A (persisted-line_type PROJECTION activation) safe and
// independent of Gate 2B (first reviewed structural PERSISTENCE = program PONR):
//  1. Zero-reviewed-structure parity: with no corrections, enabled === disabled (Gate 2A is a
//     no-op on current production data — the empirical Stage A result, now a committed test).
//  2. Reviewed structure wins: a persisted/accepted decision changes the projection when enabled.
//  3. Reopen idempotency: re-deriving from the immutable source + corrections reproduces exactly.
//  4. Raw evidence is never mutated by the projection (words' text/raw_text/timestamps preserved).
//  5. No-write invariant: every flag-gated module is free of DB-write calls — enabling the flag
//     cannot write. (Gate 2B's write is a separate, un-flag-gated endpoint.)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { EditorDocument, Utterance, Word } from "../../api/types";
import type { CorrectionObject } from "../transcript/correctionObject";
import { emptyCaseRecord } from "../../types/case";
import { applyStructuralCorrections, deriveWorkingTranscript } from "../transcript/structuralApply";
import { buildCanonicalExportRenderModel } from "./exportAdapter";
import { buildFinalizedTranscriptModel } from "./finalizedTranscriptModel";
import { lookupUtteranceRef } from "./paginationContract";

const RECORD = () => emptyCaseRecord("case-2a", "2026-07-22T00:00:00.000Z");

function word(id: string, text: string, uttId: string, speaker: string, t: number): Word {
  return { word_id: id, text, raw_text: text, speaker_id: speaker, utterance_id: uttId, start_time: t, end_time: t + 0.3, confidence: 0.87, reviewed: false, edited: false } as Word;
}

// u2 is a mis-merged attorney-question + witness-answer captured as one unit.
function doc(): EditorDocument {
  const utterances: Utterance[] = [
    { utterance_id: "u0", speaker_id: "spk-atty", start_time: 0, end_time: 1, word_ids: ["a0", "a1"] },
    { utterance_id: "u1", speaker_id: "spk-wit", start_time: 1, end_time: 2, word_ids: ["b0", "b1"] },
    { utterance_id: "u2", speaker_id: "spk-atty", start_time: 2, end_time: 4, word_ids: ["c0", "c1", "c2", "c3", "c4"] },
  ] as unknown as Utterance[];
  const words: Word[] = [
    word("a0", "State", "u0", "spk-atty", 0), word("a1", "your name.", "u0", "spk-atty", 0.3),
    word("b0", "Jane", "u1", "spk-wit", 1), word("b1", "Doe.", "u1", "spk-wit", 1.3),
    word("c0", "You", "u2", "spk-atty", 2), word("c1", "understand?", "u2", "spk-atty", 2.3),
    word("c2", "Yes,", "u2", "spk-atty", 2.6), word("c3", "I", "u2", "spk-atty", 2.9), word("c4", "do.", "u2", "spk-atty", 3.2),
  ];
  return {
    job_id: "j2a", media_url: null, duration: 4,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
    ],
    utterances, words,
  } as unknown as EditorDocument;
}

function qaSplit(): CorrectionObject {
  return {
    id: "corr_01HXA92NVXZM3K4T7B2R9WQPD5", transcript_id: "j2a", case_id: "case-2a", specialty: "qa_split", prompt_version: "v1",
    location: { paragraph_id: "u2", start_word_id: "c0", end_word_id: "c4" },
    change: { type: "qa_split", structural_change: { split_after_word_id: "c1", new_q_paragraph_speaker_id: "spk-atty", new_a_paragraph_speaker_id: "spk-wit" } },
    reason: "Inline attorney question immediately followed by the witness answer.",
    reason_kind: "structural_boundary", confidence: 0.95,
    provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-11T00:00:00Z" },
    review: { state: "accepted" }, downstream: { applied_to_working_transcript: false },
  } as CorrectionObject;
}

describe("Gate 2A/2B decoupling invariants", () => {
  it("1. zero-reviewed-structure parity: enabled === disabled (Gate 2A no-op on current data)", () => {
    const on = buildFinalizedTranscriptModel(doc(), RECORD(), { corrections: [], persistedLineTypeEnabled: true });
    const off = buildFinalizedTranscriptModel(doc(), RECORD(), { corrections: [], persistedLineTypeEnabled: false });
    expect(on.pagination).toEqual(off.pagination);
    expect(on.examinationIndex).toEqual(off.examinationIndex);
    expect(on.exhibitIndex).toEqual(off.exhibitIndex);
    // Also true at the projection root: deriveWorkingTranscript is a no-op with no corrections.
    expect(deriveWorkingTranscript(doc(), [], true)).toEqual(deriveWorkingTranscript(doc(), [], false));
  });

  it("2. reviewed structure wins when enabled (and only when enabled)", () => {
    const on = buildFinalizedTranscriptModel(doc(), RECORD(), { corrections: [qaSplit()], persistedLineTypeEnabled: true });
    const off = buildFinalizedTranscriptModel(doc(), RECORD(), { corrections: [qaSplit()], persistedLineTypeEnabled: false });
    expect(lookupUtteranceRef(on.pagination, "u2::q")).not.toBeNull();
    expect(lookupUtteranceRef(on.pagination, "u2::a")).not.toBeNull();
    expect(lookupUtteranceRef(off.pagination, "u2::q")).toBeNull(); // disabled ignores the decision
    expect(lookupUtteranceRef(off.pagination, "u2")).not.toBeNull();
  });

  it("3. reopen idempotency: re-deriving from the immutable source reproduces exactly", () => {
    const first = deriveWorkingTranscript(doc(), [qaSplit()], true);
    const second = deriveWorkingTranscript(doc(), [qaSplit()], true);
    expect(second).toEqual(first);
  });

  it("4. the projection never mutates raw evidence (word text/raw_text/timestamps/confidence)", () => {
    const original = doc();
    const applied = applyStructuralCorrections(original, [qaSplit()]).document;
    const byId = new Map(applied.words.map((w) => [w.word_id, w]));
    for (const w of original.words) {
      const after = byId.get(w.word_id)!;
      expect(after.text).toBe(w.text);
      expect(after.raw_text).toBe(w.raw_text);
      expect(after.start_time).toBe(w.start_time);
      expect(after.end_time).toBe(w.end_time);
      expect(after.confidence).toBe(w.confidence);
    }
  });

  it("5. reviewed structure reaches the export render model", () => {
    const model = buildCanonicalExportRenderModel(doc(), RECORD(), [qaSplit()], true);
    const utt = new Set(model.lines.flatMap((l) => l.sourceUtteranceIds));
    expect(utt.has("u2::q") || utt.has("u2::a")).toBe(true);
  });

  it("6. no-write invariant: flag-gated projection modules contain no DB-write calls", () => {
    const dir = resolve(process.cwd(), "src");
    const files = [
      "lib/transcript/structuralApply.ts",
      "lib/transcript/lineTypeMigration.ts",
      "lib/transcript/workspacePresentation.ts",
      "lib/export/finalizedTranscriptModel.ts",
      "lib/export/paginationProducer.ts",
    ];
    const write = /\.(insert|update|upsert|delete)\s*\(|\.rpc\s*\(|\.from\s*\(\s*["'`]/;
    for (const f of files) {
      const sql = readFileSync(resolve(dir, f), "utf8").split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, "")).join("\n");
      expect(write.test(sql)).toBe(false);
    }
  });
});

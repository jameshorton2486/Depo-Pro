// DOC-0325 §16 — long-transcript validation of the completed structural
// architecture. Exercises deriveWorkingTranscript + both real builders on a
// >1,000-utterance synthetic deposition with many accepted qa_split /
// objection_split corrections. Proves complete hydration, correct structural
// apply, stable derived identities, complete word coverage (no drops/dupes),
// raw-evidence immutability, and no pathological performance. Synthetic fixture —
// no Thomas retranscription, no Deepgram call.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Word, Utterance, Speaker } from "../../api/types";
import type { CorrectionObject } from "./correctionObject";
import { deriveWorkingTranscript } from "./structuralApply";
import { buildEditorContent } from "../buildEditorContent";
import { buildCanonicalExportRenderModel } from "../export/exportAdapter";
import { emptyCaseRecord } from "../../types/case";
import type { JSONContent } from "@tiptap/core";

const N = 1200; // > 1,000 utterances

const SPEAKERS: Speaker[] = [
  { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
  { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
  { speaker_id: "spk-def", display_name: "MS. JONES", deepgram_speaker: 2, role: "ATTORNEY" },
];

// Build a large alternating Q/A deposition. Every 100th attorney turn is a
// combined "question + answer" utterance (a qa_split target); every 150th is a
// question with an embedded "Objection." (an objection_split target).
function bigDoc(): { doc: EditorDocument; corrections: CorrectionObject[] } {
  const utterances: Utterance[] = [];
  const words: Word[] = [];
  const corrections: CorrectionObject[] = [];
  let t = 0;

  for (let i = 0; i < N; i += 1) {
    const uttId = `u${i}`;
    const isAtty = i % 2 === 0;
    const speaker = isAtty ? "spk-atty" : "spk-wit";
    const combined = isAtty && i % 100 === 0;       // qa_split target
    const objection = isAtty && i % 150 === 0 && !combined; // objection_split target

    const tokens: string[] = combined
      ? ["Did", "you", "see", "it?", "Yes,", "I", "did."]
      : objection
        ? ["Please", "answer.", "Objection.", "Go", "ahead."]
        : isAtty
          ? ["Question", `number`, `${i}?`]
          : ["Answer", `number`, `${i}.`];

    const wordIds: string[] = [];
    tokens.forEach((tok, k) => {
      const wid = `w_${i}_${k}`;
      wordIds.push(wid);
      words.push({
        word_id: wid, text: tok, raw_text: tok, speaker_id: speaker, utterance_id: uttId,
        start_time: t, end_time: t + 0.4, confidence: 1, reviewed: false, edited: false,
      });
      t += 0.5;
    });
    utterances.push({ utterance_id: uttId, speaker_id: speaker, start_time: words[words.length - tokens.length].start_time, end_time: t, word_ids: wordIds });

    if (combined) {
      corrections.push({
        id: `corr_QA${i.toString().padStart(22, "0")}`.slice(0, 31),
        transcript_id: "big", case_id: "c", specialty: "qa_split", prompt_version: "v1",
        location: { paragraph_id: uttId, start_word_id: wordIds[0], end_word_id: wordIds[wordIds.length - 1] },
        change: { type: "qa_split", structural_change: { split_after_word_id: `w_${i}_3`, new_q_paragraph_speaker_id: "spk-atty", new_a_paragraph_speaker_id: "spk-wit" } },
        reason: "Combined question and answer in one attorney block.",
        reason_kind: "structural_boundary", confidence: 0.9,
        provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-11T00:00:00Z" },
        review: { state: "accepted" }, downstream: { applied_to_working_transcript: false },
      } as CorrectionObject);
    } else if (objection) {
      corrections.push({
        id: `corr_OB${i.toString().padStart(22, "0")}`.slice(0, 31),
        transcript_id: "big", case_id: "c", specialty: "objection_attribution", prompt_version: "v1",
        location: { paragraph_id: uttId, start_word_id: `w_${i}_2`, end_word_id: `w_${i}_2` },
        change: { type: "objection_split", structural_change: { objection_start_word_id: `w_${i}_2`, objection_end_word_id: `w_${i}_2`, objector_speaker_id: "spk-def" } },
        reason: "Objection embedded in the attorney question turn.",
        reason_kind: "structural_boundary", confidence: 0.9,
        provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-11T00:00:00Z" },
        review: { state: "accepted" }, downstream: { applied_to_working_transcript: false },
      } as CorrectionObject);
    }
  }

  return { doc: { job_id: "big", media_url: null, duration: t, speakers: SPEAKERS, utterances, words } as unknown as EditorDocument, corrections };
}

describe("long-transcript structural validation (>1,000 utterances)", () => {
  it("applies all corrections, keeps stable ids, and certifies every word exactly once", () => {
    const { doc, corrections } = bigDoc();
    expect(doc.utterances.length).toBe(N);
    expect(corrections.length).toBeGreaterThan(10);

    const start = performance.now();
    const working = deriveWorkingTranscript(doc, corrections, true);
    const ms = performance.now() - start;

    // Every accepted correction split its utterance (qa_split → +1 unit,
    // objection_split embedded → +2 units), so the working doc has MORE utterances.
    expect(working.utterances.length).toBeGreaterThan(N);
    // Complete word coverage: exactly the same word_id set, none dropped/duplicated.
    const origIds = doc.words.map((w) => w.word_id).sort();
    const workIds = working.words.map((w) => w.word_id).sort();
    expect(workIds).toEqual(origIds);
    // Stable derived identities are deterministic across a second derivation.
    const again = deriveWorkingTranscript(doc, corrections, true);
    expect(again.utterances.map((u) => u.utterance_id)).toEqual(working.utterances.map((u) => u.utterance_id));
    // No pathological performance (generous ceiling; typically a few ms).
    expect(ms).toBeLessThan(2000);
  });

  it("never mutates raw evidence at scale", () => {
    const { doc, corrections } = bigDoc();
    const sampledBefore = doc.words.slice(0, 50).map((w) => ({ id: w.word_id, text: w.text, t: w.start_time, utt: w.utterance_id }));
    deriveWorkingTranscript(doc, corrections, true);
    for (const s of sampledBefore) {
      const w = doc.words.find((x) => x.word_id === s.id)!;
      expect(w.text).toBe(s.text);
      expect(w.start_time).toBe(s.t);
      expect(w.utterance_id).toBe(s.utt); // DB doc utterance ownership untouched
    }
  });

  it("Workspace and export certify the same complete word set at scale (no builder drops words)", () => {
    const { doc, corrections } = bigDoc();
    const record = emptyCaseRecord("big-case", "2026-07-22T00:00:00.000Z");

    const wsContent = buildEditorContent(doc, { corrections, persistedLineTypeEnabled: true, structureConfirmed: true, record }) as JSONContent;
    const exModel = buildCanonicalExportRenderModel(doc, record, corrections, true);

    const wsWordIds = new Set<string>();
    for (const block of wsContent.content ?? []) {
      if (block.type !== "utterance") continue;
      for (const inline of block.content ?? []) {
        const mark = (inline.marks ?? []).find((m) => m.type === "wordMark");
        const id = (mark?.attrs as Record<string, unknown> | undefined)?.word_id;
        if (typeof id === "string") wsWordIds.add(id);
      }
    }
    const exWordIds = new Set(exModel.lines.flatMap((l) => l.sourceWordIds));

    // Both builders account for every source word (complete hydration at scale).
    expect(exWordIds.size).toBe(doc.words.length);
    expect(wsWordIds.size).toBe(doc.words.length);
    expect([...wsWordIds].sort()).toEqual([...exWordIds].sort());
  });
});

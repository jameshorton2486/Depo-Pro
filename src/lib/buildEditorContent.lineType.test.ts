// DOC-0325 Step 1 (Wave 1) — proves the REAL Workspace entry point
// (buildEditorContent) exercises the Working Transcript projection end-to-end
// when the persisted-line-type gate is ON, and is a byte-identical no-op when it
// is OFF (the shipped production default). This is the frontend hookup proof:
// reviewed qa_split CorrectionObjects flow through buildEditorContent →
// deriveWorkingTranscript → applyStructuralCorrections, and the split shows up in
// the rendered content — without flipping PERSISTED_LINE_TYPE_ENABLED.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Word } from "../api/types";
import type { CorrectionObject } from "./transcript/correctionObject";
import { buildEditorContent } from "./buildEditorContent";
import type { JSONContent } from "@tiptap/core";

function word(id: string, text: string, uttId: string, t: number): Word {
  return {
    word_id: id, text, raw_text: text, speaker_id: "spk-0", utterance_id: uttId,
    start_time: t, end_time: t + 0.1, confidence: 1, reviewed: false, edited: false,
  };
}

// One combined utterance "You understand? Yes, I do." spoken by a single ASR
// speaker — the classic case where a reviewer accepts a qa_split so the question
// and answer become separate Q/A structural units owned by distinct speakers.
function doc(): EditorDocument {
  return {
    job_id: "t", media_url: null, duration: 10,
    speakers: [
      { speaker_id: "spk-0", display_name: "SPEAKER 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-q", display_name: "MR. SMITH", deepgram_speaker: 1, role: "ATTORNEY" },
      { speaker_id: "spk-a", display_name: "THE WITNESS", deepgram_speaker: 2, role: "WITNESS" },
    ],
    utterances: [
      { utterance_id: "u1", speaker_id: "spk-0", start_time: 1, end_time: 4, word_ids: ["w1", "w2", "w3", "w4"] },
    ],
    words: [
      word("w1", "You", "u1", 1), word("w2", "understand?", "u1", 2),
      word("w3", "Yes,", "u1", 2.5), word("w4", "I do.", "u1", 3),
    ],
  } as unknown as EditorDocument;
}

function qaSplit(state: CorrectionObject["review"]["state"] = "accepted"): CorrectionObject {
  return {
    id: "corr_01HXA92NVXZM3K4T7B2R9WQPD5",
    transcript_id: "t", case_id: "c", specialty: "qa_split", prompt_version: "v1",
    location: { paragraph_id: "u1", start_word_id: "w1", end_word_id: "w4" },
    change: {
      type: "qa_split",
      structural_change: {
        split_after_word_id: "w2",
        new_q_paragraph_speaker_id: "spk-q",
        new_a_paragraph_speaker_id: "spk-a",
      },
    },
    reason: "Inline question followed by the witness answer.",
    reason_kind: "structural_boundary", confidence: 0.9,
    provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-10T00:00:00Z" },
    review: { state },
    downstream: { applied_to_working_transcript: false },
  } as CorrectionObject;
}

function utteranceSpeakerIds(content: JSONContent): string[] {
  return (content.content ?? [])
    .filter((node) => node.type === "utterance")
    .map((node) => String((node.attrs as Record<string, unknown> | undefined)?.speaker_id ?? ""));
}

describe("buildEditorContent — Step 1 corrections projection (real entry point)", () => {
  it("does NOT split when the gate is off (shipped production default) even with accepted corrections", () => {
    const content = buildEditorContent(doc(), { corrections: [qaSplit()] });
    const speakers = utteranceSpeakerIds(content);
    // The single ASR utterance is untouched: no split speakers appear.
    expect(speakers).not.toContain("spk-q");
    expect(speakers).not.toContain("spk-a");
    expect(speakers).toContain("spk-0");
  });

  it("is identical whether or not accepted corrections are supplied when the gate is off", () => {
    const withCorrections = buildEditorContent(doc(), { corrections: [qaSplit()] });
    const without = buildEditorContent(doc());
    expect(withCorrections).toEqual(without);
  });

  it("applies the accepted qa_split when the gate is ON, producing Q + A units", () => {
    const content = buildEditorContent(doc(), {
      corrections: [qaSplit()],
      persistedLineTypeEnabled: true,
    });
    const speakers = utteranceSpeakerIds(content);
    // The utterance is split: the question is owned by the attorney, the answer
    // by the witness. The original combined spk-0 unit no longer stands alone.
    expect(speakers).toContain("spk-q");
    expect(speakers).toContain("spk-a");
  });

  it("does not apply PENDING corrections even when the gate is ON", () => {
    const content = buildEditorContent(doc(), {
      corrections: [qaSplit("pending")],
      persistedLineTypeEnabled: true,
    });
    const speakers = utteranceSpeakerIds(content);
    expect(speakers).not.toContain("spk-q");
    expect(speakers).not.toContain("spk-a");
  });

  it("does not apply REJECTED corrections even when the gate is ON", () => {
    const content = buildEditorContent(doc(), {
      corrections: [qaSplit("rejected")],
      persistedLineTypeEnabled: true,
    });
    const speakers = utteranceSpeakerIds(content);
    expect(speakers).not.toContain("spk-q");
    expect(speakers).not.toContain("spk-a");
  });

  it("is idempotent: re-deriving from the same document + corrections yields identical content", () => {
    const once = buildEditorContent(doc(), { corrections: [qaSplit()], persistedLineTypeEnabled: true });
    const twice = buildEditorContent(doc(), { corrections: [qaSplit()], persistedLineTypeEnabled: true });
    expect(twice).toEqual(once);
  });
});

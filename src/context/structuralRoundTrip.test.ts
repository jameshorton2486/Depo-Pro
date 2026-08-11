// DOC-0325 Step 1 (Wave 3) — autosave / close / reopen round-trip for reviewed
// structural corrections.
//
// In this architecture the Working Transcript is NOT persisted: it is DERIVED at
// load time by deriveWorkingTranscript(immutable DB document, persisted reviewed
// corrections). "Close/reopen" is therefore re-running the load reducer cycle
// (LOAD_OK clears derived state; SET_CORRECTIONS re-hydrates from the persisted
// corrections) and re-deriving. The round-trip invariant:
//
//   load → accept structural correction → structural apply → Working Transcript
//        → close → reopen → IDENTICAL reviewed structure
//
// This test drives the REAL DocumentContext reducer through two full opens and
// asserts: identical derived structure, no double split, stable derived
// identities, provenance preserved, raw Deepgram evidence (the DB document)
// never mutated, rejected stays rejected, accepted persists, and later proposals
// cannot overwrite a CONFIRMED human decision.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Word } from "../api/types";
import type { CorrectionObject } from "../lib/transcript/correctionObject";
import { createInitialDocumentState, documentReducer } from "./DocumentContext";
import { deriveWorkingTranscript } from "../lib/transcript/structuralApply";
import { asStructuredUtterance } from "../lib/transcript/structuredTranscript";
import { shouldProposeStructure } from "../lib/transcript/lineTypeMigration";

function word(id: string, text: string, uttId: string, t: number): Word {
  return {
    word_id: id, text, raw_text: text, speaker_id: "spk-0", utterance_id: uttId,
    start_time: t, end_time: t + 0.4, confidence: 1, reviewed: false, edited: false,
  };
}

// Frozen DB snapshot the server returns on every open — the immutable canonical
// document. Returned fresh each call so a test can prove the reducer/projection
// never mutate the caller's copy.
function dbDoc(): EditorDocument {
  return {
    job_id: "job-rt", media_url: null, duration: 10,
    speakers: [
      { speaker_id: "spk-0", display_name: "SPEAKER 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-q", display_name: "MR. SMITH", deepgram_speaker: 1, role: "ATTORNEY" },
      { speaker_id: "spk-a", display_name: "THE WITNESS", deepgram_speaker: 2, role: "WITNESS" },
    ],
    utterances: [
      { utterance_id: "u1", speaker_id: "spk-0", start_time: 0, end_time: 4, word_ids: ["w1", "w2", "w3", "w4"] },
    ],
    words: [
      word("w1", "You", "u1", 0), word("w2", "understand?", "u1", 1),
      word("w3", "Yes,", "u1", 2), word("w4", "I do.", "u1", 3),
    ],
  } as unknown as EditorDocument;
}

function qaSplit(state: CorrectionObject["review"]["state"] = "accepted"): CorrectionObject {
  return {
    id: "corr_01HXA92NVXZM3K4T7B2R9WQPD5",
    transcript_id: "job-rt", case_id: "c", specialty: "qa_split", prompt_version: "v1",
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
    provenance: { source: "ai", provider: "anthropic", model: "claude", generated_at: "2026-08-10T00:00:00Z" },
    review: { state, decided_by: "reporter-1", decided_at: "2026-08-10T01:00:00Z" },
    downstream: { applied_to_working_transcript: false, pending_reason: "structural_apply_engine_v2" },
  } as CorrectionObject;
}

// Simulate one full open: LOAD_OK (server snapshot) then SET_CORRECTIONS (the
// flag-gated re-fetch). Returns the reducer state after the open.
function open(corrections: CorrectionObject[]) {
  let state = createInitialDocumentState("job-rt", true);
  state = documentReducer(state, {
    type: "LOAD_OK",
    doc: dbDoc(),
    updatedAt: "2026-08-10T00:00:00.000Z",
    speakerMapConfirmed: true,
    pipelineState: null,
    audioSegments: [],
  });
  state = documentReducer(state, { type: "SET_CORRECTIONS", corrections });
  return state;
}

function derive(state: ReturnType<typeof open>) {
  return deriveWorkingTranscript(state.document!, state.corrections, state.persistedLineTypeEnabled);
}

describe("structural round-trip — load → accept → apply → close → reopen (DOC-0325 Wave 3)", () => {
  it("re-derives IDENTICAL reviewed structure across close/reopen (deterministic, no double split)", () => {
    const first = derive(open([qaSplit("accepted")]));
    const second = derive(open([qaSplit("accepted")]));
    expect(second).toEqual(first);

    // Stable derived identities, and exactly one split (not re-split on reopen).
    const ids = second.utterances.map((u) => u.utterance_id);
    expect(ids).toEqual(["u1::q", "u1::a"]);
    // No compounding: a derived id is never itself split again.
    expect(ids.every((id) => !id.includes("::q::") && !id.includes("::a::"))).toBe(true);
  });

  it("split units carry a CONFIRMED review status that later proposals cannot overwrite", () => {
    const working = derive(open([qaSplit("accepted")]));
    for (const u of working.utterances) {
      const su = asStructuredUtterance(u);
      expect(su.line_type_review_status).toBe("CONFIRMED");
      // The migration-safety invariant: a proposal generator must skip this unit.
      expect(shouldProposeStructure(su)).toBe(false);
    }
  });

  it("never mutates the DB document (raw Deepgram evidence) during derivation", () => {
    const state = open([qaSplit("accepted")]);
    const before = JSON.parse(JSON.stringify(state.document));
    derive(state);
    // The DB document held in state is untouched: same single utterance u1, same
    // word text/timestamps/ownership — the split lives only in the derived output.
    expect(state.document).toEqual(before);
    expect(state.document!.utterances.map((u) => u.utterance_id)).toEqual(["u1"]);
    const w2 = state.document!.words.find((w) => w.word_id === "w2")!;
    expect(w2.utterance_id).toBe("u1");
    expect(w2.text).toBe("understand?");
  });

  it("preserves correction provenance across the reopen cycle", () => {
    const reopened = open([qaSplit("accepted")]);
    const corr = reopened.corrections[0];
    expect(corr.provenance.source).toBe("ai");
    expect(corr.provenance.provider).toBe("anthropic");
    expect(corr.review.decided_by).toBe("reporter-1");
  });

  it("keeps a rejected proposal rejected across reopen — it never applies", () => {
    const first = derive(open([qaSplit("rejected")]));
    const second = derive(open([qaSplit("rejected")]));
    // Unchanged from the DB structure on both opens: no split ever happens.
    expect(first.utterances.map((u) => u.utterance_id)).toEqual(["u1"]);
    expect(second).toEqual(first);
  });

  it("an accepted decision does not disappear on reopen (still applied the second time)", () => {
    const second = derive(open([qaSplit("accepted")]));
    expect(second.utterances.map((u) => u.utterance_id)).toEqual(["u1::q", "u1::a"]);
  });
});

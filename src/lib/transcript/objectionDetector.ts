// DOC-0325 Wave 4 / G1 — deterministic objection-split PRODUCER.
//
// The missing proposal source for objection_split (the AI bridge deliberately
// excludes objections). This is a pure, deterministic detector: it scans the
// immutable evidence for an EXPLICIT, word-bounded objection and emits an
// `objection_split` CorrectionObject PROPOSAL (review.state = "pending"). It never
// mutates the transcript, never decides speaker identity (attribution stays
// separate and unresolved), and prefers precision over recall — it matches only a
// standalone "Objection." token (optionally followed by "Form." / "Foundation."),
// not vague language. Accepted proposals flow through applyStructuralCorrections
// exactly like any reviewed correction.
import type { CorrectionObject } from "./correctionObject";
import type { EditorDocument, Word } from "../../api/types";

// A word IS the objection assertion: "Objection." — the trailing PERIOD is required
// (precision-first). This distinguishes the assertion from the common noun in
// "I have no objection to that", where the token is "objection" without a period.
// Recall trade-off: a provider that drops the period is intentionally not matched.
function isObjectionWord(text: string): boolean {
  return /^objection\.$/i.test(text.trim());
}
// The bounded qualifier that may immediately follow: "Form." / "Foundation.".
function isObjectionQualifier(text: string): boolean {
  return /^(form|foundation)\.$/i.test(text.trim());
}

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32 (matches corr_ id pattern)

// Deterministic corr_ id derived from the evidence span — the SAME objection at the
// SAME span always yields the SAME proposal id (idempotent proposal identity, no
// Date/Math.random). Collisions are harmless: a proposal is re-derivable, not a
// persisted authority. Satisfies the schema id pattern ^corr_[0-9A-Z]{26}$.
function deterministicProposalId(seed: string): string {
  let h = 2166136261 >>> 0; // FNV-1a offset basis
  const out: string[] = [];
  for (let i = 0; i < 26; i += 1) {
    h ^= seed.charCodeAt(i % seed.length) || i + 1;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995) >>> 0;
    h ^= h >>> 15;
    out.push(ALPHABET[(h >>> 0) % 32]); // >>> 0: XOR yields a signed int; force unsigned
  }
  return "corr_" + out.join("");
}

export interface ObjectionDetectorOptions {
  // Timestamp stamped on provenance.generated_at. Explicit so the detector stays a
  // pure function of its inputs (deterministic in tests); production passes real time.
  generatedAt?: string;
  promptVersion?: string;
}

function buildProposal(
  document: EditorDocument,
  utteranceId: string,
  startWord: Word,
  endWord: Word,
  options: ObjectionDetectorOptions,
): CorrectionObject {
  const seed = `${document.job_id}:${utteranceId}:${startWord.word_id}:${endWord.word_id}`;
  return {
    id: deterministicProposalId(seed),
    transcript_id: document.job_id,
    case_id: document.job_id, // proposal scope; the persisting layer owns real case_id
    specialty: "objection_attribution",
    prompt_version: options.promptVersion ?? "v1",
    location: { paragraph_id: utteranceId, start_word_id: startWord.word_id, end_word_id: endWord.word_id },
    change: {
      type: "objection_split",
      structural_change: {
        objection_start_word_id: startWord.word_id,
        objection_end_word_id: endWord.word_id,
        // No objector_speaker_id: attribution is a separate, human/unresolved concern.
      },
    },
    reason: "Explicit objection detected at a word boundary inside another speaker's turn.",
    reason_kind: "structural_boundary",
    confidence: 0.9,
    confidence_source: "explicit_objection_token",
    provenance: { source: "deterministic", generated_at: options.generatedAt ?? "1970-01-01T00:00:00.000Z" },
    review: { state: "pending" },
    downstream: { applied_to_working_transcript: false },
  } as CorrectionObject;
}

/**
 * Detect embedded explicit objections and return `objection_split` proposals
 * (review.state="pending"). Deterministic: same document → same proposals (same
 * spans, same ids). Precision-first: only an explicit "Objection." token embedded
 * in a turn that also has other words is proposed — a standalone objection turn is
 * left alone (nothing to extract; its attribution is a separate concern).
 */
export function detectObjectionSplitProposals(
  document: EditorDocument,
  options: ObjectionDetectorOptions = {},
): CorrectionObject[] {
  const wordById = new Map(document.words.map((w) => [w.word_id, w]));
  const proposals: CorrectionObject[] = [];

  for (const utterance of document.utterances) {
    const words = utterance.word_ids.map((id) => wordById.get(id)).filter((w): w is Word => Boolean(w));
    if (words.length < 2) continue; // a standalone objection turn has nothing to extract

    let i = 0;
    while (i < words.length) {
      if (!isObjectionWord(words[i].text)) {
        i += 1;
        continue;
      }
      const startWord = words[i];
      let endIndex = i;
      if (i + 1 < words.length && isObjectionQualifier(words[i + 1].text)) {
        endIndex = i + 1;
      }
      const endWord = words[endIndex];

      // Embedded only: require surrounding non-objection content (before OR after).
      const hasOther = i > 0 || endIndex < words.length - 1;
      if (hasOther) {
        proposals.push(buildProposal(document, utterance.utterance_id, startWord, endWord, options));
      }
      i = endIndex + 1;
    }
  }

  return proposals;
}

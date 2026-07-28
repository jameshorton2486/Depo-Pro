import type { EditorDocument } from "../../api/types";

// ─────────────────────────────────────────────────────────────────────────────
// Layer 0 — Immutable Deepgram recognition ("Recognition Evidence").
//
// Produces plain, read-only rows straight from the recognition data:
//   • raw_text only — never working_text, never AI suggestions
//   • Deepgram speaker numbers ("Speaker 0", "Speaker 1", …)
//   • one row per SPEAKER TURN — consecutive same-speaker utterances are
//     grouped into a paragraph (like Deepgram Playground); tokens are never
//     reordered, edited, or dropped
//
// These rows are rendered by RecognitionEvidenceView OUTSIDE the editable TipTap
// editor, so recognition can never flow into the reporter's working-text /
// autosave pipeline. Per-word confidence + timestamps are preserved for
// confidence coloring and click-to-seek.
//
// It represents exactly what Deepgram returned — no CFE, no structure inference,
// no exclusions, no geometry, no pagination.
// ─────────────────────────────────────────────────────────────────────────────

// Matches the WordMark confidence buckets used in the reporter view.
const VERY_LOW_CONFIDENCE = 0.5;
const LOW_CONFIDENCE = 0.75;

export type ConfidenceLevel = "ok" | "low" | "very-low";

export interface BaselineWord {
  word_id: string;
  text: string;
  confidence: number;
  start_time: number;
  end_time: number;
  confidenceLevel: ConfidenceLevel;
}

export interface BaselineRow {
  /** First utterance of the turn — stable render key. */
  utterance_id: string;
  /** Every utterance merged into this turn, in order (lineage). */
  utterance_ids: string[];
  speaker_id: string;
  speaker_label: string;
  start_time: number;
  words: BaselineWord[];
}

function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence < VERY_LOW_CONFIDENCE) return "very-low";
  if (confidence < LOW_CONFIDENCE) return "low";
  return "ok";
}

function buildSpeakerLabels(doc: EditorDocument): Map<string, string> {
  const labels = new Map<string, string>();
  doc.speakers.forEach((speaker, index) => {
    const dg = speaker.deepgram_speaker;
    const n = typeof dg === "number" ? dg : index;
    labels.set(speaker.speaker_id, `Speaker ${n}`);
  });
  return labels;
}

export function buildBaselineRows(doc: EditorDocument): BaselineRow[] {
  const wordById = new Map(doc.words.map((w) => [w.word_id, w]));
  const speakerLabels = buildSpeakerLabels(doc);

  const rows: BaselineRow[] = [];

  for (const utt of doc.utterances) {
    const words: BaselineWord[] = [];
    utt.word_ids.forEach((wid) => {
      const word = wordById.get(wid);
      if (!word) return;
      const text = word.raw_text; // Layer 0 shows the immutable ASR token verbatim.
      if (!text || text.length === 0) return;
      words.push({
        word_id: word.word_id,
        text,
        confidence: word.confidence,
        start_time: word.start_time,
        end_time: word.end_time,
        confidenceLevel: confidenceLevel(word.confidence),
      });
    });

    // Group consecutive same-speaker utterances into one speaker turn
    // (paragraph), the way Deepgram Playground groups paragraphs. This only
    // joins adjacent same-speaker utterances — it never reorders, edits, or
    // drops a token; per-word data is preserved for confidence + click-to-seek.
    const prev = rows[rows.length - 1];
    if (prev && prev.speaker_id === utt.speaker_id) {
      prev.words.push(...words);
      prev.utterance_ids.push(utt.utterance_id);
      continue;
    }

    rows.push({
      utterance_id: utt.utterance_id,
      utterance_ids: [utt.utterance_id],
      speaker_id: utt.speaker_id,
      speaker_label: speakerLabels.get(utt.speaker_id) ?? utt.speaker_id,
      start_time: utt.start_time,
      words,
    });
  }

  return rows;
}

// Flatten baseline rows into readable, speaker-labeled lines.
// Used by the Recognition-vs-Reporter diff viewer.
export function baselineToLabeledLines(doc: EditorDocument): string[] {
  return buildBaselineRows(doc).map((row) => {
    const text = row.words.map((w) => w.text).join(" ");
    return `${row.speaker_label}: ${text}`;
  });
}

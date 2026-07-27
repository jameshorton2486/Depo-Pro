import type { JSONContent } from "@tiptap/core";
import type { EditorDocument } from "../../api/types";

// ─────────────────────────────────────────────────────────────────────────────
// Layer 0 — Immutable Deepgram recognition.
//
// This builder renders EXACTLY what Deepgram returned and nothing else:
//   • raw_text only — never working_text, never AI suggestions
//   • Deepgram speaker numbers ("Speaker 0", "Speaker 1", …)
//   • Deepgram utterance order and boundaries (utterance.word_ids)
//
// It deliberately BYPASSES the entire Depo-Pro transformation stack:
//   • buildDisplayDocument  (speaker-identity inference / legal roles)
//   • cfe()                 (stutter dashes, phrase corrections, abbreviation
//                            spacing, low-conf flag spans, page geometry)
//   • resolveWordDisplay    (working / AI layer selection)
//   • Q/A classification, colloquy structure, section headings, BY-lines
//   • pagination and court-reporter geometry
//   • exclusion filtering (excluded_from_output)  — nothing is hidden here
//
// Per-word timestamps and confidence are preserved on the wordMark, so
// confidence coloring, the ConfidencePlugin, and click-to-seek audio sync all
// continue to work against the baseline exactly as they do for processed views.
//
// This is the dependable diagnostic baseline: if the workspace and this view
// disagree, the difference is something the pipeline did — not something
// Deepgram produced.
// ─────────────────────────────────────────────────────────────────────────────

const BASELINE_LINE_ROLE = "baseline";

function buildSpeakerLabels(doc: EditorDocument): Map<string, string> {
  const labels = new Map<string, string>();
  doc.speakers.forEach((speaker, index) => {
    const dg = speaker.deepgram_speaker;
    const n = typeof dg === "number" ? dg : index;
    labels.set(speaker.speaker_id, `Speaker ${n}`);
  });
  return labels;
}

export function buildBaselineContent(doc: EditorDocument): JSONContent {
  const wordById = new Map(doc.words.map((w) => [w.word_id, w]));
  const speakerLabels = buildSpeakerLabels(doc);

  const blocks: JSONContent[] = [];

  doc.utterances.forEach((utt, idx) => {
    const inlineNodes: JSONContent[] = [];

    utt.word_ids.forEach((wid, i) => {
      const word = wordById.get(wid);
      if (!word) return;

      // Layer 0 shows the immutable ASR token verbatim. No layer selection.
      const text = word.raw_text;
      if (!text || text.length === 0) return;

      inlineNodes.push({
        type: "text",
        text,
        marks: [
          {
            type: "wordMark",
            attrs: {
              word_id: word.word_id,
              utterance_id: word.utterance_id,
              speaker_id: word.speaker_id,
              start_time: word.start_time,
              end_time: word.end_time,
              confidence: word.confidence,
              reviewed: word.reviewed,
              // Baseline is always the raw layer — never pending AI.
              ai_layer: "raw_text",
              ai_pending: false,
            },
          },
        ],
      });

      if (i < utt.word_ids.length - 1) {
        inlineNodes.push({ type: "text", text: " " });
      }
    });

    if (inlineNodes.length === 0) {
      inlineNodes.push({ type: "text", text: " " });
    }

    const label = speakerLabels.get(utt.speaker_id) ?? utt.speaker_id;

    blocks.push({
      type: "utterance",
      attrs: {
        // A dedicated role so the block gets no Q/A/geometry styling and can be
        // targeted for baseline-specific CSS if ever needed.
        formatted_line_role: BASELINE_LINE_ROLE,
        utterance_id: utt.utterance_id,
        speaker_id: utt.speaker_id,
        speaker_label: label,
        // Explicit prefix wins over role-inferred Q./A. prefixes.
        prefix_text: label,
        line_number: idx + 1,
        page_line_number: 0,
        start_time: utt.start_time,
        role: null,
        language: null,
      },
      content: inlineNodes,
    });
  });

  return { type: "doc", content: blocks };
}

// Flatten a built baseline document into readable, speaker-labeled lines.
// Used by the Recognition-vs-Current diff viewer.
export function baselineToLabeledLines(doc: EditorDocument): string[] {
  const wordById = new Map(doc.words.map((w) => [w.word_id, w]));
  const speakerLabels = buildSpeakerLabels(doc);

  return doc.utterances.map((utt) => {
    const label = speakerLabels.get(utt.speaker_id) ?? utt.speaker_id;
    const text = utt.word_ids
      .map((wid) => wordById.get(wid)?.raw_text ?? "")
      .filter((t) => t.length > 0)
      .join(" ");
    return `${label}: ${text}`;
  });
}

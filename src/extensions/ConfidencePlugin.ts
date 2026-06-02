import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { EditorState } from "prosemirror-state";
import type { Node as ProseMirrorNode } from "prosemirror-model";

export const CONFIDENCE_THRESHOLD = 0.70;

export interface LowConfWord {
  word_id: string;
  utterance_id: string;
  start_time: number;
  end_time: number;
  confidence: number;
  text: string;
  from: number;
  to: number;
}

interface PluginState {
  decorations: DecorationSet;
  reviewedIds: Set<string>;
  lowConfWords: LowConfWord[];
}

export const confidencePluginKey = new PluginKey<PluginState>("confidence");

function buildState(
  doc: ProseMirrorNode,
  reviewedIds: Set<string>
): PluginState {
  const decos: Decoration[] = [];
  const lowConfWords: LowConfWord[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    node.marks.forEach((mark) => {
      if (mark.type.name !== "wordMark") return;
      const { word_id, utterance_id, start_time, end_time, confidence } =
        mark.attrs as {
          word_id: string;
          utterance_id: string;
          start_time: number;
          end_time: number;
          confidence: number;
        };

      const conf = typeof confidence === "number" ? confidence : 1;
      if (conf >= CONFIDENCE_THRESHOLD) return;
      if (reviewedIds.has(word_id)) return;

      const from = pos;
      const to = pos + node.nodeSize;
      const text = node.text ?? "";

      lowConfWords.push({ word_id, utterance_id, start_time, end_time, confidence: conf, text, from, to });

      const pct = Math.round(conf * 100);
      decos.push(
        Decoration.inline(from, to, {
          class: "conf-underline",
          "data-conf-pct": String(pct),
          title: `Confidence: ${pct}%`,
        })
      );
    });
  });

  // Sort queue in document order (already is, but make explicit)
  lowConfWords.sort((a, b) => a.from - b.from);

  return {
    decorations: DecorationSet.create(doc, decos),
    reviewedIds,
    lowConfWords,
  };
}

export function createConfidencePlugin(
  initialReviewedIds: Set<string> = new Set()
): Plugin<PluginState> {
  return new Plugin<PluginState>({
    key: confidencePluginKey,

    state: {
      init(_config, editorState: EditorState): PluginState {
        return buildState(editorState.doc, initialReviewedIds);
      },

      apply(tr, prev): PluginState {
        // Check for our custom meta action
        const meta = tr.getMeta(confidencePluginKey) as
          | { type: "SET_REVIEWED"; word_ids: string[] }
          | { type: "CLEAR_REVIEWED"; word_ids: string[] }
          | { type: "RESET_REVIEWED"; word_ids: string[] }
          | undefined;

        if (meta) {
          const next = new Set(prev.reviewedIds);
          if (meta.type === "SET_REVIEWED") {
            meta.word_ids.forEach((id) => next.add(id));
          } else if (meta.type === "CLEAR_REVIEWED") {
            meta.word_ids.forEach((id) => next.delete(id));
          } else if (meta.type === "RESET_REVIEWED") {
            next.clear();
            meta.word_ids.forEach((id) => next.add(id));
          }
          return buildState(tr.doc, next);
        }

        if (tr.docChanged) {
          return buildState(tr.doc, prev.reviewedIds);
        }

        return prev;
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
  });
}

export function getConfidenceState(state: EditorState): PluginState | undefined {
  return confidencePluginKey.getState(state);
}
